import fs from "node:fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported output formats selectable via the `--format` / `-f` flag. */
export type OutputFormat = "json" | "table" | "quiet";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * ID field names recognised across the Trilium ETAPI surface.
 * The order matters: the first match wins when scanning an object in quiet mode.
 */
const ID_FIELDS = [
  "noteId",
  "branchId",
  "attributeId",
  "attachmentId",
  "revisionId",
] as const;

/**
 * Columns that are meaningful in a table view.  When the incoming array
 * contains objects we pick only the keys that appear in this list so the
 * table stays readable in a terminal.
 */
const TABLE_COLUMNS = [
  "noteId",
  "branchId",
  "attributeId",
  "attachmentId",
  "revisionId",
  "title",
  "type",
  "name",
  "value",
  "mime",
  "dateCreated",
  "dateModified",
  "utcDateModified",
] as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return the first recognised ID field name present on `obj`, or `undefined`
 * when none of the known ID fields exist.
 */
function findIdField(obj: Record<string, unknown>): string | undefined {
  return ID_FIELDS.find((field) => field in obj);
}

/**
 * Given an array of objects, return the subset of {@link TABLE_COLUMNS} that
 * actually appear as keys in at least one element.
 */
function selectTableColumns(rows: Record<string, unknown>[]): string[] {
  const present = new Set<string>();
  for (const row of rows) {
    for (const col of TABLE_COLUMNS) {
      if (col in row) {
        present.add(col);
      }
    }
  }
  // Preserve the canonical column ordering defined in TABLE_COLUMNS.
  return TABLE_COLUMNS.filter((col) => present.has(col));
}

// ---------------------------------------------------------------------------
// Format: JSON
// ---------------------------------------------------------------------------

function formatJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Format: table
// ---------------------------------------------------------------------------

function formatTable(data: unknown): void {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      // Nothing to display.
      return;
    }

    // When every element is a plain object we can do smart column selection.
    const allObjects = data.every(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object" && !Array.isArray(item),
    );

    if (allObjects) {
      const columns = selectTableColumns(data);
      if (columns.length > 0) {
        console.table(data, columns);
      } else {
        // No recognised columns -- fall back to default console.table.
        console.table(data);
      }
    } else {
      console.table(data);
    }

    return;
  }

  if (data !== null && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      console.log(`${key}: ${value}`);
    }
    return;
  }

  // Primitives or other unexpected shapes -- just stringify.
  console.log(String(data));
}

// ---------------------------------------------------------------------------
// Format: quiet
// ---------------------------------------------------------------------------

function formatQuiet(data: unknown): void {
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item !== null && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const idField = findIdField(record);
        if (idField) {
          console.log(record[idField]);
          continue;
        }
      }
      // Non-object element or no recognised ID field -- fall back to JSON.
      console.log(JSON.stringify(item));
    }
    return;
  }

  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    const idField = findIdField(record);
    if (idField) {
      console.log(record[idField]);
      return;
    }
  }

  // No ID field found -- fall back to JSON.
  formatJson(data);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format and print `data` to stdout according to the chosen {@link OutputFormat}.
 *
 * - **json** (default) -- pretty-printed JSON, suitable for piping to `jq`.
 * - **table** -- human-friendly tabular view with smart column selection.
 * - **quiet** -- print only the primary ID of each item, one per line.
 */
export function formatOutput(format: OutputFormat, data: unknown): void {
  switch (format) {
    case "json":
      formatJson(data);
      break;
    case "table":
      formatTable(data);
      break;
    case "quiet":
      formatQuiet(data);
      break;
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unknown format: ${_exhaustive}`);
    }
  }
}

/**
 * Write binary data to a file or to stdout.
 *
 * When `outputPath` is provided the buffer is written to that path on disk.
 * Otherwise the raw bytes are written directly to `process.stdout` so the
 * caller can pipe them into another process.
 */
export function outputBinary(data: Buffer, outputPath?: string): void {
  if (outputPath) {
    fs.writeFileSync(outputPath, data);
  } else {
    process.stdout.write(data);
  }
}
