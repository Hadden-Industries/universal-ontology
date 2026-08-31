import { createHash } from "node:crypto";
import * as nodeFileSystem from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const REPOSITORY_ROOT_PATH = fileURLToPath(new URL("../../", import.meta.url));
const ROOT_PACKAGE_JSON_PATH = join(REPOSITORY_ROOT_PATH, "package.json");
const PUBLIC_PACKAGE_DIRECTORY_PATH = join(
  REPOSITORY_ROOT_PATH,
  "packages",
  "universal-ontology-mcp-server",
);
const PUBLIC_PACKAGE_JSON_PATH = join(
  PUBLIC_PACKAGE_DIRECTORY_PATH,
  "package.json",
);
const PUBLIC_PACKAGE_NOTICES_PATH = join(
  PUBLIC_PACKAGE_DIRECTORY_PATH,
  "THIRD_PARTY_NOTICES.md",
);
const APPLICATION_ENTRY_POINT_RELATIVE_PATH =
  "scripts/runUniversalOntologyMcpStdioServer.js";
const APPLICATION_ENTRY_POINT_PATH = join(
  REPOSITORY_ROOT_PATH,
  ...APPLICATION_ENTRY_POINT_RELATIVE_PATH.split("/"),
);
const APPLICATION_BUNDLE_RELATIVE_PATH =
  "packages/universal-ontology-mcp-server/dist/universal-ontology-mcp-server.mjs";
const APPLICATION_BUNDLE_PATH = join(
  REPOSITORY_ROOT_PATH,
  ...APPLICATION_BUNDLE_RELATIVE_PATH.split("/"),
);
const APPLICATION_BUNDLE_METADATA_PATH = join(
  REPOSITORY_ROOT_PATH,
  "dist",
  "release-work",
  "universal-ontology-mcp-application-bundle.json",
);
const ALLOWED_REPOSITORY_INPUT_PREFIXES = Object.freeze([
  "src/mcp/",
  "src/ontologyQuery/",
]);
const ALLOWED_REPOSITORY_INPUT_PATHS = new Set([
  APPLICATION_ENTRY_POINT_RELATIVE_PATH,
  "package.json",
  "src/ontologyProjectionProperties.js",
  "src/projection/field-property-history.v1.json",
]);
const ALLOWED_DIRECT_BUNDLED_COMPONENT_NAMES = new Set([
  "@modelcontextprotocol/core",
  "@modelcontextprotocol/server",
  "zod",
]);
// The published MCP server artifact is itself prebundled. esbuild attributes
// these validators to @modelcontextprotocol/server in its metafile. These
// records therefore describe the source-region identities in that official
// artifact, rather than unrelated versions installed for this build toolchain.
const PREBUNDLED_SERVER_COMPONENTS = Object.freeze([
  Object.freeze({
    name: "ajv",
    version: "8.18.0",
    license: "MIT",
    packageStoreEntryName: "ajv@8.18.0",
  }),
  Object.freeze({
    name: "ajv-formats",
    version: "3.0.1",
    license: "MIT",
    packageStoreEntryName: "ajv-formats@3.0.1_ajv@8.18.0",
  }),
  Object.freeze({
    name: "fast-deep-equal",
    version: "3.1.3",
    license: "MIT",
    packageStoreEntryName: "fast-deep-equal@3.1.3",
  }),
  Object.freeze({
    name: "fast-uri",
    version: "3.1.0",
    license: "BSD-3-Clause",
    packageStoreEntryName: "fast-uri@3.1.0",
  }),
  Object.freeze({
    name: "json-schema-traverse",
    version: "1.0.0",
    license: "MIT",
    packageStoreEntryName: "json-schema-traverse@1.0.0",
  }),
]);
const MCP_SERVER_AJV_PROVIDER_INPUT_PATTERN =
  /^node_modules\/@modelcontextprotocol\/server\/dist\/ajvProvider-[^/]+\.mjs$/u;
const ALLOWED_NETWORK_ORIGINS = new Set([
  "http://json-schema.org",
  "http://purl.org",
  "http://www.w3.org",
  "https://github.com",
  "https://haddenindustries.com",
  "https://json-schema.org",
  "https://opensource.org",
  "https://raw.githubusercontent.com",
]);
const APPROVED_AJV_DYNAMIC_FUNCTION_CONSTRUCTOR =
  "new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode)(this, this.scope.get())";

function normalizeRelativePath(path) {
  return path.split(sep).join("/");
}

function calculateSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readJsonDocument(path) {
  return JSON.parse(await nodeFileSystem.readFile(path, "utf8"));
}

