import { createWaiterAwareSharedOperation } from "../../src/ontologyQuery/createWaiterAwareSharedOperation.js";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function createTestSharedOperation() {
  return createWaiterAwareSharedOperation({
    createWaiterCancellationError({ signal }) {
      return new Error("This waiter cancelled.", { cause: signal.reason });
    },
    createAllWaitersCancelledAbortReason({ operationKey }) {
      return new DOMException(
        `Every waiter for ${operationKey} cancelled.`,
        "AbortError",
      );
    },
  });
}

describe("waiter-aware shared operation", () => {
  test("coalesces equal operation keys into one underlying invocation", async () => {
    const runSharedOperation = createTestSharedOperation();
    const operationResult = createDeferred();
    let invocationCount = 0;
    const firstWait = runSharedOperation({
      operationKey: "release-a",
      executeOperation: async () => {
        invocationCount += 1;
        return operationResult.promise;
      },
    });
    const secondWait = runSharedOperation({
      operationKey: "release-a",
      executeOperation: async () => {
        throw new Error("A coalesced caller must not start another operation.");
      },
    });

    operationResult.resolve({ value: "shared" });

    await expect(Promise.all([firstWait, secondWait])).resolves.toEqual([
      { value: "shared" },
      { value: "shared" },
    ]);
    expect(invocationCount).toBe(1);
  });

  test("cancels one waiter without aborting work still needed by another", async () => {
    const runSharedOperation = createTestSharedOperation();
    const operationResult = createDeferred();
    const firstController = new AbortController();
    let sharedSignal;
    const firstWait = runSharedOperation({
      operationKey: "release-a",
      signal: firstController.signal,
      executeOperation: async ({ signal }) => {
        sharedSignal = signal;
        return operationResult.promise;
      },
    });
    const secondWait = runSharedOperation({
      operationKey: "release-a",
      executeOperation: async () => operationResult.promise,
    });
    const cancellationReason = new Error("caller stopped");

    firstController.abort(cancellationReason);

    await expect(firstWait).rejects.toMatchObject({
      message: "This waiter cancelled.",
      cause: cancellationReason,
    });
    expect(sharedSignal.aborted).toBe(false);

    operationResult.resolve("available");
    await expect(secondWait).resolves.toBe("available");
  });

  test("aborts and unregisters the operation after every current waiter cancels", async () => {
    const runSharedOperation = createTestSharedOperation();
    const firstController = new AbortController();
    const secondController = new AbortController();
    let invocationCount = 0;
    let firstSharedSignal;
    const executeOperation = ({ signal }) => {
      invocationCount += 1;
      firstSharedSignal ??= signal;

      return new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      });
    };
    const firstWait = runSharedOperation({
      operationKey: "release-a",
      signal: firstController.signal,
      executeOperation,
    });
    const secondWait = runSharedOperation({
      operationKey: "release-a",
      signal: secondController.signal,
      executeOperation,
    });

    firstController.abort(new Error("first stopped"));
    expect(firstSharedSignal.aborted).toBe(false);
    secondController.abort(new Error("second stopped"));

    await expect(firstWait).rejects.toThrow("This waiter cancelled.");
    await expect(secondWait).rejects.toThrow("This waiter cancelled.");
    expect(firstSharedSignal).toMatchObject({
      aborted: true,
      reason: {
        name: "AbortError",
        message: "Every waiter for release-a cancelled.",
      },
    });

    const retryController = new AbortController();
    const retryWait = runSharedOperation({
      operationKey: "release-a",
      signal: retryController.signal,
      executeOperation,
    });
    expect(invocationCount).toBe(2);
    retryController.abort();
    await expect(retryWait).rejects.toThrow("This waiter cancelled.");
  });

  test("shares rejection and permits a retry after rejection settles", async () => {
    const runSharedOperation = createTestSharedOperation();
    const rejectedOperation = createDeferred();
    const sharedError = new Error("repository unavailable");
    let invocationCount = 0;
    const executeRejectedOperation = async () => {
      invocationCount += 1;
      return rejectedOperation.promise;
    };
    const firstWait = runSharedOperation({
      operationKey: "release-a",
      executeOperation: executeRejectedOperation,
    });
    const secondWait = runSharedOperation({
      operationKey: "release-a",
      executeOperation: executeRejectedOperation,
    });
    rejectedOperation.reject(sharedError);

    await expect(firstWait).rejects.toBe(sharedError);
    await expect(secondWait).rejects.toBe(sharedError);
    expect(invocationCount).toBe(1);

    await expect(
      runSharedOperation({
        operationKey: "release-a",
        executeOperation: async () => {
          invocationCount += 1;
          return "recovered";
        },
      }),
    ).resolves.toBe("recovered");
    expect(invocationCount).toBe(2);
  });

  test("does not start an operation for an already-cancelled waiter", async () => {
    const runSharedOperation = createTestSharedOperation();
    const controller = new AbortController();
    let invoked = false;
    controller.abort(new Error("cancelled before invocation"));

    await expect(
      runSharedOperation({
        operationKey: "release-a",
        signal: controller.signal,
        executeOperation: async () => {
          invoked = true;
        },
      }),
    ).rejects.toMatchObject({
      message: "This waiter cancelled.",
      cause: controller.signal.reason,
    });
    expect(invoked).toBe(false);
  });

  test("observes cancellation that occurs synchronously while starting the operation", async () => {
    const runSharedOperation = createTestSharedOperation();
    const controller = new AbortController();
    const cancellationReason = new Error("cancelled during invocation");

    await expect(
      runSharedOperation({
        operationKey: "release-a",
        signal: controller.signal,
        executeOperation: async () => {
          controller.abort(cancellationReason);
          return "must not reach the waiter";
        },
      }),
    ).rejects.toMatchObject({
      message: "This waiter cancelled.",
      cause: cancellationReason,
    });
  });
});
