import { open } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { OWLOntologyLoaderConfiguration } from "owlapi/model";
import {
  MissingImportError,
  ResourceLimitError,
  SecurityPolicyError,
  StringDocumentSource,
  UnloadableImportError,
} from "owlapi/io";

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const ACCEPT =
  "application/rdf+xml, application/owl+xml, text/owl-functional, text/owl-manchester, text/turtle, application/ld+json, application/n-triples, application/n-quads, application/trig, */*;q=0.1";

function decode(bytes, contentType) {
  let encoding;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    encoding = "utf-8";
  else if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = "utf-16le";
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = "utf-16be";
  else {
    encoding = /charset\s*=\s*["']?([^\s;"']+)/iu.exec(contentType ?? "")?.[1];
    if (
      !encoding &&
      bytes[0] === 0x3c &&
      bytes[1] === 0 &&
      bytes[2] === 0x3f &&
      bytes[3] === 0
    )
      encoding = "utf-16le";
    if (
      !encoding &&
      bytes[0] === 0 &&
      bytes[1] === 0x3c &&
      bytes[2] === 0 &&
      bytes[3] === 0x3f
    )
      encoding = "utf-16be";
    encoding ??= /^<\?xml\s[^?]*encoding\s*=\s*["']([^"']+)["']/iu.exec(
      bytes.subarray(0, 1024).toString("latin1"),
    )?.[1];
  }
  try {
    return new TextDecoder(encoding ?? "utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new UnloadableImportError(
      "Ontology bytes cannot be decoded without loss",
      { cause, reason: "INVALID_ENCODING" },
    );
  }
}

function checkBytes(observed, limit) {
  if (observed > limit)
    throw new ResourceLimitError("Ontology input exceeds its byte limit", {
      resource: "maxInputBytes",
      limit,
      observed,
    });
}

function retryDelay(header, retry) {
  if (header) {
    const seconds = /^\d+$/u.test(header.trim()) ? Number(header) : NaN;
    const milliseconds = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(header) - Date.now();
    if (Number.isFinite(milliseconds))
      return Math.max(0, Math.min(30000, milliseconds));
  }
  return [250, 1000, 4000][Math.min(retry, 2)];
}

/** Bounded file/HTTP acquisition shared by ontology and catalog documents. */
export class OntologyDocumentLoader {
  #iriMapper;
  #fetch;
  #sleep;
  #onDocument;

  constructor({
    iriMapper,
    fetchImpl = fetch,
    sleepImpl = (delay, signal) => sleep(delay, undefined, { signal }),
    onDocument,
  } = {}) {
    this.#iriMapper = iriMapper;
    this.#fetch = fetchImpl;
    this.#sleep = sleepImpl;
    this.#onDocument = onDocument;
  }

  async #attempt(url, config, callerSignal) {
    callerSignal?.throwIfAborted();
    if (url.protocol === "file:") {
      const handle = await open(fileURLToPath(url), "r");
      try {
        const chunks = [];
        let count = 0;
        for (;;) {
          callerSignal?.throwIfAborted();
          const buffer = Buffer.alloc(
            Math.min(65536, config.maxInputBytes + 1),
          );
          const { bytesRead } = await handle.read(buffer);
          if (!bytesRead) break;
          count += bytesRead;
          checkBytes(count, config.maxInputBytes);
          chunks.push(buffer.subarray(0, bytesRead));
        }
        return {
          bytes: Buffer.concat(chunks),
          url: url.href,
          fileName: basename(fileURLToPath(url)),
        };
      } finally {
        await handle.close();
      }
    }
    if (!new Set(["http:", "https:"]).has(url.protocol))
      throw new SecurityPolicyError(
        `Unsupported ontology document scheme: ${url.protocol}`,
      );
    if (!config.remoteImports)
      throw new SecurityPolicyError("Remote document loading is disabled");
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("Ontology attempt timed out")),
      config.timeoutMs,
    );
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, controller.signal])
      : controller.signal;
    try {
      const visited = new Set();
      let current = url;
      for (let redirects = 0; ; redirects += 1) {
        if (visited.has(current.href))
          throw new SecurityPolicyError("Ontology redirect cycle", {
            documentIRI: current.href,
          });
        if (redirects > config.maxRedirects)
          throw new ResourceLimitError("Ontology redirect limit", {
            resource: "maxRedirects",
            limit: config.maxRedirects,
            observed: redirects,
          });
        visited.add(current.href);
        if (current.protocol !== "http:" && current.protocol !== "https:")
          throw new SecurityPolicyError(
            "HTTP redirect requires an HTTP(S) target",
          );
        const response = await this.#fetch(current.href, {
          redirect: "manual",
          signal,
          headers: {
            "User-Agent": "universal-ontology-import-closure/1.0",
            Accept: ACCEPT,
          },
        });
        if (REDIRECTS.has(response.status)) {
          await response.body?.cancel();
          const location = response.headers.get("location");
          if (!location)
            throw new SecurityPolicyError("Redirect has no Location");
          current = new URL(location, current);
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          const failure = new UnloadableImportError(`HTTP ${response.status}`, {
            status: response.status,
            retryAfter: response.headers.get("retry-after"),
          });
          failure.retryable = RETRYABLE.has(response.status);
          throw failure;
        }
        const chunks = [];
        let count = 0;
        const reader = response.body?.getReader();
        if (reader) {
          try {
            for (;;) {
              signal.throwIfAborted();
              const { done, value } = await reader.read();
              if (done) break;
              count += value.byteLength;
              checkBytes(count, config.maxInputBytes);
              chunks.push(Buffer.from(value));
            }
          } catch (error) {
            await reader.cancel().catch(() => {});
            throw error;
          } finally {
            reader.releaseLock();
          }
        }
        return {
          bytes: Buffer.concat(chunks),
          url: current.href,
          contentType: response.headers.get("content-type") ?? undefined,
          fileName: current.pathname.split("/").at(-1),
        };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  async #read(
    documentIRI,
    {
      config = new OWLOntologyLoaderConfiguration(),
      signal = config.signal,
    } = {},
    useMapper = true,
  ) {
    signal?.throwIfAborted();
    const authored = documentIRI.value ?? String(documentIRI);
    const mapped = useMapper
      ? this.#iriMapper?.getDocumentIRI(documentIRI)?.value
      : undefined;
    const candidates = [...new Set([mapped, authored].filter(Boolean))];
    if (authored.startsWith("http:"))
      candidates.push(`https:${authored.slice(5)}`);
    const attempts = [];
    let lastError;
    for (const candidate of candidates) {
      for (let retry = 0; retry <= config.maxRetries; retry += 1) {
        try {
          const result = await this.#attempt(
            new URL(candidate),
            config,
            signal,
          );
          // Decoding and parsing failures must never substitute another document.
          return {
            ...result,
            text: decode(result.bytes, result.contentType),
            authored,
            candidates,
            attempts,
          };
        } catch (error) {
          signal?.throwIfAborted();
          if (
            error instanceof ResourceLimitError ||
            error instanceof SecurityPolicyError ||
            error.reason === "INVALID_ENCODING"
          )
            throw error;
          lastError = error;
          attempts.push({
            url: candidate,
            attempt: retry + 1,
            status: error.status,
            code: error.code,
            message: error.message,
          });
          if (error.retryable === false || retry === config.maxRetries) break;
          try {
            await this.#sleep(retryDelay(error.retryAfter, retry), signal);
          } catch (cause) {
            signal?.throwIfAborted();
            throw cause;
          }
        }
      }
    }
    const Failure =
      lastError?.status === 404 || lastError?.code === "ENOENT"
        ? MissingImportError
        : UnloadableImportError;
    throw new Failure(`Cannot load ontology document: ${authored}`, {
      cause: lastError,
      attempts,
    });
  }

  /** Resolve a managed import and preserve the successfully retrieved document identity. */
  async load(documentIRI, context) {
    const result = await this.#read(documentIRI, context);
    this.#record("import", result);
    return new StringDocumentSource(result.text, {
      documentIRI: result.url,
      fileName: result.fileName,
      contentType: result.contentType,
    });
  }

  /** Acquire catalog text through the same bounded transport, without ontology mapping. */
  async loadCatalogDocument(documentIRI, context) {
    const result = await this.#read(documentIRI, context, false);
    this.#record("catalog", result);
    return result.text;
  }

  /** Load a root from its exact absolute file URL. */
  async loadRootDocument(inputPath, context) {
    const result = await this.#read(
      { value: pathToFileURL(resolve(inputPath)).href },
      context,
      false,
    );
    this.#record("root", result);
    return new StringDocumentSource(result.text, {
      documentIRI: result.url,
      fileName: result.fileName,
    });
  }

  #record(kind, result) {
    this.#onDocument?.({
      kind,
      authored: result.authored,
      candidates: result.candidates,
      failedAttempts: result.attempts,
      resolved: result.url,
      sha256: createHash("sha256").update(result.bytes).digest("hex"),
      bytes: result.bytes.length,
      contentType: result.contentType,
    });
  }
}
