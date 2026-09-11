import { fileURLToPath } from "node:url";

import { build } from "vite";

// Like the website build fixtures, exercise Vite/Rolldown in its native Node
// process instead of passing Jest VM objects into its native plugin binding.
const builds = await build({
  root: fileURLToPath(new URL("../../../", import.meta.url)),
  configFile: false,
  publicDir: false,
  logLevel: "warn",
  build: {
    write: false,
    minify: false,
    lib: {
      entry: fileURLToPath(
        new URL("./ontology-query-browser-entries.js", import.meta.url),
      ),
      formats: ["es"],
    },
  },
});
const chunks = [builds]
  .flat()
  .flatMap((result) => result.output)
  .filter((output) => output.type === "chunk");
process.stdout.write(
  JSON.stringify({
    entryChunkCount: chunks.filter((chunk) => chunk.isEntry).length,
    moduleIds: chunks.flatMap((chunk) => Object.keys(chunk.modules)),
  }),
);
