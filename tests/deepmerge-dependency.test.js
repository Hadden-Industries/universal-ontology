import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const merge = require("deepmerge");
const { mergeConfig } = require("jest-config");

test("Jest resolves the tracked private backport", () => {
  const fromJest = createRequire(require.resolve("jest-config"));
  expect(realpathSync(fromJest.resolve("deepmerge"))).toBe(
    fileURLToPath(new URL("../vendor/deepmerge/index.cjs", import.meta.url)),
  );
});

function prototypeKey() {
  return JSON.parse('{"__proto__":{"unexpectedSetting":true}}');
}

function expectPlainResult(result) {
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(result.unexpectedSetting).toBeUndefined();
  expect(Object.hasOwn(result, "__proto__")).toBe(false);
  expect({}.unexpectedSetting).toBeUndefined();
}

test("Jest configuration merges reject inherited settings from null defaults", () => {
  const result = mergeConfig(
    { globals: { settings: null, items: [1] } },
    { globals: { settings: prototypeKey(), items: [2] } },
  );
  expectPlainResult(result.globals.settings);
  expect(result.globals.items).toEqual([1, 2]);
});

test.each([null, undefined, false, 0, "placeholder"])(
  "nested placeholder %j cannot acquire a source-controlled prototype",
  (placeholder) => {
    const result = merge(
      { settings: placeholder },
      { settings: prototypeKey() },
    );
    expectPlainResult(result.settings);
  },
);

test("null-prototype targets do not inherit a JSON source prototype", () => {
  expectPlainResult(merge(Object.create(null), prototypeKey()));
});

test("the target copy loop excludes an own prototype key", () => {
  const target = prototypeKey();
  expectPlainResult(merge(target, { legitimate: true }));
  expect(Object.hasOwn(target, "__proto__")).toBe(true);
});

test("escaped JSON spelling and nested arrays retain the same protection", () => {
  const source = JSON.parse(
    '{"settings":{"\\u005f\\u005fproto\\u005f\\u005f":{"unexpectedSetting":true}}}',
  );
  expectPlainResult(merge({ settings: null }, source).settings);
  expectPlainResult(merge([], [prototypeKey()])[0]);
});

test("legitimate configuration values, cloning and enumerable symbols are preserved", () => {
  const symbol = Symbol("setting");
  const date = new Date("2026-01-01T00:00:00Z");
  const expression = /setting/u;
  const first = { nested: { first: true }, items: [{ first: true }] };
  const second = {
    nested: { second: true },
    items: [{ second: true }],
    date,
    expression,
    [symbol]: "retained",
  };
  Object.defineProperty(second, "hidden", { value: "excluded" });
  const result = merge(first, second);
  expect(result.nested).toEqual({ first: true, second: true });
  expect(result.items).toEqual([{ first: true }, { second: true }]);
  expect(result.nested).not.toBe(first.nested);
  expect(result.items[0]).not.toBe(first.items[0]);
  expect(result.date).toBe(date);
  expect(result.expression).toBe(expression);
  expect(result[symbol]).toBe("retained");
  expect(result).not.toHaveProperty("hidden");
  expect(first.nested).toEqual({ first: true });
});

test("documented clone and custom merge options retain their behavior", () => {
  const retained = { value: true };
  expect(merge({}, { retained }, { clone: false }).retained).toBe(retained);
  const result = merge(
    { nested: { first: true } },
    { nested: { second: true } },
    {
      customMerge: (key) =>
        key === "nested" ? (_target, source) => source : undefined,
    },
  );
  expect(result.nested).toEqual({ second: true });
  expect(merge.all([{ first: true }, { second: true }])).toEqual({
    first: true,
    second: true,
  });
  expect(() => merge.all({})).toThrow("first argument should be an array");
});

test("safe constructor/prototype data and similarly named symbols are retained", () => {
  const symbol = Symbol("__proto__");
  const result = merge(
    { constructor: { first: true }, prototype: { first: true } },
    {
      constructor: { second: true },
      prototype: { second: true },
      [symbol]: "retained",
    },
  );
  expect(result.constructor).toEqual({ first: true, second: true });
  expect(result.prototype).toEqual({ first: true, second: true });
  expect(result[symbol]).toBe("retained");
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
});

test("custom array merging receives the existing clone helper", () => {
  const source = [{ replacement: true }];
  const result = merge([{ original: true }], source, {
    arrayMerge: (_target, values, options) =>
      values.map((value) =>
        options.cloneUnlessOtherwiseSpecified(value, options),
      ),
  });
  expect(result).toEqual(source);
  expect(result[0]).not.toBe(source[0]);
});
