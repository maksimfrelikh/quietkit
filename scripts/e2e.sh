#!/usr/bin/env bash
# Browser tests inside the official Playwright image: same browsers, same rendering on
# every machine. The repo is mounted read-write so Playwright can write test-results/.
# The host's node_modules are reused (Linux x64 on both the image and laptop-server;
# on a Mac, Docker runs Linux too, so the same modules work).
#
# Runs as the host user, not root: the container writes dist/, node_modules/.vite/deps,
# test-results/ and the snapshot baselines, and root-owned files there broke the host's
# `npm run verify` (astro check could not unlink .vite/deps — seen 2026-10-01). HOME must be
# writable for npx's cache; the image's browsers live in /ms-playwright, readable by anyone.
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE="mcr.microsoft.com/playwright:v1.61.0-noble"
exec docker run --rm --init --ipc=host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$PWD":/work -w /work \
  -e CI="${CI:-}" -e E2E_BASE_URL="${E2E_BASE_URL:-}" \
  "$IMAGE" npx playwright test "$@"
