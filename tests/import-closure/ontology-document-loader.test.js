import { afterEach, expect, jest, test } from "@jest/globals";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { IRI, OWLOntologyLoaderConfiguration } from "owlapi/model";
import { OntologyDocumentLoader } from "../../scripts/ontology/ontologyDocumentLoader.js";

const roots = [];
const config = new OWLOntologyLoaderConfiguration({
  remoteImports: true,
  maxRetries: 3,
  maxRedirects: 20,
});
const context = { config };
const immediate = async () => {};
afterEach(async () => {
  jest.useRealTimers();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});
async function input(bytes) {
  const root = await mkdtemp(join(tmpdir(), "uo-document-test-"));
  roots.push(root);
  const path = join(root, "root.owl");
  await writeFile(path, bytes);
  return path;
}
test.each([
  [Buffer.from("Ontology()"), "Ontology()"],
  [Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from("Ontology()")]), "Ontology()"],
  [
    Buffer.from('<?xml version="1.0"?><root/>', "utf16le"),
    '<?xml version="1.0"?><root/>',
  ],
  [
    Buffer.from('<?xml version="1.0"?><root/>', "utf16le").swap16(),
    '<?xml version="1.0"?><root/>',
  ],
])("decodes valid bytes without loss %#", async (bytes, text) => {
  const path = await input(bytes);
  const source = await new OntologyDocumentLoader().loadRootDocument(
    path,
    context,
  );
  expect(source.getText()).toBe(text);
  expect(source.getDocumentIRI().value).toBe(pathToFileURL(path).href);
  expect(source.getFileName()).toBe("root.owl");
});
test("invalid UTF-8 is fatal rather than replacement decoded", async () => {
  const path = await input(Buffer.from([0xc3, 0x28]));
  await expect(
    new OntologyDocumentLoader().loadRootDocument(path, context),
  ).rejects.toMatchObject({ code: "UNLOADABLE_IMPORT" });
});
test("mapped read failure falls through; mapped malformed text is not substituted", async () => {
  const path = await input("malformed ontology text");
  const fetchImpl = jest.fn(async () => new Response("remote"));
  const mapper = { getDocumentIRI: () => IRI.create(pathToFileURL(path).href) };
  const loader = new OntologyDocumentLoader({
    iriMapper: mapper,
    fetchImpl,
    sleepImpl: immediate,
  });
  expect(
    (
      await loader.load(IRI.create("https://example.test/root"), context)
    ).getText(),
  ).toBe("malformed ontology text");
  expect(fetchImpl).not.toHaveBeenCalled();
  await rm(path);
  expect(
    (
      await loader.load(IRI.create("https://example.test/root"), context)
    ).getText(),
  ).toBe("remote");
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
test("authored HTTP receives four transport attempts before HTTPS promotion", async () => {
  const fetchImpl = jest.fn(async (url) => {
    if (url.startsWith("http:")) throw new TypeError("transport interrupted");
    return new Response("Ontology()");
  });
  const loader = new OntologyDocumentLoader({
    fetchImpl,
    sleepImpl: immediate,
  });
  expect(
    (
      await loader.load(IRI.create("http://example.test/root"), context)
    ).getText(),
  ).toBe("Ontology()");
  expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual(
    Array(4)
      .fill("http://example.test/root")
      .concat("https://example.test/root"),
  );
});
test.each([408, 425, 429, 500, 502, 503, 504])(
  "retries HTTP %i",
  async (status) => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(new Response("failure", { status }))
      .mockResolvedValueOnce(new Response("success"));
    const sleepImpl = jest.fn(immediate);
    const loader = new OntologyDocumentLoader({ fetchImpl, sleepImpl });
    expect(
      (
        await loader.load(IRI.create("https://example.test/root"), context)
      ).getText(),
    ).toBe("success");
    expect(sleepImpl).toHaveBeenCalledWith(250, undefined);
  },
);
test("caps Retry-After and reports exhausted attempts", async () => {
  const fetchImpl = jest.fn(
    async () =>
      new Response("busy", { status: 503, headers: { "Retry-After": "100" } }),
  );
  const sleepImpl = jest.fn(immediate);
  await expect(
    new OntologyDocumentLoader({ fetchImpl, sleepImpl }).load(
      IRI.create("https://example.test/root"),
      context,
    ),
  ).rejects.toMatchObject({
    code: "UNLOADABLE_IMPORT",
    attempts: expect.arrayContaining([
      expect.objectContaining({ status: 503 }),
    ]),
  });
  expect(fetchImpl).toHaveBeenCalledTimes(4);
  expect(sleepImpl.mock.calls.map(([delay]) => delay)).toEqual([
    30000, 30000, 30000,
  ]);
});
test("404 is not retried", async () => {
  const fetchImpl = jest.fn(
    async () => new Response("missing", { status: 404 }),
  );
  await expect(
    new OntologyDocumentLoader({ fetchImpl }).load(
      IRI.create("https://example.test/root"),
      context,
    ),
  ).rejects.toMatchObject({ code: "MISSING_IMPORT" });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
test.each([20, 21])(
  "enforces the redirect ceiling at %i redirects",
  async (count) => {
    const fetchImpl = jest.fn(async (url) => {
      const step = Number(new URL(url).pathname.slice(1));
      return step < count
        ? new Response(null, {
            status: 302,
            headers: { location: `/${step + 1}` },
          })
        : new Response("success");
    });
    const result = new OntologyDocumentLoader({ fetchImpl }).load(
      IRI.create("https://example.test/0"),
      context,
    );
    if (count === 20) expect((await result).getText()).toBe("success");
    else
      await expect(result).rejects.toMatchObject({
        resource: "maxRedirects",
        observed: 21,
      });
  },
);
test("HTTP-date Retry-After uses the bounded remaining delay", async () => {
  jest.useFakeTimers({ now: new Date("2026-10-02T00:00:00Z") });
  const fetchImpl = jest
    .fn()
    .mockResolvedValueOnce(
      new Response(null, {
        status: 429,
        headers: { "Retry-After": "Fri, 02 Oct 2026 00:00:05 GMT" },
      }),
    )
    .mockResolvedValueOnce(new Response("success"));
  const sleepImpl = jest.fn(immediate);
  await new OntologyDocumentLoader({ fetchImpl, sleepImpl }).load(
    IRI.create("https://example.test/root"),
    context,
  );
  expect(sleepImpl).toHaveBeenCalledWith(5000, undefined);
});
test("network attempt timeout aborts at 30 seconds", async () => {
  jest.useFakeTimers();
  const fetchImpl = (_url, { signal }) =>
    new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      }),
    );
  const result = new OntologyDocumentLoader({ fetchImpl }).load(
    IRI.create("https://example.test/root"),
    { config: new OWLOntologyLoaderConfiguration({ remoteImports: true }) },
  );
  const assertion = expect(result).rejects.toMatchObject({
    code: "UNLOADABLE_IMPORT",
  });
  await jest.advanceTimersByTimeAsync(30000);
  await assertion;
});
test("rejects redirect loops and unsupported schemes", async () => {
  const fetchImpl = jest.fn(
    async () =>
      new Response(null, { status: 302, headers: { location: "/root" } }),
  );
  const loader = new OntologyDocumentLoader({ fetchImpl });
  await expect(
    loader.load(IRI.create("https://example.test/root"), context),
  ).rejects.toMatchObject({ code: "SECURITY_POLICY_VIOLATION" });
  await expect(
    loader.load(IRI.create("ftp://example.test/root"), context),
  ).rejects.toMatchObject({ code: "SECURITY_POLICY_VIOLATION" });
});
test("streams input within its byte ceiling and cancels overflow", async () => {
  let canceled = false;
  const fetchImpl = async () =>
    new Response(
      new ReadableStream({
        pull(controller) {
          controller.enqueue(new Uint8Array(8));
        },
        cancel() {
          canceled = true;
        },
      }),
    );
  await expect(
    new OntologyDocumentLoader({ fetchImpl }).load(
      IRI.create("https://example.test/root"),
      {
        config: new OWLOntologyLoaderConfiguration({
          remoteImports: true,
          maxInputBytes: 10,
        }),
      },
    ),
  ).rejects.toMatchObject({
    code: "RESOURCE_LIMIT_EXCEEDED",
    resource: "maxInputBytes",
    limit: 10,
    observed: 16,
  });
  expect(canceled).toBe(true);
});
test("preserves caller cancellation reason", async () => {
  const controller = new AbortController();
  const reason = new Error("owner canceled");
  controller.abort(reason);
  await expect(
    new OntologyDocumentLoader().load(IRI.create("https://example.test/root"), {
      config,
      signal: controller.signal,
    }),
  ).rejects.toBe(reason);
});
test("real HTTP retrieval carries headers, follows redirects, and honors charset", async () => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(request.headers);
    if (request.url === "/redirect") {
      response.writeHead(302, { location: "/root" });
      response.end();
    } else {
      response.writeHead(200, {
        "content-type": "application/rdf+xml; charset=utf-16le",
      });
      response.end(Buffer.from("<root/>", "utf16le"));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = `http://127.0.0.1:${server.address().port}`;
    const source = await new OntologyDocumentLoader().load(
      IRI.create(`${address}/redirect`),
      context,
    );
    expect(source.getText()).toBe("<root/>");
    expect(source.getDocumentIRI().value).toBe(`${address}/root`);
    expect(requests[0]["user-agent"]).toBe(
      "universal-ontology-import-closure/1.0",
    );
    expect(requests[0].accept).toContain("application/rdf+xml");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
