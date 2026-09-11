import { freezeJsonValueDeeply } from "../src/jsonValueImmutability.js";

describe("validated JSON value immutability", () => {
  test("freezes nested objects and arrays without replacing the parsed value", () => {
    const value = JSON.parse(
      '{"release":{"entities":[{"label":"Person","sources":["urn:example:source"]}]}}',
    );

    expect(freezeJsonValueDeeply(value)).toBe(value);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.release)).toBe(true);
    expect(Object.isFrozen(value.release.entities)).toBe(true);
    expect(Object.isFrozen(value.release.entities[0])).toBe(true);
    expect(Object.isFrozen(value.release.entities[0].sources)).toBe(true);
    expect(() => {
      value.release.entities[0].label = "Changed";
    }).toThrow(TypeError);
    expect(() => {
      value.release.entities[0].sources.push("urn:example:other");
    }).toThrow(TypeError);
    expect(value.release.entities[0]).toEqual({
      label: "Person",
      sources: ["urn:example:source"],
    });
  });

  test("requires already-frozen containers to have already-frozen descendants", () => {
    const descendant = { label: "Person" };
    const shallowlyFrozenValue = Object.freeze({ descendant });

    // This intentionally violates the helper's precondition and characterizes
    // its existing boundary: it does not repair a partially frozen object graph.
    expect(freezeJsonValueDeeply(shallowlyFrozenValue)).toBe(
      shallowlyFrozenValue,
    );
    expect(Object.isFrozen(descendant)).toBe(false);
  });
});
