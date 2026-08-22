import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";

const DEFAULT_WORKER_COUNT = Math.min(4, availableParallelism());
const DEFAULT_WORKER_URL = new URL("./jsonLdWorker.js", import.meta.url);

function compareBinaryPaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function validateInputs(inputs, workerCount) {
  if (!Array.isArray(inputs)) {
    throw new TypeError("inputs must be an array.");
  }

  if (!Number.isInteger(workerCount) || workerCount < 1) {
    throw new TypeError("workerCount must be a positive integer.");
  }

  for (const input of inputs) {
    if (!input?.outputPath) {
      throw new TypeError("Every JSON-LD worker input needs an outputPath.");
    }

    if (!Number.isFinite(input.size) || input.size < 0) {
      throw new TypeError(
        `JSON-LD worker input "${input.outputPath}" needs a non-negative size.`,
      );
    }

    if (!input.sourcePath && input.content === undefined) {
      throw new TypeError(
        `JSON-LD worker input "${input.outputPath}" needs a sourcePath or content.`,
      );
    }
  }
}

function orderTasksBySize(inputs) {
  return inputs
    .map((input, index) => ({ index, input }))
    .sort(
      (left, right) =>
        right.input.size - left.input.size ||
        compareBinaryPaths(left.input.outputPath, right.input.outputPath),
    );
}

function createSizeBalancedQueues(inputs, poolSize) {
  const queues = Array.from({ length: poolSize }, () => ({
    scheduledSize: 0,
    tasks: [],
  }));

  for (const task of orderTasksBySize(inputs)) {
    const queue = queues.reduce((lightest, candidate) =>
      candidate.scheduledSize < lightest.scheduledSize ? candidate : lightest,
    );
    queue.tasks.push(task);
    queue.scheduledSize += task.input.size;
  }

  return queues.map(({ tasks }) => tasks);
}

function createFailure({ outputPath, error }) {
  const cause = new Error(error?.message ?? "Worker conversion failed.");
  cause.name = error?.name ?? "Error";

  if (error?.stack) {
    cause.stack = error.stack;
  }

  return {
    outputPath,
    error: new Error(
      `Unable to render JSON-LD for "${outputPath}": ${cause.message}`,
      { cause },
    ),
  };
}

export async function renderJsonLdWithWorkers({
  inputs,
  workerCount = DEFAULT_WORKER_COUNT,
  workerUrl = DEFAULT_WORKER_URL,
}) {
  validateInputs(inputs, workerCount);

  if (inputs.length === 0) {
    return [];
  }

  const results = new Array(inputs.length);
  const states = [];
  const failures = [];
  const poolSize = Math.min(workerCount, inputs.length);
  const taskQueues = createSizeBalancedQueues(inputs, poolSize);
  let activeTasks = 0;
  let completedTasks = 0;
  let dispatchStopped = false;
  let settled = false;

  return new Promise((resolve, reject) => {
    async function finish() {
      if (settled) {
        return;
      }

      const allSuccessful = completedTasks === inputs.length;
      const allActiveTasksSettled = dispatchStopped && activeTasks === 0;

      if (!allSuccessful && !allActiveTasksSettled) {
        return;
      }

      settled = true;
      await Promise.allSettled(states.map(({ worker }) => worker.terminate()));

      if (failures.length > 0) {
        failures.sort(({ outputPath: left }, { outputPath: right }) =>
          compareBinaryPaths(left, right),
        );
        reject(failures[0].error);
      } else {
        resolve(results);
      }
    }

    function dispatch(state) {
      if (dispatchStopped || state.queue.length === 0 || !state.alive) {
        void finish();
        return;
      }

      const task = state.queue.shift();
      activeTasks += 1;
      state.task = task;
      state.worker.postMessage({ taskId: task.index, input: task.input });
    }

    function failState(state, error) {
      if (!state.task) {
        return;
      }

      failures.push(
        createFailure({
          outputPath: state.task.input.outputPath,
          error,
        }),
      );
      activeTasks -= 1;
      dispatchStopped = true;
      state.task = undefined;
      void finish();
    }

    for (let index = 0; index < poolSize; index += 1) {
      const worker = new Worker(workerUrl, { type: "module" });
      const state = {
        worker,
        task: undefined,
        alive: true,
        queue: taskQueues[index],
      };
      states.push(state);

      worker.on("message", (message) => {
        if (settled || !state.task || message.taskId !== state.task.index) {
          return;
        }

        const task = state.task;
        state.task = undefined;
        activeTasks -= 1;

        if (message.error) {
          failures.push(
            createFailure({
              outputPath: task.input.outputPath,
              error: message.error,
            }),
          );
          dispatchStopped = true;
        } else {
          results[task.index] = {
            outputPath: task.input.outputPath,
            content: Buffer.from(message.content),
          };
          completedTasks += 1;
        }

        if (!dispatchStopped) {
          dispatch(state);
        }

        void finish();
      });

      worker.on("error", (error) => {
        state.alive = false;
        failState(state, error);
      });

      worker.on("exit", (code) => {
        state.alive = false;

        if (!settled && code !== 0) {
          failState(state, {
            name: "WorkerExitError",
            message: `Worker exited with code ${code}.`,
          });
        }
      });

      dispatch(state);
    }
  });
}
