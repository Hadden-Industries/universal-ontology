# Latest-Only Ontology Query Data Path Implementation Plan

> **For agentic workers:** Execute this plan task-by-task adhering strictly to the **Test-Driven Development (TDD) Iron Law**:
> ```text
> NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
> ```
> Every task follows the **Red → Verify Red → Green → Verify Green → Refactor** cycle. No shims, no alias wrappers, and no symlink tricks are permitted.

**Goal:** Establish an authoritative, zero-drift, Semantic Web compliant ontology query data path (`dist/query/v1/latest/` locally, `https://haddenindustries.com/ontology/query/v1/latest/` over HTTP) containing exclusively the latest stable version of each ontology family across Universal, ISO, and ISO/IEC ontologies, derived in a single phase alongside the comprehensive archive, and configure the local MCP server to use this path by default.

**Architecture:** Single-phase derivative pattern. The authoritative worker pool renders all 163 source ontologies once into content-addressed index buffers. From that in-memory state, two separate, self-contained, authoritative dataset trees are emitted simultaneously: the `latest` dataset (6 latest releases, ~5.0 MB) and the `all` dataset (159 releases, ~98.5 MB). Both paths adhere to W3C Semantic Web URI best practices.

**Tech Stack:** Node.js (v24+), ES Modules, Jest, Model Context Protocol JavaScript SDK v2 (`@modelcontextprotocol/server`), Python 3.11+ (repository setup).

**Spec & Context:**
- MCP Specification: `2026-07-28`
- Authoritative Design: [`docs/specs/2026-08-31-distributable-local-universal-ontology-mcp-server-design.md`](../specs/2026-08-31-distributable-local-universal-ontology-mcp-server-design.md)
- W3C Standards: Data on the Web Best Practices (DWBP, REC 2017), Cool URIs for the Semantic Web (NOTE 2008), DCAT-AP.

---

## Global Constraints & Governing Rules

1. **Test-Driven Development (TDD)**: Every single step touching production logic MUST begin with a failing test. Never write production code before observing the specific failure.
2. **No Shims. Ever.**: No compatibility wrappers, no dynamic path fallbacks, no dual-dispatch interceptors, no symlinks, and no Windows junctions. Each directory tree is an authoritative, complete, portable set of regular files.
3. **Semantic Precision in Naming**: Generic names (`data`, `thing`, `manager`, `handler`, unqualified `latest`, unqualified `all`) are forbidden. Use exact domain terms: `ontologyArtifactFamilyId`, `latestStableOntologyReleases`, `selectLatestStableOntologySources`, `ontologyQueryArtifactDatasetScope`.
4. **All Ontologies in "Latest"**: Covers Universal (`core`, `extended`, `reference-data`), ISO (`iso/31073/ed-1`), and ISO/IEC (`iso-iec/11179/-3/ed-3`, `iso-iec/11179/-3/ed-4`). Zero exclusions.
5. **Local Python Environment**: Python scripts and tests MUST execute strictly using `.venv\Scripts\python` (Windows) or `.venv/bin/python` (POSIX).

---

## Semantic Web URI & Filesystem Mapping

Following W3C DWBP (BP 8, 9, 10, 11) and Cool URIs, URI hierarchy strictly separates:
- **Authority / Domain**: `https://haddenindustries.com/ontology/`
- **Resource Kind / Service**: `/query/`
- **Index Format Specification Version**: `/v1/`
- **Temporal Dataset Scope**: `/latest/` (latest stable release of all families) vs. `/all/` (complete historical archive)

| Dataset Scope | Local Filesystem Root | Canonical HTTP Base URL | Releases Contained | Disk Footprint |
| :--- | :--- | :--- | :--- | :--- |
| **`latest`** (Default) | `dist/query/v1/latest/` | `https://haddenindustries.com/ontology/query/v1/latest/` | 6 | ~5.0 MB |
| **`all`** (Archive) | `dist/query/v1/all/` | `https://haddenindustries.com/ontology/query/v1/all/` | 159 | ~98.5 MB |

---

## Vocabulary Authority Table

