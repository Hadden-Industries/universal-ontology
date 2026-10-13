import { ESLint, Linter } from "eslint";
import globals from "globals";
import rule from "../../scripts/eslint/noJsonStringifyIdentity.js";

const ruleId = "uo/no-json-stringify-identity";
const config = {
  languageOptions: { globals: { ...globals.node, ...globals.jest } },
  plugins: { uo: { rules: { "no-json-stringify-identity": rule } } },
  rules: { [ruleId]: "error" },
};
const lint = (code) => new Linter().verify(code, config);
const contract = (kind = "bytes") =>
  `// json-identity-contract: ${kind}; owner: Test oracle; reason: Exact representation is the asserted contract.\n`;

test.each([
  `${contract()}const wire =\nJSON.stringify(value); wire === expected;`,
  "console.log(JSON.stringify(value));",
  "writeFile(path, JSON.stringify(value));",
  "const body = JSON.stringify(value); fetch(url, { body });",
  "JSON.stringify(value, null, 2);",
  "const JSON = { stringify: x => x }; JSON.stringify(a) === b;",
  "function compare(JSON) { return JSON.stringify(a) === b; }",
  "function stringify(x) { return x; } stringify(a) === b;",
  "const Object = { is: () => true }; Object.is(JSON.stringify(a), b);",
  "function expect(x) { return { toBe() {} }; } expect(JSON.stringify(a)).toBe(b);",
  "expect(JSON.stringify(value)).not.toContain('secret');",
  "expect(JSON.stringify(value)).toMatch(/safe/u);",
  "const values = new Map(); values.set('body', JSON.stringify(value));",
  "new Map([['body', JSON.stringify(value)]]);",
  "const a = b; const b = a; a === c;",
  "function first() { const wire = JSON.stringify(a); return wire; } function second() { const wire = 'plain'; return wire === b; }",
  `${contract()}const wire = JSON.stringify(value); wire === expected;`,
  `${contract("digest")}const wire = JSON.stringify(value); const hash = require('node:crypto').createHash('sha256'); hash.update(wire);`,
  `${contract("ordered-tuple")}const wire = JSON.stringify([value.name, value.version]); new Set([wire]);`,
])(
  "permits ordinary serialization, shadowing or a local contract: %s",
  (code) => {
    expect(lint(code)).toEqual([]);
  },
);

