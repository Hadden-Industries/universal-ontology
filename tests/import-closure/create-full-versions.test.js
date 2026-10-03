import { expect, jest, test } from "@jest/globals";
const materializeImportClosure = jest.fn(async () => {});
jest.unstable_mockModule("../../scripts/materializeImportClosure.js", () => ({
  materializeImportClosure,
}));
const { createFullVersions, targets } =
  await import("../../scripts/createFullVersions.js");

test("four target families have explicit catalogs and RDF/XML output", () => {
  expect(targets.map((target) => target.catalog)).toEqual([
    "../iso-iec11179-3/catalog-v001.xml",
    "../reference-data/catalog-v001.xml",
    "../core/catalog-v001.xml",
    "../extended/catalog-v001.xml",
  ]);
  expect(
    targets.every(
      (target) =>
        target.format === "rdfxml" && target.output === `${target.input}-full`,
    ),
  ).toBe(true);
});
test("sequential composition stops at the first failed family", async () => {
  materializeImportClosure.mockClear();
  materializeImportClosure
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("family failure"));
  await expect(createFullVersions()).rejects.toThrow("family failure");
  expect(materializeImportClosure).toHaveBeenCalledTimes(2);
  expect(materializeImportClosure.mock.calls[0][0].inputPath).toContain(
    "11179",
  );
  expect(materializeImportClosure.mock.calls[1][0].inputPath).toContain(
    "reference-data",
  );
});
