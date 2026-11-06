// The generator owns writes; this adapter admits one logical public SDK result.
import { fileURLToPath } from "node:url";
import {
  processLogicalDocument,
  validateQualityResult,
} from "@hadden-industries/markdown-quality";

const root = fileURLToPath(new URL("../", import.meta.url));
try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const report = await processLogicalDocument({
    root,
    mode: "format",
    path: request.path,
    requestId: request.requestId,
    content: Buffer.from(request.contentBase64, "base64"),
  });
  if (report.schemaVersion !== 5) throw new Error("Expected result schema 5");
  validateQualityResult(report, {
    operation: "format",
    exitCode: 0,
    requestId: request.requestId,
  });
  if (
    report.operationStatus !== "completed" ||
    report.errors.length ||
    report.writtenPaths.length ||
    report.document?.path !== request.path ||
    report.document?.requestId !== request.requestId ||
    typeof report.document?.contentBase64 !== "string"
  ) {
    throw new Error("Logical Markdown output was not admitted");
  }
  process.stdout.write(JSON.stringify(report));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
