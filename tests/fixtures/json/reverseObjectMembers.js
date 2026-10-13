/** Permute JSON mappings at every depth while preserving array positions. */
export function reverseObjectMembers(value) {
  if (Array.isArray(value)) return value.map(reverseObjectMembers);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .reverse()
        .map((key) => [key, reverseObjectMembers(value[key])]),
    );
  return value;
}
