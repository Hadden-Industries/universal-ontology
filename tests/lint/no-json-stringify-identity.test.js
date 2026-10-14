import { ESLint } from "eslint";
import { jsonQualityEslint } from "../../tooling/json/public-api.mjs";
const ruleId = "json-quality/no-json-stringify-identity";
const rule = jsonQualityEslint.rules["no-json-stringify-identity"];

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
    "// eslint-disable-next-line json-quality/no-json-stringify-identity\nvoid 0;",
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