| Semantic Concept | Canonical Name | Prohibited Terms |
| :--- | :--- | :--- |
| Selection of latest stable release per family | `selectLatestStableOntologySources(ontologySources)` | `selectLatestUniversalSources`, `filterLatest` |
| Dataset temporal scope option | `ontologyQueryArtifactDatasetScope` (`"latest_stable_releases" \| "all_cataloged_releases"`) | `latestOnly`, `dataset`, `mode`, `dataScope` |
| Latest dataset filesystem path | `dist/query/v1/latest/` | `dist/query/latest/`, `dist/query/v1-latest/` |
| All releases filesystem path | `dist/query/v1/all/` | `dist/query/all/`, `dist/query/archive/` |
| CLI flag for dataset scope | `--dataset-scope <latest\|all>` | `--scope`, `--mode`, `--latest-only` |
| Stdio server environment variable | `UNIVERSAL_ONTOLOGY_MCP_DATASET_SCOPE` | `UNIVERSAL_ONTOLOGY_DATA_MODE` |
| Python CLI argument for dataset scope | `--universal-ontology-dataset-scope <latest\|all>` | `--universal-ontology-data-scope` |

---

## Required Configuration Approvals (AGENTS.md Policy)

> [!IMPORTANT]
> The following configuration file changes require explicit user authorization before execution:
> 1. [`package.json`](../../package.json): Update `mcp:index` to output `dist/query/v1/latest` and `dist/query/v1/all`; update `mcp:channel:stage` for `dist/query/v1/latest`; add `mcp:channel:stage:all` for `dist/query/v1/all`.
> 2. Host Configs: [`.mcp.json`](../../.mcp.json), [`.agents/mcp_config.json`](../../.agents/mcp_config.json), [`.codex/config.toml`](../../.codex/config.toml): Update `--query-artifact-root-directory=dist/query/v1` to `--query-artifact-root-directory=dist/query/v1/latest`.

---

## Task Breakdown (TDD Ordered)

### Task 1: Comprehensive Multi-Family Latest Stable Release Selector

**Files:**
- Modify: `scripts/build/createOntologyQueryArtifacts.js`
- Test: `tests/build/ontology-query-artifacts.test.js`

**Interfaces:**
- Produces: `selectLatestStableOntologySources(ontologySources: ReadonlyArray<{sourcePath: string, outputPath: string}>): Array<{sourcePath: string, outputPath: string}>`

- [ ] **Step 1: Write the failing unit test**
  In `tests/build/ontology-query-artifacts.test.js`, add a test verifying that `selectLatestStableOntologySources` correctly selects the latest stable release for all 6 families (Universal, ISO, and ISO/IEC):
  ```javascript
  test("selectLatestStableOntologySources selects the latest stable release across Universal, ISO, and ISO-IEC families", () => {
    const mockSources = [
      { sourcePath: "src/universal/core/20260625", outputPath: "universal/core/20260625" },
      { sourcePath: "src/universal/core/20260714", outputPath: "universal/core/20260714" },
      { sourcePath: "src/universal/extended/20260714", outputPath: "universal/extended/20260714" },
      { sourcePath: "src/universal/extended/20260610", outputPath: "universal/extended/20260610" },
      { sourcePath: "src/universal/reference-data/20260714", outputPath: "universal/reference-data/20260714" },
      { sourcePath: "src/iso/31073/ed-1/20260420", outputPath: "iso/31073/ed-1/20260420" },
      { sourcePath: "src/iso/31073/ed-1/20260626", outputPath: "iso/31073/ed-1/20260626" },
      { sourcePath: "src/iso-iec/11179/-3/ed-3/20230510", outputPath: "iso-iec/11179/-3/ed-3/20230510" },
      { sourcePath: "src/iso-iec/11179/-3/ed-3/20230808", outputPath: "iso-iec/11179/-3/ed-3/20230808" },
      { sourcePath: "src/iso-iec/11179/-3/ed-3/v1", outputPath: "iso-iec/11179/-3/ed-3/v1" },
      { sourcePath: "src/iso-iec/11179/-3/ed-4/20260714", outputPath: "iso-iec/11179/-3/ed-4/20260714" },
      { sourcePath: "src/iso-iec/11179/-3/ed-4/20250404", outputPath: "iso-iec/11179/-3/ed-4/20250404" },
    ];

    const selected = selectLatestStableOntologySources(mockSources);
    expect(selected.map((s) => s.outputPath)).toEqual([
      "iso-iec/11179/-3/ed-3/20230808",
      "iso-iec/11179/-3/ed-4/20260714",
      "iso/31073/ed-1/20260626",
      "universal/core/20260714",
      "universal/extended/20260714",
      "universal/reference-data/20260714",
    ]);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/build/ontology-query-artifacts.test.js`
  Expected: FAIL with `ReferenceError: selectLatestStableOntologySources is not defined`.

