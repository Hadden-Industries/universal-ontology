# Universal Ontology deepmerge backport

This private dependency is a security backport of MIT-licensed `deepmerge` 4.3.1 for Jest configuration merging.
It is not an upstream release or a published Hadden Industries package.
The root npm override selects this tracked source without an installation script or runtime wrapper.

The implementation, declarations and licence reuse the backport in [WebVOWL commit fad2d459](https://github.com/Hadden-Industries/webvowl/commit/fad2d4599101eabc82d7c8d39d54cd0641c47a40).
Its baseline is `dist/cjs.js` and `index.d.ts` from the [deepmerge 4.3.1 npm artifact](https://registry.npmjs.org/deepmerge/-/deepmerge-4.3.1.tgz).
The artifact integrity is `sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==`.
The original CommonJS file's SHA-256 is `2e5160f84a1141bd927264afe4d15766f1e6cf07daef182b37ff53fea121de7d`.
The original attribution and terms are retained in [LICENSE](LICENSE).

[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) concerns prototype poisoning of returned objects.
The backport excludes the string `__proto__` in the shared own-key enumeration before either the target or source copy loop reads or writes it.
Other enumerable strings and symbols, arrays, cloning, custom merge options and the CommonJS API retain upstream behavior.
Caller-supplied callbacks and options can deliberately retain supplied objects; this correction protects writes performed by deepmerge itself.

Run the installed dependency and Jest consumer regressions with `npm test -- --runInBand tests/deepmerge-dependency.test.js`.
They cover both copy loops, null-prototype targets, primitive placeholders, escaped JSON keys and legitimate merge controls.

Keep the backport until a maintained upstream replacement demonstrably covers both copy loops and passes the same regressions.
Remove the local dependency, override and directory together when adopting that replacement.
