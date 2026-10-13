/** Exercise native JSON decisions and repository selection without mocking the tools. */
import { execFileSync, spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  lstatSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tokenize } from "@humanwhocodes/momoa";
import { createHash } from "node:crypto";
import { checkJsonInventory } from "../tooling/json/public-api.mjs";
import { runRepositoryJsonQuality } from "../scripts/runRepositoryJsonQuality.js";
import {
  checkJsonPresentation,
  jsonFormatOptions,
  jsonContract,
  readJsonPolicy,
} from "../tooling/json/public-api.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
// Native config loading and disposable Git I/O need an explicit cold-run budget.
const NATIVE_TOOL_TIMEOUT_MS = 30000;

/** Tokens preserve member/array order, decoded string values and exact numeric lexemes. */
function meaning(text) {
  return tokenize(text).map((token) => {
    const raw = text.slice(token.loc.start.offset, token.loc.end.offset);
    return [token.type, token.type === "String" ? JSON.parse(raw) : raw];
  });
}
const dataPath =
  "packages/universal-ontology-projection-policy/data/field-property-history.v1.json";
const producerPath = "policy/authorities/iana-media-types.provenance.json";
const retainedPath = "docs/import-closure/registry-artifact-verification.json";

/** Exercise the public entry points in a real disposable Git checkout. */
function runCommand(directory, command, args = []) {
  return spawnSync(
    process.execPath,
    [process.env.npm_execpath, "run", command, "--", ...args],
    {
      cwd: directory,
      encoding: "utf8",
      windowsHide: true,
      timeout: NATIVE_TOOL_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
}
test("the native JSON presentation contract remains explicit and strict", async () => {
  expect(await jsonFormatOptions()).toMatchObject({
    parser: "json-stringify",
    tabWidth: 2,
    useTabs: false,
    endOfLine: "lf",
    printWidth: 80,
    trailingComma: "none",
  });
});
test("the isolated archive, provenance and consumer lock identify the same producer", () => {
  const manifest = JSON.parse(
    readFileSync(join(root, "tooling/json/package.json"), "utf8"),
  );
  const dependency =
    manifest.devDependencies["@hadden-industries/json-quality"];
  expect(dependency).toMatch(
    /^file:archives\/hadden-industries-json-quality-.*-[a-f0-9]{40}\.tgz$/u,
  );
  const archive = join(root, "tooling/json", dependency.slice(5));
  const provenance = JSON.parse(
    readFileSync(`${archive}.provenance.json`, "utf8"),
  );
  expect(createHash("sha256").update(readFileSync(archive)).digest("hex")).toBe(
    provenance.sha256,
  );
  expect(dependency).toContain(provenance.sourceCommit);
  expect(provenance.sourceClean).toBe(true);
  const lock = JSON.parse(
    readFileSync(join(root, "tooling/json/package-lock.json"), "utf8"),
  );
  expect(
    lock.packages["node_modules/@hadden-industries/json-quality"].integrity,
  ).toBe(provenance.integrity);
});
test.each([
  dataPath,
  "new.json",
  "ignored/generated.json",
  "dist/generated.jsonld",
])(
  "the installed document boundary rejects BOM bytes at %s without writing",
  async (path) => {
    const { directory, put } = fixture();
    try {
      const bytes = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from("{}\n"),
      ]);
      put(path, bytes);
      const result = await runRepositoryJsonQuality("check", {
        root: directory,
      });
      expect(result.status).toBe("failed");
      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path,
            phase: "bytes",
            messageId: "invalid-utf8-or-bom",
          }),
        ]),
      );
      expect(readFileSync(join(directory, path))).toEqual(bytes);
      const inventory = await runRepositoryJsonQuality("inventory", {
        root: directory,
      });
      expect(inventory.counts.checked).toBe(0);
      expect(
        inventory.documents.find((document) => document.path === path)
          .syntaxValid,
      ).toBeNull();
    } finally {
      rmSync(directory, {
        recursive: true,
      });
    }
  },
);
test("consumer tool configuration cannot weaken installed JSON checking", () => {
  const { directory, put } = fixture();
  try {
    put(
      "eslint.config.js",
      'throw new Error("Consumer configuration must not execute");',
    );
    put(".prettierignore", "**\n");
    put("new.json", '{"x":1,"x":2}');
    const result = runCommand(directory, "lint:json");
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("json/no-duplicate-keys");
    expect(readFileSync(join(directory, "new.json"), "utf8")).toBe(
      '{"x":1,"x":2}',
    );
  } finally {
    rmSync(directory, {
      recursive: true,
    });
  }
});
test.each([
  ['{\r\n  "x": true\r\n}', true],
  ['{\n  "x": true\n}', true],
  ['{\n  "x": true\n}\n', true],
  ['{\n  "x": true\n}  ', false],
  ['{\n  "x":true\n}', false],
])(
  "shared producer-body formatting validates the complete body: %s",
  async (text, valid) => {
    expect(
      await checkJsonPresentation(
        Buffer.from(text),
        "producer-json-body",
        await jsonFormatOptions(),
      ),
    ).toBe(valid);
  },
);
test("aggregate formatting routes reach the sole JSON writer once and node routes exclude JSON", () => {
  const { scripts } = JSON.parse(
    readFileSync(join(root, "package.json"), "utf8"),
  );
  const expand = (name) =>
    scripts[name].replace(/npm run ([a-z:-]+)/gu, (_match, child) =>
      expand(child),
    );
  for (const name of ["format", "fix:all", "fix:code-style"]) {
    const command = expand(name);
    expect(
      command.match(/node scripts\/runRepositoryJsonQuality\.js format\b/gu),
    ).toHaveLength(1);
    expect(command).not.toMatch(/eslint [^&]*\.json[^&]*--fix/u);
  }
  for (const name of ["format:node", "format:node:check"])
    expect(expand(name)).not.toMatch(
      /\*\.(?:json|jsonld|sarif|jsonc|json5|jsonl|ndjson)\b/u,
    );
  expect(scripts["format:node"]).toBe("npm run format:node:files -- --write");
  expect(scripts["format:node:check"]).toBe(
    "npm run format:node:files -- --check",
  );
  expect(expand("check:qualification")).toContain(
    "node scripts/runRepositoryJsonQuality.js check",
  );
});