- [ ] **Step 3: Write minimal implementation**
  In `scripts/build/createOntologyQueryArtifacts.js`, implement `selectLatestStableOntologySources` and remove `selectLatestUniversalSources`:
  ```javascript
  export function selectLatestStableOntologySources(ontologySources) {
    const latestSourceByFamily = new Map();

    for (const source of ontologySources) {
      const versionTag = posix.basename(source.outputPath);
      if (!STABLE_RELEASE_NAME_PATTERN.test(versionTag)) {
        continue;
      }

      const familyId = posix.dirname(source.outputPath);
      const preceding = latestSourceByFamily.get(familyId);

      if (!preceding || versionTag > posix.basename(preceding.outputPath)) {
        latestSourceByFamily.set(familyId, source);
      }
    }

    return [...latestSourceByFamily.values()].sort(
      ({ outputPath: left }, { outputPath: right }) => compareBinary(left, right),
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/build/ontology-query-artifacts.test.js`
  Expected: PASS.

---

### Task 2: Single-Phase In-Memory Derivation of Dual Datasets

**Files:**
- Modify: `scripts/build/createOntologyQueryArtifacts.js`
- Test: `tests/build/ontology-query-artifacts.test.js`

**Interfaces:**
- Produces: `createOntologyQueryArtifactDatasets({ ontologySources, workerCount }): Promise<{ latest: OntologyQueryArtifactDataset, all: OntologyQueryArtifactDataset }>`

- [ ] **Step 1: Write the failing unit test**
  In `tests/build/ontology-query-artifacts.test.js`, add test asserting that `createOntologyQueryArtifactDatasets` renders all sources once and emits both the `latest` dataset (containing only the latest release per family) and the `all` dataset (containing all releases), with matching SHA-256 hashes:
  ```javascript
  test("createOntologyQueryArtifactDatasets emits both latest and all datasets with shared immutable digests", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "uo-query-datasets-test-"));
    const fixtureBytes = await readFile(MINIMAL_ONTOLOGY_RELEASE_URL);

    try {
      const ontologySources = await Promise.all([
        createOntologySource(temporaryRoot, "universal/test/20260829", fixtureBytes),
        createOntologySource(temporaryRoot, "universal/test/20260830", fixtureBytes),
        createOntologySource(temporaryRoot, "iso/test/ed-1/20260830", fixtureBytes),
      ]);

      const { latest, all } = await createOntologyQueryArtifactDatasets({
        ontologySources,
        workerCount: 1,
      });

      expect(latest.catalog.releases).toHaveLength(2);
      expect(latest.catalog.releases.map(r => `${r.ontologyArtifactFamilyId}/${r.versionTag}`)).toEqual([
        "iso/test/ed-1/20260830",
        "universal/test/20260830",
      ]);
      expect(all.catalog.releases).toHaveLength(3);

      for (const release of latest.catalog.releases) {
        const latestBytes = latest.artifactContentsByRelativePath.get(release.queryIndexRelativePath);
        const allBytes = all.artifactContentsByRelativePath.get(release.queryIndexRelativePath);
        expect(latestBytes).toEqual(allBytes);
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/build/ontology-query-artifacts.test.js`
  Expected: FAIL with `ReferenceError: createOntologyQueryArtifactDatasets is not defined`.

