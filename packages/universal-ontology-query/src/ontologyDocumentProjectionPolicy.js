import { OntologyVersionTagSchema } from "./ontologyQuerySchemas.js";
import {
  resolveApplicableOntologyProjectionPropertyIris,
  resolveLegacySourceInterpretations,
} from "universal-ontology-projection-policy";

const uoSeries =
  /^https:\/\/haddenindustries\.com\/ontology\/(universal\/(?:core|extended|reference-data))\/?$/u;
const skos = "http://www.w3.org/2004/02/skos/core#";
const rdfs = "http://www.w3.org/2000/01/rdf-schema#";

/** Apply the existing history declaration only when both authored identities
 * identify the same dated UO series. Physical filenames are never evidence.
 */
export function documentProjectionPolicy({ ontologyIRI, versionIRI }) {
  const series = uoSeries.exec(ontologyIRI?.value ?? "")?.[1];
  const prefix = `https://haddenindustries.com/ontology/${series}/`;
  const version = versionIRI?.value?.startsWith(prefix)
    ? versionIRI.value.slice(prefix.length)
    : "";
  if (
    !series ||
    !/^\d{8}$/.test(version) ||
    !OntologyVersionTagSchema.safeParse(version).success
  )
    return {
      definitionPredicates: [`${skos}definition`],
      labelPredicates: [`${skos}prefLabel`, `${rdfs}label`],
      legacySources: [],
      interpretation: series
        ? "unverified_release_metadata"
        : "standard_annotations",
    };
  const path = `/${series}/${version}`;
  return {
    definitionPredicates: [
      ...new Set([
        `${skos}definition`,
        ...resolveApplicableOntologyProjectionPropertyIris(path, "definition"),
      ]),
    ],
    labelPredicates: [
      ...new Set([
        `${skos}prefLabel`,
        `${rdfs}label`,
        ...resolveApplicableOntologyProjectionPropertyIris(
          path,
          "preferredLabel",
        ),
      ]),
    ],
    legacySources: resolveLegacySourceInterpretations(path),
    interpretation: "uo_field_property_history_v1",
  };
}
