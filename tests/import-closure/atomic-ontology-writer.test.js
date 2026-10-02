import { afterEach, expect, jest, test } from "@jest/globals";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { OWLManager } from "owlapi/apibinding";
import { StringDocumentSource } from "owlapi/io";
import { OWLDocumentFormats } from "owlapi/formats";

let fault;
const directories = [];
jest.unstable_mockModule("node:fs/promises", () => ({
  ...fs,
  rename: (...args) => {
    if (fault === "rename") throw new Error("injected rename failure");
    return fs.rename(...args);
  },
  open: async (...args) => {
    const handle = await fs.open(...args);
    return {
      writeFile: (...values) => {
        if (fault === "write") throw new Error("injected write failure");
        return handle.writeFile(...values);
      },
      sync: () => {
        if (fault === "flush") throw new Error("injected flush failure");
        return handle.sync();
      },
      close: () => handle.close(),
    };
  },
}));
const { writeVerifiedOntology } =
  await import("../../scripts/ontology/atomicOntologyWriter.js");
afterEach(async () => {
  fault = undefined;
  await Promise.all(
    directories.splice(0).map((path) => fs.rm(path, { recursive: true })),
  );
});

test.each(["serialize", "verify", "write", "flush", "rename", "success"])(
  "atomic publication: %s",
  async (mode) => {
    const directory = await fs.mkdtemp(join(tmpdir(), "uo-atomic-test-"));
    directories.push(directory);
    const outputPath = join(directory, "output.owl");
    await fs.writeFile(outputPath, "sentinel");
    const realManager = OWLManager.createOWLOntologyManager();
    const ontology = await realManager.loadOntologyFromOntologyDocument(
      new StringDocumentSource("Ontology(<urn:root>)"),
    );
    const other = await realManager.loadOntologyFromOntologyDocument(
      new StringDocumentSource("Ontology(<urn:other>)"),
    );
    fault = mode;
    const manager = {
      saveOntology: (value, format, target) => {
        if (mode === "serialize")
          throw new Error("injected serializer failure");
        return realManager.saveOntology(
          mode === "verify" ? other : value,
          format,
          target,
        );
      },
    };
    const result = writeVerifiedOntology({
      ontology,
      manager,
      format: OWLDocumentFormats.FUNCTIONAL,
      outputPath,
    });
    if (mode === "success") {
      await result;
      expect(await fs.readFile(outputPath, "utf8")).toContain("urn:root");
    } else {
      await expect(result).rejects.toThrow();
      expect(await fs.readFile(outputPath, "utf8")).toBe("sentinel");
    }
    expect(await fs.readdir(directory)).toEqual(["output.owl"]);
  },
);
