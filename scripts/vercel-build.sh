#!/usr/bin/env bash
# scripts/vercel-build.sh
#
# Single build entrypoint used by all four Vercel projects.
# Set the VERCEL_APP environment variable in each Vercel project's settings
# to control which app is built (shell | auth | platform | admin).
#
# Vercel project settings:
#   Build Command:    bash scripts/vercel-build.sh
#   Output Directory: dist/apps/<VERCEL_APP>

set -euo pipefail

APP="${VERCEL_APP:?VERCEL_APP environment variable must be set to: shell | auth | platform | admin}"

echo "[vercel-build] Building app: $APP"

# Step 1: Inject environment-specific config from Vercel env vars into source files.
# This overwrites the placeholder environment.prod.ts (and remotes.json for shell).
bash scripts/generate-env.sh "$APP"

# Step 2: Build the app with Nx in production configuration.
# Nx's affected detection is handled by the separate Ignored Build Step script.
npx nx build "$APP" --configuration=production --skip-nx-cache