function requireMatchingPackageVersions(rootPackage, publicPackage) {
  if (
    typeof rootPackage.version !== "string" ||
    rootPackage.version === "" ||
    publicPackage.version !== rootPackage.version
  ) {
    throw new Error(
      "Root and public Universal Ontology MCP package versions must match.",
    );
  }
}

function getNodeModulesPackageName(inputPath) {
  const normalizedPath = normalizeRelativePath(inputPath);
  const nodeModulesMarker = "node_modules/";
  const markerIndex = normalizedPath.lastIndexOf(nodeModulesMarker);

  if (markerIndex < 0) {
    return null;
  }

  const pathAfterNodeModules = normalizedPath.slice(
    markerIndex + nodeModulesMarker.length,
  );
  const [firstSegment, secondSegment] = pathAfterNodeModules.split("/");

  if (!firstSegment) {
    return null;
  }

  return firstSegment.startsWith("@")
    ? `${firstSegment}/${secondSegment ?? ""}`
    : firstSegment;
}

function collectAndValidateBundledComponentNames(metafile) {
  const bundledComponentNames = new Set();

  for (const inputPath of Object.keys(metafile.inputs)) {
    const normalizedInputPath = normalizeRelativePath(inputPath);
    const packageName = getNodeModulesPackageName(normalizedInputPath);

    if (packageName) {
      if (!ALLOWED_DIRECT_BUNDLED_COMPONENT_NAMES.has(packageName)) {
        throw new Error(
          `Application bundle contains an unapproved runtime package: ${packageName}`,
        );
      }

      bundledComponentNames.add(packageName);
      continue;
    }

    const repositoryInputIsAllowed =
      ALLOWED_REPOSITORY_INPUT_PATHS.has(normalizedInputPath) ||
      ALLOWED_REPOSITORY_INPUT_PREFIXES.some((prefix) =>
        normalizedInputPath.startsWith(prefix),
      );

    if (!repositoryInputIsAllowed) {
      throw new Error(
        `Application bundle contains an unapproved repository input: ${normalizedInputPath}`,
      );
    }
  }

  return [...bundledComponentNames].sort((left, right) =>
    left.localeCompare(right),
  );
}

async function readBundledComponents(componentNames) {
  return Promise.all(
    componentNames.map(async (name) => {
      const packageMetadata = await readJsonDocument(
        join(
          REPOSITORY_ROOT_PATH,
          "node_modules",
          ...name.split("/"),
          "package.json",
        ),
      );

      if (
        packageMetadata.name !== name ||
        typeof packageMetadata.version !== "string" ||
        typeof packageMetadata.license !== "string"
      ) {
        throw new Error(
          `Bundled component metadata is incomplete for ${name}.`,
        );
      }

      return Object.freeze({
        name,
        version: packageMetadata.version,
        license: packageMetadata.license,
      });
    }),
  );
}

async function readAndValidatePrebundledServerComponents(metafile) {
  const ajvProviderInputPaths = Object.keys(metafile.inputs)
    .map(normalizeRelativePath)
    .filter((inputPath) =>
      MCP_SERVER_AJV_PROVIDER_INPUT_PATTERN.test(inputPath),
    );

  if (ajvProviderInputPaths.length !== 1) {
    throw new Error(
      "Application bundle must contain exactly one official MCP server AJV provider input.",
    );
  }

  const ajvProviderSourceText = await nodeFileSystem.readFile(
    join(REPOSITORY_ROOT_PATH, ...ajvProviderInputPaths[0].split("/")),
    "utf8",
  );
  const sourceRegionIdentityPattern =
    /\/\/#region [^\r\n]*\/\.pnpm\/([^/\r\n]+)\/node_modules\/((?:@[^/\r\n]+\/)?[^/\r\n]+)\//gu;
  const discoveredSourceRegionIdentities = new Set(
    [...ajvProviderSourceText.matchAll(sourceRegionIdentityPattern)].map(
      ([, packageStoreEntryName, packageName]) =>
        `${packageStoreEntryName}|${packageName}`,
    ),
  );
  const expectedSourceRegionIdentities = new Set(
    PREBUNDLED_SERVER_COMPONENTS.map(
      ({ name, packageStoreEntryName }) => `${packageStoreEntryName}|${name}`,
    ),
  );
  const missingSourceRegionIdentities = [
    ...expectedSourceRegionIdentities,
  ].filter((identity) => !discoveredSourceRegionIdentities.has(identity));
  const unexpectedSourceRegionIdentities = [
    ...discoveredSourceRegionIdentities,
  ].filter((identity) => !expectedSourceRegionIdentities.has(identity));

  if (
    missingSourceRegionIdentities.length > 0 ||
    unexpectedSourceRegionIdentities.length > 0
  ) {
    throw new Error(
      `Official MCP server AJV provider component identities changed (missing: ${missingSourceRegionIdentities.join(", ") || "none"}; unexpected: ${unexpectedSourceRegionIdentities.join(", ") || "none"}).`,
    );
  }

  return PREBUNDLED_SERVER_COMPONENTS.map(({ name, version, license }) =>
    Object.freeze({ name, version, license }),
  );
}