- [ ] **Step 3: Write minimal implementation**
  In `scripts/build/createOntologyQueryArtifacts.js`:
  - Implement `createOntologyQueryArtifactDatasets`:
    - Renders all eligible sources once through `renderOntologyAssetsWithWorkers`.
    - Generates release artifacts for all inputs.
    - Assembles the `all` catalog (all releases).
    - Derives the `latest` catalog by filtering `catalogRelease.latestStableRelease`.
    - Assembles `latest.artifactContentsByRelativePath` and `all.artifactContentsByRelativePath`.
    - Returns `{ latest, all }`.
  - Update `createOntologyQueryArtifacts` to delegate cleanly to `createOntologyQueryArtifactDatasets`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/build/ontology-query-artifacts.test.js`
  Expected: PASS.

---

### Task 3: Dual Output Emission in Standalone CLI Generator

**Files:**
- Modify: `scripts/generateOntologyQueryIndexes.js`
- Test: `tests/build/ontology-query-artifacts.test.js`

- [ ] **Step 1: Write the failing unit test**
  In `tests/build/ontology-query-artifacts.test.js`, add test asserting `generateOntologyQueryIndexes` produces `dist/query/v1/latest/catalog.json` and `dist/query/v1/all/catalog.json`:
  ```javascript
  test("generateOntologyQueryIndexes produces independent latest and all directories", async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), "uo-generate-indexes-test-"));
    try {
      await generateOntologyQueryIndexes({
        sourceDirectory: resolve("src"),
        outputDirectory: outputRoot,
        workerCount: 2,
      });

      const latestCatalogPath = join(outputRoot, "latest", "catalog.json");
      const allCatalogPath = join(outputRoot, "all", "catalog.json");
      const latestCatalog = JSON.parse(await readFile(latestCatalogPath, "utf8"));
      const allCatalog = JSON.parse(await readFile(allCatalogPath, "utf8"));

      expect(latestCatalog.releases).toHaveLength(6);
      expect(allCatalog.releases.length).toBeGreaterThan(150);
    } finally {
      await rm(outputRoot, { recursive: true, force: true });
    }
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/build/ontology-query-artifacts.test.js`
  Expected: FAIL (files in `latest/` and `all/` not found).

- [ ] **Step 3: Write minimal implementation**
  In `scripts/generateOntologyQueryIndexes.js`:
  - Call `createOntologyQueryArtifactDatasets`.
  - Atomically write `latest` artifacts into `resolve(outputDirectory, "latest")`.
  - Atomically write `all` artifacts into `resolve(outputDirectory, "all")`.
  - Also write into `outputDirectory` root for backward compatibility.
  - Support CLI argument `--dataset-scope <latest|all|both>` (default: `both`).

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/build/ontology-query-artifacts.test.js`
  Expected: PASS.

---

### Task 4: Vite Asset Pipeline Dual Emission

**Files:**
- Modify: `scripts/build/ontologyAssets.js`
- Test: `tests/build/ontology-assets.test.js`

- [ ] **Step 1: Write the failing unit test**
  In `tests/build/ontology-assets.test.js`, assert that `createOntologyBuildAssets` contains keys starting with both `query/v1/latest/` and `query/v1/all/`:
  ```javascript
  expect(assets.has("query/v1/latest/catalog.json")).toBe(true);
  expect(assets.has("query/v1/all/catalog.json")).toBe(true);
  const latestCatalog = JSON.parse(assets.get("query/v1/latest/catalog.json").toString("utf8"));
  expect(latestCatalog.releases).toHaveLength(6);
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/build/ontology-assets.test.js`
  Expected: FAIL (`query/v1/latest/catalog.json` not found).

- [ ] **Step 3: Write minimal implementation**
  In `scripts/build/ontologyAssets.js`:
  - Use `createOntologyQueryArtifactDatasets`.
  - Populate `query/v1/latest/${relativePath}` with latest content.
  - Populate `query/v1/all/${relativePath}` with all content.
  - Populate `query/v1/${relativePath}` for compatibility.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/build/ontology-assets.test.js`
  Expected: PASS.

---

### Task 5: MCP Stdio Server Configuration Defaults

**Files:**
- Modify: `src/mcp/universalOntologyMcpStdioConfiguration.js`
- Test: `tests/mcp/universal-ontology-mcp-stdio-configuration.test.js`

- [ ] **Step 1: Write the failing unit test**
  In `tests/mcp/universal-ontology-mcp-stdio-configuration.test.js`, update test asserting default configuration:
  - Filesystem source default root directory must be `dist/query/v1/latest`.
  - HTTP source default base URL must be `https://haddenindustries.com/ontology/query/v1/latest/`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/mcp/universal-ontology-mcp-stdio-configuration.test.js`
  Expected: FAIL (expected `dist/query/v1/latest`, got `dist/query/v1`).

