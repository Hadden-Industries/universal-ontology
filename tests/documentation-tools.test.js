import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { prepareDocumentationTools } from "../scripts/prepareDocumentationTools.js";

let root;
const integrity = `sha512-${Buffer.alloc(64, 7).toString("base64")}`;
const wheelHash = "a".repeat(64);
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "ontology-documentation-tools-"));
  writeFileSync(
    join(root, "package-lock.json"),
    JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "node_modules/prettier": {
          version: "3.9.8",
          resolved: "https://registry.npmjs.org/prettier/-/prettier-3.9.8.tgz",
          integrity,
          dev: true,
          license: "MIT",
        },
        "node_modules/unrelated": { version: "1.0.0" },
      },
    }),
  );
  writeFileSync(
    join(root, "requirements.lock.txt"),
    `unrelated==1.0.0\nsnapper-fmt==0.11.2 \\\n    --hash=sha256:${wheelHash}\n    # via requirements-dev.txt\nmore-unrelated==1.0.0\n`,
  );
});
afterEach(() => {
  if (
    dirname(resolve(root)) !== resolve(tmpdir()) ||
    !basename(root).startsWith("ontology-documentation-tools-")
  )
    throw new Error(
      "Refusing cleanup outside the owned documentation-tools fixture.",
    );
  rmSync(root, { recursive: true, force: true });
});

test("documentation installation inputs preserve only the locked formatter packages and hashes", () => {
  const outputDirectory = join(root, "prepared");
  prepareDocumentationTools({ root, outputDirectory });
  const manifest = JSON.parse(
    readFileSync(join(outputDirectory, "package.json"), "utf8"),
  );
  const lock = JSON.parse(
    readFileSync(join(outputDirectory, "package-lock.json"), "utf8"),
  );
  expect(manifest.dependencies).toEqual({ prettier: "3.9.8" });
  expect(Object.keys(lock.packages)).toEqual(["", "node_modules/prettier"]);
  expect(lock.packages["node_modules/prettier"]).toMatchObject({
    version: "3.9.8",
    integrity,
  });
  expect(readFileSync(join(outputDirectory, "requirements.txt"), "utf8")).toBe(
    `snapper-fmt==0.11.2 \\\n    --hash=sha256:${wheelHash}\n`,
  );
});

test("missing hashes cannot create an unverified documentation installation", () => {
  writeFileSync(join(root, "requirements.lock.txt"), "snapper-fmt==0.11.2\n");
  expect(() =>
    prepareDocumentationTools({
      root,
      outputDirectory: join(root, "prepared"),
    }),
  ).toThrow(/hash/iu);
});

test("a future formatter dependency must enter the reviewed installation inputs", () => {
  const lockPath = join(root, "package-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.packages["node_modules/prettier"].dependencies = { unreviewed: "*" };
  writeFileSync(lockPath, JSON.stringify(lock));
  expect(() =>
    prepareDocumentationTools({
      root,
      outputDirectory: join(root, "prepared"),
    }),
  ).toThrow(/dependencies/iu);
});

test("preparation preserves an existing output directory", () => {
  const outputDirectory = join(root, "prepared");
  mkdirSync(outputDirectory);
  writeFileSync(join(outputDirectory, "package.json"), "Retain this file.");
  expect(() => prepareDocumentationTools({ root, outputDirectory })).toThrow();
  expect(readFileSync(join(outputDirectory, "package.json"), "utf8")).toBe(
    "Retain this file.",
  );
});
