import { Buffer } from "node:buffer";
import process from "node:process";

const MAXIMUM_OPERATIONAL_EVENT_LINE_BYTE_LENGTH = 2_048;
const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{0,95}$/u;
const LOWERCASE_TOKEN_PATTERN = /^[a-z][a-z0-9_]{0,63}$/u;
const SAFE_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,95}$/u;
const CORRELATION_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SEVERITY_VALUES = new Set(["info", "warning", "error"]);
const CHANNEL_VALUES = new Set(["stable", "development"]);

/**
 * This literal never passes through the caller-provided serializer. It is the
 * sole last-resort diagnostic when event validation, JSON serialization, or a
 * stderr write fails, and contains no data obtained from the failed event.
 */
export const UNIVERSAL_ONTOLOGY_MCP_OPERATIONAL_EVENT_FALLBACK_LINE =
  '{"eventName":"universal_ontology_mcp_operational_event_write_failed","severity":"error","outcome":"failed","safeErrorCode":"OPERATIONAL_EVENT_WRITE_FAILED"}\n';

function requirePattern(value, pattern, fieldName) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new TypeError(`Invalid operational-event ${fieldName}.`);
  }

  return value;
}

function requireEnum(value, allowedValues, fieldName) {
  if (!allowedValues.has(value)) {
    throw new TypeError(`Invalid operational-event ${fieldName}.`);
  }

  return value;
}

function requireNonNegativeSafeInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`Invalid operational-event ${fieldName}.`);
  }

  return value;
}

function copyOptionalField({ source, destination, fieldName, parse }) {
  const value = source[fieldName];

  if (value !== undefined) {
    destination[fieldName] = parse(value, fieldName);
  }
}

/**
 * Copy only the public event vocabulary in its fixed serialization order.
 * Unknown fields—including paths, URLs, query text, ontology values, HTTP
 * bodies, and exceptions—are deliberately never inspected or serialized.
 */
function createSafeOperationalEvent(event) {
  if (!event || typeof event !== "object") {
    throw new TypeError("An operational event must be an object.");
  }

  const safeEvent = {
    eventName: requirePattern(event.eventName, EVENT_NAME_PATTERN, "eventName"),
    severity: requireEnum(event.severity, SEVERITY_VALUES, "severity"),
  };
  copyOptionalField({
    source: event,
    destination: safeEvent,
    fieldName: "outcome",
    parse: (value, fieldName) =>
      requirePattern(value, LOWERCASE_TOKEN_PATTERN, fieldName),
  });
  copyOptionalField({
    source: event,
    destination: safeEvent,
    fieldName: "safeErrorCode",
    parse: (value, fieldName) =>
      requirePattern(value, SAFE_ERROR_CODE_PATTERN, fieldName),
  });
  copyOptionalField({
    source: event,
    destination: safeEvent,
    fieldName: "channel",
    parse: (value, fieldName) => requireEnum(value, CHANNEL_VALUES, fieldName),
  });
  copyOptionalField({
    source: event,
    destination: safeEvent,
    fieldName: "cacheOutcome",
    parse: (value, fieldName) =>
      requirePattern(value, LOWERCASE_TOKEN_PATTERN, fieldName),
  });
  copyOptionalField({
    source: event,
    destination: safeEvent,
    fieldName: "byteCount",
    parse: requireNonNegativeSafeInteger,
  });
  copyOptionalField({
    source: event,
    destination: safeEvent,
    fieldName: "elapsedMilliseconds",
    parse: requireNonNegativeSafeInteger,
  });
  copyOptionalField({
    source: event,
    destination: safeEvent,
    fieldName: "correlationIdentifier",
    parse: (value, fieldName) =>
      requirePattern(value, CORRELATION_IDENTIFIER_PATTERN, fieldName),
  });
  return safeEvent;
}

/**
 * Create the process-wide best-effort JSON-lines writer for stderr.
 *
 * The returned function is intentionally synchronous: it can be supplied to
 * cache and repository callbacks, and it completes the small bounded write
 * before those callers continue. It returns whether the requested event line
 * was accepted; diagnostic failure never throws into protocol service.
 */
export function createUniversalOntologyMcpOperationalEventWriter({
  standardError = process.stderr,
  serializeJson = JSON.stringify,
} = {}) {
  if (!standardError || typeof standardError.write !== "function") {
    throw new TypeError("standardError must implement write().");
  }

  if (typeof serializeJson !== "function") {
    throw new TypeError("serializeJson must be a function.");
  }

  let fallbackLineAttempted = false;

  function attemptFallbackLineOnce() {
    if (fallbackLineAttempted) {
      return;
    }

    fallbackLineAttempted = true;

    try {
      standardError.write(
        UNIVERSAL_ONTOLOGY_MCP_OPERATIONAL_EVENT_FALLBACK_LINE,
      );
    } catch {
      // With stderr itself unavailable there is no safe secondary channel.
    }
  }

  return function writeOperationalEvent(event) {
    try {
      const serializedEvent = serializeJson(createSafeOperationalEvent(event));

      if (typeof serializedEvent !== "string") {
        throw new TypeError(
          "The operational-event serializer returned no text.",
        );
      }

      const line = `${serializedEvent}\n`;

      if (
        Buffer.byteLength(line, "utf8") >
        MAXIMUM_OPERATIONAL_EVENT_LINE_BYTE_LENGTH
      ) {
        throw new TypeError("The operational-event line exceeds its bound.");
      }

      standardError.write(line);
      return true;
    } catch {
      attemptFallbackLineOnce();
      return false;
    }
  };
}
