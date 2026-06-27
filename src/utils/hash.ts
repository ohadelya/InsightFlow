import { createHash } from "crypto";

export function computeHash(value: string): string {
  return createHash("sha256").update(value || "", "utf8").digest("hex");
}
