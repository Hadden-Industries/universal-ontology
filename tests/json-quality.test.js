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
import * as prettier from "prettier";
import { ESLint } from "eslint";
import { checkJsonInventory } from "../scripts/checkJsonInventory.js";
import {
  checkJsonPresentation,
  jsonFormatOptions,
  jsonContract,
  jsonLintConfig,
  normalizeJsonSource,
  isStrictJsonPath,
  JSON_SUFFIX,
  STRICT_JSON_GLOBS,
  readJsonPolicy,
} from "../scripts/jsonQuality.js";

const root = fileURLToPath(new URL("../", import.meta.url));
// Native config loading and disposable Git I/O need an explicit cold-run budget.
const NATIVE_TOOL_TIMEOUT_MS = 30000;
const eslint = fileURLToPath(
  new URL("../node_modules/eslint/bin/eslint.js", import.meta.url),
);

test.each([
  ["new/data.json", true, true],
  ["dist/ontology.jsonld", true, true],
  ["reports/result.sarif", true, true],
  [".json", true, true],
  ["new/data.jsonc", true, false],
  ["new/data.json5", true, false],
  ["new/data.jsonl", true, false],
  ["new/data.ndjson", true, false],
  ["new/data.JSON", true, false],
  ["new/data.json.txt", false, false],
])(
  "JSON discovery and strict qualification agree for %s",
  (path, discovered, strict) => {
    expect(JSON_SUFFIX.test(path)).toBe(discovered);
    expect(isStrictJsonPath(path)).toBe(strict);
  },
);

test("native lint and formatting select the supported strict extensions", () => {
  expect(STRICT_JSON_GLOBS).toEqual(["**/*.json", "**/*.jsonld", "**/*.sarif"]);
});

test("bundle metadata inherits its producer presentation instead of policy defaults", async () => {
  const policy = await readJsonPolicy();
  const contract = jsonContract(
    "dist/release-work/universal-ontology-mcp-application-bundle.json",
    policy,
  );
  expect(contract.formatContract).toBe("producer-json-indent");
  const options = await jsonFormatOptions();
  const bytes = Buffer.from('{\n  "probe": -0\n}\n');
  expect(
    await checkJsonPresentation(bytes, policy.defaults.formatContract, options),
  ).toBe(true);
  expect(
    await checkJsonPresentation(bytes, contract.formatContract, options),
  ).toBe(false);
});

function lint(text, name = "package.json") {
  return spawnSync(
    process.execPath,
    [eslint, "--stdin", "--stdin-filename", name, "--format", "json"],
    {
      cwd: root,
      input: text,
      encoding: "utf8",
      windowsHide: true,
    },
  );
}

test("native strict JSON rejects duplicate keys before any formatting", () => {
  const result = lint('{"name":"first","name":"second"}');
  expect(result.status).toBe(1);
  expect(
    JSON.parse(result.stdout)[0].messages.map((message) => message.ruleId),
  ).toContain("json/no-duplicate-keys");
});

test.each(['{"a":1,"\\u0061":2}', '{"nested":{"x":0,"x":1}}'])(
  "decoded and nested duplicates fail: %s",
  (text) => {
    const result = lint(text);
    expect(result.status).toBe(1);
    expect(
      JSON.parse(result.stdout)[0].messages.some(
        (message) => message.ruleId === "json/no-duplicate-keys",
      ),
    ).toBe(true);
  },
);

test.each([
  '{/* comment */"x":1}',
  '{"x":1,}',
  "{'x':1}",
  "{x:1}",
  "{} false",
  "NaN",
  "01",
])("strict dialect rejects %s", (text) => {
  const result = lint(text);
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stdout)[0].fatalErrorCount).toBeGreaterThan(0);
});

test.each([
  "9007199254740992",
  "-9007199254740992",
  "1e400",
  "1e-400",
  "5e-324",
  '"\\ud800"',
  '"\\udfff"',
])("native interoperability rejects %s", (text) => {
  const result = lint(text);
  expect(result.status).toBe(1);
  expect(
    JSON.parse(result.stdout)[0].messages.some(
      (message) => message.ruleId === "json/no-unsafe-values",
    ),
  ).toBe(true);
});

