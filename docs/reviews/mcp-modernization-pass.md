**Our MCP server is already using the right modern foundation. I would not replace it with OpenAI sample code.**

It already uses the official MCP TypeScript v2 SDK correctly in the important places: `McpServer`, `createMcpHandler`, `@modelcontextprotocol/node`, Zod schemas, structured outputs, tool annotations, modern `2026-07-28` protocol support, and stateless HTTP compatibility. 

What I *would* do now is a relatively focused modernization pass to remove a few pieces of hand-maintained protocol-adjacent machinery, tighten the package architecture, and align the `stdio` production path explicitly with the v2 SDK's modern entry point.

## Recommended changes, in priority order

| Priority | Change | Recommendation |
|---|---|---|
| **P0** | Ensure `stdio` uses `serveStdio()` | Make this explicit and test both modern and legacy eras |
| **P0** | Clarify what calling the tool catalog “v1” internally means | Current comments/docs may confuse readers who may think “v1” refers to the MCP TypeScript v1 SDK when the implementation is MCP 2026-era |
| **P1** | Reduce custom HTTP protocol validation where SDK now owns it | Retain only controls the SDK genuinely does not provide |
| **P1** | Separate protocol adapter from deployment/security adapter more cleanly | `McpServer factory` → protocol transport → Node/loopback policy |
| **P1** | Add protocol-era conformance tests | Test both `2026-07-28` and legacy fallback through official clients |
| **P1** | Turn the MCP package into the actual ownership boundary | Move MCP source under the workspace package rather than shipping code sourced broadly from root |
| **P2** | Strengthen Registry/release metadata automation | Generate `server.json`, package metadata and server identity from one canonical source |
| **P2** | Revisit HTTP legacy compatibility before production | Keep locally; consider `legacy: "reject"` eventually for a new hosted service |
| **P2** | Add standard MCP-compatible observability selectively | Keep current redacted operational logs; potentially use `ctx.mcpReq.log()` for opt-in protocol diagnostics |
| **P3** | Do **not** add resources/prompts/UI merely because MCP supports them | The current two-tool interface is semantically appropriate |

There are several subtleties behind those recommendations.

---

# 1. Most important: make `serveStdio()` the canonical production entry point

The official v2 guidance is unusually clear here.

For MCP 2026-07-28:

```js
import { serveStdio } from "@modelcontextprotocol/server/stdio";

serveStdio(() => createUniversalOntologyMcpServer(...));
```

is the appropriate high-level server entry point.

A manually constructed:

```js
server.connect(new StdioServerTransport());
```

continues to behave as a **2025-era MCP server**, even when built with v2 of the SDK. `serveStdio()` is what performs modern protocol-era negotiation and pins the appropriate server instance to the connection. 

Your HTTP implementation already gets this right:

```js
const sdkHandler = createMcpHandler(
  () =>
    createUniversalOntologyMcpServer({
      ontologyQuery,
      reportUnhandledToolError: onError,
    }),
  {
    legacy: "stateless",
    responseMode: "json",
    onerror: onError,
  },
);
``` 


The repository's installed production topology, however, is explicitly `stdio`, while HTTP is only the contributor/development topology. 

So I would verify that `src/mcp/runUniversalOntologyMcpStdioServer.js` eventually delegates to `serveStdio()`. If it does, excellent—make that fact explicit in the architecture documentation and conformance tests. If it still manually connects a `StdioServerTransport`, **that is the single change I would make first.**

Conceptually:

```text
createUniversalOntologyMcpServer()
              │
              ├── serveStdio(factory)          ← production/local installation
              │
              └── createMcpHandler(factory)    ← HTTP adapter
```

That gives both transports one authoritative server factory and leaves protocol-era handling to upstream MCP.

---

# 2. Clarify the remaining “v1 tool catalog” terminology

There are several comments like:

> `Register the complete v1 tool catalog on a cheap per-request server.`

and:

> `Full v1 catalog definition for lexical ontology discovery.` 


Those now create unnecessary ambiguity because the server is explicitly targeting MCP `2026-07-28`.

