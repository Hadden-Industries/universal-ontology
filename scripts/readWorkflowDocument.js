import { lstat, readFile } from "node:fs/promises";
import { parse } from "yaml";

const MAXIMUM_WORKFLOW_BYTE_SIZE = 16_777_216;

/** Read a bounded regular YAML file with a workflow job graph. */
export async function readWorkflowDocument(filePath) {
  const stats = await lstat(filePath);
  if (!stats.isFile() || stats.size > MAXIMUM_WORKFLOW_BYTE_SIZE) {
    throw new Error(`Workflow is not a bounded regular file: ${filePath}`);
  }
  const bytes = await readFile(filePath);
  if (bytes.length !== stats.size) {
    throw new Error(`Workflow changed while being read: ${filePath}`);
  }
  let document;
  try {
    document = parse(bytes.toString("utf8"));
  } catch (cause) {
    throw new Error(`Workflow YAML cannot be parsed: ${filePath}`, { cause });
  }
  if (
    !document ||
    typeof document.jobs !== "object" ||
    document.jobs === null ||
    Array.isArray(document.jobs)
  ) {
    throw new Error(`Workflow omits its job graph: ${filePath}`);
  }
  return document;
}
