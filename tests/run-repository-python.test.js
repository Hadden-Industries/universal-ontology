import { jest } from "@jest/globals";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const spawn = jest.fn();
jest.unstable_mockModule("node:child_process", () => ({ spawnSync: spawn }));
const { runRepositoryPython } =
  await import("../scripts/runRepositoryPython.js");
let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ontology-python-launcher-"));
  spawn.mockReset().mockReturnValue({ status: 7, signal: null });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test.each(["win32", "linux"])(
  "uses only the checkout's interpreter on %s and preserves failure",
  (platform) => {
    const executable = join(
      root,
      ".venv",
      ...(platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]),
    );
    mkdirSync(dirname(executable), { recursive: true });
    writeFileSync(executable, "fixture executable boundary");
    expect(
      runRepositoryPython(["scripts/file with spaces.py", "literal;argument"], {
        root,
        platform,
      }),
    ).toBe(7);
    expect(spawn).toHaveBeenCalledWith(
      executable,
      ["-B", "scripts/file with spaces.py", "literal;argument"],
      {
        cwd: root,
        stdio: "inherit",
        windowsHide: true,
      },
    );
  },
);

test("missing local Python cannot fall back to a global interpreter", () => {
  expect(() => runRepositoryPython(["-m", "unittest"], { root })).toThrow(
    /\.venv/,
  );
  expect(spawn).not.toHaveBeenCalled();
});
