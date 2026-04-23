import type { EtapiClient } from "../client/index.js";

const DEFAULT_INBOX_LABEL = "clipperInbox";

/**
 * Resolve the parent noteId for a "clipper-style" note creation.
 *
 * Resolution order (highest precedence first):
 *   1. `configured` is a plain noteId (no leading `#`)  → use it verbatim.
 *   2. `configured` is `#labelName` (or `undefined`)    → search for the first
 *      note carrying that label; default label is `clipperInbox`.
 *   3. No match found                                   → fall back to `"root"`.
 *
 * This lets a user point their config at either:
 *   - a stable noteId (`"defaultParent": "abc123"`), or
 *   - a label they manage in Trilium (`"defaultParent": "#workspaceInbox"`).
 */
export async function resolveDefaultParent(
  client: EtapiClient,
  configured: string | undefined,
): Promise<string> {
  if (configured && !configured.startsWith("#")) {
    return configured;
  }

  const label = (configured ?? `#${DEFAULT_INBOX_LABEL}`).slice(1);
  const { results } = await client.searchNotes({ search: `#${label}`, limit: 1 });
  return results[0]?.noteId ?? "root";
}
