import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";
import { parse as parseYaml } from "yaml";

test.each([
  "development-checks.yml",
  "pr-validation.yml",
  "full-qualification.yml",
  "ontology-validation.yml",
  "verify-universal-ontology-mcp-distribution.yml",
])(
  "%s selects the exact npm reference before every npm consumer",
  (filename) => {
    const workflow = parseYaml(
      readFileSync(
        new URL(`../.github/workflows/${filename}`, import.meta.url),
        "utf8",
      ),
    );
    let consumers = 0;
    for (const job of Object.values(workflow.jobs)) {
      let selected = false;
      for (const step of job.steps ?? []) {
        const run = step.run ?? "";
        if (run.includes("npm install --global")) {
          expect(step.shell).toBe("bash");
          expect(run).toBe(
            'npm install --global --no-audit --no-fund npm@12.2.0\ntest "$(npm --version)" = "12.2.0"\n',
          );
          // A conditional bootstrap must cover each subsequent npm consumer.
          selected = step.if ?? true;
        } else if (/\bnpm\s/u.test(run)) {
          consumers += 1;
          expect(selected === true || selected === step.if).toBe(true);
        }
      }
    }
    expect(consumers).toBeGreaterThan(0);
  },
);

test.each([
  [
    "pr-validation.yml",
    "gate",
    "node scripts/prQualificationCommand.js record",
  ],
  [
    "full-qualification.yml",
    "select",
    "node scripts/prQualificationReuseCommand.js select",
  ],
  [
    "full-qualification.yml",
    "gate",
    "node scripts/prQualificationReuseCommand.js gate",
  ],
])(
  "%s/%s observes the same npm as the qualification producer",
  (filename, jobName, command) => {
    const workflow = parseYaml(
      readFileSync(
        new URL(`../.github/workflows/${filename}`, import.meta.url),
        "utf8",
      ),
    );
    const steps = workflow.jobs[jobName].steps;
    const bootstrapIndex = steps.findIndex((step) =>
      step.run?.includes("npm install --global"),
    );
    const observationIndex = steps.findIndex((step) => step.run === command);
    expect(bootstrapIndex).toBeGreaterThanOrEqual(0);
    expect(observationIndex).toBeGreaterThan(bootstrapIndex);
    expect(steps[bootstrapIndex].run).toBe(
      workflow.jobs.node.steps.find((step) =>
        step.run?.includes("npm install --global"),
      ).run,
    );
    expect(steps[bootstrapIndex].if ?? true).toBe(
      jobName === "gate" ? "${{ success() && !cancelled() }}" : true,
    );
  },
);

test.each([
  [">=12.2.0", true],
  [">=999.0.0", false],
])(
  "native npm enforces devEngines %s before running a script",
  (version, accepted) => {
    const root = mkdtempSync(join(tmpdir(), "universal-ontology-npm-engine-"));
    const cleanupPath = resolve(root);
    if (
      dirname(cleanupPath) !== resolve(tmpdir()) ||
      !basename(cleanupPath).startsWith("universal-ontology-npm-engine-")
    ) {
      throw new Error(
        "Refusing to remove a path outside the npm test fixtures.",
      );
    }
    try {
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "npm-engine-consumer-fixture",
          private: true,
          devEngines: {
            packageManager: { name: "npm", version, onFail: "error" },
          },
          scripts: {
            probe: "node -e \"process.stdout.write('engine-accepted')\"",
          },
        }),
      );
      const result = spawnSync(
        process.execPath,
        [process.env.npm_execpath, "run", "probe"],
        {
          cwd: root,
          encoding: "utf8",
          windowsHide: true,
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      if (accepted) {
        expect(result.status).toBe(0);
        expect(result.stdout).toContain("engine-accepted");
      } else {
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("EBADDEVENGINES");
        expect(result.stdout).not.toContain("engine-accepted");
      }
    } finally {
      rmSync(cleanupPath, { recursive: true, force: true });
    }
  },
);
