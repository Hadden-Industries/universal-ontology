import * as nodeFileSystem from "node:fs/promises";

const LOCAL_INSTALLATION_GUIDE_URL = new URL(
  "../../docs/mcp/local-installation.md",
  import.meta.url,
);
const LOCAL_DEVELOPMENT_GUIDE_URL = new URL(
  "../../docs/mcp/local-development.md",
  import.meta.url,
);
const PACKAGE_README_URL = new URL(
  "../../packages/universal-ontology-mcp-server/README.md",
  import.meta.url,
);
const REPOSITORY_README_URL = new URL("../../README.md", import.meta.url);

// These patterns identify commands that would falsely imply that a durable,
// publicly installable development release already exists. Keeping the list
// here makes the documentation boundary independently reviewable.
const PROHIBITED_PUBLIC_INSTALLATION_PATTERNS = Object.freeze([
  /npm install --global universal-ontology-mcp-server@/iu,
  /npx[^\n]*universal-ontology-mcp-server@/iu,
  /docker pull ghcr\.io\/hadden-industries\/universal-ontology-mcp-server/iu,
  /github\.com\/hadden-industries\/universal-ontology\/releases\/download/iu,
  /mcp-publisher\s+(?:login|publish)/iu,
]);

async function expectRelativeMarkdownLinksToResolve(markdown, documentUrl) {
  const linkTargets = [...markdown.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/gu)].map(
    ([, linkTarget]) => linkTarget,
  );

  for (const linkTarget of linkTargets) {
    // URI-scheme and in-document links are not local filesystem dependencies.
    if (/^[a-z][a-z+.-]*:/iu.test(linkTarget) || linkTarget.startsWith("#")) {
      continue;
    }

    const [pathWithoutFragment] = linkTarget.split("#", 1);
    await expect(
      nodeFileSystem.access(new URL(pathWithoutFragment, documentUrl)),
    ).resolves.toBeUndefined();
  }
}

