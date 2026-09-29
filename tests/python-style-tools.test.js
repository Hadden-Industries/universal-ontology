import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preparePythonStyleTools } from "../scripts/preparePythonStyleTools.js";

let root;
const entry = `ruff==0.16.9 \\\n    --hash=sha256:${"a".repeat(64)} \\\n    --hash=sha256:${"b".repeat(64)}\n`;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "uo-ruff-inputs-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});
function prepare(lock) {
  writeFileSync(join(root, "requirements.lock.txt"), lock);
  preparePythonStyleTools({ root, outputDirectory: join(root, "output") });
}
test("preserves exact Ruff version and hashes without unrelated packages", () => {
  prepare(
    `other==1.0\n${entry}    # via requirements-dev.txt\nlast==2.0\n`.replaceAll(
      "\n",
      "\r\n",
    ),
  );
  expect(readFileSync(join(root, "output/requirements.txt"), "utf8")).toBe(
    entry,
  );
  expect(() => prepare(entry)).toThrow();
  expect(readFileSync(join(root, "output/requirements.txt"), "utf8")).toBe(
    entry,
  );
});
test.each([
  "",
  "ruff==0.16.9\n",
  entry + entry,
  entry.replace("ruff==0.16.9", "ruff>=0.16.9"),
  entry.replace("a".repeat(64), "short"),
  entry.replace("b".repeat(64), "z".repeat(64)),
  `${entry}    --index-url https://invalid.example\n`,
])("rejects incomplete or ambiguous installer input %j", (lock) => {
  expect(() => prepare(lock)).toThrow();
  expect(existsSync(join(root, "output"))).toBe(false);
});
