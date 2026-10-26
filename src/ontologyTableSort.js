/** Extract only the selected column, preserving the table's binary text order. */
function getSortValue(row, column) {
  let value;
  switch (column) {
    case "objectType":
      value = row.entityType;
      break;
    case "subClassOf":
      value = row.superclasses.join("");
      break;
    case "sources":
      value = row.sources.join("");
      break;
    case "references":
      value = row.references.join("");
      break;
    case "uuid":
    case "uri":
    case "preferredLabel":
    case "definition":
    case "creator":
    case "createdAt":
    case "modifiedAt":
    case "classOfNamedIndividual":
      value = row[column];
      break;
    default:
      value = "";
  }
  return String(value ?? "").toLowerCase();
}

/** Sort in place, retaining row identity and stable ties in the current order. */
export function sortOntologyRows(rows, column, ascending) {
  const keyedRows = rows.map((row) => ({
    row,
    key: getSortValue(row, column),
  }));
  keyedRows.sort((left, right) => {
    if (left.key < right.key) return ascending ? -1 : 1;
    if (left.key > right.key) return ascending ? 1 : -1;
    return 0;
  });
  for (let index = 0; index < rows.length; index += 1) {
    rows[index] = keyedRows[index].row;
  }
  return rows;
}
