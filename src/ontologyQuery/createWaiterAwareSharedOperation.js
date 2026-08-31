function defaultWaiterCancellationError({ signal }) {
  return (
    signal.reason ?? new DOMException("The waiter cancelled.", "AbortError")
  );
}

function defaultAllWaitersCancelledAbortReason() {
  return new DOMException("Every waiter cancelled.", "AbortError");
}

/**
 * Create an in-flight operation registry whose callers cancel independently.
 *
 * Equal keys share only the underlying work, never the caller-facing promise.
 * Consequently one caller can receive cancellation immediately without
 * aborting work another caller still needs. The internal controller is aborted
 * only when the final current waiter leaves, at which point the entry is also
 * removed so a later caller can start fresh work immediately.
 */
export function createWaiterAwareSharedOperation({
  createWaiterCancellationError = defaultWaiterCancellationError,
  createAllWaitersCancelledAbortReason = defaultAllWaitersCancelledAbortReason,
} = {}) {
  if (typeof createWaiterCancellationError !== "function") {
    throw new TypeError("createWaiterCancellationError must be a function.");
  }

  if (typeof createAllWaitersCancelledAbortReason !== "function") {
    throw new TypeError(
      "createAllWaitersCancelledAbortReason must be a function.",
    );
  }

  const inFlightEntriesByOperationKey = new Map();

  function createCancellationError(signal) {
    return createWaiterCancellationError({ signal });
  }

  function unregisterEntry(entry) {
    if (inFlightEntriesByOperationKey.get(entry.operationKey) === entry) {
      inFlightEntriesByOperationKey.delete(entry.operationKey);
    }
  }

  function createEntry(operationKey, executeOperation) {
    const entry = {
      operationKey,
      abortController: new AbortController(),
      waiterCount: 0,
      settled: false,
      promise: undefined,
    };
    inFlightEntriesByOperationKey.set(operationKey, entry);

    try {
      entry.promise = Promise.resolve(
        executeOperation({ signal: entry.abortController.signal }),
      );
    } catch (error) {
      entry.promise = Promise.reject(error);
    }

    // Register cleanup before any waiter reaction so a normally settled
    // operation cannot be mistaken for abandoned work and aborted afterward.
    entry.promise.then(
      () => {
        entry.settled = true;
        unregisterEntry(entry);
      },
      () => {
        entry.settled = true;
        unregisterEntry(entry);
      },
    );

    return entry;
  }

  function waitForEntry(entry, signal) {
    entry.waiterCount += 1;

    return new Promise((resolve, reject) => {
      let waiterSettled = false;

      function releaseWaiter() {
        if (waiterSettled) {
          return false;
        }

        waiterSettled = true;
        signal?.removeEventListener("abort", handleAbort);
        entry.waiterCount -= 1;

        if (entry.waiterCount === 0 && !entry.settled) {
          // With no useful consumer left, the old entry must not capture a
          // later caller even if its adapter takes time to observe abort.
          unregisterEntry(entry);
          entry.abortController.abort(
            createAllWaitersCancelledAbortReason({
              operationKey: entry.operationKey,
            }),
          );
        }

        return true;
      }

      function handleAbort() {
        if (releaseWaiter()) {
          reject(createCancellationError(signal));
        }
      }

      signal?.addEventListener("abort", handleAbort, { once: true });

      // The first caller starts its operation before this waiter is attached.
      // Recheck after listener registration so synchronous startup code cannot
      // move the caller signal from live to aborted inside that small window.
      if (signal?.aborted) {
        handleAbort();
      }

      entry.promise.then(
        (value) => {
          if (releaseWaiter()) {
            resolve(value);
          }
        },
        (error) => {
          if (releaseWaiter()) {
            reject(error);
          }
        },
      );
    });
  }

  return function runSharedOperation({
    operationKey,
    signal,
    executeOperation,
  }) {
    if (operationKey === undefined) {
      throw new TypeError("operationKey must be defined.");
    }

    if (typeof executeOperation !== "function") {
      throw new TypeError("executeOperation must be a function.");
    }

    if (signal?.aborted) {
      return Promise.reject(createCancellationError(signal));
    }

    const entry =
      inFlightEntriesByOperationKey.get(operationKey) ??
      createEntry(operationKey, executeOperation);
    return waitForEntry(entry, signal);
  };
}