test.each([
  "9007199254740991",
  "-9007199254740991",
  "-0",
  "1e+03",
  "0.123456789012345678901",
  "2.2250738585072014e-308",
  '"\\ud83d\\ude00"',
  "null",
  "false",
  '""',
  "[]",
  "{}",
])("valid scalar, empty value and qualified number passes: %s", (text) => {
  expect(lint(text).status).toBe(0);
});

// The real native config is cached across lexical vectors; CLI tests below
// separately prove repository discovery and writer refusal.
const qualityLinter = new ESLint({ cwd: root });
async function qualityMessages(text, path = "new/data.json") {
  const [result] = await qualityLinter.lintText(text, { filePath: path });
  return result.messages;
}

test.each([
  '{"":0}',
  '{" ":0}',
  '{"\\t\\n":0}',
  '{"\\u00a0":0}',
  '{" key":0}',
  '{"key ":0}',
  '{"\\u00a0key":0}',
  '[{"nested":{"key\\t":0}}]',
])("meaningful keys reject decoded empty/edge whitespace: %s", async (text) => {
  expect(await qualityMessages(text)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        ruleId: expect.stringMatching(/(?:no-empty-keys|meaningful-keys)$/u),
      }),
    ]),
  );
});

test.each([
  ['{"packages":{"":{}}}', "package-lock.json", true],
  ['{"packages":{"\\u0000":{}}}', "package-lock.json", true],
  ['{"packages":{"":{}}}', "nested/package-lock.json", true],
  ['{"packages":{"":{}}}', "new/data.json", false],
  ['{"packages":{"":{}}}', "new/package.json", false],
  ['{"":0,"packages":{"":{}}}', "package-lock.json", false],
  ['{"packages":{" ":{}}}', "package-lock.json", false],
  ['{"packages":{"":{"":0}}}', "package-lock.json", false],
  ['{"nested":{"packages":{"":{}}}}', "package-lock.json", false],
  ['{"packages":[{"":{}}]}', "package-lock.json", false],
  ['{"packages":{"":"e\\u0301"}}', "package-lock.json", false],
  ['{"packages":{"":0,"":1}}', "package-lock.json", false],
  ['{"packages":{"":{}," bad":0}}', "package-lock.json", false],
])(
  "lockfile exception is pointer-scoped: %s (%s)",
  async (text, path, valid) => {
    expect((await qualityMessages(text, path)).length === 0).toBe(valid);
  },
);

test("pointer exceptions escape keys and retain array indices without weakening other rules", async () => {
  const linter = new ESLint({
    overrideConfigFile: true,
    overrideConfig: jsonLintConfig([
      {
        path: "source.json",
        allowEmptyKeys: ["/a~1b/~0/0/"],
        normalization: "preserve",
      },
    ]),
  });
  const check = async (text) =>
    (await linter.lintText(text, { filePath: "source.json" }))[0];
  expect((await check('{"a/b":{"~":[{"":"e\\u0301"}]}}')).errorCount).toBe(0);
  expect((await check('{"a/b":{"~":[{}, {"":0}]}}')).errorCount).toBe(1);
  expect((await check('{"a/b":{"~":[{" ":0}]}}')).errorCount).toBe(1);
  expect((await check('{"a/b":{"~":[{"":"\\uffff"}]}}')).errorCount).toBe(1);
});

test.each([
  "9007199254740992.0",
  "-9007199254740992.000",
  "9007199254740993e0",
  "9.007199254740992e15",
  "90071992547409920e-1",
  "9007199254740992.00000000000000000001e20",
  "1e20",
  "1.7976931348623157e308",
])("exact integral values outside the safe range fail: %s", async (text) => {
  expect(await qualityMessages(text)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        ruleId: "uo-json/interoperability",
        messageId: "integer",
      }),
    ]),
  );
});

