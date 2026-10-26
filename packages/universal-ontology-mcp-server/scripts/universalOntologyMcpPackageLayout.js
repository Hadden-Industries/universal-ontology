/** Package-owned build locations, usable in a standalone workspace snapshot. */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const PUBLIC_PACKAGE_JSON_PATH = fileURLToPath(
  new URL("../package.json", import.meta.url),
);
export const PUBLIC_PACKAGE_DIRECTORY_PATH = dirname(PUBLIC_PACKAGE_JSON_PATH);
export const APPLICATION_BUNDLE_METADATA_PATH = fileURLToPath(
  new URL(
    "../../../dist/release-work/universal-ontology-mcp-application-bundle.json",
    import.meta.url,
  ),
);
