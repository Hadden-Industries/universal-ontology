import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import {
  resolveApplicableOntologyProjectionPropertyIris,
  resolveLegacySourceInterpretations,
} from "universal-ontology-projection-policy";
import { createOntologyQueryModule } from "./createOntologyQueryModule.js";
import { createOntologyStoreExecution } from "./createOntologyStoreExecution.js";
import { parseOntologyQueryCatalogBytes } from "./ontologyQueryArtifactParsing.js";
import {
  GetOntologyEntityContextInputSchema,
  OntologyEntityContextSuccessSchema,
  FindOntologyEntityConnectionsInputSchema,
  OntologyEntityConnectionsSuccessSchema,
} from "./ontologyQuerySchemas.js";
import { OntologyQueryError } from "./ontologyQueryErrors.js";
import { createWaiterAwareSharedOperation } from "./createWaiterAwareSharedOperation.js";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const selectionFields = [
  "ontologyReleaseSelection",
  "rootSnapshotId",
  "graphSelection",
  "selectedSnapshotIds",
];

/** Compose immutable filesystem snapshots with one disposable local RDF worker. */
export function createNodeOntologyQueryModule(options) {
  const repository = options.ontologyQueryArtifactRepository;
  const lexicalQuery = createOntologyQueryModule({
    ...options,
    searchContext: {
      normalize: normalizeSearch,
      select: selectSnapshot,
      search: finishSearch,
    },
  });
  const execution = createOntologyStoreExecution({ onEvent: options.onEvent });
  let catalog;
  let closed = false;
  let reservedDatasetBytes = 0;
  let pendingRequests = 0;
  const shutdown = new AbortController();
  const sharedRead = createWaiterAwareSharedOperation({
    createWaiterCancellationError: () =>
      new OntologyQueryError("QUERY_CANCELLED"),
    createAllWaitersCancelledAbortReason: () =>
      new DOMException("All readers cancelled.", "AbortError"),
  });

  async function loadCatalog(signal, pinnedDigest) {
    if (catalog && (!pinnedDigest || catalog.sha256 === pinnedDigest))
      return catalog;
    return sharedRead({
      operationKey: pinnedDigest ?? "context-catalog",
      signal,
      async executeOperation({ signal: internalSignal }) {
        let bytes;
        try {
          bytes = await repository.readOntologyQueryCatalog({
            signal: internalSignal,
            catalogSha256: pinnedDigest,
          });
        } catch (error) {
          if (internalSignal.aborted)
            throw new OntologyQueryError("QUERY_CANCELLED");
          throw new OntologyQueryError("QUERY_INDEX_CATALOG_UNAVAILABLE", {
            cause: error,
          });
        }
        const digest = sha256(bytes);
        if (pinnedDigest && pinnedDigest !== digest)
          throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
        const loaded = {
          document: parseOntologyQueryCatalogBytes(bytes),
          sha256: digest,
        };
        if (!pinnedDigest) catalog = loaded;
        return loaded;
      },
    });
  }

  async function selectSnapshot(input, signal) {
    const { document: currentCatalog, sha256: catalogSha256 } =
      await loadCatalog(signal, input.snapshotRef?.catalogSha256);
    const releases = currentCatalog.releases;
    let root;
    const pinned = input.snapshotRef;
    const requestedId = pinned?.rootSnapshotId ?? input.rootSnapshotId;
    if (requestedId)
      root = releases.find(({ snapshotId }) => snapshotId === requestedId);
    else {
      const selection = input.ontologyReleaseSelection;
      let candidates = releases.filter((release) =>
        selection?.selectionKind === "active_publications"
          ? release.activePublication
          : release.latestStableRelease,
      );
      if (selection?.selectionKind === "specified_releases")
        candidates = releases.filter((release) =>
          selection.ontologyReleases.some(
            (ref) =>
              ref.ontologyArtifactFamilyId ===
                release.ontologyArtifactFamilyId &&
              ref.versionTag === release.versionTag,
          ),
        );
      else if (selection?.ontologyArtifactFamilyIds)
        candidates = candidates.filter(({ ontologyArtifactFamilyId }) =>
          selection.ontologyArtifactFamilyIds.includes(
            ontologyArtifactFamilyId,
          ),
        );
      if (candidates.length !== 1)
        throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE", {
          message: `Choose exactly one root ontology. Available roots: ${candidates
            .slice(0, 8)
            .map(
              ({ ontologyArtifactFamilyId, versionTag }) =>
                `${ontologyArtifactFamilyId}/${versionTag}`,
            )
            .join(", ")}.`,
        });
      [root] = candidates;
    }
    if (!root) throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE");
    const graphSelection =
      pinned?.graphSelection ?? input.graphSelection ?? "catalogued_imports";
    const selected = new Map([[root.snapshotId, root]]);
    const append = (snapshotId) => {
      const release = releases.find(
        (candidate) => candidate.snapshotId === snapshotId,
      );
      if (!release) throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE");
      if (
        release.ontologyIri &&
        [...selected.values()].some(
          (candidate) =>
            candidate.ontologyIri === release.ontologyIri &&
            candidate.snapshotId !== snapshotId,
        )
      )
        throw new OntologyQueryError("UNKNOWN_ONTOLOGY_RELEASE", {
          message:
            "The graph selection contains conflicting versions of one ontology.",
        });
      selected.set(snapshotId, release);
      if (selected.size > 16)
        throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
    };
    if (pinned) for (const snapshotId of pinned.snapshotIds) append(snapshotId);
    else if (graphSelection === "selected_graphs")
      for (const snapshotId of input.selectedSnapshotIds ?? [])
        append(snapshotId);
    else if (graphSelection === "catalogued_imports")
      for (const release of selected.values())
        for (const imported of release.importCoverage.resolved)
          append(imported.snapshotId);
    if (graphSelection === "source_graph" && selected.size !== 1)
      throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
    if (pinned && graphSelection === "catalogued_imports") {
      const reachable = new Set([root.snapshotId]);
      for (const id of reachable)
        for (const imported of releases.find(
          (release) => release.snapshotId === id,
        ).importCoverage.resolved)
          reachable.add(imported.snapshotId);
      if (
        reachable.size !== selected.size ||
        [...reachable].some((id) => !selected.has(id))
      )
        throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
    }
    const snapshotIds = [...selected.keys()].sort();
    const selectionSha256 = sha256(
      JSON.stringify({
        rootSnapshotId: root.snapshotId,
        graphSelection,
        datasets: snapshotIds.map((id) => [
          id,
          selected.get(id).dataset.sha256,
        ]),
      }),
    );
    if (
      pinned &&
      (pinned.selectionSha256 !== selectionSha256 ||
        !pinned.snapshotIds.includes(root.snapshotId) ||
        new Set(pinned.snapshotIds).size !== pinned.snapshotIds.length)
    )
      throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
    return {
      root,
      releases: [...selected.values()],
      snapshotRef: {
        catalogSha256,
        rootSnapshotId: root.snapshotId,
        snapshotIds,
        graphSelection,
        selectionSha256,
      },
    };
  }

  async function loadDatasets(selection, signal) {
    if (typeof repository.readOntologyDataset !== "function")
      throw new OntologyQueryError("QUERY_INDEX_UNAVAILABLE", {
        message:
          "Context datasets are unavailable. Regenerate local artifacts and select a filesystem query root.",
      });
    let totalBytes = 0;
    const datasets = [];
    for (const release of selection.releases) {
      totalBytes += release.dataset.byteLength;
      if (totalBytes > 64 * 1024 * 1024)
        throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
      const bytes = await sharedRead({
        operationKey: release.dataset.sha256,
        signal,
        executeOperation: ({ signal: internalSignal }) =>
          repository.readOntologyDataset({
            relativePath: release.dataset.relativePath,
            signal: internalSignal,
          }),
      });
      if (
        bytes.byteLength !== release.dataset.byteLength ||
        sha256(bytes) !== release.dataset.sha256
      )
        throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
      datasets.push({
        snapshotId: release.snapshotId,
        sha256: release.dataset.sha256,
        nquads: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      });
    }
    return datasets;
  }

  function projectionPolicies(selection) {
    return Object.fromEntries(
      selection.releases.map((release) => [
        release.snapshotId,
        {
          definitionPredicates: resolveApplicableOntologyProjectionPropertyIris(
            release.sourceArtifactRelativePath,
            "definition",
          ),
          legacySources: resolveLegacySourceInterpretations(
            release.sourceArtifactRelativePath,
          ),
        },
      ]),
    );
  }

  async function executeSnapshot(selection, query, signal) {
    if (pendingRequests >= 9) throw new OntologyQueryError("QUERY_QUEUE_FULL");
    const size = selection.releases.reduce(
      (sum, release) => sum + release.dataset.byteLength,
      0,
    );
    if (reservedDatasetBytes + size > 64 * 1024 * 1024)
      throw new OntologyQueryError("DATASET_LIMIT_EXCEEDED");
    pendingRequests += 1;
    reservedDatasetBytes += size;
    try {
      const datasets = await loadDatasets(selection, signal);
      return await execution.query({
        datasetKey: selection.snapshotRef.selectionSha256,
        datasets,
        query,
        signal,
      });
    } finally {
      pendingRequests -= 1;
      reservedDatasetBytes -= size;
    }
  }

  function decodeCursor(cursor) {
    try {
      if (typeof cursor !== "string" || cursor.length > 8192) throw new Error();
      const value = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8"),
      );
      if (
        !value.criteria ||
        typeof value.position?.entityIri !== "string" ||
        !(
          value.position.definitionAssertionRef === null ||
          /^[0-9a-f]{64}$/u.test(value.position.definitionAssertionRef)
        ) ||
        value.digest !==
          sha256(
            JSON.stringify([
              value.criteria,
              value.position,
              value.originalSelection,
            ]),
          )
      )
        throw new Error();
      return value;
    } catch {
      throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH", {
        message: "Invalid search cursor; repeat the initial search.",
      });
    }
  }

  function normalizeSearch(input) {
    if (!input?.cursor) return input;
    const { criteria, originalSelection } = decodeCursor(input.cursor);
    for (const [name, value] of Object.entries(input)) {
      if (["cursor", "maximumResultCount", "maximumResultBytes"].includes(name))
        continue;
      const expected = selectionFields.includes(name)
        ? originalSelection?.[name]
        : criteria[name];
      if (JSON.stringify(value) !== JSON.stringify(expected))
        throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH", {
          message: "Search criteria changed after the cursor was issued.",
        });
    }
    return {
      ...criteria,
      ...Object.fromEntries(
        Object.entries(input).filter(
          ([name]) => !selectionFields.includes(name),
        ),
      ),
    };
  }

  async function finishSearch({
    input,
    selection,
    matches,
    resolvedOntologyReleases,
    signal,
  }) {
    const ownedNamespaces =
      input.ownershipNamespaceIris ?? selection.root.ownedNamespaces;
    if (input.ownership === "root_module" && ownedNamespaces.length === 0)
      throw new OntologyQueryError("QUERY_INDEX_UNAVAILABLE", {
        message:
          "Ownership is unknown for this ontology; supply ownershipNamespaceIris explicitly.",
      });
    const criteria = {
      ...(input.queryText ? { queryText: input.queryText } : {}),
      ...(input.entityKinds ? { entityKinds: input.entityKinds } : {}),
      ...(input.definitionSourceStatus
        ? { definitionSourceStatus: input.definitionSourceStatus }
        : {}),
      ...(input.ownership ? { ownership: input.ownership } : {}),
      ...(input.ownershipNamespaceIris
        ? { ownershipNamespaceIris: input.ownershipNamespaceIris }
        : {}),
      preferredLanguageTags: input.preferredLanguageTags,
      snapshotRef: selection.snapshotRef,
    };
    const position = input.cursor ? decodeCursor(input.cursor).position : null;
    const originalSelection = input.cursor
      ? decodeCursor(input.cursor).originalSelection
      : Object.fromEntries(
          selectionFields
            .filter((name) => input[name] !== undefined)
            .map((name) => [name, input[name]]),
        );
    if (
      position &&
      !matches.some(
        (match) => match.ontologyEntity.entityIri === position.entityIri,
      )
    )
      throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH");
    const page = await executeSnapshot(
      selection,
      {
        operation: "search",
        input: {
          input: {
            ...input,
            projectionPolicies: projectionPolicies(selection),
          },
          matches,
          ownedNamespaces,
          position,
        },
      },
      signal,
    );
    const nextCursor = page.position
      ? Buffer.from(
          JSON.stringify({
            criteria,
            position: page.position,
            originalSelection,
            digest: sha256(
              JSON.stringify([criteria, page.position, originalSelection]),
            ),
          }),
        ).toString("base64url")
      : null;
    return {
      outcome: "success",
      resultKind: "ontology_entity_search",
      ...(input.queryText ? { queryText: input.queryText } : {}),
      preferredLanguageTags: input.preferredLanguageTags,
      snapshotRef: selection.snapshotRef,
      resolvedOntologyReleases,
      returnedEntityCount: page.returnedEntityCount,
      returnedDefinitionAssertionCount: page.returnedDefinitionAssertionCount,
      resultSetTruncated: nextCursor !== null,
      nextCursor,
      truncationReasons: page.truncationReasons,
      matches: page.matches,
    };
  }

  async function contextOperation(
    rawInput,
    { signal } = {},
    connections = false,
  ) {
    const input = (
      connections
        ? FindOntologyEntityConnectionsInputSchema
        : GetOntologyEntityContextInputSchema
    ).parse(rawInput);
    if (closed) throw new OntologyQueryError("QUERY_CANCELLED");
    const deadline = AbortSignal.timeout(10000);
    const lifecycle = AbortSignal.any([
      shutdown.signal,
      deadline,
      ...(signal ? [signal] : []),
    ]);
    try {
      const selection = await selectSnapshot(input, lifecycle);
      async function resolve(identifier) {
        if (identifier.identifierKind === "entity_iri")
          return identifier.identifierValue;
        const resolved = await lexicalQuery.resolveOntologyEntity(
          {
            entityIdentifier: identifier,
            preferredLanguageTags: input.preferredLanguageTags,
          },
          { signal: lifecycle, catalogReleases: selection.releases },
        );
        if (resolved.resolutionStatus !== "found")
          throw new OntologyQueryError("UNKNOWN_ENTITY");
        return resolved.ontologyEntities[0].entityIri;
      }
      const entityIri = await resolve(input.entityIdentifier);
      const targetEntityIri = connections
        ? await resolve(input.targetEntityIdentifier)
        : undefined;
      const projection = await executeSnapshot(
        selection,
        {
          operation: connections ? "connections" : "context",
          input: {
            ...input,
            entityIri,
            targetEntityIri,
            projectionPolicies: projectionPolicies(selection),
          },
        },
        lifecycle,
      );
      const context = connections ? projection.context : projection;
      const definitions =
        context.nodes.find((node) => node.entityIri === entityIri)
          ?.definitions ?? [];
      if (
        input.definitionAssertionRef &&
        !definitions.some(
          ({ definitionAssertionRef }) =>
            definitionAssertionRef === input.definitionAssertionRef,
        )
      )
        throw new OntologyQueryError("QUERY_INDEX_DIGEST_MISMATCH", {
          message:
            "The definition assertion does not belong to this entity and snapshot.",
        });
      return (
        connections
          ? OntologyEntityConnectionsSuccessSchema
          : OntologyEntityContextSuccessSchema
      ).parse({
        outcome: "success",
        resultKind: connections
          ? "ontology_entity_connections"
          : "ontology_entity_context",
        snapshotRef: selection.snapshotRef,
        selectedDefinitionAssertionRef:
          input.definitionAssertionRef ??
          (definitions.length === 1
            ? definitions[0].definitionAssertionRef
            : null),
        context,
        ...(connections ? { ...projection, targetEntityIri } : {}),
        importCoverage: selection.releases.map(
          ({ snapshotId, importCoverage }) => ({
            snapshotId,
            unresolved: importCoverage.unresolved,
          }),
        ),
      });
    } catch (error) {
      if (deadline.aborted)
        throw new OntologyQueryError("QUERY_DEADLINE_EXCEEDED");
      if (lifecycle.aborted) throw new OntologyQueryError("QUERY_CANCELLED");
      throw error;
    }
  }

  return Object.freeze({
    ...lexicalQuery,
    async checkReadiness({ signal } = {}) {
      const { document } = await loadCatalog(signal);
      const preferred = document.releases.filter(
        (release) =>
          release.activePublication ||
          release.latestStableRelease ||
          release.versionTag === "working",
      );
      const releases = preferred.length
        ? preferred
        : document.releases.slice(0, 1);
      if (!releases.length)
        throw new OntologyQueryError("QUERY_INDEX_UNAVAILABLE");
      await lexicalQuery.resolveOntologyEntity(
        {
          entityIdentifier: {
            identifierKind: "entity_iri",
            identifierValue: "urn:uo:readiness-probe",
          },
        },
        { signal, catalogReleases: releases },
      );
    },
    async searchOntologyEntities(input, { signal } = {}) {
      const deadline = AbortSignal.timeout(10000);
      const lifecycle = AbortSignal.any([
        shutdown.signal,
        deadline,
        ...(signal ? [signal] : []),
      ]);
      try {
        return await lexicalQuery.searchOntologyEntities(input, {
          signal: lifecycle,
        });
      } catch (error) {
        if (deadline.aborted)
          throw new OntologyQueryError("QUERY_DEADLINE_EXCEEDED");
        if (lifecycle.aborted) throw new OntologyQueryError("QUERY_CANCELLED");
        throw error;
      }
    },
    getOntologyEntityContext: (input, options) =>
      contextOperation(input, options),
    findOntologyEntityConnections: (input, options) =>
      contextOperation(input, options, true),
    async close() {
      closed = true;
      shutdown.abort();
      await execution.close();
    },
  });
}
