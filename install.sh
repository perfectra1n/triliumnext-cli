#!/bin/sh
set -eu

REPO="perfectra1n/triliumnext-cli"
BINARY="trilium"

get_latest_version() {
  curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" |
    grep '"tag_name"' | head -1 | cut -d'"' -f4
}

detect_platform() {
  os=$(uname -s)
  arch=$(uname -m)

  case "$os" in
    Linux)  os="linux" ;;
    Darwin) os="darwin" ;;
    *)      echo "Unsupported OS: $os" >&2; exit 1 ;;
  esac

  case "$arch" in
    x86_64|amd64)  arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *)             echo "Unsupported architecture: $arch" >&2; exit 1 ;;
  esac

  echo "${os}-${arch}"
}

VERSION="${VERSION:-$(get_latest_version)}"
PLATFORM=$(detect_platform)
ASSET="${BINARY}-${PLATFORM}"
BASE_URL="https://github.com/${REPO}/releases/download/${VERSION}"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Downloading ${ASSET} ${VERSION}..."
curl -fSL "${BASE_URL}/${ASSET}" -o "${TMPDIR}/${ASSET}"
curl -fSL "${BASE_URL}/checksums.txt" -o "${TMPDIR}/checksums.txt"

echo "Verifying checksum..."
cd "$TMPDIR"
grep "  ${ASSET}\$" checksums.txt | sha256sum -c - || {
  # macOS uses shasum instead of sha256sum
  grep "  ${ASSET}\$" checksums.txt | shasum -a 256 -c -
}

INSTALL_DIR="${INSTALL_DIR:-}"
if [ -z "$INSTALL_DIR" ]; then
  if [ -w /usr/local/bin ]; then
    INSTALL_DIR="/usr/local/bin"
  else
    INSTALL_DIR="${HOME}/.local/bin"
    mkdir -p "$INSTALL_DIR"
  fi
fi

chmod +x "${TMPDIR}/${ASSET}"
mv "${TMPDIR}/${ASSET}" "${INSTALL_DIR}/${BINARY}"

echo "Installed ${BINARY} ${VERSION} to ${INSTALL_DIR}/${BINARY}"

case ":${PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *) echo "NOTE: Add ${INSTALL_DIR} to your PATH if not already present." ;;
esac
