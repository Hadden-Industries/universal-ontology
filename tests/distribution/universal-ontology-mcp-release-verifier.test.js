import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import * as nodeFileSystem from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";

import * as tar from "tar";
import yazl from "yazl";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { createUniversalOntologyMcpSpdxSboms } from "../../scripts/distribution/createUniversalOntologyMcpSpdxSbom.js";
import { readUniversalOntologyMcpReleaseInputs } from "../../scripts/distribution/buildUniversalOntologyMcpPlatformArchive.js";
import {
  verifyUniversalOntologyMcpDistributionWorkflow,
  verifyUniversalOntologyMcpRelease,
} from "../../scripts/distribution/verifyUniversalOntologyMcpRelease.js";

const SOFTWARE_VERSION = "1.0.0";
const RELEASE_TAG = `universal-ontology-mcp-server-v${SOFTWARE_VERSION}`;
const RELEASE_BASE_NAME = `${RELEASE_TAG}`;
const PACKAGE_NAME = "universal-ontology-mcp-server";
const SOURCE_DATE_EPOCH_SECONDS = 1_700_000_000;
const DISTRIBUTION_WORKFLOW_URL = new URL(
  "../../.github/workflows/verify-universal-ontology-mcp-distribution.yml",
  import.meta.url,
);
const APPLICATION_BYTES = Buffer.from(
  "#!/usr/bin/env node\nprocess.stdout.write('synthetic fixture');\n",
);
const BUNDLED_COMPONENTS = Object.freeze([
  {
    name: "@modelcontextprotocol/core",
    version: "2.0.0",
    license: "MIT",
  },
  {
    name: "@modelcontextprotocol/server",
    version: "2.0.0",
    license: "MIT",
  },
  { name: "ajv", version: "8.18.0", license: "MIT" },
  { name: "ajv-formats", version: "3.0.1", license: "MIT" },
  { name: "fast-deep-equal", version: "3.1.3", license: "MIT" },
  { name: "fast-uri", version: "3.1.0", license: "BSD-3-Clause" },
  { name: "json-schema-traverse", version: "1.0.0", license: "MIT" },
  { name: "zod", version: "4.5.4", license: "MIT" },
]);

function calculateSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function createZipArchive(archivePath, entries) {
  const zipFile = new yazl.ZipFile();
  const archivePipeline = pipeline(
    zipFile.outputStream,
    createWriteStream(archivePath, { flags: "wx", mode: 0o600 }),
  );

  for (const entry of entries) {
    zipFile.addBuffer(entry.bytes, entry.path, {
      mode: entry.mode,
      mtime: new Date(SOURCE_DATE_EPOCH_SECONDS * 1000),
      compress: true,
      compressionLevel: 9,
    });
  }
  zipFile.end();
  await archivePipeline;
}

async function createTarGzipArchive(archivePath, entries) {
  const stagingDirectoryPath = `${archivePath}.staging`;
  await nodeFileSystem.mkdir(stagingDirectoryPath, { recursive: false });

  try {
    for (const entry of entries) {
      const stagedPath = join(stagingDirectoryPath, ...entry.path.split("/"));
      await nodeFileSystem.mkdir(dirname(stagedPath), { recursive: true });
      await nodeFileSystem.writeFile(stagedPath, entry.bytes, {
        flag: "wx",
        mode: entry.mode,
      });
    }
    await tar.create(
      {
        cwd: stagingDirectoryPath,
        file: archivePath,
        gzip: { level: 9, mtime: SOURCE_DATE_EPOCH_SECONDS },
        portable: true,
        noDirRecurse: true,
        noPax: true,
        mtime: new Date(SOURCE_DATE_EPOCH_SECONDS * 1000),
        strict: true,
      },
      entries.map(({ path }) => path),
    );
  } finally {
    await nodeFileSystem.rm(stagingDirectoryPath, {
      recursive: true,
      force: true,
    });
  }
}

