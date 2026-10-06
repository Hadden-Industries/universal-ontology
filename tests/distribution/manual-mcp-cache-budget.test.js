import { readFileSync } from "node:fs";
import { parse } from "yaml";

const MANUAL = ".github/workflows/manual-mcp-packages.yml";
const FULL = ".github/workflows/full-qualification.yml";
const DEVELOPMENT = ".github/workflows/development-checks.yml";
const CAPABILITIES = {
  none: [],
  read: ["read"],
  "write-only": ["write"],
  write: ["read", "write"],
};

function readGraph(path = MANUAL, graph = new Map()) {
  if (graph.has(path)) return graph;
  const workflow = parse(
    readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"),
  );
  graph.set(path, workflow);
  for (const job of Object.values(workflow.jobs)) {
    if (job.uses?.startsWith("./.github/workflows/"))
      readGraph(job.uses.slice(2), graph);
  }
  return graph;
}

// A job override replaces its own workflow default, but every explicit request
// in a called workflow is capped by the calling job's transmitted budget.
function cacheBudgetViolations(graph, path = MANUAL, ceiling, chain = path) {
  const workflow = graph.get(path);
  const violations = [];
  function check(mode, location) {
    if (!Object.hasOwn(CAPABILITIES, mode))
      throw new Error(`Unexpected cache mode at ${location}: ${mode}`);
    if (
      ceiling &&
      CAPABILITIES[mode].some((capability) => !ceiling.includes(capability))
    )
      violations.push(`${location} requests ${mode} beyond caller budget`);
  }
  if (workflow["cache-mode"] !== undefined)
    check(workflow["cache-mode"], `${chain}/workflow`);
  for (const [id, job] of Object.entries(workflow.jobs)) {
    const mode = job["cache-mode"] ?? workflow["cache-mode"];
    check(mode, `${chain}/${id}`);
    if (!job.uses?.startsWith("./.github/workflows/")) continue;
    const budget = CAPABILITIES[mode].filter(
      (capability) => !ceiling || ceiling.includes(capability),
    );
    violations.push(
      ...cacheBudgetViolations(
        graph,
        job.uses.slice(2),
        budget,
        `${chain}/${id}->${job.uses.slice(2)}`,
      ),
    );
  }
  return violations;
}

test("manual qualification grants every nested explicit cache request", () => {
  expect(cacheBudgetViolations(readGraph())).toEqual([]);
});

test("qualify-only read budget admits unchanged full and nested read jobs", () => {
  const graph = readGraph();
  const manual = graph.get(MANUAL);
  manual.jobs.qualify["cache-mode"] = "read";
  expect(graph.get(FULL)["cache-mode"]).toBe("read");
  expect(graph.get(FULL).jobs.development["cache-mode"]).toBe("read");
  expect(graph.get(FULL).jobs.ontology["cache-mode"]).toBe("read");
  expect(cacheBudgetViolations(graph)).toEqual([]);
  expect(manual["cache-mode"]).toBe("none");
  for (const id of ["validate", "draft", "complete"])
    expect(manual.jobs[id]["cache-mode"]).toBe("none");
  expect(manual.jobs.qualify.permissions).toEqual({ contents: "read" });
});

test("a none calling budget rejects the callee and transitive read request", () => {
  const graph = readGraph();
  graph.get(MANUAL).jobs.qualify["cache-mode"] = "none";
  const violations = cacheBudgetViolations(graph);
  expect(violations).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`${FULL}/workflow requests read`),
      expect.stringContaining(`${FULL}/development requests read`),
      expect.stringContaining(`${DEVELOPMENT}/workflow requests read`),
    ]),
  );
});

test("read calling budget rejects a transitive cache write escalation", () => {
  const graph = readGraph();
  graph.get(MANUAL).jobs.qualify["cache-mode"] = "read";
  graph.get(DEVELOPMENT).jobs.documentation["cache-mode"] = "write";
  expect(cacheBudgetViolations(graph)).toEqual([
    expect.stringContaining(`${DEVELOPMENT}/documentation requests write`),
  ]);
});