test.each([
  "9007199254740991.0",
  "-9.007199254740991e15",
  "90071992547409910e-1",
  "0.1",
  "9007199254740991.1",
  "9007199254740992.1",
  "9007199254740993e-1",
  "0e999999999999999999999999",
  "-0.000e-9999999999999999999999",
  "1.00000000000000000000000000000001",
  "1e+0000000000000000000000000",
  '{"key with interior spaces":"  preserved value  ","empty":""}',
])(
  "valid spellings and ordinary fractional precision remain accepted: %s",
  async (text) => {
    expect(await qualityMessages(text)).toEqual([]);
  },
);

test.each([
  0xfdd0,
  0xfdef,
  ...Array.from(
    { length: 34 },
    (_, index) => Math.floor(index / 2) * 0x10000 + 0xfffe + (index % 2),
  ),
])(
  "Unicode noncharacter U+%s fails directly and after escape decoding",
  async (point) => {
    const character = String.fromCodePoint(point);
    const escaped =
      [...character].length === 1 && point <= 0xffff
        ? `\\u${point.toString(16).padStart(4, "0")}`
        : `\\u${character.charCodeAt(0).toString(16)}\\u${character.charCodeAt(1).toString(16)}`;
    for (const text of [
      JSON.stringify(character),
      `"${escaped}"`,
      `{"${escaped}":0}`,
      `[{"nested":"${escaped}"}]`,
    ])
      expect(await qualityMessages(text)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ruleId: "uo-json/interoperability",
            messageId: "noncharacter",
          }),
        ]),
      );
  },
);

test("valid supplementary characters and boundaries remain accepted", async () => {
  expect(
    await qualityMessages(
      JSON.stringify([
        "😀",
        "中文",
        "العربية",
        "\ufdcf",
        "\ufdf0",
        "\ufffd",
        String.fromCodePoint(0x10fffd),
      ]),
    ),
  ).toEqual([]);
});

test("numeric spellings agree with an independent BigInt boundary oracle", async () => {
  for (const value of [
    9007199254740989n,
    9007199254740991n,
    9007199254740992n,
    9007199254740993n,
    9007199254741000n,
  ])
    for (const signed of [value, -value])
      for (const text of [`${signed}.000`, `${signed}00e-2`, `${signed}e+0`]) {
        const messages = await qualityMessages(text);
        expect(messages.some(({ messageId }) => messageId === "integer")).toBe(
          signed > 9007199254740991n || signed < -9007199254740991n,
        );
      }
});

test("opinionated rules expose no automatic native fix", async () => {
  const text = '{" bad":9007199254740992e0,"":"\\uffff"}';
  const linter = new ESLint({ cwd: root, fix: true });
  const [result] = await linter.lintText(text, { filePath: "new/data.json" });
  expect(result.output).toBeUndefined();
  expect(result.errorCount).toBe(4);
});

test("source/producer NFC preflight retains the complete quality contract", async () => {
  await expect(
    normalizeJsonSource('{"packages":{"":"e\\u0301"}}', {
      allowEmptyKeys: ["/packages/"],
    }),
  ).resolves.toBe('{"packages":{"":"é"}}');
  for (const text of [
    '{" bad":"e\\u0301"}',
    '{"":"e\\u0301"}',
    '{"key":"\\uffff"}',
    "9007199254740992e0",
  ])
    await expect(normalizeJsonSource(text)).rejects.toThrow(
      /invalid or unsafe/u,
    );
});

test.each([
  ['{"e\\u0301":1}', "package.json"],
  ['{"e\\u0301":1}', "new/data.json"],
  ['{"key":"e\\u0301"}', "new/data.json"],
  ['["é", {"nested":["e\\u0301"]}]', "new/data.json"],
  ['"e\\u0301"', "new/data.json"],
  ['{"key":"e\\u0301"}', "new/data.jsonld"],
])("NFC applies to every decoded key and value: %s (%s)", (text, path) => {
  const result = lint(text, path);
  expect(result.status).toBe(1);
  expect(
    JSON.parse(result.stdout)[0].messages.some(
      (message) => message.ruleId === "uo-json/normalized-strings",
    ),
  ).toBe(true);
});

