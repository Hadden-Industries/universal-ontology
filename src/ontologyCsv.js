const CSV_HEADERS = [
  "Entity Type",
  "UUID",
  "URI",
  "Preferred Label",
  "Definition",
  "Sources",
  "Creator",
  "Created At",
  "Modified At",
  "Superclasses",
  "Class of Named Individual",
];

function escapeCsvValue(value) {
  let escapedValue = String(value ?? "");

  if (/^[=+\-@]/.test(escapedValue)) {
    escapedValue = `'${escapedValue}`;
  }

  if (
    escapedValue.includes(",") ||
    escapedValue.includes('"') ||
    escapedValue.includes("\n")
  ) {
    escapedValue = `"${escapedValue.replace(/"/g, '""')}"`;
  }

  return escapedValue;
}

/**
 * Serializes ontology view-model rows as CSV text.
 *
 * @param {Array<Object>} rows - The ontology rows to serialize.
 * @returns {string} The serialized CSV document.
 */
export function serializeOntologyRowsAsCsv(rows) {
  const csvRows = [CSV_HEADERS.join(",")];

  for (const row of rows) {
    const values = [
      row.entityType,
      row.uuid,
      row.uri,
      row.preferredLabel,
      row.definition,
      row.sources.join("\n"),
      row.creator,
      row.createdAt,
      row.modifiedAt,
      row.superclasses.join("\n"),
      row.classOfNamedIndividual,
    ].map(escapeCsvValue);

    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}