function createPlatformArchiveEntries(
  target,
  applicationBytes,
  runtimeExecutableBytes,
) {
  const archiveRootName = `${RELEASE_BASE_NAME}-${target.targetName}`;
  const regularTextEntries = [
    ["LICENSE", "MIT license fixture\n"],
    ["README.md", "Synthetic release archive fixture.\n"],
    ["THIRD_PARTY_NOTICES.md", "Synthetic third-party notices.\n"],
  ];
  return [
    ...regularTextEntries.map(([relativePath, content]) => ({
      path: `${archiveRootName}/${relativePath}`,
      bytes: Buffer.from(content),
      mode: 0o100644,
    })),
    {
      path: `${archiveRootName}/app/universal-ontology-mcp-server.mjs`,
      bytes: applicationBytes,
      mode: 0o100755,
    },
    {
      path: `${archiveRootName}/${target.packagedRuntimeExecutablePath}`,
      bytes:
        runtimeExecutableBytes ??
        Buffer.from(`synthetic Node ${target.targetName} runtime`),
      mode: 0o100755,
    },
  ].sort(({ path: leftPath }, { path: rightPath }) =>
    Buffer.compare(Buffer.from(leftPath), Buffer.from(rightPath)),
  );
}

async function createNpmTarball(releaseDirectoryPath, applicationBytes) {
  const npmPackageDocument = {
    name: PACKAGE_NAME,
    version: SOFTWARE_VERSION,
    type: "module",
    bin: {
      "universal-ontology-mcp-server": "dist/universal-ontology-mcp-server.mjs",
    },
    engines: { node: ">=24.0.0" },
    mcpName: "io.github.hadden-industries/universal-ontology",
    license: "MIT",
  };
  const entries = [
    { path: "package/LICENSE", bytes: Buffer.from("MIT license fixture\n") },
    {
      path: "package/README.md",
      bytes: Buffer.from("Synthetic npm package fixture.\n"),
    },
    {
      path: "package/THIRD_PARTY_NOTICES.md",
      bytes: Buffer.from("Synthetic third-party notices.\n"),
    },
    {
      path: "package/dist/universal-ontology-mcp-server.mjs",
      bytes: applicationBytes,
      mode: 0o755,
    },
    {
      path: "package/package.json",
      bytes: Buffer.from(`${JSON.stringify(npmPackageDocument)}\n`),
    },
  ].map((entry) => ({ mode: 0o644, ...entry }));
  await createTarGzipArchive(
    join(releaseDirectoryPath, `${PACKAGE_NAME}-${SOFTWARE_VERSION}.tgz`),
    entries,
  );
}

async function createCompleteReleaseCandidate({
  parentDirectoryPath,
  includeOntologyData = false,
  runtimeExecutableBytes,
}) {
  const releaseDirectoryPath = join(parentDirectoryPath, "release");
  const bundleMetadataPath = join(parentDirectoryPath, "bundle-metadata.json");
  await nodeFileSystem.mkdir(releaseDirectoryPath, { recursive: true });
  const applicationBytes = includeOntologyData
    ? Buffer.from(
        `${APPLICATION_BYTES.toString("utf8")}const ontology = "A natural or legal person recognised by law.";\n`,
      )
    : APPLICATION_BYTES;
  const releaseInputs = await readUniversalOntologyMcpReleaseInputs();

  await createNpmTarball(releaseDirectoryPath, applicationBytes);
  for (const target of releaseInputs.nodeRuntime.targets) {
    const archiveExtension =
      target.releaseArchiveFormat === "zip" ? "zip" : "tar.gz";
    const archivePath = join(
      releaseDirectoryPath,
      `${RELEASE_BASE_NAME}-${target.targetName}.${archiveExtension}`,
    );
    const entries = createPlatformArchiveEntries(
      target,
      applicationBytes,
      runtimeExecutableBytes,
    );
    if (target.releaseArchiveFormat === "zip") {
      await createZipArchive(archivePath, entries);
    } else {
      await createTarGzipArchive(archivePath, entries);
    }
  }

  await nodeFileSystem.writeFile(
    bundleMetadataPath,
    `${JSON.stringify({
      applicationBundleMetadataFormatVersion: 1,
      packageName: PACKAGE_NAME,
      packageVersion: SOFTWARE_VERSION,
      bundleSha256: calculateSha256(applicationBytes),
      bundledComponents: BUNDLED_COMPONENTS,
    })}\n`,
  );
  await createUniversalOntologyMcpSpdxSboms({
    releaseDirectoryPath,
    applicationBundleMetadataPath: bundleMetadataPath,
    sourceDateEpochSeconds: SOURCE_DATE_EPOCH_SECONDS,
  });
  return releaseDirectoryPath;
}