function createRootPackageVersionProjectionPlugin(rootPackageVersion) {
  return {
    name: "root-package-version-projection",
    setup(buildContext) {
      // esbuild's filter syntax is RE2-compatible and therefore must not use
      // JavaScript-only regular-expression flags such as `u`.
      buildContext.onLoad({ filter: /package\.json$/ }, (arguments_) => {
        if (resolve(arguments_.path) !== resolve(ROOT_PACKAGE_JSON_PATH)) {
          return null;
        }

        // Runtime metadata needs only the version. Projecting that single
        // property prevents scripts and build dependencies from leaking into
        // the distributable application while retaining package.json as the
        // one authoritative version source.
        return {
          contents: `${JSON.stringify({ version: rootPackageVersion })}\n`,
          loader: "json",
        };
      });
    },
  };
}

function assertNoticesCoverBundledComponents(noticesText, bundledComponents) {
  for (const component of bundledComponents) {
    const componentHeading = `## ${component.name} ${component.version}`;
    const licenseDeclaration = `License: ${component.license}`;

    if (
      !noticesText.includes(componentHeading) ||
      !noticesText.includes(licenseDeclaration)
    ) {
      throw new Error(
        `THIRD_PARTY_NOTICES.md does not identify ${component.name}@${component.version} under ${component.license}.`,
      );
    }
  }
}

function assertBundleContainsOnlyAllowedNetworkOrigins(bundleText) {
  const networkOriginPattern = /https?:\/\/[A-Za-z0-9._:-]+/gu;

  for (const match of bundleText.matchAll(networkOriginPattern)) {
    const origin = new URL(match[0]).origin;

    if (!ALLOWED_NETWORK_ORIGINS.has(origin)) {
      throw new Error(
        `Application bundle contains an unexpected network origin: ${origin}`,
      );
    }
  }
}

