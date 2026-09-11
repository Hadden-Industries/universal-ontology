/**
 * Deeply freeze a validated acyclic JSON value, preserving its identity.
 * Already-frozen containers must already have deeply frozen descendants; this
 * operation does not revisit them or validate arbitrary object graphs.
 */
export function freezeJsonValueDeeply(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      freezeJsonValueDeeply(child);
    }

    Object.freeze(value);
  }

  return value;
}
