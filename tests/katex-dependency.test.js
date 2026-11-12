import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mermaidCliEntry = require.resolve("@mermaid-js/mermaid-cli");

function assertInheritedSettingsAreIgnored(entryPoint) {
  const assert = require("node:assert/strict");
  const { createRequire } = require("node:module");
  const katex = createRequire(entryPoint)("katex");

  Object.prototype.trust = true;
  Object.prototype.default = true;
  Object.prototype.processor = () => true;
  Object.prototype["\\inheritedMacro"] = "inherited";

  const unsafeLink = "\\href{javascript:alert(1)}{click}";
  assert.doesNotMatch(
    katex.renderToString(unsafeLink, { throwOnError: false }),
    /href=["']javascript:/u,
  );
  assert.match(katex.renderToString("c^2=a^2+b^2"), /katex-mathml/u);
  assert.throws(
    () => katex.renderToString("\\inheritedMacro"),
    katex.ParseError,
  );
}

test("Mermaid CLI's KaTeX ignores inherited settings and preserves ordinary math", () => {
  const source = `(${assertInheritedSettingsAreIgnored.toString()})(${JSON.stringify(mermaidCliEntry)})`;
  execFileSync(process.execPath, ["-e", source], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15000,
  });
});
