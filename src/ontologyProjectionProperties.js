import fieldPropertyHistory from "./projection/field-property-history.v1.json" with { type: "json" };

const PROJECTION_FIELD_NAMES = ["preferredLabel", "definition", "creator"];
const PUBLICATION_VERSION_PATTERN = /^(\d{4})(\d{2})(\d{2})$/u;

function normalizeOntologyPath(ontologyPath) {
  return `/${String(ontologyPath ?? "")
    .replaceAll("\\", "/")
    .split(/[?#]/, 1)[0]
    .replace(/^\/+/, "")}`.toLowerCase();
}

function extractPublicationVersion(path) {
  return path.match(/(?:^|\/)(\d{8})(?:-full)?(?:\.[^/]*)?(?:$|\/)/)?.[1];
}

function requireObject(value, location) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${location} must be an object.`);
  }
}

function requireAbsoluteIri(value, location) {
  if (typeof value !== "string") {
    throw new TypeError(`${location} must be an absolute IRI.`);
  }

  try {
    if (!new URL(value).protocol) {
      throw new TypeError();
    }
  } catch {
    throw new TypeError(`${location} must be an absolute IRI.`);
  }
}

function requirePublicationVersion(
  value,
  location,
  propertyName = "fromVersion",
) {
  const match =
    typeof value === "string" ? PUBLICATION_VERSION_PATTERN.exec(value) : null;

  if (!match) {
    throw new TypeError(`${location} has an invalid ${propertyName}.`);
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    throw new TypeError(`${location} has an invalid ${propertyName}.`);
  }
}

function validateFieldPropertyHistory(history, location) {
  requireObject(history, location);
  requireAbsoluteIri(
    history.initialPropertyIri,
    `${location}.initialPropertyIri`,
  );

  if (!Array.isArray(history.transitions)) {
    throw new TypeError(`${location}.transitions must be an array.`);
  }

  let precedingVersion = null;
  let precedingPropertyIri = history.initialPropertyIri;

  history.transitions.forEach((transition, index) => {
    const transitionLocation = `${location}.transitions[${index}]`;
    requireObject(transition, transitionLocation);
    requirePublicationVersion(transition.fromVersion, transitionLocation);
    requireAbsoluteIri(
      transition.propertyIri,
      `${transitionLocation}.propertyIri`,
    );

    if (precedingVersion && transition.fromVersion <= precedingVersion) {
      throw new TypeError(
        `${location}.transitions must be strictly ascending.`,
      );
    }

    if (transition.propertyIri === precedingPropertyIri) {
      throw new TypeError(
        `${transitionLocation} repeats the preceding propertyIri.`,
      );
    }

    precedingVersion = transition.fromVersion;
    precedingPropertyIri = transition.propertyIri;
  });
}

function validateFieldPropertyHistoryDeclaration(declaration) {
  requireObject(declaration, "declaration");
  requireObject(declaration.defaultPropertyIris, "defaultPropertyIris");

  for (const fieldName of PROJECTION_FIELD_NAMES) {
    requireAbsoluteIri(
      declaration.defaultPropertyIris[fieldName],
      `defaultPropertyIris.${fieldName}`,
    );
  }

  if (
    !Array.isArray(declaration.ontologySeries) ||
    declaration.ontologySeries.length === 0
  ) {
    throw new TypeError("ontologySeries must be a non-empty array.");
  }

  const pathPrefixes = [];

  declaration.ontologySeries.forEach((series, seriesIndex) => {
    const seriesLocation = `ontologySeries[${seriesIndex}]`;
    requireObject(series, seriesLocation);

    if (
      typeof series.pathPrefix !== "string" ||
      !/^\/[a-z0-9/-]+\/$/u.test(series.pathPrefix)
    ) {
      throw new TypeError(`${seriesLocation}.pathPrefix is invalid.`);
    }

    if (pathPrefixes.includes(series.pathPrefix)) {
      throw new TypeError(`duplicate pathPrefix: ${series.pathPrefix}`);
    }

    if (
      pathPrefixes.some(
        (existing) =>
          existing.startsWith(series.pathPrefix) ||
          series.pathPrefix.startsWith(existing),
      )
    ) {
      throw new TypeError(`overlapping pathPrefix: ${series.pathPrefix}`);
    }

    pathPrefixes.push(series.pathPrefix);
    requireObject(
      series.fieldPropertyHistories,
      `${seriesLocation}.fieldPropertyHistories`,
    );

    for (const fieldName of PROJECTION_FIELD_NAMES) {
      validateFieldPropertyHistory(
        series.fieldPropertyHistories[fieldName],
        `${seriesLocation}.fieldPropertyHistories.${fieldName}`,
      );
    }
  });

  if (!Array.isArray(declaration.legacySourceInterpretations)) {
    throw new TypeError("legacySourceInterpretations must be an array.");
  }

  const interpretationKeys = new Set();

  declaration.legacySourceInterpretations.forEach(
    (interpretation, interpretationIndex) => {
      const location = `legacySourceInterpretations[${interpretationIndex}]`;
      requireObject(interpretation, location);

      if (!pathPrefixes.includes(interpretation.pathPrefix)) {
        throw new TypeError(
          `${location}.pathPrefix must identify a declared ontology series.`,
        );
      }

      requirePublicationVersion(
        interpretation.throughVersion,
        location,
        "throughVersion",
      );
      requireAbsoluteIri(
        interpretation.observedPropertyIri,
        `${location}.observedPropertyIri`,
      );
      requireAbsoluteIri(
        interpretation.valueIriPrefix,
        `${location}.valueIriPrefix`,
      );
      requireAbsoluteIri(
        interpretation.interpretedAsPropertyIri,
        `${location}.interpretedAsPropertyIri`,
      );

      const interpretationKey = JSON.stringify(interpretation);

      if (interpretationKeys.has(interpretationKey)) {
        throw new TypeError(
          `${location} duplicates an earlier interpretation.`,
        );
      }

      interpretationKeys.add(interpretationKey);
    },
  );
}

function resolveFieldPropertyIri(history, version) {
  let propertyIri = history.initialPropertyIri;

  for (const transition of history.transitions) {
    if (version < transition.fromVersion) {
      break;
    }

    propertyIri = transition.propertyIri;
  }

  return propertyIri;
}

function getApplicableFieldPropertyIris(history, version) {
  const propertyIris = [history.initialPropertyIri];

  for (const transition of history.transitions) {
    if (version && version < transition.fromVersion) {
      break;
    }

    propertyIris.push(transition.propertyIri);
  }

  return [...new Set(propertyIris)];
}

/**
 * Creates a validated resolver for an ontology projection property history.
 *
 * @param {object} declaration - Field-to-property history declaration.
 * @returns {(ontologyPath: string) => {
 *   preferredLabel: string,
 *   definition: string,
 *   creator: string
 * }}
 */
export function createOntologyProjectionPropertyResolver(declaration) {
  validateFieldPropertyHistoryDeclaration(declaration);

  return (ontologyPath) => {
    const path = normalizeOntologyPath(ontologyPath);
    const version = extractPublicationVersion(path);
    const series = declaration.ontologySeries.find(({ pathPrefix }) =>
      path.includes(pathPrefix),
    );

    if (!series) {
      return { ...declaration.defaultPropertyIris };
    }

    if (!version) {
      const seriesHasTransitions = Object.values(
        series.fieldPropertyHistories,
      ).some(({ transitions }) => transitions.length > 0);

      if (seriesHasTransitions) {
        return { ...declaration.defaultPropertyIris };
      }
    }

    return Object.fromEntries(
      Object.entries(series.fieldPropertyHistories).map(
        ([fieldName, history]) => [
          fieldName,
          version
            ? resolveFieldPropertyIri(history, version)
            : history.initialPropertyIri,
        ],
      ),
    );
  };
}

/**
 * Creates a resolver for every property IRI applicable to a projection field
 * at an ontology version, including properties retained from earlier phases.
 *
 * @param {object} declaration - Field-to-property history declaration.
 * @returns {(ontologyPath: string, fieldName: string) => string[]}
 */
export function createApplicableOntologyProjectionPropertyIriResolver(
  declaration,
) {
  validateFieldPropertyHistoryDeclaration(declaration);

  return (ontologyPath, fieldName) => {
    if (!PROJECTION_FIELD_NAMES.includes(fieldName)) {
      throw new TypeError(`Unknown projection field: ${fieldName}`);
    }

    const path = normalizeOntologyPath(ontologyPath);
    const version = extractPublicationVersion(path);
    const series = declaration.ontologySeries.find(({ pathPrefix }) =>
      path.includes(pathPrefix),
    );

    if (!series) {
      return [declaration.defaultPropertyIris[fieldName]];
    }

    const history = series.fieldPropertyHistories[fieldName];

    if (!version && history.transitions.length > 0) {
      return [
        ...new Set([
          declaration.defaultPropertyIris[fieldName],
          ...getApplicableFieldPropertyIris(history),
        ]),
      ];
    }

    return getApplicableFieldPropertyIris(history, version);
  };
}

/**
 * Creates a resolver for conditional interpretations of historically
 * misapplied source properties.
 *
 * @param {object} declaration - Field-to-property history declaration.
 * @returns {(ontologyPath: string) => object[]}
 */
export function createLegacySourceInterpretationResolver(declaration) {
  validateFieldPropertyHistoryDeclaration(declaration);

  return (ontologyPath) => {
    const path = normalizeOntologyPath(ontologyPath);
    const version = extractPublicationVersion(path);

    if (!version) {
      return [];
    }

    return declaration.legacySourceInterpretations.filter(
      ({ pathPrefix, throughVersion }) =>
        path.includes(pathPrefix) && version <= throughVersion,
    );
  };
}

/**
 * Resolves the RDF property IRIs used by projection fields for an ontology.
 * Unknown and undated paths use the declared default properties.
 *
 * @param {string} ontologyPath - Published ontology path or URL pathname.
 * @returns {{preferredLabel: string, definition: string, creator: string}}
 */
export const resolveOntologyProjectionProperties =
  createOntologyProjectionPropertyResolver(fieldPropertyHistory);

export const resolveApplicableOntologyProjectionPropertyIris =
  createApplicableOntologyProjectionPropertyIriResolver(fieldPropertyHistory);

export const resolveLegacySourceInterpretations =
  createLegacySourceInterpretationResolver(fieldPropertyHistory);
