import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, resolve } from "node:path";
import { StringDocumentTarget } from "owlapi/io";
import { verifyStandaloneOntology } from "./verifyStandaloneOntology.js";

/** Publish only flushed bytes that pass a fresh-manager structural verification. */
export async function writeVerifiedOntology({
  ontology,
  manager,
  format,
  outputPath,
}) {
  const destination = resolve(outputPath);
  const parent = dirname(destination);
  const temporary = resolve(
    parent,
    `.${basename(destination)}.${randomUUID()}.tmp`,
  );
  if (
    dirname(temporary) !== parent ||
    dirname(destination) !== parent ||
    temporary === destination
  )
    throw new Error("Invalid atomic ontology paths");
  let created = false;
  let stage = "serialization";
  let failure;
  try {
    const target = new StringDocumentTarget();
    await manager.saveOntology(ontology, format, target);
    stage = "publication";
    await mkdir(parent, { recursive: true });
    const handle = await open(temporary, "wx");
    created = true;
    try {
      await handle.writeFile(target.toString(), "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    const bytes = await readFile(temporary);
    stage = "verification";
    await verifyStandaloneOntology({
      expectedOntology: ontology,
      serializedText: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      format,
    });
    stage = "publication";
    await rename(temporary, destination);
    created = false;
  } catch (cause) {
    failure = Object.assign(
      new Error(`Ontology ${stage} failed: ${cause.message}`, { cause }),
      { stage },
    );
  }
  if (created) {
    try {
      await unlink(temporary);
    } catch (error) {
      if (error.code !== "ENOENT")
        throw Object.assign(
          new AggregateError(
            [failure, error].filter(Boolean),
            `Cannot remove temporary ontology: ${temporary}`,
          ),
          { stage: "publication" },
        );
    }
  }
  if (failure) throw failure;
}
