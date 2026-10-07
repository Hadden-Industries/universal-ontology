# Private braces depth-guard backport

This package is a private development dependency based on npm `braces` 3.0.3.
Its original MIT license is retained in `LICENSE`.
The upstream runtime files remain unchanged apart from the depth guards described below.

The root npm override selects this local source for both micromatch and Chokidar.
No install script patches `node_modules`.

## Guard and compatibility contract

GHSA-vfj7-8cjw-p6xm concerns stack exhaustion in recursive AST walkers.
The parser bounds nested braces and parentheses; compile, expand and stringify independently bound recursive `nodes` traversal, including caller-supplied ASTs.
Excessive depth throws `SyntaxError` with the message `AST nesting depth exceeds the maximum of 100`.

Parser nesting and walker depth count different nodes: 100 containers can parse while a terminal node makes compilation exceed 100 traversal steps.
Ordinary alternatives, ranges, escaping and quoted text retain 3.0.3 behavior.
This does not bound expansion cardinality, regex complexity or malformed AST fields such as recursively nested array-valued text, getters or parent pointers.
The repository's affected tooling passes strings.

## Provenance and replacement

The guard-only changes were reviewed against upstream [PR #78](https://github.com/micromatch/braces/pull/78), immutable commit `97308a01d091b211cf015314a2d0696da28a5392`.
That full fork also includes earlier parser changes; they are deliberately excluded because one changes valid quoted patterns ending in escaped backslashes.
Only `MAX_AST_DEPTH`, `assertDepth`, parser depth checks and walker depth propagation were backported to the published 3.0.3 source.

The upstream package name and version are preserved.
Version-based audit tools may still report the advisory despite this source remedy; verify the locked local resolution and `tests/braces-dependency.test.js` instead of inferring security from a version label.

Remove this local package and its root override when a reviewed stable upstream release closes the depth-exhaustion paths and passes the security, compatibility and repository checks.
Regenerate the lockfile with npm when changing that graph.
