#!/usr/bin/env bash
# Regenerates PNG PWA icons from public/favicon.svg and public/icon-maskable.svg.
# Requires rsvg-convert (brew install librsvg).
set -euo pipefail

cd "$(dirname "$0")/.."

command -v rsvg-convert >/dev/null 2>&1 || {
  echo "rsvg-convert not found. Install with: brew install librsvg" >&2
  exit 1
}

rsvg-convert -w 192  -h 192  public/favicon.svg        > public/icons/icon-192.png
rsvg-convert -w 512  -h 512  public/favicon.svg        > public/icons/icon-512.png
rsvg-convert -w 512  -h 512  public/icon-maskable.svg  > public/icons/icon-512-maskable.png
rsvg-convert -w 180  -h 180  public/favicon.svg        > public/icons/apple-touch-icon-180.png

echo "Generated:"
ls -lh public/icons/
