#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')
if echo "$COMMAND" | grep -qE "^pnpm "; then
  echo "Blocked: use npx instead of pnpm" >&2
  exit 2
fi
exit 0