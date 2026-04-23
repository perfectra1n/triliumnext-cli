# triliumnext-cli

A command-line interface for [TriliumNext Notes](https://github.com/TriliumNext/Notes), providing full coverage of the ETAPI (External API).

## Features

- **Complete ETAPI coverage** -- all 40 endpoints across notes, branches, attributes, attachments, revisions, calendar, auth, and system
- **Multiple output formats** -- JSON (default, pipe to `jq`), table (human-readable), and quiet (IDs only)
- **Binary-safe** -- download/upload note content and attachments, export/import ZIP archives
- **Markdown support** -- create or update notes with markdown content, auto-converted to HTML
- **Flexible configuration** -- CLI flags, environment variables, or config file
- **Single binary** -- zero runtime dependencies, bundled with Bun

## Installation

### Download a prebuilt binary (recommended)

Grab the latest binary for your platform from [GitHub Releases](https://github.com/perfectra1n/triliumnext-cli/releases):

```bash
# One-liner install (Linux / macOS)
curl -fsSL https://raw.githubusercontent.com/perfectra1n/triliumnext-cli/master/install.sh | bash
```

Or download manually:

```bash
# Example: Linux x64
curl -fSL https://github.com/perfectra1n/triliumnext-cli/releases/latest/download/trilium-linux-x64 -o trilium
chmod +x trilium
sudo mv trilium /usr/local/bin/
```

Available binaries: `linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `windows-x64`.

### Build from source

```bash
git clone --recurse-submodules https://github.com/perfectra1n/triliumnext-cli
cd triliumnext-cli
bun install
bun run build:compile   # standalone binary → ./trilium
```

Requires [Bun](https://bun.sh/) to build. The compiled binary has no runtime dependencies.

## Configuration

The CLI resolves connection settings in priority order:

1. **CLI flags**: `--server` / `--token`
2. **Environment variables**: `TRILIUM_URL` / `TRILIUM_TOKEN`
3. **Config file**: `~/.config/triliumnext-cli/config.json` (or legacy `~/.trilium-cli.json`)
4. **Default**: `http://localhost:37740`

### Config file

```json
{
  "serverUrl": "http://localhost:37740/etapi",
  "authToken": "your-etapi-token",
  "defaultParent": "#clipperInbox",
  "defaultType": "text",
  "defaultFormat": "pretty"
}
```

`defaultParent`, `defaultType`, and `defaultFormat` are optional and tune the
behavior of `notes create` and the global `--format` flag:

- **`defaultParent`** -- where `notes create` puts new notes when `--parent`
  is omitted. Either a noteId (e.g. `"abc123"`) or a label pointer
  (e.g. `"#clipperInbox"`, `"#workspaceInbox"`). Labels are resolved at
  create time via search; if no match exists, the note is placed under `root`.
  When unset, the CLI looks for `#clipperInbox` automatically.
- **`defaultType`** -- the note type used when `--type` is omitted. Defaults
  to `"text"`.
- **`defaultFormat`** -- the output format used when `-f`/`--format` is
  omitted. Defaults to `"pretty"`.

Each key has an env-var equivalent (highest precedence after the CLI flag):
`TRILIUM_DEFAULT_PARENT`, `TRILIUM_DEFAULT_TYPE`, `TRILIUM_DEFAULT_FORMAT`.

### Login and save credentials

```bash
trilium auth login --server http://localhost:37740/etapi
```

This prompts for your password interactively, authenticates, receives an ETAPI token, and saves both the server URL and token to the config file.

## Usage

```
trilium <command> [options]
```

### Global options

| Flag | Alias | Description |
|------|-------|-------------|
| `--server <url>` | `-s` | Trilium server URL |
| `--token <token>` | `-t` | ETAPI auth token |
| `--format <fmt>` | `-f` | Output format: `pretty` (default), `json`, `table`, `quiet` |
| `--help` | | Show help |

### Notes

```bash
# Get a note by ID
trilium notes get <noteId>

# Search notes
trilium notes search "my query" --limit 10 --order-by title

# Create a note (uses defaults: --type text, --parent = #clipperInbox or root)
trilium notes create --title "My Note" --content "Hello"

# Override defaults explicitly
trilium notes create --parent root --title "My Note" --type text --content "Hello"

# Create from a file
trilium notes create --title "From File" --file ./notes.txt

# Create from stdin (clipper-style: pipe markdown straight in)
echo "# piped content" | trilium notes create --title "Piped" --markdown

# Create with markdown (auto-converts to HTML)
trilium notes create --title "MD Note" --content "# Heading" --markdown

# Update note metadata
trilium notes patch <noteId> --title "New Title"

# Get/set note content
trilium notes get-content <noteId>
trilium notes get-content <noteId> -o output.html
trilium notes set-content <noteId> --content "new content"
trilium notes set-content <noteId> --file ./content.html
cat document.md | trilium notes set-content <noteId> --markdown

# Export/import
trilium notes export <noteId> -o backup.zip
trilium notes export <noteId> --export-format markdown -o notes.zip
trilium notes import <noteId> --file archive.zip

# Create a revision snapshot
trilium notes revision <noteId>

# Delete / restore
trilium notes delete <noteId>
trilium notes undelete <noteId>

# Recent change history
trilium notes history
trilium notes history --ancestor <noteId>
```

### Branches

```bash
trilium branches get <branchId>
trilium branches create --note-id <noteId> --parent-note-id <parentId>
trilium branches patch <branchId> --prefix "prefix" --position 10
trilium branches delete <branchId>
trilium branches refresh-ordering <parentNoteId>
```

### Attributes

```bash
trilium attributes get <attributeId>
trilium attributes create --note-id <noteId> --type label --name priority --value high
trilium attributes patch <attributeId> --value "updated"
trilium attributes delete <attributeId>
```

### Attachments

```bash
trilium attachments get <attachmentId>
trilium attachments list <noteId>
trilium attachments create --owner-id <noteId> --role file --mime image/png --title photo.png --content "..."
trilium attachments patch <attachmentId> --title "renamed.png"
trilium attachments delete <attachmentId>

# Binary content
trilium attachments get-content <attachmentId> -o image.png
trilium attachments set-content <attachmentId> --file photo.png
```

### Revisions

```bash
trilium revisions list <noteId>
trilium revisions get <revisionId>
trilium revisions content <revisionId> -o snapshot.html
```

### Calendar

```bash
trilium calendar inbox                     # today's inbox
trilium calendar inbox 2024-03-15          # specific date
trilium calendar day 2024-03-15
trilium calendar week 2024-W12
trilium calendar month 2024-03
trilium calendar year 2024
```

### Auth

```bash
trilium auth login --server <url>
trilium auth logout
```

### System

```bash
trilium system info
trilium system backup mybackup
```

## Output formats

```bash
# Pretty (default) -- colorized when stdout is a TTY, plain when piped
trilium notes get root

# Pretty JSON -- machine-friendly, ideal for jq
trilium notes get root -f json | jq '.title'

# Human-readable table
trilium notes search "journal" -f table

# IDs only -- useful in scripts
NOTE_ID=$(trilium notes search "meeting" -f quiet | head -1)
trilium notes get-content "$NOTE_ID"
```

To make a different format your default, set `defaultFormat` in your config
file or `TRILIUM_DEFAULT_FORMAT` in your environment.

## Development

```bash
# Run from source (no build step)
bun run dev -- notes get root

# Type checking
bun run typecheck

# Unit tests
bun run test

# Integration tests (requires Docker)
bun run test:integration

# All tests
bun run test:all

# Test coverage
bun run test:coverage

# Build the single-file bundle
bun run build
```

### Integration tests

Integration tests run against a real TriliumNext instance using [testcontainers](https://node.testcontainers.org/). Docker must be available. The test suite automatically:

1. Pulls `triliumnext/trilium:latest`
2. Starts a container with no-auth mode
3. Initializes the database
4. Runs all ETAPI integration tests
5. Tears down the container

You can also run against an external instance:

```bash
TRILIUM_URL=http://localhost:37740/etapi TRILIUM_TOKEN="" bun run test:integration
```

## Architecture

```
src/
  main.ts            # CLI entry point (yargs)
  config.ts          # 3-tier config resolution
  output.ts          # JSON / table / quiet formatters
  errors.ts          # Error handling
  stdin.ts           # Stdin reading utility
  client/
    index.ts         # EtapiClient (all 40 endpoints)
    http.ts          # HTTP transport (built-in fetch)
    types.ts         # ETAPI response types
  commands/
    notes.ts         # Note CRUD, content, export/import, history
    branches.ts      # Branch CRUD, refresh ordering
    attributes.ts    # Attribute CRUD
    attachments.ts   # Attachment CRUD, binary content
    revisions.ts     # Revision listing, content retrieval
    calendar.ts      # Day/week/month/year/inbox notes
    auth.ts          # Login/logout
    system.ts        # App info, backup
  utils/
    markdown.ts      # Markdown-to-HTML conversion
tests/
  unit/              # 216 unit tests (mocked HTTP)
  integration/       # Integration tests (real Trilium via Docker)
```

## License

See [LICENSE](LICENSE) for details.