/** Disposable Git checkout uses the production configs, scripts and installed native binaries. */
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "uo-json-quality-"));
  const put = (path, text) => {
    mkdirSync(dirname(join(directory, path)), {
      recursive: true,
    });
    writeFileSync(join(directory, path), text);
  };
  execFileSync("git", ["init", "--quiet", directory]);
  symlinkSync(
    join(root, "node_modules"),
    join(directory, "node_modules"),
    "junction",
  );
  put(".gitignore", "node_modules/\nignored/\n");
  for (const path of [
    "eslint.config.js",
    ".prettierignore",
    ".prettierrc.json",
    "tooling/json/public-api.mjs",
    "scripts/runRepositoryJsonQuality.js",
  ])
    put(path, readFileSync(join(root, path)));
  mkdirSync(join(directory, "tooling/json"), {
    recursive: true,
  });
  put(
    "tooling/json/package.json",
    readFileSync(join(root, "tooling/json/package.json")),
  );
  symlinkSync(
    join(root, "tooling/json/node_modules"),
    join(directory, "tooling/json/node_modules"),
    "junction",
  );
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  put(
    "package.json",
    `${JSON.stringify(
      {
        name: "json-fixture",
        version: "1.0.0",
        type: "module",
        scripts: manifest.scripts,
      },
      null,
      2,
    )}\n`,
  );
  put(dataPath, '{"b":[-0,1e+03],"a":"é"}');
  put(producerPath, '{\n  "b": 2,\n  "a": 1\n}\n');
  put(retainedPath, '{\n  "retained": true\n}\n');
  const policy = JSON.parse(
    readFileSync(join(root, ".json-quality.json"), "utf8"),
  );
  put(".json-quality.json", `${JSON.stringify(policy, null, 2)}\n`);
  execFileSync("git", ["-C", directory, "add", "."]);
  return {
    directory,
    put,
    policy,
  };
}
test.each(["defaults", "exceptions"])(
  "obsolete lintProfile in %s is rejected by the shared closed policy",
  async (location) => {
    const { directory, put, policy } = fixture();
    try {
      if (location === "defaults") policy.defaults.lintProfile = "data";
      else
        policy.exceptions.push({
          paths: ["new.json"],
          lintProfile: "control",
          owner: "test",
          reason: "Obsolete setting",
        });
      put(".json-quality.json", JSON.stringify(policy));
      await expect(readJsonPolicy(directory)).rejects.toThrow(
        /Invalid JSON policy structure/u,
      );
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
);
test.each([
  ["new/authored.json", '{" bad":"e\\u0301"}', "format:json"],
  ["new/authored.json", '{" bad":"e\\u0301"}', "normalize:json"],
  ["ignored/generated.json", '{"nested":[9007199254740992e0]}', "lint:json"],
  ["dist/generated.jsonld", '{"nested":"\\uffff"}', "lint:json"],
  [retainedPath, '{" ":true}', "lint:json"],
])(
  "default quality gates reject %s through %s without rewriting inputs",
  (path, text, command) => {
    const { directory, put } = fixture();
    try {
      put(path, text);
      const sourceBefore = readFileSync(join(directory, dataPath));
      const result = runCommand(
        directory,
        command,
        command === "normalize:json" ? [path] : [],
      );
      expect(result.status).toBe(command === "normalize:json" ? 2 : 1);
      expect(result.stdout + result.stderr).toMatch(
        /meaningful-keys|no-empty-keys|interoperability|invalid or unsafe/u,
      );
      expect(readFileSync(join(directory, path), "utf8")).toBe(text);
      expect(readFileSync(join(directory, dataPath))).toEqual(sourceBefore);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  NATIVE_TOOL_TIMEOUT_MS,
);
test.each(["/packages", "/packages/~2/", "packages/", ""])(
  "policy rejects a nonliteral/nonempty-key pointer: %s",
  async (pointer) => {
    const { directory, put, policy } = fixture();
    try {
      policy.exceptions[0].allowEmptyKeys = [pointer];
      put(".json-quality.json", JSON.stringify(policy));
      await expect(
        checkJsonInventory({
          root: directory,
        }),
      ).rejects.toThrow(/policy structure/u);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  NATIVE_TOOL_TIMEOUT_MS,
);
test(
  "conflicting empty-key exceptions fail closed while identical overlaps are accepted",
  async () => {
    const { directory, put, policy } = fixture();
    try {
      put("package-lock.json", '{"packages":{"":{}}}');
      const exception = {
        paths: ["package-lock.json"],
        allowEmptyKeys: ["/packages/"],
        owner: "test",
        reason: "Identical intentional empty-key location",
      };
      policy.exceptions.push(exception);
      put(".json-quality.json", JSON.stringify(policy));
      await expect(
        checkJsonInventory({
          root: directory,
        }),
      ).resolves.toBeDefined();
      exception.allowEmptyKeys = ["/elsewhere/"];
      put(".json-quality.json", JSON.stringify(policy));
      await expect(
        checkJsonInventory({
          root: directory,
        }),
      ).rejects.toThrow(/Conflicting JSON exceptions/u);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  NATIVE_TOOL_TIMEOUT_MS,
);
test(
  "inventory covers tracked hidden JSON and protects producer and retained bytes",
  async () => {
    const { directory } = fixture();
    try {
      expect(
        await checkJsonInventory({
          root: directory,
        }),
      ).toEqual({
        discovered: 7,
        tracked: 7,
        writable: 5,
        protected: 2,
      });
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  NATIVE_TOOL_TIMEOUT_MS,
);
test("new untracked JSON is checked and formatted without a policy entry or staging", () => {
  const { directory, put } = fixture();
  try {
    const path = "new/authored.json";
    put(path, '{"new":[-0,1e+03]}');
    const ignoreBefore = readFileSync(join(directory, ".prettierignore"));
    const direct = spawnSync(
      process.execPath,
      [
        fileURLToPath(import.meta.resolve("prettier/bin/prettier.cjs")),
        "--write",
        path,
      ],
      {
        cwd: directory,
        encoding: "utf8",
        windowsHide: true,
      },
    );
    expect(direct.status).toBe(0);
    expect(readFileSync(join(directory, path), "utf8")).toBe(
      '{"new":[-0,1e+03]}',
    );
    const formatted = runCommand(directory, "format:json");
    if (formatted.status !== 0)
      throw new Error(formatted.stdout + formatted.stderr);
    expect(formatted.status).toBe(0);
    expect(readFileSync(join(directory, path), "utf8")).toBe(
      '{\n  "new": [\n    -0,\n    1e+03\n  ]\n}\n',
    );
    expect(readFileSync(join(directory, ".prettierignore"))).toEqual(
      ignoreBefore,
    );
    const check = runCommand(directory, "check:json");
    expect(
      readdirSync(directory).filter((name) =>
        name.startsWith(".json-quality-write-"),
      ),
    ).toEqual([]);
    expect(check.status).toBe(0);
    expect(check.stdout).toContain("8 physical files");
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}, 60000);
test("explicit source normalization repairs untracked JSON and preserves protected bytes", () => {
  const { directory, put } = fixture();
  try {
    const path = "new/source.json";
    put(path, '{"e\\u0301":"e\\u0301","n":1e+03}');
    const protectedBefore = readFileSync(join(directory, producerPath));
    const first = runCommand(directory, "normalize:json", [path]);
    if (first.status !== 0) throw new Error(first.stdout + first.stderr);
    expect(readFileSync(join(directory, path), "utf8")).toBe(
      '{"é":"é","n":1e+03}',
    );
    expect(readFileSync(join(directory, producerPath))).toEqual(
      protectedBefore,
    );
    const second = runCommand(directory, "normalize:json", [path]);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain("0 written");
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}, 60000);
test("a collision in the final selected source prevents every source write", () => {
  const { directory, put } = fixture();
  try {
    put("first.json", '{"x":"e\\u0301"}');
    put("last.json", '{"e\\u0301":1,"é":2}');
    const before = readFileSync(join(directory, "first.json"));
    const result = runCommand(directory, "normalize:json", [
      "first.json",
      "last.json",
    ]);
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/duplicate keys/);
    expect(readFileSync(join(directory, "first.json"))).toEqual(before);
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}, 60000);
test.each(
  [
    [],
    [producerPath],
    ["ignored/new.json"],
    ["missing.json"],
    ["new.json", "new.json"],
  ].map((paths) => [paths]),
)(
  "normalization refuses absent, protected or ambiguous source selection: %j",
  (paths) => {
    const { directory, put } = fixture();
    try {
      put("new.json", '{"x":"e\\u0301"}');
      put("ignored/new.json", '{"x":"e\\u0301"}');
      const before = readFileSync(join(directory, "new.json"));
      const result = runCommand(directory, "normalize:json", paths);
      expect(result.status).toBe(2);
      expect(readFileSync(join(directory, "new.json"))).toEqual(before);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  60000,
);
test.each(["format:json", "normalize:json"])(
  "unrelated protected NFC failure blocks %s before writes",
  (command) => {
    const { directory, put } = fixture();
    try {
      put("new.json", '{"x":"e\\u0301"}');
      put(producerPath, '{\n  "x": "e\\u0301"\n}\n');
      const before = readFileSync(join(directory, "new.json"));
      const result = runCommand(
        directory,
        command,
        command === "normalize:json" ? ["new.json"] : [],
      );
      expect(result.status).toBe(1);
      expect(readFileSync(join(directory, "new.json"))).toEqual(before);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  60000,
);
test.each([
  ['{"e\u0301":"e\u0301"}', 0],
  ['{"x":1,"\\u0078":2}', 1],
  ['{"x":1e400}', 1],
])(
  "explicit preservation permits exact strings while retaining native checks: %s",
  (text, status) => {
    const { directory, put, policy } = fixture();
    try {
      const path = "retained.json";
      policy.exceptions.push({
        paths: [path],
        normalization: "preserve",
        allowFormatWrites: false,
        formatContract: "producer-json-compact",
        owner: "test producer",
        reason: "Exact externally defined string identity",
      });
      put(".json-quality.json", `${JSON.stringify(policy, null, 2)}\n`);
      put(dataPath, '{\n  "b": [\n    -0,\n    1e+03\n  ],\n  "a": "é"\n}\n');
      put(path, `${text}\n`);
      const before = readFileSync(join(directory, path));
      const check = runCommand(directory, "check:json");
      expect(check.status).toBe(status);
      expect(runCommand(directory, "normalize:json", [path]).status).toBe(2);
      expect(readFileSync(join(directory, path))).toEqual(before);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  60000,
);
test(
  "preservation exceptions cannot retain generic write permission",
  async () => {
    const { directory, put, policy } = fixture();
    try {
      policy.exceptions.push({
        paths: ["retained.json"],
        normalization: "preserve",
        owner: "test",
        reason: "Exact identity",
      });
      put(".json-quality.json", `${JSON.stringify(policy, null, 2)}\n`);
      await expect(
        checkJsonInventory({
          root: directory,
        }),
      ).rejects.toThrow(/prohibit generic writes/);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  NATIVE_TOOL_TIMEOUT_MS,
);
test.each(["untracked", "staged", "ignored", "ignored-tracked"])(
  "ordinary %s JSON is automatically included without policy edits",
  async (state) => {
    const { directory, put } = fixture();
    try {
      const path = state.startsWith("ignored")
        ? "ignored/new file é.json"
        : "new file é.json";
      put(path, '{"x":1,"x":2}');
      if (state === "staged" || state === "ignored-tracked")
        execFileSync("git", ["-C", directory, "add", "-f", "--", path]);
      const inventory = await checkJsonInventory({
        root: directory,
      });
      expect(inventory.discovered).toBe(8);
      expect(inventory.writable).toBe(state === "ignored" ? 5 : 6);
      expect(runCommand(directory, "lint:json").status).toBe(1);
      put(path, '{\n  "x": 1\n}\n');
      expect(runCommand(directory, "lint:json").status).toBe(0);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  60000,
);
test.each([".sdlc/runtime/state.json", "nested/node_modules/owned.json"])(
  "an external boundary never conceals tracked JSON: %s",
  async (path) => {
    const { directory, put } = fixture();
    try {
      put(path, '{"x":1,"x":2}');
      expect(
        (
          await checkJsonInventory({
            root: directory,
          })
        ).discovered,
      ).toBe(7);
      execFileSync("git", ["-C", directory, "add", "-f", "--", path]);
      const tracked = await checkJsonInventory({
        root: directory,
      });
      expect(tracked.discovered).toBe(8);
      expect(tracked.writable).toBe(5);
      expect(runCommand(directory, "lint:json").status).toBe(1);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  60000,
);
test("ignored generated JSON-LD is checked with its producer contract and cannot be rewritten", async () => {
  const { directory, put } = fixture();
  try {
    put(".gitignore", "node_modules/\ndist/\n");
    const path = "dist/generated.jsonld";
    // json-identity-contract: bytes; owner: JSON write-protection tests; reason: Generic formatting must retain the exact generated product.
    const generated = `${JSON.stringify(
      {
        "@graph": [
          {
            "@id": "urn:test",
          },
        ],
      },
      null,
      2,
    )}\n`;
    put(path, generated);
    put("dist/query/v1/catalog.json", "{}\n");
    expect(
      (
        await runRepositoryJsonQuality("inventory", {
          root: directory,
          requireGenerated: true,
        })
      ).documents.filter((document) => !document.contract.allowFormatWrites)
        .length,
    ).toBe(4);
    expect(runCommand(directory, "format:json").status).toBe(0);
    expect(readFileSync(join(directory, path), "utf8")).toBe(generated);
    const authoredBefore = readFileSync(join(directory, dataPath));
    put(path, '{"@id":"first","@id":"second"}');
    expect(runCommand(directory, "format:json").status).toBe(1);
    expect(readFileSync(join(directory, dataPath))).toEqual(authoredBefore);
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}, 60000);
test(
  "the post-generation gate rejects an absent generated corpus",
  async () => {
    const { directory } = fixture();
    try {
      await expect(
        runRepositoryJsonQuality("inventory", {
          root: directory,
          requireGenerated: true,
        }),
      ).rejects.toThrow(/generated JSON/);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  NATIVE_TOOL_TIMEOUT_MS,
);
test.each([
  ["producer-json-indent", '{\n  "x": [\n    1,\n    2\n  ]\n}\n', true],
  ["producer-json-indent", '{"x":[1,2]}\n', false],
  ["producer-json-indent-body", '{\r\n  "x": true\r\n}\r\n', true],
  ["producer-json-compact", '{"x":true}\n', true],
  ["producer-json-compact", '{"x":true}', false],
])(
  "native producer serialization is checked exactly: %s",
  async (contract, text, valid) => {
    expect(
      await checkJsonPresentation(
        Buffer.from(text),
        contract,
        await jsonFormatOptions(),
      ),
    ).toBe(valid);
  },
);
test("native formatting preserves every protected file in a complete corpus copy", () => {
  const { directory, put } = fixture();
  try {
    const policy = JSON.parse(
      readFileSync(join(root, ".json-quality.json"), "utf8"),
    );
    const files = execFileSync("git", ["-C", root, "ls-files", "-z"], {
      encoding: "utf8",
    })
      .split("\0")
      .filter((path) => path.endsWith(".json"))
      .map((path) =>
        jsonContract(path, policy, {
          tracked: true,
        }),
      );
    for (const file of files)
      put(file.path, readFileSync(join(root, file.path)));
    put(dataPath, '{"b":[-0,1e+03,1.0],"a":"\\u0061"}');
    const protectedFiles = files.filter((file) => !file.allowFormatWrites);
    expect(protectedFiles.map((file) => file.path)).toEqual(
      expect.arrayContaining([producerPath, retainedPath, "package-lock.json"]),
    );
    const before = protectedFiles.map((file) =>
      readFileSync(join(directory, file.path)),
    );
    const authoredBefore = readFileSync(join(directory, dataPath), "utf8");
    execFileSync("git", ["-C", directory, "add", "."]);
    const result = runCommand(directory, "format:json");
    expect(result.status).toBe(0);
    for (const [index, file] of protectedFiles.entries())
      expect(readFileSync(join(directory, file.path))).toEqual(before[index]);
    const authoredAfter = readFileSync(join(directory, dataPath), "utf8");
    expect(authoredAfter).not.toBe(authoredBefore);
    expect(meaning(authoredAfter)).toEqual(meaning(authoredBefore));
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}, 60000);
test.each([
  "duplicate",
  "conflict",
  "dialect",
  "outside",
  "missing",
  "case-collision",
])(
  "inventory fails closed for %s",
  async (scenario) => {
    const { directory, put, policy } = fixture();
    try {
      if (scenario === "duplicate")
        policy.exceptions.push(policy.exceptions[0]);
      if (scenario === "conflict")
        policy.exceptions.push(
          {
            paths: ["package.json"],
            formatContract: "producer-json-compact",
            owner: "test",
            reason: "Conflicting producer presentation override",
          },
          {
            paths: ["package.json"],
            formatContract: "producer-json-body",
            owner: "test",
            reason: "Second contradictory presentation override",
          },
        );
      if (scenario === "dialect") {
        put("new.jsonc", "{}");
        execFileSync("git", ["-C", directory, "add", "new.jsonc"]);
      }
      if (scenario === "outside")
        policy.exceptions.push({
          paths: ["../outside.json"],
          allowFormatWrites: false,
          owner: "test",
          reason: "Invalid outside path",
        });
      if (scenario === "missing") rmSync(join(directory, dataPath));
      if (scenario === "case-collision")
        execFileSync("git", [
          "-C",
          directory,
          "update-index",
          "--add",
          "--cacheinfo",
          `100644,${execFileSync(
            "git",
            ["-C", directory, "rev-parse", ":package.json"],
            {
              encoding: "utf8",
            },
          ).trim()},PACKAGE.JSON`,
        ]);
      put(".json-quality.json", JSON.stringify(policy));
      await expect(
        checkJsonInventory({
          root: directory,
        }),
      ).rejects.toThrow();
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  NATIVE_TOOL_TIMEOUT_MS,
);
test(
  "symlinked JSON ancestor is refused before formatting",
  async () => {
    const { directory } = fixture();
    const target = mkdtempSync(join(tmpdir(), "uo-json-symlink-target-"));
    try {
      writeFileSync(join(target, "field-property-history.v1.json"), "{}");
      rmSync(join(directory, dirname(dataPath)), {
        recursive: true,
      });
      symlinkSync(target, join(directory, dirname(dataPath)), "junction");
      expect(
        lstatSync(join(directory, dirname(dataPath))).isSymbolicLink(),
      ).toBe(true);
      await expect(
        checkJsonInventory({
          root: directory,
        }),
      ).rejects.toThrow(/Nonregular/);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
      rmSync(target, {
        recursive: true,
        force: true,
      });
    }
  },
  NATIVE_TOOL_TIMEOUT_MS,
);
test.each([
  ['{"retained":true,"retained":false}', "lint:json", 1],
  ["{/* invalid retained input */}", "lint:json", 1],
  ['{"retained":true}', "format:json:check", 1],
  ['{"retained":true}', "format:json", 1],
  ['{\r\n  "retained": true\r\n}', "check:json", 0],
])(
  "retained JSON receives full read-only validation: %s",
  (text, command, status) => {
    const { directory, put, policy } = fixture();
    try {
      // Qualify the same producer body contract used by the retained Oxigraph notice.
      policy.exceptions.push({
        paths: [retainedPath],
        formatContract: "producer-json-body",
        owner: "test notice producer",
        reason: "Qualified upstream byte envelope",
      });
      put(".json-quality.json", `${JSON.stringify(policy, null, 2)}\n`);
      put(dataPath, '{\n  "b": [\n    -0,\n    1e+03\n  ],\n  "a": "é"\n}\n');
      put(retainedPath, text);
      const before = readFileSync(join(directory, retainedPath));
      const result = runCommand(directory, command);
      expect(result.status).toBe(status);
      expect(readFileSync(join(directory, retainedPath))).toEqual(before);
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  60000,
);
test.each([false, true])(
  "supported native fix is scoped, idempotent and preflights the whole corpus (invalid=%s)",
  (invalid) => {
    const { directory, put } = fixture();
    try {
      if (invalid) put(dataPath, '{"a":1,"a":2}');
      const before = [dataPath, producerPath, retainedPath].map((path) =>
        readFileSync(join(directory, path)),
      );
      const run = () => runCommand(directory, "format:json");
      const result = run();
      expect(result.status).toBe(invalid ? 1 : 0);
      expect(readFileSync(join(directory, producerPath))).toEqual(before[1]);
      expect(readFileSync(join(directory, retainedPath))).toEqual(before[2]);
      const after = readFileSync(join(directory, dataPath));
      if (invalid) expect(after).toEqual(before[0]);
      else {
        expect(meaning(after.toString())).toEqual(
          meaning(before[0].toString()),
        );
        expect(run().status).toBe(0);
        expect(readFileSync(join(directory, dataPath))).toEqual(after);
      }
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      });
    }
  },
  60000,
);