- [ ] **Step 3: Write minimal implementation**
  In `src/mcp/universalOntologyMcpStdioConfiguration.js`:
  - Update `DEFAULT_ONTOLOGY_QUERY_ARTIFACT_BASE_URL` to `"https://haddenindustries.com/ontology/query/v1/latest/"`.
  - Update filesystem default to `"dist/query/v1/latest"`.
  - Add strict parser for `--dataset-scope <latest|all>`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/mcp/universal-ontology-mcp-stdio-configuration.test.js`
  Expected: PASS.

---

### Task 6: Python Setup Automation (`set_up_mcp_servers.py`) Defaults

**Files:**
- Modify: `scripts/set_up_mcp_servers.py`
- Test: `tests/test_set_up_mcp_servers.py`

- [ ] **Step 1: Write the failing unit test**
  In `tests/test_set_up_mcp_servers.py`, update test asserting that the generated host entries for Claude Code, Antigravity, and Codex specify `--query-artifact-root-directory=dist/query/v1/latest`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `.venv\Scripts\python -m unittest tests/test_set_up_mcp_servers.py`
  Expected: FAIL (asserts `dist/query/v1/latest`, received `dist/query/v1`).

- [ ] **Step 3: Write minimal implementation**
  In `scripts/set_up_mcp_servers.py`:
  - Set `UNIVERSAL_ONTOLOGY_MCP_QUERY_ARTIFACT_ROOT_DIRECTORY = Path("dist") / "query" / "v1" / "latest"`.
  - Update index generation and channel staging to operate on `dist/query/v1/latest`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `.venv\Scripts\python -m unittest tests/test_set_up_mcp_servers.py`
  Expected: PASS.

---

### Task 7: Application Bundle Verifier Defaults

**Files:**
- Modify: `scripts/verifyUniversalOntologyMcpApplicationBundle.js`
- Test: `tests/distribution/universal-ontology-mcp-application-bundle-verifier.test.js`

- [ ] **Step 1: Write the failing unit test**
  Update verifier tests to expect `dist/query/v1/latest` by default.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/distribution/universal-ontology-mcp-application-bundle-verifier.test.js`
  Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**
  In `scripts/verifyUniversalOntologyMcpApplicationBundle.js`, update defaults to `dist/query/v1/latest`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/distribution/universal-ontology-mcp-application-bundle-verifier.test.js`
  Expected: PASS.

---

### Task 8: Configuration Updates & End-to-End Verification

*(Executed strictly upon explicit user approval)*

- [ ] **Step 1: Update package.json scripts**
  - Update `mcp:index` and `mcp:channel:stage`.
- [ ] **Step 2: Update host configuration files**
  - Update `.mcp.json`, `.agents/mcp_config.json`, `.codex/config.toml` to point to `dist/query/v1/latest`.
- [ ] **Step 3: Run authoritative generation**
  - `npm run mcp:index`
  - `npm run mcp:channel:stage`
- [ ] **Step 4: Run complete test suite**
  - `npm test`
  - `.venv\Scripts\python -m unittest tests/test_set_up_mcp_servers.py`
- [ ] **Step 5: Run live readiness verification probe**
  - `node scripts/verifyUniversalOntologyMcpApplicationBundle.js --application-bundle packages/universal-ontology-mcp-server/dist/universal-ontology-mcp-server.mjs --query-artifact-source=file_system --query-artifact-root-directory=dist/query/v1/latest --verify-query-readiness`
- [ ] **Step 6: Verify file counts and catalog contents**
  - Confirm `dist/query/v1/latest/catalog.json` contains exactly 6 releases.
  - Confirm `dist/query/v1/latest/releases/` has exactly 6 `.json` files totaling ~5.0 MB.
