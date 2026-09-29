#!/usr/bin/env bash
# Browser tests inside the official Playwright image: same browsers, same rendering on
# every machine. The repo is mounted read-write so Playwright can write test-results/.
# The host's node_modules are reused (Linux x64 on both the image and laptop-server;
# on a Mac, Docker runs Linux too, so the same modules work).
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE="mcr.microsoft.com/playwright:v1.61.0-noble"
exec docker run --rm --init --ipc=host \
  -v "$PWD":/work -w /work \
  -e CI="${CI:-}" \
  "$IMAGE" npx playwright test "$@"