async function updateChecksumManifest(releaseDirectoryPath) {
  const fileNames = (
    await nodeFileSystem.readdir(releaseDirectoryPath, { withFileTypes: true })
  )
    .filter((entry) => entry.isFile() && entry.name !== "SHA256SUMS")
    .map(({ name }) => name)
    .sort((leftName, rightName) =>
      Buffer.compare(Buffer.from(leftName), Buffer.from(rightName)),
    );
  const checksumLines = [];
  for (const fileName of fileNames) {
    const bytes = await nodeFileSystem.readFile(
      join(releaseDirectoryPath, fileName),
    );
    checksumLines.push(`${calculateSha256(bytes)}  ${fileName}`);
  }
  await nodeFileSystem.writeFile(
    join(releaseDirectoryPath, "SHA256SUMS"),
    `${checksumLines.join("\n")}\n`,
  );
}

describe("Universal Ontology MCP release verifier", () => {
  let fixtureParentDirectoryPath;
  let baseReleaseDirectoryPath;
  let baseBundleMetadataPath;

  beforeAll(async () => {
    fixtureParentDirectoryPath = await nodeFileSystem.mkdtemp(
      join(tmpdir(), "uo-mcp-release-verifier-"),
    );
    baseReleaseDirectoryPath = await createCompleteReleaseCandidate({
      parentDirectoryPath: fixtureParentDirectoryPath,
    });
    baseBundleMetadataPath = join(
      fixtureParentDirectoryPath,
      "bundle-metadata.json",
    );
  });

  afterAll(async () => {
    await nodeFileSystem.rm(fixtureParentDirectoryPath, {
      recursive: true,
      force: true,
    });
  });

  async function cloneBaseCandidate(caseName) {
    const candidatePath = join(fixtureParentDirectoryPath, caseName);
    await nodeFileSystem.cp(baseReleaseDirectoryPath, candidatePath, {
      recursive: true,
      errorOnExist: true,
    });
    return candidatePath;
  }

  async function writeMutatedDistributionWorkflow(
    caseName,
    mutateWorkflowText,
  ) {
    const sourceWorkflowText = await nodeFileSystem.readFile(
      DISTRIBUTION_WORKFLOW_URL,
      "utf8",
    );
    const mutatedWorkflowText = mutateWorkflowText(sourceWorkflowText);
    if (mutatedWorkflowText === sourceWorkflowText) {
      throw new Error(`Workflow mutation did not apply for ${caseName}.`);
    }

    const distributionWorkflowPath = join(
      fixtureParentDirectoryPath,
      `${caseName}.yml`,
    );
    await nodeFileSystem.writeFile(
      distributionWorkflowPath,
      mutatedWorkflowText,
    );
    return distributionWorkflowPath;
  }

  function insertValidateJobStep(workflowText, stepLines) {
    return workflowText.replace(
      "        run: npm ci --ignore-scripts",
      ["        run: npm ci --ignore-scripts", "", ...stepLines].join("\n"),
    );
  }

  test("accepts one complete, version-aligned, data-free release candidate", async () => {
    const npmComparisonSbomPath = join(
      fixtureParentDirectoryPath,
      "npm-comparison.spdx.json",
    );
    await nodeFileSystem.writeFile(
      npmComparisonSbomPath,
      `${JSON.stringify({
        spdxVersion: "SPDX-2.3",
        packages: [
          { name: "universal-ontology", versionInfo: SOFTWARE_VERSION },
          { name: PACKAGE_NAME, versionInfo: SOFTWARE_VERSION },
        ],
      })}\n`,
    );
    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
        npmComparisonSbomPath,
      }),
    ).resolves.toMatchObject({
      tag: RELEASE_TAG,
      softwareVersion: SOFTWARE_VERSION,
      verifiedAssetCount: 12,
    });
  });

  test("rejects any unapproved addition to the workflow step topology", async () => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      "additional-benign-step",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Run an otherwise benign additional command",
          "        run: node --version",
        ]),
    );

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
        distributionWorkflowPath,
      }),
    ).rejects.toThrow(/workflow.*(?:policy|manifest)/iu);
  });

  test("rejects any unapproved change to an approved run script", async () => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      "modified-approved-run-script",
      (workflowText) =>
        workflowText.replace(
          "          npm run mcp:package:build\n",
          [
            "          npm run mcp:package:build",
            "          node --version",
            "",
          ].join("\n"),
        ),
    );

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
        distributionWorkflowPath,
      }),
    ).rejects.toThrow(/workflow.*(?:policy|manifest)/iu);
  });

  test("accepts presentation-only workflow comments and mapping reordering", async () => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      "presentation-only-workflow-changes",
      (workflowText) => {
        const parsedWorkflow = parseYaml(workflowText);

        // Mapping order is not part of YAML's data model. Exercise mappings
        // checked both as policy values and as explicit topology key sets.
        parsedWorkflow.concurrency = {
          "cancel-in-progress":
            parsedWorkflow.concurrency["cancel-in-progress"],
          group: parsedWorkflow.concurrency.group,
        };
        parsedWorkflow.jobs = {
          assemble: parsedWorkflow.jobs.assemble,
          container: parsedWorkflow.jobs.container,
          archive: parsedWorkflow.jobs.archive,
          validate: parsedWorkflow.jobs.validate,
        };
        for (const jobName of ["archive", "assemble"]) {
          const uploadStep = parsedWorkflow.jobs[jobName].steps.find(
            ({ uses }) =>
              typeof uses === "string" &&
              uses.startsWith("actions/upload-artifact@"),
          );
          uploadStep.with = {
            "retention-days": uploadStep.with["retention-days"],
            path: uploadStep.with.path,
            name: uploadStep.with.name,
            "if-no-files-found": uploadStep.with["if-no-files-found"],
          };
        }

        return [
          "# Security note: never expose ${{ secrets }} from this workflow.",
          stringifyYaml(parsedWorkflow),
        ].join("\n");
      },
    );

    await expect(
      verifyUniversalOntologyMcpDistributionWorkflow({
        distributionWorkflowPath,
        releaseInputs: await readUniversalOntologyMcpReleaseInputs(),
      }),
    ).resolves.toEqual({ verifiedJobCount: 4 });
  });

  test("does not decode an allowlisted opaque runtime executable as text", async () => {
    const binaryFixtureParentPath = join(
      fixtureParentDirectoryPath,
      "opaque-runtime-source",
    );
    await nodeFileSystem.mkdir(binaryFixtureParentPath);
    const candidatePath = await createCompleteReleaseCandidate({
      parentDirectoryPath: binaryFixtureParentPath,
      // Opaque executables can coincidentally contain token-shaped byte runs.
      // Text scanners must inspect our application and metadata, not classify
      // a checksum-pinned third-party runtime by decoded binary substrings.
      runtimeExecutableBytes: Buffer.concat([
        Buffer.from([0x00, 0xff, 0x80]),
        Buffer.from(`npm_${"A".repeat(32)}`),
        Buffer.from([0x00, 0xfe, 0x81]),
      ]),
    });

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: candidatePath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: join(
          binaryFixtureParentPath,
          "bundle-metadata.json",
        ),
      }),
    ).resolves.toMatchObject({ verifiedAssetCount: 12 });
  });

  test("rejects a runtime component reported only by the independent npm SBOM", async () => {
    const npmComparisonSbomPath = join(
      fixtureParentDirectoryPath,
      "insufficient-npm-comparison.spdx.json",
    );
    await nodeFileSystem.writeFile(
      npmComparisonSbomPath,
      `${JSON.stringify({
        spdxVersion: "SPDX-2.3",
        packages: [
          { name: "universal-ontology", versionInfo: SOFTWARE_VERSION },
          { name: PACKAGE_NAME, versionInfo: SOFTWARE_VERSION },
          { name: "npm-only-runtime", versionInfo: "9.9.9" },
        ],
      })}\n`,
    );

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
        npmComparisonSbomPath,
      }),
    ).rejects.toThrow(/npm.*SBOM|SBOM.*npm/iu);
  });

  test("rejects a distribution workflow whose action ref leaves the full-SHA allowlist", async () => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      "tampered-action-reference",
      (workflowText) =>
        workflowText.replace(
          "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
          "actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ),
    );

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
        distributionWorkflowPath,
      }),
    ).rejects.toThrow(/workflow|action/iu);
  });

  test("rejects a container job that no longer performs an MCP initialization smoke", async () => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      "missing-container-mcp-initialization",
      (workflowText) =>
        workflowText.replace(
          "await client.connect(transport)",
          "await client.connect_disabled(transport)",
        ),
    );

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
        distributionWorkflowPath,
      }),
    ).rejects.toThrow(/workflow|container|MCP|initialization/iu);
  });

  test.each([
    [
      "a secret context hidden behind a neutral environment name",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Read a secret through a neutral environment name",
          "        env:",
          "          TOKEN: ${{ secrets.NPM_TOKEN }}",
          "        run: node --version",
        ]),
    ],
    [
      "an indirectly referenced secret context",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Serialize the secret context",
          "        env:",
          "          TOKEN_MAP: ${{ toJSON(secrets) }}",
          "        run: node --version",
        ]),
    ],
    [
      "option-bearing npm publication",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Publish through an option-bearing npm command",
          "        run: npm --workspace universal-ontology-mcp-server publish --provenance=false",
        ]),
    ],
    [
      "folded option-bearing npm publication",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Publish through a folded npm command",
          "        run: >-",
          "          npm --workspace universal-ontology-mcp-server",
          "          publish --provenance=false",
        ]),
    ],
    [
      "the shortest accepted npm publication abbreviation",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Publish through an npm abbreviation",
          "        run: npm pu",
        ]),
    ],
    [
      "Docker's image-push command form",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Push an OCI image through the image command group",
          "        run: docker image push example.invalid/universal-ontology-mcp-server:development",
        ]),
    ],
    [
      "Docker Buildx's push flag",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Push an OCI image through Docker Buildx",
          "        run: docker buildx build --push --tag example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker's top-level Buildx build alias",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise a top-level Docker build alias",
          "        run: docker build --push --tag example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker's image-group Buildx build alias",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise an image-group Docker build alias",
          "        run: docker image build --output=type=registry,name=example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker Buildx's abbreviated build command",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise the abbreviated Buildx build command",
          "        run: docker buildx b --cache-to=example.invalid/universal-ontology-mcp-cache:development .",
        ]),
    ],
    [
      "Docker Buildx's registry output",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export an OCI image to a registry through Docker Buildx",
          "        run: docker buildx build --output=type=registry,name=example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker Buildx's quoted registry output type",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export an OCI image through a quoted Docker Buildx output type",
          '        run: docker buildx build --output type="registry",name=example.invalid/universal-ontology-mcp-server:development .',
        ]),
    ],
    [
      "Docker Buildx's attached short output option",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise an attached Buildx output option",
          "        run: docker buildx build -otype=registry,name=example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker Buildx's combined quiet and output options",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise combined Buildx short options",
          "        run: docker buildx build -qotype=registry,name=example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker Buildx's combined short options with a following output value",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Resolve a combined short option from its next argument",
          "        run: docker buildx build -qo type=registry,name=example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker Buildx's opaque output descriptor",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Resolve a Buildx output descriptor at execution time",
          "        env:",
          "          OUTPUT_DESCRIPTOR: type=registry,name=example.invalid/universal-ontology-mcp-server:development",
          '        run: docker buildx build --output "$OUTPUT_DESCRIPTOR" .',
        ]),
    ],
    [
      "Docker Buildx's pushed image output",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export and push an OCI image through Docker Buildx",
          "        run: docker buildx build --output type=image,name=example.invalid/universal-ontology-mcp-server:development,push=true .",
        ]),
    ],
    [
      "Docker Buildx's remote registry cache export",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export a Docker Buildx cache to a registry",
          "        run: docker buildx build --cache-to=type=registry,ref=example.invalid/universal-ontology-mcp-cache:development .",
        ]),
    ],
    [
      "Docker Buildx's implicit registry cache export",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export a Docker Buildx cache through the registry shorthand",
          "        run: docker buildx build --cache-to=example.invalid/universal-ontology-mcp-cache:development .",
        ]),
    ],
    [
      "Docker Buildx's repeated effective cache exporter type",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Override a local cache exporter later in its descriptor",
          "        run: docker buildx build --cache-to=type=local,type=registry,ref=example.invalid/universal-ontology-mcp-cache:development .",
        ]),
    ],
    [
      "Docker Buildx's opaque cache exporter descriptor",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Resolve a Buildx cache descriptor at execution time",
          "        env:",
          "          CACHE_DESCRIPTOR: type=registry,ref=example.invalid/universal-ontology-mcp-cache:development",
          '        run: docker buildx build --cache-to "$CACHE_DESCRIPTOR" .',
        ]),
    ],
    [
      "Docker Buildx Bake's registry output override",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export a Bake target to a registry",
          "        run: docker buildx bake --set '*.output=type=registry'",
        ]),
    ],
    [
      "Docker Buildx Bake's pushed image output override",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Push a Bake target image",
          "        run: docker buildx bake --set=*.output=type=image,push=true",
        ]),
    ],
    [
      "Docker Buildx Bake's registry cache override",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Export a Bake target cache to a registry",
          "        run: docker buildx bake --set '*.cache-to=type=registry,ref=example.invalid/universal-ontology-mcp-cache:development'",
        ]),
    ],
    [
      "Docker's top-level Bake alias",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise a top-level Docker Bake alias",
          "        run: docker bake --set '*.output=type=registry'",
        ]),
    ],
    [
      "Docker Buildx's abbreviated Bake command",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Exercise the abbreviated Buildx Bake command",
          "        run: docker buildx f --set '*.output=type=registry'",
        ]),
    ],
    [
      "Docker publication after a quoted semicolon",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Preserve a semicolon inside a Docker label",
          '        run: docker buildx build --label "note=a;b" --push --tag example.invalid/universal-ontology-mcp-server:development .',
        ]),
    ],
    [
      "Docker publication after a quoted ampersand",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Preserve an ampersand inside a Docker label",
          '        run: docker buildx build --label "note=a&b" --output=type=registry,name=example.invalid/universal-ontology-mcp-server:development .',
        ]),
    ],
    [
      "Docker publication after a quoted pipe",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Preserve a pipe inside a Docker label",
          '        run: docker buildx build --label "note=a|b" --cache-to=type=registry,ref=example.invalid/universal-ontology-mcp-cache:development .',
        ]),
    ],
    [
      "Docker Bake after a quoted global-option separator",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Preserve a separator inside a Docker client path",
          '        run: docker --config "client;config" buildx bake',
        ]),
    ],
    [
      "npm publication hidden behind a cmd.exe caret continuation",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Publish through a cmd.exe continuation",
          "        shell: cmd",
          "        run: |",
          "          npm ^",
          "            publish",
        ]),
    ],
    [
      "Docker publication whose executable is split by a cmd.exe caret continuation",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Split the Docker executable across a cmd.exe continuation",
          "        shell: cmd",
          "        run: |",
          "          doc^",
          "          ker buildx build --push example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "Docker publication whose push flag is split by a cmd.exe caret continuation",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Split a Buildx option across a cmd.exe continuation",
          "        shell: cmd",
          "        run: |",
          "          docker buildx build --pu^",
          "          sh example.invalid/universal-ontology-mcp-server:development .",
        ]),
    ],
    [
      "indexed access to the GitHub token context",
      (workflowText) =>
        insertValidateJobStep(workflowText, [
          "      - name: Read the automatic token through index syntax",
          "        env:",
          "          TOKEN: ${{ github['token'] }}",
          "        run: node --version",
        ]),
    ],
  ])("rejects a workflow containing %s", async (caseName, mutateWorkflow) => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      caseName.replaceAll(" ", "-"),
      mutateWorkflow,
    );

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
        distributionWorkflowPath,
      }),
    ).rejects.toThrow(/publication|remote-write/iu);
  });

  test.each([
    [
      "native archive upload path",
      "path: dist/releases/universal-ontology-mcp-server-v${{ needs.validate.outputs.software-version }}-${{ matrix.targetName }}.${{ matrix.releaseArchiveFormat }}",
    ],
    ["assembled candidate upload path", "path: dist/releases/*"],
  ])("rejects a narrowed %s", async (caseName, exactUploadPath) => {
    const distributionWorkflowPath = await writeMutatedDistributionWorkflow(
      caseName.replaceAll(" ", "-"),
      (workflowText) =>
        workflowText.replace(exactUploadPath, "path: dist/releases/SHA256SUMS"),
    );

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
        distributionWorkflowPath,
      }),
    ).rejects.toThrow(/workflow|upload|artifact/iu);
  });

  test.each([
    [
      "missing asset",
      /missing|asset/iu,
      async (candidatePath) => {
        await nodeFileSystem.rm(
          join(
            candidatePath,
            `${RELEASE_BASE_NAME}-development-candidate-notes.md`,
          ),
        );
      },
    ],
    [
      "unexpected asset",
      /unexpected/iu,
      async (candidatePath) => {
        await nodeFileSystem.writeFile(
          join(candidatePath, "unexpected.txt"),
          "not part of the release contract\n",
        );
      },
    ],
    [
      "renamed asset",
      /missing|unexpected|asset/iu,
      async (candidatePath) => {
        await nodeFileSystem.rename(
          join(candidatePath, `${RELEASE_BASE_NAME}-windows-x64.zip`),
          join(candidatePath, `${RELEASE_BASE_NAME}-win-x64.zip`),
        );
      },
    ],
    [
      "corrupt asset bytes",
      /SHA-256|checksum/iu,
      async (candidatePath) => {
        await nodeFileSystem.appendFile(
          join(candidatePath, `${PACKAGE_NAME}-${SOFTWARE_VERSION}.tgz`),
          "corrupt",
        );
      },
    ],
    [
      "mismatched Registry version",
      /version/iu,
      async (candidatePath) => {
        const serverDocumentPath = join(candidatePath, "server.json");
        const serverDocument = JSON.parse(
          await nodeFileSystem.readFile(serverDocumentPath, "utf8"),
        );
        serverDocument.version = "1.0.1";
        await nodeFileSystem.writeFile(
          serverDocumentPath,
          `${JSON.stringify(serverDocument, null, 2)}\n`,
        );
        await updateChecksumManifest(candidatePath);
      },
    ],
    [
      "insufficient release SBOM",
      /SBOM/iu,
      async (candidatePath) => {
        const releaseSbomPath = join(
          candidatePath,
          `${RELEASE_BASE_NAME}-release.spdx.json`,
        );
        const releaseSbom = JSON.parse(
          await nodeFileSystem.readFile(releaseSbomPath, "utf8"),
        );
        const omittedPackage = releaseSbom.packages.find(({ name }) =>
          name.endsWith("-windows-x64.zip"),
        );
        releaseSbom.packages = releaseSbom.packages.filter(
          ({ SPDXID }) => SPDXID !== omittedPackage.SPDXID,
        );
        releaseSbom.relationships = releaseSbom.relationships.filter(
          ({ spdxElementId, relatedSpdxElement }) =>
            spdxElementId !== omittedPackage.SPDXID &&
            relatedSpdxElement !== omittedPackage.SPDXID,
        );
        await nodeFileSystem.writeFile(
          releaseSbomPath,
          `${JSON.stringify(releaseSbom, null, 2)}\n`,
        );
        await updateChecksumManifest(candidatePath);
      },
    ],
  ])("rejects a %s", async (caseName, expectedError, mutateCandidate) => {
    const candidatePath = await cloneBaseCandidate(
      caseName.replaceAll(" ", "-"),
    );
    await mutateCandidate(candidatePath);

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: candidatePath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: baseBundleMetadataPath,
      }),
    ).rejects.toThrow(expectedError);
  });

  test("rejects ontology data embedded inside otherwise valid archives", async () => {
    const dataFixtureParentPath = join(
      fixtureParentDirectoryPath,
      "data-containing-source",
    );
    await nodeFileSystem.mkdir(dataFixtureParentPath);
    const candidatePath = await createCompleteReleaseCandidate({
      parentDirectoryPath: dataFixtureParentPath,
      includeOntologyData: true,
    });

    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: candidatePath,
        tag: RELEASE_TAG,
        applicationBundleMetadataPath: join(
          dataFixtureParentPath,
          "bundle-metadata.json",
        ),
      }),
    ).rejects.toThrow(/ontology data/iu);
  });

  test("rejects malformed and version-inconsistent release tags", async () => {
    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: "v1.0.0",
        applicationBundleMetadataPath: baseBundleMetadataPath,
      }),
    ).rejects.toThrow(/tag/iu);
    await expect(
      verifyUniversalOntologyMcpRelease({
        releaseDirectoryPath: baseReleaseDirectoryPath,
        tag: "universal-ontology-mcp-server-v1.0.1",
        applicationBundleMetadataPath: baseBundleMetadataPath,
      }),
    ).rejects.toThrow(/version/iu);
  });
});
