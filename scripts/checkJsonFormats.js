/** Validate presentation for every classified JSON file through native Prettier.
 * Generic writes remain separately deny-by-default. Producer contracts may own
 * the document envelope; no check result is written back to a source file.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

const root = fileURLToPath(new URL("../", import.meta.url));
const producersOnly =
  process.argv.length === 3 && process.argv[2] === "--producers";
if (process.argv.length !== 2 && !producersOnly)
  throw new Error("Expected no arguments or --producers.");

try {
  const policy = JSON.parse(
    readFileSync(join(root, ".json-quality.json"), "utf8"),
  );
  let checked = 0;
  const failures = [];
  for (const file of policy.files) {
    if (producersOnly && file.format) continue;
    const path = join(root, file.path);
    let text = new TextDecoder("utf-8", { fatal: true }).decode(
      readFileSync(path),
    );
    const options = await prettier.resolveConfig(path, { editorconfig: true });
    if (file.formatContract === "producer-json-body") {
      // The retained Oxigraph producer supplied a pretty JSON body without a
      // final newline. Checkout LF/CRLF projection is outside that body contract.
      // Native Prettier still validates all presentation within the body.
      text = text.replaceAll("\r\n", "\n");
      if (!text.endsWith("\n")) text += "\n";
    } else if (file.formatContract !== "prettier-json")
      throw new Error(`Unknown producer formatting contract: ${file.path}`);
    if (!(await prettier.check(text, options))) failures.push(file.path);
    checked++;
  }
  if (!checked) throw new Error("Expected JSON formatting selection is empty.");
  if (failures.length)
    throw new Error(
      `JSON formatting differs from its declared contract:\n${failures.join("\n")}`,
    );
  process.stdout.write(
    `JSON presentation: ${checked} files checked read-only against native/producer contracts.\n`,
  );
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
