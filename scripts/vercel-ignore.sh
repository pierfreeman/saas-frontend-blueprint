#!/usr/bin/env bash
# scripts/vercel-ignore.sh
#
# Vercel "Ignored Build Step" script for Nx monorepos.
# Exit 0  → Vercel SKIPS the build (app not affected by this commit).
# Exit 1  → Vercel PROCEEDS with the build (app is affected).
#
# Vercel project settings:
#   Ignored Build Step: bash scripts/vercel-ignore.sh
#
# Requires VERCEL_APP to be set to the app name (shell | auth | platform | admin).

set -euo pipefail

APP="${VERCEL_APP:?VERCEL_APP environment variable must be set}"

# Vercel injects these SHAs automatically.
# VERCEL_GIT_PREVIOUS_SHA is the SHA of the last successful deployment for this project.
# Falls back to HEAD~1 for the first deployment or local testing.
BASE="${VERCEL_GIT_PREVIOUS_SHA:-}"
HEAD_SHA="${VERCEL_GIT_COMMIT_SHA:-HEAD}"

if [[ -z "$BASE" ]]; then
  # No previous deployment — always build (first deploy or can't determine delta).
  echo "[vercel-ignore] No VERCEL_GIT_PREVIOUS_SHA set; proceeding with build."
  exit 1
fi

# Vercel does a shallow clone by default. Fetch enough history so that the
# base commit (last successful deploy SHA) is available for nx affected.
if ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  echo "[vercel-ignore] Fetching history to reach base commit $BASE..."
  git fetch --unshallow 2>/dev/null || git fetch origin --depth=50 2>/dev/null || true
fi

if ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  echo "[vercel-ignore] Base commit $BASE still not available after fetch; proceeding with build."
  exit 1
fi

echo "[vercel-ignore] Checking if '$APP' is affected between $BASE and $HEAD_SHA..."

AFFECTED=$(npx nx show projects --affected --base="$BASE" --head="$HEAD_SHA" 2>/dev/null || true)

if echo "$AFFECTED" | grep -qx "$APP"; then
  echo "[vercel-ignore] '$APP' IS affected — proceeding with build."
  exit 1
else
  echo "[vercel-ignore] '$APP' is NOT affected — skipping build."
  exit 0
fi
