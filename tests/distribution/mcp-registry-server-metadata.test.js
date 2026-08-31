import * as nodeFileSystem from "node:fs/promises";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const REPOSITORY_ROOT_URL = new URL("../../", import.meta.url);
const SERVER_DOCUMENT_URL = new URL("server.json", REPOSITORY_ROOT_URL);
const REGISTRY_SCHEMA_URL = new URL(
  "../fixtures/distribution/mcp-registry-server-schema-2025-12-11.json",
  import.meta.url,
);
const REGISTRY_SCHEMA_NOTICE_URL = new URL(
  "../fixtures/distribution/MCP_REGISTRY_SCHEMA_NOTICE.md",
  import.meta.url,
);
const DRAFT_07_META_SCHEMA_URL = new URL(
  "../../node_modules/ajv/dist/refs/json-schema-draft-07.json",
  import.meta.url,
);

async function readJsonDocument(fileUrl) {
  return JSON.parse(await nodeFileSystem.readFile(fileUrl, "utf8"));
}

describe("MCP Registry server metadata", () => {
  test("validates the exact npm and OCI stdio topology against the vendored official schema", async () => {
    const [
      serverDocument,
      registrySchema,
      draft07MetaSchema,
      rootPackage,
      publicPackage,
      dockerfileText,
      schemaNoticeText,
    ] = await Promise.all([
      readJsonDocument(SERVER_DOCUMENT_URL),
      readJsonDocument(REGISTRY_SCHEMA_URL),
      readJsonDocument(DRAFT_07_META_SCHEMA_URL),
      readJsonDocument(new URL("package.json", REPOSITORY_ROOT_URL)),
      readJsonDocument(
        new URL(
          "packages/universal-ontology-mcp-server/package.json",
          REPOSITORY_ROOT_URL,
        ),
      ),
      nodeFileSystem.readFile(
        new URL(
          "packages/universal-ontology-mcp-server/Dockerfile",
          REPOSITORY_ROOT_URL,
        ),
        "utf8",
      ),
      nodeFileSystem.readFile(REGISTRY_SCHEMA_NOTICE_URL, "utf8"),
    ]);
    const ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      // The official draft-07 schema expresses value/valueHint requirements
      // in sibling allOf branches. That is valid JSON Schema but intentionally
      // trips AJV's optional structural lint, not instance validation.
      strictRequired: false,
    });
    addFormats(ajv);
    ajv.addMetaSchema(draft07MetaSchema);
    // The official schema carries OpenAPI-style annotation keywords. Register
    // them explicitly so strict mode still rejects every genuinely unknown
    // validation keyword instead of disabling schema strictness wholesale.
    ajv.addKeyword({ keyword: "example" });
    const validateServerDocument = ajv.compile(registrySchema);

    expect(validateServerDocument(serverDocument)).toBe(true);
    expect(validateServerDocument.errors).toBeNull();
    expect(serverDocument).toEqual({
      $schema:
        "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
      name: "io.github.hadden-industries/universal-ontology",
      title: "Universal Ontology",
      description:
        "Read-only local access to versioned Universal Ontology definitions and entity descriptions.",
      repository: {
        url: "https://github.com/hadden-industries/universal-ontology",
        source: "github",
      },
      version: "1.0.0",
      packages: [
        {
          registryType: "npm",
          identifier: "universal-ontology-mcp-server",
          version: "1.0.0",
          transport: { type: "stdio" },
        },
        {
          registryType: "oci",
          identifier:
            "ghcr.io/hadden-industries/universal-ontology-mcp-server:1.0.0",
          transport: { type: "stdio" },
        },
      ],
    });
    expect(registrySchema.$id).toBe(serverDocument.$schema);
    expect(serverDocument.name).toBe(publicPackage.mcpName);
    expect(serverDocument.version).toBe(rootPackage.version);
    expect(serverDocument.version).toBe(publicPackage.version);
    expect(serverDocument.packages[0]).toMatchObject({
      identifier: publicPackage.name,
      version: publicPackage.version,
    });
    expect(
      serverDocument.packages.map(({ transport }) => transport.type),
    ).toEqual(["stdio", "stdio"]);
    expect(serverDocument).not.toHaveProperty("remotes");
    expect(dockerfileText).toContain(
      `io.modelcontextprotocol.server.name="${serverDocument.name}"`,
    );
    expect(schemaNoticeText).toContain(serverDocument.$schema);
    expect(schemaNoticeText).toContain("unmodified");
    expect(schemaNoticeText).toMatch(/Apache-2\.0|MIT/iu);
    expect(rootPackage.scripts.format).toContain('"server.json"');
    expect(rootPackage.scripts["format:check"]).toContain('"server.json"');
  });
});
