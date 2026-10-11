import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  pythonTarget,
  syncPythonProjections,
} from "../scripts/pythonTarget.js";

test("a changed pin makes Ruff stale until regenerated without changing other policy", () => {
  const root = mkdtempSync(join(tmpdir(), "ontology-python-target-"));
  try {
    const original = readFileSync(
      new URL("../ruff.toml", import.meta.url),
      "utf8",
    );
    writeFileSync(join(root, "ruff.toml"), original);
    writeFileSync(join(root, ".python-version"), "3.16.2\n");
    expect(() => syncPythonProjections({ root })).toThrow(
      "Stale Python target",
    );
    syncPythonProjections({ root, write: true });
    expect(readFileSync(join(root, "ruff.toml"), "utf8")).toBe(
      original.replace(/^target-version = ".*"$/mu, 'target-version = "py316"'),
    );
    expect(() => syncPythonProjections({ root })).not.toThrow();
    writeFileSync(join(root, ".python-version"), "3.16.2rc1\n");
    expect(() => pythonTarget(root)).toThrow("stable major.minor.patch");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the checked-in projection matches the maintained pin", () => {
  expect(() => syncPythonProjections()).not.toThrow();
});
