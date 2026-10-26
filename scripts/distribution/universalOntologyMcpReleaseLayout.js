/** Shared release layout and format bounds; artifact validators remain independent. */
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

export {
  PUBLIC_PACKAGE_JSON_PATH,
  APPLICATION_BUNDLE_METADATA_PATH as DEFAULT_APPLICATION_BUNDLE_METADATA_PATH,
} from "../../packages/universal-ontology-mcp-server/scripts/universalOntologyMcpPackageLayout.js";
export const DEFAULT_RELEASE_DIRECTORY_PATH = join(root, "dist/releases");
export const DEFAULT_RELEASE_WORK_PARENT_DIRECTORY_PATH = join(
  root,
  "dist/release-work",
);

// ZIP cannot represent dates before 1980; both archive and SBOM timestamps use this epoch.
export const DEFAULT_SOURCE_DATE_EPOCH_SECONDS = 315_532_800;
export const MAXIMUM_RELEASE_ASSET_BYTE_SIZE = 268_435_456;
export const SPDX_DOCUMENT_ID = "SPDXRef-DOCUMENT";