“v1” actually means here is **version 1 of your application/tool contract**, not MCP v1. That distinction should become explicit.

For example:

```js
/** Register the complete Universal Ontology tool contract v1. */
```

or better still:

```js
/** Register the stable Universal Ontology tool catalog. */
```

If versioning the application contract is genuinely necessary, name it something unmistakable:

```js
UNIVERSAL_ONTOLOGY_TOOL_CONTRACT_VERSION = 1;
```

Avoid bare `v1` around MCP code.

This becomes increasingly important because MCP now itself has three overlapping notions:

- TypeScript SDK v2
- 2025-era MCP
- MCP protocol revision `2026-07-28`

Your code should make those impossible to confuse.

---

# 3. Your use of `createMcpHandler()` is exactly the direction I was recommending

This deserves emphasis.

You are **already reusing the upstream implementation rather than recreating MCP yourself**:

```js
import { createMcpHandler } from "@modelcontextprotocol/server";
```

and:

```js
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
``` 


That is considerably better than copying OpenAI's example server.

Your own adapter explicitly says:

> protocol metadata, argument validation, and modern/legacy classification remain owned by the official SDK.

That is exactly the architectural boundary I would choose. 

So **don't rewrite this layer.**

Instead, continue applying the rule:

> **If it is MCP protocol machinery and upstream exposes it, upstream owns it. If it is Universal Ontology semantics or deployment policy, your code owns it.**

---

# 4. There is nevertheless some HTTP machinery worth periodically trying to delete

`createUniversalOntologyMcpHttpHandler.js` currently contains custom implementations for:

- Content-Type validation
- Accept validation
- request-body buffering
- body-size rejection
- JSON-RPC-shaped HTTP error responses 


Some of this is justified today.

Your comment identifies the principal reason:

> The pinned SDK 2.0.0 has no request-body limit option.

That's a perfectly sound reason to wrap the handler.

But I would make this a deliberate maintenance policy:

### Custom transport code must justify its continued existence against each SDK upgrade.

For example:

```text
HTTP wrapper
├── body size limiting        KEEP — SDK 2.0.0 cannot do it
├── loopback Host validation  SDK — @modelcontextprotocol/node
├── Origin validation         SDK — @modelcontextprotocol/node
├── MCP era classification    SDK — createMcpHandler()
├── JSON-RPC dispatch         SDK
├── input schema validation   SDK/McpServer
└── Accept/Content-Type       REVIEW each SDK release
```

The upstream implementation itself now documents that certain lower-level building blocks require callers to validate JSON content type, while `createMcpHandler` is the high-level entry. 

You are using the high-level entry, so I would add regression tests proving exactly which wrapper checks remain necessary with `2.0.0`. When upstream acquires a body limit or equivalent adapter middleware, delete yours.

**Reducing custom protocol-edge code is a worthwhile objective even when that code is currently correct.**

---

# 5. Keep the security hardening. It is better than the samples.

I would **not** simplify the loopback runner down to the examples in OpenAI or MCP documentation.

You currently have:

- fixed `127.0.0.1` binding;
- no user-overridable LAN bind;
- exact route admission;
- official Host validation;
- official Origin validation;
- 128 KiB request body bound;
- monotonic token-bucket rate limiting;
- maximum eight concurrent MCP requests;
- cancellation propagation;
- bounded graceful shutdown;
- safe error codes;
- redacted structured logging;
- no query text, definitions, entity identifiers or local paths in logs. 


That is unusually good.

Recent MCP ecosystem vulnerabilities have specifically involved **browser → unauthenticated localhost MCP attacks caused by incorrect Origin handling**, including seemingly innocuous prefix matching such as accepting `http://localhost.evil.example`. 

So using the official:

```js
localhostHostValidation
localhostOriginValidation
```

instead of your own string matching is an excellent decision. Keep it.

I would even turn this into a repository architecture rule:

> **Security-sensitive HTTP admission logic SHOULD use upstream MCP primitives where available and MUST NOT implement permissive hostname/origin prefix matching.**

---

# 6. Strengthen the separation into three layers

You already have most of this architecture, but I would make it more explicit.

