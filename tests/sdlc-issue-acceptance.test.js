import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const workflow = parse(
  readFileSync(
    new URL("../.github/workflows/sdlc-issue-acceptance.yml", import.meta.url),
    "utf8",
  ),
);
const execute = new (Object.getPrototypeOf(async function () {}).constructor)(
  "github",
  "context",
  workflow.jobs.invalidate.steps[0].with.script,
);
const context = {
  repo: { owner: "fixture", repo: "ontology" },
  issue: { number: 12 },
};

function client(labels) {
  return {
    rest: {
      issues: {
        get: jest.fn().mockResolvedValue({
          data: { labels: labels.map((name) => ({ name })) },
        }),
        removeLabel: jest.fn().mockResolvedValue({}),
        addLabels: jest.fn().mockResolvedValue({}),
        createComment: jest.fn().mockResolvedValue({}),
      },
    },
  };
}

test("editing an accepted issue invalidates acceptance while preserving unrelated labels", async () => {
  const github = client([
    "risk:R2",
    "state:accepted",
    "state:verified",
    "domain:ontology",
  ]);
  await execute(github, context);
  expect(
    github.rest.issues.removeLabel.mock.calls.map(([args]) => args.name),
  ).toEqual(["state:accepted", "state:verified"]);
  expect(github.rest.issues.addLabels).toHaveBeenCalledWith({
    owner: "fixture",
    repo: "ontology",
    issue_number: 12,
    labels: ["state:changed"],
  });
  expect(github.rest.issues.createComment).toHaveBeenCalledTimes(1);
});

test("editing an ordinary draft creates no acceptance ceremony", async () => {
  const github = client(["state:draft", "risk:R0"]);
  await execute(github, context);
  expect(github.rest.issues.removeLabel).not.toHaveBeenCalled();
  expect(github.rest.issues.addLabels).not.toHaveBeenCalled();
  expect(github.rest.issues.createComment).not.toHaveBeenCalled();
});

test("permission failure remains a failure rather than a successful invalidation", async () => {
  const github = client(["state:accepted"]);
  github.rest.issues.removeLabel.mockRejectedValue(
    Object.assign(new Error("Forbidden"), { status: 403 }),
  );
  await expect(execute(github, context)).rejects.toThrow("Forbidden");
  expect(github.rest.issues.addLabels).not.toHaveBeenCalled();
});
