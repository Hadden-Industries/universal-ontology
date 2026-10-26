/** Shared lexical identity of query digests; each consumer still validates its inputs. */
import * as z from "zod";

export const SHA_256_HEXADECIMAL_PATTERN = /^[0-9a-f]{64}$/u;
export const SHA_256_FILE_NAME_PATTERN = new RegExp(
  `^(${SHA_256_HEXADECIMAL_PATTERN.source.slice(1, -1)})\\.json$`,
  "u",
);
export const LowercaseSha256Schema = z
  .string()
  .regex(SHA_256_HEXADECIMAL_PATTERN);