Currently the conceptual structure is:

```text
ontology artifacts
       ↓
query repository
       ↓
ontology query module
       ↓
MCP server
       ↓
HTTP / stdio runner
```

Your docs explicitly state that HTTP and MCP adapters contain no ontology semantics. 

I would sharpen it into:

```text
Domain
 ├── artifact schemas
 ├── artifact repositories
 └── ontologyQuery

Application
 ├── searchEntities
 └── resolveEntity

MCP protocol adapter
 ├── tool schemas
 ├── result rendering
 └── createUniversalOntologyMcpServer()

Transports
 ├── serveStdio()
 └── createMcpHandler()

Deployment adapters
 ├── local stdio
 ├── loopback Node HTTP
 └── future authenticated hosted HTTP
```

That distinction matters for your future hosted server.

For example, a future Lambda/CloudFront/API Gateway implementation should not contain:

```js
searchOntologyEntities(...)
```

logic.

It should essentially be:

```text
authenticate
authorize
rate-limit
↓
official MCP HTTP handler
↓
existing server factory
↓
existing query module
```

This is exactly why I would **not** introduce OpenAI-specific abstractions into the core.

---

# 7. Move the actual MCP implementation under the workspace package

This is one architectural area I would change fairly substantially.

You have an npm workspace:

```json
"workspaces": [
  "packages/universal-ontology-mcp-server"
]
```

but much of the actual implementation appears under:

```text
src/mcp/
scripts/
src/ontologyQuery/
```

while the workspace package mostly contains distribution metadata and has a generated `dist/universal-ontology-mcp-server.mjs`. 

That works, but the package is not yet a particularly clean software ownership boundary.

Longer term I would aim for something like:

```text
packages/
  universal-ontology-query/
    src/
      ...
  universal-ontology-mcp-server/
    src/
      createUniversalOntologyMcpServer.js
      universalOntologyToolSchemas.js
      universalOntologyMcpMetadata.js
      stdio.js
      http.js
    package.json
```

You don't necessarily need two npm packages—you can retain the query module internally.

But **the publishable MCP package should ideally contain the source that defines the MCP product**, rather than functioning mostly as a packaging shell around root-level implementation code.

Benefits include:

- clearer dependency ownership;
- cleaner independent testing;
- simpler SBOM/provenance;
- easier package publishing;
- reduced accidental coupling to the website application;
- easier future extraction;
- easier API boundaries.

This is probably the largest structural improvement I would recommend.

---

# 8. Your tool design is very good; resist adding more MCP surface area

You expose exactly:

```text
search_entities
resolve_entity
``` 


I like this considerably more than exposing:

```text
run_sparql
query_ontology
get_triples
search_classes
search_properties
search_individuals
get_label
get_definition
get_superclasses
...
```

Your model-facing abstraction corresponds to actual user intent:

1. discover the entity;
2. resolve the entity precisely.

The tool descriptions are also good:

> Search authored labels, identifiers, IRI local names, and lexical definitions...

and explicitly say:

> This tool performs no inference and never dereferences external IRIs. 


Likewise the server instructions establish a sensible search → resolve workflow and explicitly tell the model that ontology-authored strings are data rather than instructions. 

I would **not** add MCP resources or prompts simply because the protocol supports them.

They would need a real use case.

For this application:

- **tools** = correct abstraction for query operations;
- **resources** might eventually make sense for immutable ontology releases or schemas, but only if hosts actually benefit from retrieving whole artifacts;
- **prompts** appear unnecessary;
- **MCP Apps/UI** appear unnecessary.

The minimalist tool catalog is a strength.

---

# 9. Structured content + human-readable content is exactly right

Your result shape:

```js
return {
  content: [
    {
      type: "text",
      text: renderOntologyToolResultAsText(structuredContent),
    },
  ],
  structuredContent,
};
```

is a very good MCP pattern. 

That provides:

- machine-readable deterministic output;
- graceful compatibility with hosts primarily consuming text;
- human inspectability in MCP Inspector;
- schema validation.

Your additional explicit parsing:

