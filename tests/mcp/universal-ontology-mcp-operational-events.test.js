import {
  UNIVERSAL_ONTOLOGY_MCP_OPERATIONAL_EVENT_FALLBACK_LINE,
  createUniversalOntologyMcpOperationalEventWriter,
} from "../../src/mcp/universalOntologyMcpOperationalEvents.js";

function createRecordingStandardError() {
  const lines = [];
  return {
    lines,
    write(value) {
      lines.push(value);
      return true;
    },
  };
}

describe("Universal Ontology MCP operational events", () => {
  test("writes one allowlisted, bounded JSON object per stderr line", () => {
    const standardError = createRecordingStandardError();
    const writeOperationalEvent =
      createUniversalOntologyMcpOperationalEventWriter({ standardError });

    expect(
      writeOperationalEvent({
        eventName: "ontology_query_artifact_retained_snapshot_selected",
        severity: "warning",
        outcome: "fallback",
        safeErrorCode: "ORIGIN_REQUEST_TIMEOUT",
        channel: "stable",
        cacheOutcome: "last_known_good",
        byteCount: 0,
        elapsedMilliseconds: 125,
        correlationIdentifier: "7bb4c2d8-860b-4cd7-a073-0dc9f2e1c680",
        localPath: "C:\\Users\\private\\ontology-cache",
        queryText: "private acquisition target",
        sourceUrl: "https://example.test/?secret=value",
        stack: "private stack",
      }),
    ).toBe(true);

    expect(standardError.lines).toHaveLength(1);
    expect(standardError.lines[0].endsWith("\n")).toBe(true);
    expect(JSON.parse(standardError.lines[0])).toEqual({
      eventName: "ontology_query_artifact_retained_snapshot_selected",
      severity: "warning",
      outcome: "fallback",
      safeErrorCode: "ORIGIN_REQUEST_TIMEOUT",
      channel: "stable",
      cacheOutcome: "last_known_good",
      byteCount: 0,
      elapsedMilliseconds: 125,
      correlationIdentifier: "7bb4c2d8-860b-4cd7-a073-0dc9f2e1c680",
    });
    expect(standardError.lines[0]).not.toMatch(
      /private|secret|sourceUrl|localPath|queryText|stack/u,
    );
    expect(Buffer.byteLength(standardError.lines[0], "utf8")).toBeLessThan(
      2_048,
    );
  });

  test.each([
    { eventName: "x".repeat(97), severity: "warning" },
    { eventName: "unsafe\nname", severity: "warning" },
    { eventName: "safe_name", severity: "critical" },
    {
      eventName: "safe_name",
      severity: "error",
      correlationIdentifier: "x".repeat(129),
    },
    {
      eventName: "safe_name",
      severity: "error",
      byteCount: Number.MAX_SAFE_INTEGER + 1,
    },
  ])(
    "replaces unsafe or unbounded allowed values with the fixed line %#",
    (event) => {
      const standardError = createRecordingStandardError();
      const writeOperationalEvent =
        createUniversalOntologyMcpOperationalEventWriter({ standardError });

      expect(writeOperationalEvent(event)).toBe(false);
      expect(standardError.lines).toEqual([
        UNIVERSAL_ONTOLOGY_MCP_OPERATIONAL_EVENT_FALLBACK_LINE,
      ]);
    },
  );

  test("emits the fixed fallback at most once after serialization failures", () => {
    const standardError = createRecordingStandardError();
    const writeOperationalEvent =
      createUniversalOntologyMcpOperationalEventWriter({
        standardError,
        serializeJson() {
          throw new Error("private serializer failure");
        },
      });

    expect(
      writeOperationalEvent({ eventName: "safe_name", severity: "error" }),
    ).toBe(false);
    expect(
      writeOperationalEvent({ eventName: "safe_name", severity: "error" }),
    ).toBe(false);
    expect(standardError.lines).toEqual([
      UNIVERSAL_ONTOLOGY_MCP_OPERATIONAL_EVENT_FALLBACK_LINE,
    ]);
  });

  test("attempts the fixed fallback once after a stderr write failure", () => {
    const writtenValues = [];
    let invocationCount = 0;
    const standardError = {
      write(value) {
        invocationCount += 1;

        if (invocationCount === 1) {
          throw new Error("private stderr failure");
        }

        writtenValues.push(value);
        return true;
      },
    };
    const writeOperationalEvent =
      createUniversalOntologyMcpOperationalEventWriter({ standardError });

    expect(
      writeOperationalEvent({ eventName: "safe_name", severity: "error" }),
    ).toBe(false);
    expect(writtenValues).toEqual([
      UNIVERSAL_ONTOLOGY_MCP_OPERATIONAL_EVENT_FALLBACK_LINE,
    ]);
  });

  test("has no stdout dependency and tolerates fallback-write failure", () => {
    let writeInvocationCount = 0;
    const writeOperationalEvent =
      createUniversalOntologyMcpOperationalEventWriter({
        standardError: {
          write() {
            writeInvocationCount += 1;
            throw new Error("stderr unavailable");
          },
        },
      });

    expect(() =>
      writeOperationalEvent({ eventName: "safe_name", severity: "error" }),
    ).not.toThrow();
    expect(() =>
      writeOperationalEvent({ eventName: "safe_name", severity: "error" }),
    ).not.toThrow();
    expect(writeInvocationCount).toBe(3);
  });
});
