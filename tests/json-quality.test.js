/** UO ownership and generated-output obligations over the installed engine.
 * Grammar, resource controls and built-in boundaries belong to JSON Quality.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openRepositoryJsonSession } from "../scripts/runRepositoryJsonQuality.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const producer = "policy/authorities/iana-media-types.provenance.json";
const retained = "docs/import-closure/registry-artifact-verification.json";
async function checked(directory, options = {}) {
  const session = await openRepositoryJsonSession({
    root: directory,
    ...options,
  });
  const events = []; // Finite fixture metadata only; the repository adapter streams.
  try {
    for await (const event of session.check()) events.push(event);
    return events;
  } finally {
    await session.close();
  }
}

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "uo-json-consumer-"));
  const put = (path, bytes) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), bytes);
  };
  execFileSync("git", ["init", "--quiet", directory], { windowsHide: true });
  for (const path of [
    ".json-quality.json",
    "scripts/runRepositoryJsonQuality.js",
  ])
    put(path, readFileSync(join(root, path)));
  mkdirSync(join(directory, "node_modules/@hadden-industries"), {
    recursive: true,
  });
  symlinkSync(
    join(root, "node_modules/@hadden-industries/json-quality"),
    join(directory, "node_modules/@hadden-industries/json-quality"),
    "junction",
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
      "--ndjson",
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
  return { ...result, events, terminal: events.at(-1) };
}

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

test("selected formatting preserves numeric spelling and producer/retained bytes", () => {
  const f = fixture();
  try {
    const protectedBytes = [producer, retained].map((path) =>
      readFileSync(join(f.directory, path)),
    );
    const result = command(f.directory, "format", [
      "--write",
      "--",
      "authored.json",
    ]);
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

test("normalization repairs an authored source and refuses producer-owned bytes", () => {
  const f = fixture();
  try {
    f.put("authored.json", '{\n  "value": "é"\n}\n');
    expect(
      command(f.directory, "normalize", ["--write", "--", "authored.json"])
        .status,
    ).toBe(0);
    expect(readFileSync(join(f.directory, "authored.json"), "utf8")).toContain(
      '"é"',
    );
    const before = readFileSync(join(f.directory, producer));
    expect(
      command(f.directory, "normalize", ["--write", "--", producer]).status,
    ).toBe(2);
    expect(readFileSync(join(f.directory, producer))).toEqual(before);
  } finally {
    f.close();
  }
});

test("the adapter binds the repository root", () => {
  const f = fixture();
  try {
    expect(command(f.directory, "check", ["--root", root]).status).toBe(2);
  } finally {
    f.close();
  }
});
