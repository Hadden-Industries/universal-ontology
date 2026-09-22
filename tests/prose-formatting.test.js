import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve, basename } from "node:path";
import {
  selectDocumentationFiles,
  processDocumentation,
} from "../scripts/formatDocumentation.js";

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ontology-prose-"));
  writeFileSync(
    join(root, ".snapperrc.toml"),
    'format = "markdown"\nmax_width = 0\nclause_breaks = false\n',
  );
  writeFileSync(
    join(root, ".prettierrc.json"),
    JSON.stringify({
      proseWrap: "preserve",
      embeddedLanguageFormatting: "off",
    }),
  );
});
afterEach(() => {
  if (
    dirname(resolve(root)) !== resolve(tmpdir()) ||
    !basename(root).startsWith("ontology-prose-")
  ) {
    throw new Error("Refusing cleanup outside the owned prose fixture");
  }
  rmSync(root, { recursive: true, force: true });
});
function write(name, content = "First sentence. Second sentence.\n") {
  const path = join(root, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}
test("selection shares current Prettier and Git ignore rules, including negation", async () => {
  for (const name of [
    "README.md",
    "docs/guide.md",
    "docs/drafts/hidden.md",
    "docs/drafts/keep.md",
    "docs/generated/result.md",
    "packages/example/README.md",
    "tests/fixture.md",
  ])
    write(name);
  write(".gitignore", "docs/generated/\n");
  write(".prettierignore", "docs/drafts/*.md\n!docs/drafts/keep.md\n");
  expect(await selectDocumentationFiles(root)).toEqual(
    [
      "README.md",
      "docs/drafts/keep.md",
      "docs/guide.md",
      "packages/example/README.md",
    ]
      .map((p) => join(root, p))
      .sort(),
  );
  write(".prettierignore", "docs/guide.md\n");
  expect(await selectDocumentationFiles(root)).toEqual(
    [
      "README.md",
      "docs/drafts/hidden.md",
      "docs/drafts/keep.md",
      "packages/example/README.md",
    ]
      .map((p) => join(root, p))
      .sort(),
  );
});
test("check does not write; formatting converges and preserves literals", async () => {
  const literal = "\n```js\nconst value={a:1}; // Keep. Both.\n```\n";
  const path = write(
    "README.md",
    `First sentence. Second sentence.\n${literal}`,
  );
  const before = readFileSync(path, "utf8");
  expect(await processDocumentation({ root, write: false })).toBe(1);
  expect(readFileSync(path, "utf8")).toBe(before);
  expect(await processDocumentation({ root, write: true })).toBe(0);
  const formatted = readFileSync(path, "utf8");
  expect(formatted).toContain("First sentence.\nSecond sentence.");
  expect(formatted).toContain(literal);
  expect(await processDocumentation({ root, write: false })).toBe(0);
  expect(await processDocumentation({ root, write: true })).toBe(0);
  expect(readFileSync(path, "utf8")).toBe(formatted);
});
test("ignored evidence remains byte-identical in write mode", async () => {
  const path = write("docs/reviews/external.md");
  write(".prettierignore", "docs/reviews/\n");
  const before = readFileSync(path);
  expect(await processDocumentation({ root, write: true })).toBe(0);
  expect(readFileSync(path)).toEqual(before);
});

test("explicitly preserved Markdown examples retain meaningful trailing spaces", async () => {
  const example =
    "<!-- prettier-ignore -->\n\n```markdown\nLabel  \nValue\n```\n";
  const path = write(
    "README.md",
    `First sentence. Second sentence.\n\n${example}`,
  );
  expect(await processDocumentation({ root, write: true })).toBe(0);
  expect(readFileSync(path, "utf8")).toContain(
    "```markdown\nLabel  \nValue\n```\n",
  );
  expect(await processDocumentation({ root, write: false })).toBe(0);
});
test("native preservation backstop does not hide fused-sentence findings", async () => {
  write(
    "README.md",
    ".NET mods retain their own licence. Check the converter.\n",
  );
  expect(await processDocumentation({ root, write: false })).toBe(1);
});
test("valid lists and Prettier task indentation converge", async () => {
  write(
    "README.md",
    "- first item; and\n- second item.\n\n- [ ] First sentence.\n      Second sentence.\n",
  );
  await processDocumentation({ root, write: true });
  expect(await processDocumentation({ root, write: false })).toBe(0);
});

test.each([">", "> >", "> > >"])(
  "quoted ordered lists at depth %s do not mistake numbering for sentences",
  async (prefix) => {
    const valid = `${prefix} 1. First item.\n${prefix} 2. Second item.\n`;
    const path = write("README.md", valid);
    expect(await processDocumentation({ root, write: false })).toBe(0);
    expect(readFileSync(path, "utf8")).toBe(valid);
    expect(await processDocumentation({ root, write: true })).toBe(0);
    expect(readFileSync(path, "utf8")).toBe(valid);
    const fused = `${prefix} 1. First sentence. Another sentence.\n`;
    write("README.md", fused);
    expect(await processDocumentation({ root, write: false })).toBe(1);
    expect(readFileSync(path, "utf8")).toBe(fused);
  },
);
