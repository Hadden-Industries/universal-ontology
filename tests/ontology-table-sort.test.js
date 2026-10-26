import { sortOntologyRows } from "../src/ontologyTableSort.js";

const columns = {
  objectType: "entityType",
  uuid: "uuid",
  uri: "uri",
  preferredLabel: "preferredLabel",
  definition: "definition",
  sources: "sources",
  references: "references",
  creator: "creator",
  createdAt: "createdAt",
  modifiedAt: "modifiedAt",
  subClassOf: "superclasses",
  classOfNamedIndividual: "classOfNamedIndividual",
};

test.each(Object.entries(columns))(
  "sorts %s in both directions with stable ties",
  (column, field) => {
    const arrayColumn = ["sources", "references", "subClassOf"].includes(
      column,
    );
    const rows = ["b", "A", "a", "", "é"].map((value, index) => ({
      id: index,
      sources: [],
      references: [],
      superclasses: [],
      [field]: arrayColumn ? (value ? [value] : []) : value || undefined,
    }));
    const originalRows = [...rows];
    expect(sortOntologyRows(rows, column, true)).toBe(rows);
    expect(rows.map((row) => row.id)).toEqual([3, 1, 2, 0, 4]);
    expect(rows.every((row) => originalRows.includes(row))).toBe(true);
    sortOntologyRows(rows, column, false);
    expect(rows.map((row) => row.id)).toEqual([4, 0, 1, 2, 3]);
  },
);

test("joins selected arrays without separators and reads each key once", () => {
  let reads = 0;
  const rows = ["b", "a", "c"].map((value) => ({
    get sources() {
      reads += 1;
      return [value, "z"];
    },
    get references() {
      throw new Error("Unselected references were extracted");
    },
    get superclasses() {
      throw new Error("Unselected superclasses were extracted");
    },
  }));
  const original = [...rows];
  sortOntologyRows(rows, "sources", true);
  expect(reads).toBe(3);
  expect(rows).toEqual([original[1], original[0], original[2]]);
});

test("uses the current order for ties after a different column sort", () => {
  const rows = [
    { uuid: "b", preferredLabel: "Same" },
    { uuid: "a", preferredLabel: "same" },
  ];
  sortOntologyRows(rows, "uuid", true);
  sortOntologyRows(rows, "preferredLabel", false);
  expect(rows.map((row) => row.uuid)).toEqual(["a", "b"]);
  expect(sortOntologyRows([], "preferredLabel", true)).toEqual([]);
});
