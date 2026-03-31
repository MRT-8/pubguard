#!/usr/bin/env bash
# PubGuard demo — creates a leaky npm package and scans it
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

echo ""
echo "  PubGuard demo"
echo "  =============="
echo ""
echo "  Creating a test package with common security issues..."
echo ""

# Create a fake npm package with multiple issues
mkdir -p "$TMP_DIR/package/dist"

cat > "$TMP_DIR/package/package.json" << 'EOF'
{"name":"leaky-app","version":"1.0.0","main":"dist/index.js"}
EOF

cat > "$TMP_DIR/package/.env" << 'EOF'
DATABASE_URL=postgres://admin:s3cret@db.internal.company.com:5432/prod
API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxx
EOF

# JS file with sourceMappingURL and a system prompt
cat > "$TMP_DIR/package/dist/index.js" << 'EOF'
"use strict";
const systemPrompt = "You are a helpful AI assistant. Follow these rules strictly...";
module.exports = { run: function() { console.log("app"); } };
//# sourceMappingURL=index.js.map
EOF

# Source map with embedded original source code
cat > "$TMP_DIR/package/dist/index.js.map" << 'EOF'
{"version":3,"sources":["../src/index.ts","../src/config.ts","../src/prompts.ts"],"sourcesContent":["import { config } from './config';\nimport { getPrompt } from './prompts';\n\nexport function run() {\n  const prompt = getPrompt();\n  console.log('Starting app...');\n}\n","export const config = {\n  apiKey: process.env.API_KEY,\n  debug: true,\n  internalApi: 'https://api.internal.company.com/v2'\n};\n","export function getPrompt() {\n  const systemPrompt = \"You are a helpful AI assistant created by ACME Corp...\";\n  return systemPrompt;\n}\n"],"mappings":"AAAA;AACA;AACA"}
EOF

# Create tarball
cd "$TMP_DIR"
tar czf leaky-app-1.0.0.tgz package/

echo "  Scanning with PubGuard..."
echo ""

# Run pubguard
node "$PROJECT_DIR/dist/cli.js" check "$TMP_DIR/leaky-app-1.0.0.tgz" --strict 2>&1 || true

echo ""
echo "  PubGuard blocked the publish!"
echo "  Fix the issues above, then publish safely."
echo ""
