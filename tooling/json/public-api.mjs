/** Resolve only supported exports from the isolated, locked JSON tool project. */
import { createRequire } from "node:module";
import { URL, fileURLToPath, pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
import { isAbsolute, relative, sep } from "node:path";

const require = createRequire(new URL("./package.json", import.meta.url));
const installedRoot = realpathSync(
  fileURLToPath(new URL("./node_modules/", import.meta.url)),
);
function resolveExport(specifier) {
  const path = require.resolve(specifier);
  const local = relative(installedRoot, realpathSync(path));
  if (isAbsolute(local) || local === ".." || local.startsWith(`..${sep}`))
    throw new Error(
      "JSON tooling must resolve from its isolated installation.",
    );
  return pathToFileURL(path);
}
const api = await import(resolveExport("@hadden-industries/json-quality"));
export const {
  runJsonQuality,
  runJsonQualityCli,
  inspectJsonInventory,
  checkJsonInventory,
  checkJsonDocument,
  checkJsonLines,
  normalizeJsonSource,
  decodeJsonBytes,
  readJsonPolicy,
  jsonContract,
  jsonFormatOptions,
  checkJsonPresentation,
  validateJsonQualityResult,
} = api;
export const jsonQualityEslint = (
  await import(resolveExport("@hadden-industries/json-quality/eslint"))
).default;