```js
const structuredContent =
  outputSchema.parse(await execute());
```

is also valuable even though the MCP SDK handles declared output schemas, because it creates a clear **application → transport validation boundary**.

I would keep it.

Particularly good is your treatment of `isError`: since the SDK skips output-schema validation for error results, you explicitly validate the failure arm yourself before emitting it. 

That's better than most MCP examples.

---

# 10. The tool annotations are correct

You currently declare:

```js
{
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
}
``` 


That is semantically accurate for an immutable ontology-release query interface.

In particular:

```js
openWorldHint: false
```

is worth preserving.

It means the **tool's operational universe is bounded by the selected generated release set**, not that OWL itself suddenly acquires a closed-world semantic interpretation.

Your documentation already explains that distinction, which is important. 

---

# 11. Add proper modern/legacy protocol conformance tests

This is the testing change I would prioritize most after `serveStdio`.

Because MCP 2026 introduces an actual protocol-era split, tests should no longer merely demonstrate:

> the server answers MCP calls.

They should demonstrate:

```text
HTTP
├── modern 2026-07-28 client
└── legacy 2025 client

stdio
├── modern 2026-07-28 negotiation
└── legacy initialize fallback
```

The official client now supports:

```js
versionNegotiation: { mode: "auto" }
```

or:

```js
versionNegotiation: { pin: "2026-07-28" }
``` 


For HTTP, the upstream guidance specifically recommends in-process testing by wiring the client transport's `fetch` directly to:

```js
handler.fetch(...)
```

so no socket is needed. 

That's attractive for your Jest tests.

I would establish four contract tests:

```text
modern HTTP → search Person
legacy HTTP → search Person
modern stdio → search Person
legacy stdio → search Person
```

and assert identical **application-level structured results** across all four.

That would prove your most important architectural assertion:

> transport and protocol era do not change ontology semantics.

---

# 12. Consider eventually dropping legacy protocol support—but not yet

You currently have:

```js
legacy: "stateless"
```

for HTTP. 

That is a sensible compatibility default today.

For a **new public hosted service**, however, I would periodically reassess this.

Once ChatGPT, Codex, Claude, VS Code and the hosts you care about all reliably support `2026-07-28`, a newly deployed service could plausibly choose:

```js
legacy: "reject"
```

That gives you:

- one protocol era;
- smaller compatibility test matrix;
- fewer historical semantics;
- less long-term attack surface;
- simpler diagnostics.

But I **wouldn't do that now for the local distributable server**, because compatibility with existing MCP hosts has genuine value and the official SDK already encapsulates the compatibility path.

---

# 13. One metadata issue worth modernizing: `server.json`

Your Registry manifest still declares:

```json
"$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json"
``` 


This is not automatically wrong—the Registry schema revision and MCP protocol revision are separate things.

But I would check whether a newer current Registry schema exists before first publication, rather than freezing the December 2025 URI accidentally.

More importantly, I would avoid manually keeping all of these synchronized:

```text
root package version
workspace package version
McpServer serverInfo.version
server.json version
npm package version
OCI tag
release archive version
```

You already derive the runtime MCP version from `package.json`:

```js
version: packageMetadata.version
``` 


Extend that approach.

I'd make one version authoritative and **generate `server.json` as a release artefact** or validate it mechanically during CI.

---

# 14. Keep exact dependency pinning for the MCP stack

The root currently has:

```json
"@modelcontextprotocol/client": "2.0.0",
"@modelcontextprotocol/node": "2.0.0",
"@modelcontextprotocol/server": "2.0.0",
"zod": "4.5.4"
``` 


For an application/server rather than a reusable library, I like the exact MCP pins.

The SDK is still developing relatively rapidly around a major protocol transition. Exact versions plus `package-lock.json` give you:

```text
intentional upgrade
→ inspect changelog
→ run protocol conformance suite
→ update lockfile
```

rather than:

```text
npm install
→ subtly different MCP behaviour
```

I would retain that policy.

---

# 15. One minor modernization: import Zod via `zod/v4`

Current code has:

```js
import * as z from "zod";
``` 