describe("Universal Ontology MCP operator documentation", () => {
  let localDevelopmentGuide;
  let localInstallationGuide;
  let packageReadme;
  let repositoryReadme;

  beforeAll(async () => {
    [
      localDevelopmentGuide,
      localInstallationGuide,
      packageReadme,
      repositoryReadme,
    ] = await Promise.all([
      nodeFileSystem.readFile(LOCAL_DEVELOPMENT_GUIDE_URL, "utf8"),
      nodeFileSystem.readFile(LOCAL_INSTALLATION_GUIDE_URL, "utf8"),
      nodeFileSystem.readFile(PACKAGE_README_URL, "utf8"),
      nodeFileSystem.readFile(REPOSITORY_README_URL, "utf8"),
    ]);
  });

  test("states the development-only distribution boundary without public install commands", () => {
    expect(localInstallationGuide).toMatch(/development-only/iu);
    expect(localInstallationGuide).toMatch(/not (?:a )?release/iu);
    expect(localInstallationGuide).toMatch(/no public npm package/iu);
    expect(localInstallationGuide).toMatch(/no public (?:GHCR|OCI) image/iu);
    expect(localInstallationGuide).toMatch(
      /no(?:\s+>\s+|\s+)MCP Registry record/iu,
    );
    expect(localInstallationGuide).toMatch(/no GitHub Release/iu);
    expect(localInstallationGuide).toMatch(
      /no publisher (?:signature|attestation)/iu,
    );

    const operatorDocumentation = [
      localInstallationGuide,
      packageReadme,
      repositoryReadme,
    ].join("\n");
    for (const prohibitedPattern of PROHIBITED_PUBLIC_INSTALLATION_PATTERNS) {
      expect(operatorDocumentation).not.toMatch(prohibitedPattern);
    }
  });

  test("documents every permitted unpublished installation form and its integrity boundary", () => {
    expect(localInstallationGuide).toMatch(/source checkout/iu);
    expect(localInstallationGuide).toContain("npm run mcp:package:build");
    expect(localInstallationGuide).toMatch(/locally packed npm tarball/iu);
    expect(localInstallationGuide).toContain("npm run mcp:package:pack");
    expect(localInstallationGuide).toMatch(/locally built platform archive/iu);
    expect(localInstallationGuide).toContain("npm run mcp:archives:build");
    expect(localInstallationGuide).toMatch(/locally built OCI image/iu);
    expect(localInstallationGuide).toContain(
      "docker build --tag universal-ontology-mcp-server:development",
    );
    expect(localInstallationGuide).toMatch(/GitHub Actions artifact/iu);
    expect(localInstallationGuide).toMatch(/three days/iu);
    expect(localInstallationGuide).toContain("gh run download");
    expect(localInstallationGuide).toContain("SHA256SUMS");
    expect(localInstallationGuide).toMatch(
      /checksums detect corruption[\s\S]*do not authenticate the publisher/iu,
    );
  });

  test("provides current stdio configurations for supported MCP hosts", () => {
    expect(localInstallationGuide).toContain(
      "codex mcp add universal_ontology -- node",
    );
    expect(localInstallationGuide).toContain(
      "[mcp_servers.universal_ontology]",
    );
    expect(localInstallationGuide).toContain(
      'default_tools_approval_mode = "writes"',
    );
    expect(localInstallationGuide).toContain('"mcpServers"');
    expect(localInstallationGuide).toContain('"servers"');
    expect(localInstallationGuide).toContain('"type": "stdio"');
    expect(localInstallationGuide).toMatch(/generic stdio host/iu);
    expect(localInstallationGuide).toContain('"search_entities"');
    expect(localInstallationGuide).toContain('"resolve_entity"');
    expect(localInstallationGuide).not.toMatch(
      /search_ontology_entities|resolve_ontology_entity/iu,
    );
  });

  test("documents cache, network, lifecycle, and troubleshooting semantics", () => {
    const requiredOperatorTerms = [
      "stable",
      "development",
      "512 MiB",
      "UNIVERSAL_ONTOLOGY_MCP_CACHE_DIRECTORY",
      "UNSAFE_CACHE_DIRECTORY",
      "UNSUPPORTED_CACHE_FILE_SYSTEM",
      "NODE_USE_ENV_PROXY",
      "HTTP_PROXY",
      "HTTPS_PROXY",
      "NO_PROXY",
      "NODE_USE_SYSTEM_CA",
      "NODE_EXTRA_CA_CERTS",
      "stdin EOF",
      "SIGINT",
      "SIGTERM",
      "401",
      "403",
      "404",
    ];
    for (const requiredOperatorTerm of requiredOperatorTerms) {
      expect(localInstallationGuide).toContain(requiredOperatorTerm);
    }

    expect(localInstallationGuide).toMatch(/0700[\s\S]*0600/iu);
    expect(localInstallationGuide).toMatch(/symbolic link/iu);
    expect(localInstallationGuide).toMatch(/hard-link capability probe/iu);
    expect(localInstallationGuide).toMatch(/cold start/iu);
    expect(localInstallationGuide).toMatch(/warm start/iu);
    expect(localInstallationGuide).toMatch(/offline/iu);
    expect(localInstallationGuide).toMatch(/restart[\s\S]*channel/iu);
    expect(localInstallationGuide).toMatch(
      /Never set\s+`NODE_TLS_REJECT_UNAUTHORIZED=0`/u,
    );
    expect(localInstallationGuide).toMatch(
      /Windows[\s\S]*does not guarantee[\s\S]*SIGTERM/iu,
    );
    expect(localInstallationGuide).toMatch(/no proprietary MCP shutdown/iu);
  });

  test("pins the Person acceptance prompt and semantically precise provenance", () => {
    expect(localInstallationGuide).toContain(
      "Find the definition of Person in the Universal Ontology and cite the ontology release and source IRI.",
    );
    expect(localInstallationGuide).toContain(
      "https://haddenindustries.com/ontology/universal/core/Person",
    );
    expect(localInstallationGuide).toContain("source_artifact_graph");
    expect(localInstallationGuide).toContain("universal/core");
    expect(localInstallationGuide).toContain("20260714");
    expect(localInstallationGuide).toContain(
      "urn:iso:std:iso-iec:14662:ed-3:v1:term:3.24",
    );
    expect(localInstallationGuide).toMatch(/asserted lexical definition/iu);
    expect(localInstallationGuide).toMatch(/not an inferred OWL definition/iu);
  });

  test("keeps WebMCP, loopback HTTP, and installed stdio usage distinct", () => {
    expect(repositoryReadme).toContain(
      "docs/webmcp-ontology-entity-definition-lookup.md",
    );
    expect(repositoryReadme).toContain("docs/mcp/local-development.md");
    expect(repositoryReadme).toContain("docs/mcp/local-installation.md");
    expect(repositoryReadme).toMatch(/page-scoped/iu);
    expect(repositoryReadme).toMatch(/page-independent/iu);
    expect(packageReadme).toContain("../../docs/mcp/local-installation.md");
    expect(packageReadme).toMatch(/not published/iu);
    expect(localInstallationGuide).toMatch(/complementary/iu);
  });

  test("keeps every relative operator-documentation link live", async () => {
    await Promise.all([
      expectRelativeMarkdownLinksToResolve(
        localDevelopmentGuide,
        LOCAL_DEVELOPMENT_GUIDE_URL,
      ),
      expectRelativeMarkdownLinksToResolve(
        localInstallationGuide,
        LOCAL_INSTALLATION_GUIDE_URL,
      ),
      expectRelativeMarkdownLinksToResolve(packageReadme, PACKAGE_README_URL),
      expectRelativeMarkdownLinksToResolve(
        repositoryReadme,
        REPOSITORY_README_URL,
      ),
    ]);
  });

  test("reframes hosted compute as an optional future adapter", () => {
    expect(localDevelopmentGuide).not.toMatch(/first AWS production target/iu);
    expect(localDevelopmentGuide).toMatch(/optional future adapter/iu);
    expect(localDevelopmentGuide).toContain(
      "../specs/2026-08-31-distributable-local-universal-ontology-mcp-server-design.md",
    );
    expect(localDevelopmentGuide).toContain(
      "../plans/2026-08-31-distributable-local-universal-ontology-mcp-server.md",
    );
  });
});
