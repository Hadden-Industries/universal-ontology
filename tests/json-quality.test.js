/** Consumer-specific cohort-2 responsibilities over the real isolated engine.
 * Shared grammar/NFC/number/resource conformance stays with JSON Quality's
 * independent core corpus; this suite proves UO discovery, effects and delivery.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  cpSync,
  rmSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openRepositoryJsonSession } from "../scripts/runRepositoryJsonQuality.js";
import {
  validateJsonQualityEvent,
  verifyJsonQualityInstallation,
} from "../tooling/json/public-api.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const producer = "policy/authorities/iana-media-types.provenance.json";
const retained = "docs/import-closure/registry-artifact-verification.json";
// Native work owns its finite deadline; the outer harness also allows cleanup.
const jsonRuntimeControls = JSON.parse(
  readFileSync(join(root, ".json-quality.json"), "utf8"),
).runtimeControls;

async function checked(directory, options = {}) {
  const session = await openRepositoryJsonSession({
    root: directory,
    ...options,
  });
  const events = []; // Finite fixture metadata only; the repository adapter streams.
  try {
    for await (const event of session.events()) {
      expect(validateJsonQualityEvent(event)).toBe(true);
      events.push(event);
    }
    return events;
  } finally {
    await session.close();
  }
}

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "uo-json-cohort2-"));
  const put = (path, bytes) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), bytes);
  };
  execFileSync("git", ["init", "--quiet", directory], { windowsHide: true });
  for (const path of [
    ".json-quality.json",
    "tooling/json/public-api.mjs",
    "scripts/runRepositoryJsonQuality.js",
  ])
    put(path, readFileSync(join(root, path)));
  cpSync(
    join(root, "tooling/json/node_modules"),
    join(directory, "tooling/json/node_modules"),
    { recursive: true, dereference: true },
  );
  put(".gitignore", "node_modules/\nignored/\n");
  put(
    "package.json",
    '{\n  "name": "uo-json-fixture",\n  "type": "module"\n}\n',
  );
  put("authored.json", '{"value":1.00e+2}');
  put(producer, '{\n  "producer": true\n}\n');
  put(retained, '{\n  "retained": true\n}\n');
  return {
    directory,
    put,
    close: () =>
      rmSync(directory, { recursive: true, force: true, maxRetries: 10 }),
  };
}

function command(directory, operation, args = []) {
  const result = spawnSync(
    process.execPath,
    [
      join(directory, "scripts/runRepositoryJsonQuality.js"),
      operation,
      "--json",
      ...args,
    ],
    {
      cwd: directory,
      windowsHide: true,
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  const events = result.stdout
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  for (const event of events)
    expect(validateJsonQualityEvent(event)).toBe(true);
  return { ...result, events, terminal: events.at(-1) };
}

test(
  "the actual source census ends with complete cohort-2 evidence",
  async () => {
    // A census consumes events, not retained values for later access or rewriting.
    const events = await checked(root, { retainValues: false });
    expect(events.at(-1)).toMatchObject({
      type: "execution-terminal",
      schemaVersion: 2,
      inventoryComplete: true,
      sourceObservationsComplete: true,
      diagnosticsComplete: true,
      qualityPassed: true,
      contractSatisfied: true,
    });
  },
  2 * jsonRuntimeControls.maxCheckTimeMs,
);

test("the exact native installation, lock and generated bootstrap agree", async () => {
  const result = await verifyJsonQualityInstallation({
    toolingRoot: join(root, "tooling/json"),
    bootstrapPath: join(root, "scripts/installRepositoryQualityTools.mjs"),
  });
  expect(result.files).toBeGreaterThan(0);
});

test("required generated products remain an additive obligation", async () => {
  const f = fixture();
  try {
    await expect(
      checked(f.directory, { requireGenerated: true }),
    ).rejects.toThrow(/required|output/iu);
    f.put("authored.json", '{\n  "value": 1\n}\n');
    f.put("dist/generated.jsonld", "{}\n");
    f.put("dist/query/v1/catalog.json", "{}\n");
    const events = await checked(f.directory, { requireGenerated: true });
    expect(events.at(-1).contractSatisfied).toBe(true);
    expect(
      events.some((event) => event.path === "dist/query/v1/catalog.json"),
    ).toBe(true);
  } finally {
    f.close();
  }
});

test.each([
  "new.json",
  "ignored/generated.json",
  "dist/generated.jsonld",
  retained,
])("BOM rejection reaches %s without writing its bytes", async (path) => {
  const f = fixture();
  try {
    const bytes = Buffer.concat([
      Buffer.from([239, 187, 191]),
      Buffer.from("{}\n"),
    ]);
    f.put(path, bytes);
    const events = await checked(f.directory);
    expect(
      events.some(
        (event) =>
          event.type === "finding" &&
          event.path === path &&
          event.messageId === "invalid-utf8-or-bom",
      ),
    ).toBe(true);
    expect(events.at(-1).contractSatisfied).toBe(false);
    expect(readFileSync(join(f.directory, path))).toEqual(bytes);
  } finally {
    f.close();
  }
});

test("selected formatting preserves numeric spelling and producer/retained bytes", () => {
  const f = fixture();
  try {
    const protectedBytes = [producer, retained].map((path) =>
      readFileSync(join(f.directory, path)),
    );
    const result = command(f.directory, "format", ["--", "authored.json"]);
    expect(result.status).toBe(0);
    expect(result.terminal.type).toBe("write-terminal");
    expect(readFileSync(join(f.directory, "authored.json"), "utf8")).toContain(
      "1.00e+2",
    );
    for (const [index, path] of [producer, retained].entries())
      expect(readFileSync(join(f.directory, path))).toEqual(
        protectedBytes[index],
      );
  } finally {
    f.close();
  }
});

test("capacity bypass preserves quality rules and final completion evidence", () => {
  const f = fixture();
  try {
    f.put("bad.json", '{" ":true}');
    const result = command(f.directory, "check", ["--no-capacity-limits"]);
    expect(result.status).toBe(1);
    expect(result.terminal).toMatchObject({
      type: "execution-terminal",
      contractSatisfied: false,
    });
    expect(
      result.events.some(
        (event) => event.type === "finding" && event.path === "bad.json",
      ),
    ).toBe(true);
  } finally {
    f.close();
  }
});

test("normalization requires the literal source and refuses a final key collision", () => {
  const f = fixture();
  try {
    f.put("authored.json", '{\n  "value": "é"\n}\n');
    expect(
      command(f.directory, "normalize", ["--", "authored.json"]).status,
    ).toBe(0);
    expect(readFileSync(join(f.directory, "authored.json"), "utf8")).toContain(
      '"é"',
    );
    f.put("authored.json", '{"é":1,"é":2}');
    const before = readFileSync(join(f.directory, "authored.json"));
    expect(
      command(f.directory, "normalize", ["--", "authored.json"]).status,
    ).toBe(2);
    expect(readFileSync(join(f.directory, "authored.json"))).toEqual(before);
  } finally {
    f.close();
  }
});

test("consumer tool configuration cannot execute or suppress installed source rules", async () => {
  const f = fixture();
  try {
    f.put(
      "eslint.config.js",
      'throw new Error("Consumer configuration executed");',
    );
    f.put(".prettierignore", "**\n");
    f.put("bad.json", '{"x":1,"x":2}');
    const events = await checked(f.directory);
    expect(
      events.some(
        (event) =>
          event.messageId === "duplicateKey" && event.path === "bad.json",
      ),
    ).toBe(true);
  } finally {
    f.close();
  }
});

test("the CLI cannot redirect the repository root or select retired partial scopes", () => {
  const f = fixture();
  try {
    expect(command(f.directory, "check", ["--root", root]).status).toBe(2);
    expect(command(f.directory, "check", ["--scope", "protected"]).status).toBe(
      2,
    );
    expect(command(f.directory, "inventory").status).toBe(2);
  } finally {
    f.close();
  }
});

test("a repository-indexed JSON file cannot hide below an external tree boundary", async () => {
  const f = fixture();
  try {
    const path = "nested/node_modules/owned.json";
    f.put(path, '{"key":1,"key":2}');
    execFileSync("git", ["-C", f.directory, "add", "-f", "--", path], {
      windowsHide: true,
    });
    const events = await checked(f.directory);
    expect(
      events.some(
        (event) =>
          event.type === "finding" &&
          event.path === path &&
          event.messageId === "duplicateKey",
      ),
    ).toBe(true);
    const before = readFileSync(join(f.directory, path));
    expect(command(f.directory, "format", ["--", path]).status).toBe(2);
    expect(readFileSync(join(f.directory, path))).toEqual(before);
  } finally {
    f.close();
  }
});