test("native ESLint fix cannot mutate non-NFC JSON or collide its keys", () => {
  const text = '{"e\\u0301":1,"é":2}';
  const result = spawnSync(
    process.execPath,
    [
      eslint,
      "--stdin",
      "--stdin-filename",
      "new.json",
      "--fix-dry-run",
      "--format",
      "json",
    ],
    { cwd: root, input: text, encoding: "utf8", windowsHide: true },
  );
  const [report] = JSON.parse(result.stdout);
  expect(result.status).toBe(1);
  expect(report.output).toBeUndefined();
  expect(
    report.messages.some((message) => message.messageId === "collision"),
  ).toBe(true);
});

test("source/producer normalization preserves all non-string tokens and is idempotent", async () => {
  const source =
    '{"2":2,"1":1,"n":[-0,1e+03,1.0,0.123456789012345678901],"plain":"\\u0061","e\\u0301":"e\\u0301"}\r\n';
  const output = await normalizeJsonSource(source);
  expect(output).toBe(
    '{"2":2,"1":1,"n":[-0,1e+03,1.0,0.123456789012345678901],"plain":"\\u0061","é":"é"}\r\n',
  );
  expect(await normalizeJsonSource(output)).toBe(output);
});

test.each([
  '{"é":1,"e\\u0301":2}',
  '{"nested":{"e\\u0301":1,"\\u00e9":2}}',
  '[{"é":1,"e\\u0301":2}]',
])("producer normalization refuses NFC key collisions: %s", async (text) => {
  await expect(normalizeJsonSource(text)).rejects.toThrow(/duplicate keys/);
});

test.each([
  '{"a":1,"\\u0061":2}',
  '{"n":1e400}',
  '{"x":"\\ud800"}',
  '{"x":1,}',
])(
  "producer normalization refuses invalid or unsafe input: %s",
  async (text) => {
    await expect(normalizeJsonSource(text)).rejects.toThrow(
      /invalid or unsafe/,
    );
  },
);

test("preserved producer identity cannot be normalized", async () => {
  await expect(
    normalizeJsonSource('"e\\u0301"', { normalization: "preserve" }),
  ).rejects.toThrow(/Preserved/);
});

/** Tokens preserve member/array order, decoded string values and exact numeric lexemes. */
function meaning(text) {
  return tokenize(text).map((token) => {
    const raw = text.slice(token.loc.start.offset, token.loc.end.offset);
    return [token.type, token.type === "String" ? JSON.parse(raw) : raw];
  });
}

test("native stringify presentation preserves order, escapes, negative zero and decimal lexemes", async () => {
  const text =
    '{"2":2,"1":1,"b":[-0,1e+03,1.0,0.123456789012345678901],"a":"\\u0061","e\\u0301":"e\\u0301"}';
  const options = await prettier.resolveConfig(join(root, "package.json"));
  const output = await prettier.format(text, options);
  expect(meaning(output)).toEqual(meaning(text));
  expect(output).toBe(
    '{\n  "2": 2,\n  "1": 1,\n  "b": [\n    -0,\n    1e+03,\n    1.0,\n    0.123456789012345678901\n  ],\n  "a": "\\u0061",\n  "e\\u0301": "e\\u0301"\n}\n',
  );
  expect(await prettier.format(output, options)).toBe(output);
});

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
      command.match(/node scripts\/runJsonQuality\.js format\b/gu),
    ).toHaveLength(1);
    expect(command).not.toMatch(/eslint [^&]*\.json[^&]*--fix/u);
  }
  for (const name of ["format:node", "format:node:check"])
    expect(expand(name)).not.toContain("json");
  expect(scripts["format:node"]).toBe("npm run format:node:files -- --write");
  expect(scripts["format:node:check"]).toBe(
    "npm run format:node:files -- --check",
  );
  expect(expand("check:qualification")).toContain(
    "node scripts/runJsonQuality.js check",
  );
});