function assertBundleExcludesForbiddenContent(bundleBytes) {
  const bundleText = bundleBytes.toString("utf8");
  const normalizedRepositoryRoot = normalizeRelativePath(
    resolve(REPOSITORY_ROOT_PATH),
  );
  const forbiddenTextFragments = [
    normalizedRepositoryRoot,
    resolve(REPOSITORY_ROOT_PATH),
    "extended/universal-extended.owl",
    "reference-data/reference-data.owl",
    "tests/fixtures/ontology-query",
    "sourceMappingURL=",
    "sourcesContent",
    "-----BEGIN PRIVATE KEY-----",
  ];

  for (const forbiddenTextFragment of forbiddenTextFragments) {
    if (bundleText.includes(forbiddenTextFragment)) {
      throw new Error(
        `Application bundle contains forbidden build or source content: ${forbiddenTextFragment}`,
      );
    }
  }

  const approvedAjvConstructorIndex = bundleText.indexOf(
    APPROVED_AJV_DYNAMIC_FUNCTION_CONSTRUCTOR,
  );

  if (
    approvedAjvConstructorIndex < 0 ||
    approvedAjvConstructorIndex !==
      bundleText.lastIndexOf(APPROVED_AJV_DYNAMIC_FUNCTION_CONSTRUCTOR)
  ) {
    throw new Error(
      "Application bundle must contain exactly one pinned AJV schema compiler constructor.",
    );
  }

  // The official Node MCP validator uses AJV's code generator. With AJV and
  // esbuild pinned, this one byte-exact constructor is deliberate; remove it
  // before applying the general dynamic-code prohibition to the rest.
  const bundleTextWithoutApprovedAjvConstructor = bundleText.replace(
    APPROVED_AJV_DYNAMIC_FUNCTION_CONSTRUCTOR,
    "",
  );
  const forbiddenPatterns = [
    { name: "dynamic eval", pattern: /\beval\s*\(/u },
    { name: "dynamic function constructor", pattern: /\bnew\s+Function\s*\(/u },
    { name: "runtime dynamic import", pattern: /\bimport\s*\(/u },
    { name: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u },
    { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/u },
  ];

  for (const { name, pattern } of forbiddenPatterns) {
    if (pattern.test(bundleTextWithoutApprovedAjvConstructor)) {
      throw new Error(`Application bundle contains forbidden ${name}.`);
    }
  }

  assertBundleContainsOnlyAllowedNetworkOrigins(bundleText);
}

function assertOwnedOutputPath(path, expectedParentPath) {
  const relativePath = relative(resolve(expectedParentPath), resolve(path));

  if (
    relativePath === "" ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath === ".." ||
    isAbsolute(relativePath)
  ) {
    throw new Error("Distribution output escaped its owned directory.");
  }
}

/**
 * Build the one canonical, dependency-bundled MCP application used by every
 * distribution format. The function is intentionally deterministic: no clock,
 * temporary path, host name, or Git state enters the emitted bytes or metadata.
 */
export async function buildUniversalOntologyMcpApplicationBundle() {
  const [rootPackage, publicPackage, noticesText] = await Promise.all([
    readJsonDocument(ROOT_PACKAGE_JSON_PATH),
    readJsonDocument(PUBLIC_PACKAGE_JSON_PATH),
    nodeFileSystem.readFile(PUBLIC_PACKAGE_NOTICES_PATH, "utf8"),
  ]);
  requireMatchingPackageVersions(rootPackage, publicPackage);
  const publicPackageDistPath = join(PUBLIC_PACKAGE_DIRECTORY_PATH, "dist");
  assertOwnedOutputPath(APPLICATION_BUNDLE_PATH, publicPackageDistPath);
  assertOwnedOutputPath(
    APPLICATION_BUNDLE_METADATA_PATH,
    join(REPOSITORY_ROOT_PATH, "dist", "release-work"),
  );
  await nodeFileSystem.rm(publicPackageDistPath, {
    recursive: true,
    force: true,
  });
  await Promise.all([
    nodeFileSystem.mkdir(dirname(APPLICATION_BUNDLE_PATH), { recursive: true }),
    nodeFileSystem.mkdir(dirname(APPLICATION_BUNDLE_METADATA_PATH), {
      recursive: true,
    }),
  ]);

  const buildResult = await build({
    absWorkingDir: REPOSITORY_ROOT_PATH,
    // An absolute entry point avoids drive-relative resolution ambiguity in
    // esbuild's native Windows service while absWorkingDir keeps metafile input
    // names stable and repository-relative on every host.
    entryPoints: [APPLICATION_ENTRY_POINT_PATH],
    outfile: APPLICATION_BUNDLE_PATH,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    minify: false,
    treeShaking: true,
    legalComments: "eof",
    metafile: true,
    sourcemap: false,
    charset: "utf8",
    logLevel: "silent",
    plugins: [createRootPackageVersionProjectionPlugin(rootPackage.version)],
  });
  const bundledComponentNames = collectAndValidateBundledComponentNames(
    buildResult.metafile,
  );
  const [directBundledComponents, prebundledServerComponents] =
    await Promise.all([
      readBundledComponents(bundledComponentNames),
      readAndValidatePrebundledServerComponents(buildResult.metafile),
    ]);
  const bundledComponents = [
    ...directBundledComponents,
    ...prebundledServerComponents,
  ].sort(({ name: leftName }, { name: rightName }) =>
    leftName.localeCompare(rightName),
  );
  assertNoticesCoverBundledComponents(noticesText, bundledComponents);
  const bundleBytes = await nodeFileSystem.readFile(APPLICATION_BUNDLE_PATH);
  assertBundleExcludesForbiddenContent(bundleBytes);

  if (process.platform !== "win32") {
    await nodeFileSystem.chmod(APPLICATION_BUNDLE_PATH, 0o755);
  }

  const metadata = Object.freeze({
    applicationBundleMetadataFormatVersion: 1,
    packageName: publicPackage.name,
    packageVersion: publicPackage.version,
    bundleRelativePath: APPLICATION_BUNDLE_RELATIVE_PATH,
    bundleByteLength: bundleBytes.byteLength,
    bundleSha256: calculateSha256(bundleBytes),
    approvedDynamicCodeGeneration: [
      {
        componentName: "ajv",
        componentVersion: "8.18.0",
        occurrenceCount: 1,
        purpose: "Compile MCP JSON Schemas into validation functions",
      },
    ],
    bundledComponents,
    bundledInputPaths: Object.keys(buildResult.metafile.inputs)
      .map(normalizeRelativePath)
      .sort((left, right) => left.localeCompare(right)),
  });
  await nodeFileSystem.writeFile(
    APPLICATION_BUNDLE_METADATA_PATH,
    `${JSON.stringify(metadata, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  return metadata;
}

const invokedScriptPath = process.argv[1]
  ? resolve(process.argv[1])
  : undefined;

if (invokedScriptPath === fileURLToPath(import.meta.url)) {
  try {
    await buildUniversalOntologyMcpApplicationBundle();
  } catch (error) {
    process.stderr.write(
      `Universal Ontology MCP application bundle build failed: ${error?.message ?? "unknown error"}\n`,
    );
    process.exitCode = 1;
  }
}