The current MCP v2 examples consistently use:

```js
import * as z from "zod/v4";
``` 


Since you're already explicitly on Zod 4, I would consider following that form. It makes the intended Zod major explicit and prevents ambiguous compatibility semantics if package export behavior evolves.

This is low priority, though.

---

# 16. I would leave your application-level failure model alone

You distinguish:

```text
MCP/protocol failure
```

from:

```text
valid MCP tool call
→ ontology operation failed
→ stable application failure object + isError
```

and provide:

```js
{
  outcome: "failure",
  error: {
    errorCode,
    message,
    retryable
  }
}
``` 


That is a strong API.

Don't throw arbitrary application exceptions through MCP.

Your current approach gives models an especially useful field:

```js
retryable
```

which is far more actionable than exception strings.

---

# 17. Don't adopt OpenAI-specific Apps SDK metadata here

Given the context of your previous question, this is worth stating directly.

For the **Universal Ontology** server, I see no reason presently to add:

- OpenAI Apps SDK;
- `window.openai`;
- ChatGPT widgets;
- custom UI resources;
- OpenAI API calls.

This is a textbook **portable MCP server**.

It should work equally well from:

```text
ChatGPT
Codex
Claude
VS Code
Cursor
future MCP hosts
```

The upstream MCP SDK should therefore remain the protocol dependency.

OpenAI-specific metadata should only be introduced if some future ChatGPT-specific experience has concrete user value.

---

# Target architecture I would aim for

Something very close to this:

```text
┌──────────────────────────────────────────┐
│            Ontology source RDF           │
└────────────────────┬─────────────────────┘
                     │ deterministic build
                     ▼
┌──────────────────────────────────────────┐
│ Immutable content-addressed query index  │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│          Ontology query module           │
│                                          │
│ searchOntologyEntities()                 │
│ resolveOntologyEntity()                  │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│       Universal Ontology MCP core        │
│                                          │
│ McpServer                                │
│ ├── search_entities                      │
│ └── resolve_entity                       │
│                                          │
│ Zod input/output schemas                 │
└──────────────┬─────────────────┬─────────┘
               │                 │
               ▼                 ▼
      ┌────────────────┐  ┌────────────────────┐
      │ serveStdio()   │  │ createMcpHandler() │
      │ official SDK   │  │ official SDK       │
      └───────┬────────┘  └──────────┬─────────┘
              │                      │
              │              ┌───────▼───────────────┐
              │              │ Deployment middleware │
              │              │                       │
              │              │ Host/Origin validation│
              │              │ body bounds           │
              │              │ rate/concurrency      │
              │              │ auth (future remote)  │
              │              └────────┬──────────────┘
              ▼                       ▼
      Local MCP hosts       HTTP / future cloud hosts
```

The critical feature here is that **you own only the shaded conceptual middle**—ontology semantics and your security/deployment policies—and upstream owns MCP protocol behaviour.

---

# My overall assessment

I'd score the current implementation roughly like this:

| Area | Assessment |
|---|---|
| MCP SDK choice | **Excellent** |
| Current protocol support | **Excellent** |
| Tool semantics | **Excellent** |
| Schema discipline | **Excellent** |
| Error model | **Excellent** |
| Local HTTP security | **Excellent / unusually thorough** |
| Prompt-injection boundary | **Excellent** |
| Transport/domain separation | **Very good** |
| Distribution/reproducibility | **Very good** |
| Package/source ownership | **Main architectural improvement opportunity** |
| Protocol-era testing | **Needs to become first-class** |
| Remaining custom protocol-edge code | **Reasonable today, but target for deletion where upstream catches up** |

So the answer produced by our previous discussion is actually reassuring rather than disruptive:

> **The repo has already independently converged on the modern best-practice architecture: official MCP TypeScript SDK as a dependency, thin protocol adapters, and your own business logic behind it.**

I would **not undertake a wholesale rewrite**. The best next iteration is a focused refactor around `serveStdio()`, package ownership, protocol-era conformance tests, terminology cleanup, and progressively deleting custom HTTP plumbing whenever the official SDK can assume responsibility for it. 