/** Disposable Git checkout uses the production configs, scripts and installed native binaries. */
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "uo-json-quality-"));
  const put = (path, text) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
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
    "scripts/checkJsonInventory.js",
    "scripts/jsonQuality.js",
    "scripts/runJsonQuality.js",
    "scripts/eslint/noJsonStringifyIdentity.js",
  ])
    put(path, readFileSync(join(root, path)));
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
  return { directory, put, policy };
}

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
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toMatch(
        /meaningful-keys|no-empty-keys|interoperability|invalid or unsafe/u,
      );
      expect(readFileSync(join(directory, path), "utf8")).toBe(text);
      expect(readFileSync(join(directory, dataPath))).toEqual(sourceBefore);
    } finally {
      rmSync(directory, { recursive: true, force: true });
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
      await expect(checkJsonInventory({ root: directory })).rejects.toThrow(
        /policy structure/u,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
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
        checkJsonInventory({ root: directory }),
      ).resolves.toBeDefined();
      exception.allowEmptyKeys = ["/elsewhere/"];
      put(".json-quality.json", JSON.stringify(policy));
      await expect(checkJsonInventory({ root: directory })).rejects.toThrow(
        /Conflicting JSON exceptions/u,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  NATIVE_TOOL_TIMEOUT_MS,
);

test.each([
  "uo-json/meaningful-keys",
  "uo-json/interoperability",
  "json/no-empty-keys",
])(
  "effective-rule integrity detects weakened %s",
  async (rule) => {
    const { directory, put } = fixture();
    try {
      put(
        "eslint.config.js",
        readFileSync(join(directory, "eslint.config.js"), "utf8").replace(
          "...jsonLintConfig(jsonFiles),",
          `...jsonLintConfig(jsonFiles), { files: ["**/*.json"], rules: { "${rule}": "off" } },`,
        ),
      );
      await expect(checkJsonInventory({ root: directory })).rejects.toThrow(
        /Required JSON rule disabled/u,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  NATIVE_TOOL_TIMEOUT_MS,
);

test(
  "inventory covers tracked hidden JSON and protects producer and retained bytes",
  async () => {
    const { directory } = fixture();
    try {
      expect(await checkJsonInventory({ root: directory })).toEqual({
        discovered: 6,
        tracked: 6,
        linted: 6,
        formatted: 4,
        preserved: 2,
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
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
      { cwd: directory, encoding: "utf8", windowsHide: true },
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
    expect(check.stdout.match(/JSON inventory:/gu)).toHaveLength(1);
    expect(check.stdout).toContain("7 files checked read-only");
  } finally {
    rmSync(directory, { recursive: true, force: true });
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
    expect(second.stdout).toContain("0 changed");
  } finally {
    rmSync(directory, { recursive: true, force: true });
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
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/duplicate keys/);
    expect(readFileSync(join(directory, "first.json"))).toEqual(before);
  } finally {
    rmSync(directory, { recursive: true, force: true });
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
      expect(result.status).toBe(1);
      expect(readFileSync(join(directory, "new.json"))).toEqual(before);
    } finally {
      rmSync(directory, { recursive: true, force: true });
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
      rmSync(directory, { recursive: true, force: true });
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
      expect(runCommand(directory, "normalize:json", [path]).status).toBe(1);
      expect(readFileSync(join(directory, path))).toEqual(before);
    } finally {
      rmSync(directory, { recursive: true, force: true });
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
      await expect(checkJsonInventory({ root: directory })).rejects.toThrow(
        /prohibit generic writes/,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
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
      const inventory = await checkJsonInventory({ root: directory });
      expect(inventory.discovered).toBe(7);
      expect(inventory.formatted).toBe(state === "ignored" ? 4 : 5);
      expect(runCommand(directory, "lint:json").status).toBe(1);
      put(path, '{\n  "x": 1\n}\n');
      expect(runCommand(directory, "lint:json").status).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
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
      expect((await checkJsonInventory({ root: directory })).discovered).toBe(
        6,
      );
      execFileSync("git", ["-C", directory, "add", "-f", "--", path]);
      const tracked = await checkJsonInventory({ root: directory });
      expect(tracked.discovered).toBe(7);
      expect(tracked.formatted).toBe(4);
      expect(runCommand(directory, "lint:json").status).toBe(1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
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
    const generated = `${JSON.stringify({ "@graph": [{ "@id": "urn:test" }] }, null, 2)}\n`;
    put(path, generated);
    put("dist/query/v1/catalog.json", "{}\n");
    expect(
      (await checkJsonInventory({ root: directory, requireGenerated: true }))
        .preserved,
    ).toBe(4);
    expect(runCommand(directory, "format:json").status).toBe(0);
    expect(readFileSync(join(directory, path), "utf8")).toBe(generated);
    const authoredBefore = readFileSync(join(directory, dataPath));
    put(path, '{"@id":"first","@id":"second"}');
    expect(runCommand(directory, "format:json").status).toBe(1);
    expect(readFileSync(join(directory, dataPath))).toEqual(authoredBefore);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 60000);

test(
  "the post-generation gate rejects an absent generated corpus",
  async () => {
    const { directory } = fixture();
    try {
      await expect(
        checkJsonInventory({ root: directory, requireGenerated: true }),
      ).rejects.toThrow(/generated JSON/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
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
      .map((path) => jsonContract(path, policy, { tracked: true }));
    for (const file of files)
      put(file.path, readFileSync(join(root, file.path)));
    put(dataPath, '{"b":[-0,1e+03,1.0],"a":"\\u0061"}');
    const protectedFiles = files.filter((file) => !file.allowFormatWrites);
    expect(protectedFiles).toHaveLength(66);
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
    rmSync(directory, { recursive: true, force: true });
  }
}, 60000);

test.each([
  "duplicate",
  "conflict",
  "dialect",
  "outside",
  "native-selection",
  "native-rule",
  "missing",
  "case-collision",
  "invalid-utf8",
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
      if (scenario === "native-selection")
        put(
          ".prettierignore",
          `${readFileSync(
            join(directory, ".prettierignore"),
            "utf8",
          )}\n!/${retainedPath}\n`,
        );
      if (scenario === "native-rule")
        put(
          "eslint.config.js",
          readFileSync(join(directory, "eslint.config.js"), "utf8").replace(
            "...jsonLintConfig(jsonFiles),",
            '...jsonLintConfig(jsonFiles), { files: ["**/*.json"], rules: { "json/no-duplicate-keys": "off" } },',
          ),
        );
      if (scenario === "missing") rmSync(join(directory, dataPath));
      if (scenario === "invalid-utf8")
        put(dataPath, Buffer.from([34, 255, 34]));
      if (scenario === "case-collision")
        execFileSync("git", [
          "-C",
          directory,
          "update-index",
          "--add",
          "--cacheinfo",
          `100644,${execFileSync("git", ["-C", directory, "rev-parse", ":package.json"], { encoding: "utf8" }).trim()},PACKAGE.JSON`,
        ]);
      put(".json-quality.json", JSON.stringify(policy));
      await expect(checkJsonInventory({ root: directory })).rejects.toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
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
      rmSync(join(directory, dirname(dataPath)), { recursive: true });
      symlinkSync(target, join(directory, dirname(dataPath)), "junction");
      expect(
        lstatSync(join(directory, dirname(dataPath))).isSymbolicLink(),
      ).toBe(true);
      await expect(checkJsonInventory({ root: directory })).rejects.toThrow(
        /Nonregular/,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
      rmSync(target, { recursive: true, force: true });
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
      rmSync(directory, { recursive: true, force: true });
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
      rmSync(directory, { recursive: true, force: true });
    }
  },
  60000,
);