test.each([
  "JSON.stringify(a) === b;",
  "a !== JSON.stringify(b);",
  "JSON.stringify(a) == b;",
  "JSON.stringify(a) != b;",
  "JSON['stringify'](a) === b;",
  "JSON?.stringify(a) === b;",
  "const encoded = JSON.stringify(a); encoded === b;",
  "const encoded = JSON.stringify(a); const alias = encoded; alias === b;",
  "let encoded; encoded = JSON.stringify(a); encoded === b;",
  "const stringify = JSON.stringify; stringify(a) === b;",
  "const json = JSON; json.stringify(a) === b;",
  "const { stringify: encode } = JSON; encode(a) === b;",
  "const [encode] = [JSON.stringify]; encode(a) === b;",
  "const { wire } = { wire: JSON.stringify(a) }; wire === b;",
  "const [wire] = [JSON.stringify(a)]; wire === b;",
  "JSON.stringify.call(JSON, a) === b;",
  "JSON.stringify.apply(JSON, [a]) === b;",
  "Object.is(JSON.stringify(a), b);",
  "const same = Object.is; same(JSON.stringify(a), b);",
  "import assert from 'node:assert/strict'; assert.equal(JSON.stringify(a), b);",
  "import { deepStrictEqual as same } from 'node:assert'; same(JSON.stringify(a), b);",
  "const assert = require('node:assert'); assert.notStrictEqual(a, JSON.stringify(b));",
  "const { strictEqual: same } = require('assert'); same(JSON.stringify(a), b);",
  "expect(JSON.stringify(a)).toBe(b);",
  "expect(a).not.toStrictEqual(JSON.stringify(b));",
  "const check = expect; check(JSON.stringify(a)).resolves.toEqual(b);",
  "import { expect as check } from '@jest/globals'; check(JSON.stringify(a)).not.toBe(b);",
  "const values = new Set(); values.add(JSON.stringify(a));",
  "const values = new Set(); const alias = values; alias.has(JSON.stringify(a));",
  "const values = new Set(); values.delete(JSON.stringify(a));",
  "new Set([JSON.stringify(a)]);",
  "const list = [JSON.stringify(a)]; const alias = list; new Set(alias);",
  "new Set(values.map(value => JSON.stringify(value)));",
  "new Map([[JSON.stringify(a), b]]);",
  "new Map(values.map(value => [JSON.stringify(value), value]));",
  "const values = new Map(); values.set(JSON.stringify(a), b);",
  "const values = new Map(); values.get(JSON.stringify(a));",
  "const values = []; values.includes(JSON.stringify(a));",
  "const values = []; values.indexOf(JSON.stringify(a));",
  "const values = []; values.lastIndexOf(JSON.stringify(a));",
  "const values = { [JSON.stringify(a)]: b };",
  "values[JSON.stringify(a)] = b;",
  "String(JSON.stringify(a)) === b;",
  "Buffer.from(JSON.stringify(a)).toString('utf8') === b;",
  "JSON.stringify(a).trim().normalize('NFC') === b;",
  "(JSON.stringify(a) + '\\n') === b;",
  "`${JSON.stringify(a)}\\n` === b;",
  "(condition ? JSON.stringify(a) : 'plain') === b;",
  "(JSON.stringify(a) || 'plain') === b;",
  "(0, JSON.stringify(a)) === b;",
  "(await JSON.stringify(a)) === b;",
  "import { createHash } from 'node:crypto'; createHash('sha256').update(JSON.stringify(a)).digest('hex');",
  "import * as crypto from 'node:crypto'; crypto.createHmac('sha256', 'key').update(JSON.stringify(a));",
])("rejects identity through native scopes: %s", (code) => {
  const messages = lint(code);
  expect(messages).toHaveLength(1);
  expect(messages[0]).toMatchObject({
    ruleId,
    messageId: "identity",
    severity: 2,
  });
  expect(messages[0].fix).toBeUndefined();
  expect(messages[0].suggestions).toBeUndefined();
});

test.each([
  [
    "// json-identity-contract: unknown; owner: Team; reason: Contract.\nJSON.stringify(a) === b;",
    ["identity", "contract"],
  ],
  [
    "// json-identity-contract: bytes; owner: ; reason: Contract.\nJSON.stringify(a) === b;",
    ["identity", "contract"],
  ],
  [
    "// json-identity-contract: bytes; owner: Team; reason: \nJSON.stringify(a) === b;",
    ["identity", "contract"],
  ],
  [
    "/* json-identity-contract: bytes; owner: Team; reason: Contract. */\nJSON.stringify(a) === b;",
    ["identity", "contract"],
  ],
  [`${contract()}\nJSON.stringify(a) === b;`, ["identity", "unused"]],
  [`${contract()}console.log(JSON.stringify(a));`, ["unused"]],
  [`${contract()}JSON.stringify(a) === JSON.stringify(b);`, ["identity"]],
  [`doWork(); ${contract()}JSON.stringify(a) === b;`, ["identity", "unused"]],
])(
  "rejects malformed, stale, broad or ambiguous exceptions",
  (code, expected) => {
    expect(
      lint(code)
        .map(({ messageId }) => messageId)
        .sort(),
    ).toEqual(expected.sort());
  },
);

test.each([
  "globalThis.JSON.stringify(a) === b;",
  "const encode = JSON.stringify.bind(JSON); encode(a) === b;",
  "const same = Object.is.bind(Object); same(JSON.stringify(a), b);",
  "const check = expect(JSON.stringify(a)).toBe.bind(null); check(b);",
  "const json = globalThis.JSON; json.stringify(a) === b;",
  "const check = expect(JSON.stringify(a)).toBe; check(b);",
])("follows native global and assertion aliases: %s", (code) => {
  expect(lint(code).map(({ messageId }) => messageId)).toEqual(["identity"]);
});

