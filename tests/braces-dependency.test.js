import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "@jest/globals";

const require = createRequire(import.meta.url);
const repositoryDirectory = fileURLToPath(new URL("../", import.meta.url));
const braces = require("braces");
const fastGlob = require("fast-glob");
const chokidar = require("chokidar");
const depthMessage = "AST nesting depth exceeds the maximum of 100";

describe("private braces depth-guard dependency", () => {
  test.each(["default", "parse", "compile", "expand", "stringify"])(
    "%s rejects deep strings before exhausting a small child stack",
    (operation) => {
      const source = [
        'const braces = require("braces");',
        'const pattern = "{".repeat(4000) + "x" + "}".repeat(4000);',
        "try {",
        operation === "default"
          ? "braces(pattern);"
          : `braces.${operation}(pattern);`,
        'console.log(JSON.stringify({ name: "accepted" }));',
        "} catch (error) {",
        "console.log(JSON.stringify({ name: error.name, message: error.message }));",
        "}",
      ].join("\n");
      const result = JSON.parse(
        execFileSync(
          process.execPath,
          ["--stack_size=512", "--max-old-space-size=128", "-e", source],
          { cwd: repositoryDirectory, encoding: "utf8", timeout: 5000 },
        ),
      );
      expect(result).toEqual({ name: "SyntaxError", message: depthMessage });
    },
  );

  test.each(["compile", "expand", "stringify"])(
    "%s bounds direct AST traversal independently of parsing",
    (operation) => {
      function nestedAst(depth) {
        let ast = { type: "root", nodes: [] };
        for (let index = 0; index < depth; index++) {
          ast = { type: "root", nodes: [ast] };
        }
        return ast;
      }

      expect(braces[operation](nestedAst(100))).toEqual(
        operation === "expand" ? [] : "",
      );
      expect(() => braces[operation](nestedAst(101))).toThrow(depthMessage);
      expect(() => braces[operation](nestedAst(4000))).toThrow(SyntaxError);
    },
  );

  test("preserves alternatives, ranges and paired quotes after backslash pairs", () => {
    expect(braces.compile("app/{reading,writing}/**/*.{js,jsx}")).toBe(
      "app/(reading|writing)/**/*.(js|jsx)",
    );
    expect(braces.expand("page-{1..3}.js")).toEqual([
      "page-1.js",
      "page-2.js",
      "page-3.js",
    ]);
    expect(braces.expand("a\\{b,c\\}")).toEqual(["a{b,c}"]);

    const quoted = `${String.fromCharCode(34)}{a,b}${String.fromCharCode(92, 92, 34)}`;
    const literal = `{a,b}${String.fromCharCode(92, 92)}`;
    expect(braces.expand(quoted)).toEqual([literal]);
    expect(braces.stringify(quoted)).toBe(literal);
    expect(braces.compile(quoted)).toBe(literal);
  });

  test("fast-glob retains file alternatives and rejects a deep glob", async () => {
    const files = await fastGlob("src/**/*.{css,html}", {
      cwd: repositoryDirectory,
    });
    expect(files.some((file) => file.endsWith(".css"))).toBe(true);
    expect(files.some((file) => file.endsWith(".html"))).toBe(true);
    const deep = `${"{".repeat(4000)}x${"}".repeat(4000)}`;
    await expect(
      fastGlob(`nonexistent/${deep}/*.css`, { cwd: repositoryDirectory }),
    ).rejects.toThrow(depthMessage);
  });

  test("chokidar bounds both watch globs and directory-entry expansion", async () => {
    const watcher = new chokidar.FSWatcher({ persistent: false });
    try {
      const helper = watcher._getWatchHelpers("dir/{a,b}/file.txt");
      expect(helper.dirParts).toEqual([["a"], ["b"]]);
      const deep = `${"{".repeat(4000)}x${"}".repeat(4000)}`;
      expect(() => watcher._getWatchHelpers(`dir/${deep}/*.txt`)).toThrow(
        depthMessage,
      );
      expect(() => helper.getDirParts(`dir/${deep}/file.txt`)).toThrow(
        depthMessage,
      );
    } finally {
      await watcher.close();
    }
  });
});
