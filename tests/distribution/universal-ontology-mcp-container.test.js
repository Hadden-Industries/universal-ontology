import * as nodeFileSystem from "node:fs/promises";

import { readUniversalOntologyMcpReleaseInputs } from "../../scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js";

const PACKAGE_DIRECTORY_URL = new URL(
  "../../packages/universal-ontology-mcp-server/",
  import.meta.url,
);
const DOCKERFILE_URL = new URL("Dockerfile", PACKAGE_DIRECTORY_URL);

function parseDockerfileInstructions(dockerfileText) {
  const logicalInstructions = [];
  let continuedInstruction = "";

  for (const sourceLine of dockerfileText
    .replaceAll("\r\n", "\n")
    .split("\n")) {
    const trimmedLine = sourceLine.trim();
    if (trimmedLine === "" || trimmedLine.startsWith("#")) {
      continue;
    }

    const continues = trimmedLine.endsWith("\\");
    const instructionPart = continues
      ? trimmedLine.slice(0, -1).trimEnd()
      : trimmedLine;
    continuedInstruction = continuedInstruction
      ? `${continuedInstruction} ${instructionPart}`
      : instructionPart;

    if (!continues) {
      logicalInstructions.push(continuedInstruction);
      continuedInstruction = "";
    }
  }

  if (continuedInstruction !== "") {
    throw new Error("Dockerfile ends inside a continued instruction.");
  }
  return logicalInstructions;
}

describe("Universal Ontology MCP container package", () => {
  test("defines one digest-pinned, non-root, portless stdio image", async () => {
    const [dockerfileText, releaseInputs] = await Promise.all([
      nodeFileSystem.readFile(DOCKERFILE_URL, "utf8"),
      readUniversalOntologyMcpReleaseInputs(),
    ]);
    const instructions = parseDockerfileInstructions(dockerfileText);

    expect(instructions).toEqual([
      `FROM ${releaseInputs.ociBaseImage.reference}`,
      'LABEL org.opencontainers.image.title="Universal Ontology MCP Server" org.opencontainers.image.licenses="MIT" io.modelcontextprotocol.server.name="io.github.hadden-industries/universal-ontology"',
      "WORKDIR /opt/universal-ontology-mcp-server",
      "COPY --chown=node:node dist/universal-ontology-mcp-server.mjs ./server.mjs",
      "COPY --chown=node:node LICENSE README.md THIRD_PARTY_NOTICES.md ./",
      "RUN install --directory --owner=node --group=node --mode=0700 /home/node/.cache/universal-ontology-mcp-server/v1",
      "USER node:node",
      'VOLUME ["/home/node/.cache/universal-ontology-mcp-server/v1"]',
      "STOPSIGNAL SIGTERM",
      'ENTRYPOINT ["node", "/opt/universal-ontology-mcp-server/server.mjs"]',
    ]);
    expect(dockerfileText).not.toMatch(
      /\b(?:ADD|CMD|ENV|EXPOSE|HEALTHCHECK)\b/iu,
    );
    expect(dockerfileText).not.toMatch(
      /(?:\.owl|\.jsonld|query\/v1|COPY\s+(?:\.\/)?\.\s)/iu,
    );
    expect(dockerfileText).not.toContain("latest");
  });
});