test("reports one diagnostic for a serializer reused at multiple sinks", () => {
  expect(
    lint("const wire = JSON.stringify(a); wire === b; Object.is(wire, c);"),
  ).toHaveLength(1);
});

test.each([
  "const holder = {wire: JSON.stringify(a)}; const {wire} = holder; wire === b;",
  "const holder = {wire: JSON.stringify(a)}; holder.wire === b;",
  "const holder = {nested: {wire: JSON.stringify(a)}}; const {nested: {wire}} = holder; wire === b;",
  "const holder = {native: JSON}; const {native: {stringify: encode}} = holder; encode(a) === b;",
  "let encode; ({stringify: encode} = JSON); encode(a) === b;",
  "let wire; ({wire} = {wire: JSON.stringify(a)}); wire === b;",
  "let encode; [encode] = [JSON.stringify]; encode(a) === b;",
  "import { Buffer } from 'node:buffer'; Buffer.from(JSON.stringify(a)).toString() === b;",
  "import { Buffer as Bytes } from 'buffer'; Bytes.from(JSON.stringify(a)).toString() === b;",
  "import * as bytes from 'node:buffer'; bytes.Buffer.from(JSON.stringify(a)).toString() === b;",
  "import bytes from 'node:buffer'; bytes.Buffer.from(JSON.stringify(a)).toString() === b;",
  "const { Buffer: Bytes } = require('node:buffer'); Bytes.from(JSON.stringify(a)).toString() === b;",
])("tracks reviewed native binding/carrier gaps: %s", (code) => {
  expect(lint(code).map(({ messageId }) => messageId)).toEqual(["identity"]);
});

test.each([
  "globalThis.toString().includes('x');",
  "const own = globalThis.hasOwnProperty('x'); own.valueOf();",
  "globalThis.constructor();",
  "toString(); constructor();",
  "const JSON = { stringify: x => x }; JSON.stringify(a) === b; globalThis.toString();",
])("ignores inherited role-table names without crashing: %s", (code) => {
  expect(lint(code)).toEqual([]);
});

test.each([false, true])(
  "bounded alias analysis fails closed instead of silently passing: branching=%s",
  (branching) => {
    const declarations = ["const v0 = JSON.stringify(a);"];
    for (let index = 1; index < 80; index++)
      declarations.push(
        `const v${index} = v${index - 1}${branching ? ` + v${index - 1}` : ""};`,
      );
    const messages = lint(`${declarations.join("\n")}\nv79 === b;`);
    expect(
      messages.some(({ messageId }) => messageId === "analysisLimit"),
    ).toBe(true);
  },
);

test("scope pruning permits generated alias graphs without any JSON serialization root", () => {
  const declarations = ["const v0 = 'plain';"];
  for (let index = 1; index < 100; index++)
    declarations.push(`const v${index} = v${index - 1} + v${index - 1};`);
  expect(lint(`${declarations.join("\n")}\nv99 === 'plain';`)).toEqual([]);
});

test("repository config enables the guard for source, scripts and tests without autofixes", async () => {
  const eslint = new ESLint();
  for (const filePath of [
    "src/guard-probe.js",
    "scripts/guard-probe.mjs",
    "tests/guard-probe.test.js",
    "scripts/guard-probe.cjs",
  ]) {
    const effective = await eslint.calculateConfigForFile(filePath);
    expect(effective.rules[ruleId]).toEqual([2]);
    expect(effective.linterOptions.reportUnusedDisableDirectives).toBe(2);
    const [result] = await eslint.lintText(
      "const a = JSON.stringify({ b: 1 }); a === '{}';",
      { filePath },
    );
    expect(result.messages.some((message) => message.ruleId === ruleId)).toBe(
      true,
    );
  }
  expect(rule.meta.fixable).toBeUndefined();
  const [unused] = await eslint.lintText(
    "// eslint-disable-next-line uo/no-json-stringify-identity\nvoid 0;",
    { filePath: "scripts/guard-probe.mjs" },
  );
  expect(
    unused.messages.some(
      (message) =>
        message.severity === 2 &&
        message.message.includes("Unused eslint-disable directive"),
    ),
  ).toBe(true);
});
