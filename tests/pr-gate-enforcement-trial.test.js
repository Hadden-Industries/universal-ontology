// Disposable enforcement trial: this commit must never be merged into main.
test("a selected product failure must block PR validation", () => {
  throw new Error("Intentional PR gate enforcement trial failure");
});
