import { Buffer } from "node:buffer";
import { setTimeout as delay } from "node:timers/promises";
import { parentPort } from "node:worker_threads";

const history = [];

function recordPeak(control) {
  if (!control) {
    return;
  }

  const counters = new Int32Array(control);
  const active = Atomics.add(counters, 0, 1) + 1;
  Atomics.add(counters, 2, 1);

  while (active > Atomics.load(counters, 1)) {
    const previous = Atomics.load(counters, 1);

    if (Atomics.compareExchange(counters, 1, previous, active) === previous) {
      break;
    }
  }
}

function recordCompletion(control) {
  if (control) {
    Atomics.sub(new Int32Array(control), 0, 1);
  }
}

parentPort.on("message", async ({ taskId, input }) => {
  const fixture = JSON.parse(Buffer.from(input.content).toString("utf8"));
  history.push(input.outputPath);
  recordPeak(input.control);

  try {
    await delay(fixture.delayMilliseconds);

    if (fixture.errorMessage) {
      throw new Error(fixture.errorMessage);
    }

    recordCompletion(input.control);
    const result = fixture.resultFromHistory
      ? history.join(",")
      : fixture.result;

    parentPort.postMessage({
      taskId,
      jsonLdContent: Buffer.from(result, "utf8"),
      csvContent: Buffer.from(`csv:${result}`, "utf8"),
    });
  } catch (error) {
    recordCompletion(input.control);
    parentPort.postMessage({
      taskId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }
});
