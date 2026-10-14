/** Thin isolated bridge; the shared package owns resolution and quality. */
import { URL } from "node:url";
import { assertIsolatedJsonQuality } from "@hadden-industries/json-quality";
assertIsolatedJsonQuality(new URL("./", import.meta.url));
export * from "@hadden-industries/json-quality";
export { default as jsonQualityEslint } from "@hadden-industries/json-quality/eslint";
