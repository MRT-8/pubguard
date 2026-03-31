<div align="center">

# pubguard

**Guard what you publish.**

Detect source maps, system prompts, and sensitive files in npm packages — before they ship.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)

**English** | [中文](./README.zh-CN.md)

</div>

---

Born from the [Claude Code source map leak](https://dev.to/gabrielanhaia/claude-codes-entire-source-code-was-just-leaked-via-npm-source-maps-heres-whats-inside-cjo) — where a 57 MB `.map` file exposed 512K lines of proprietary code. No tool caught it. **pubguard would have.**

## Demo

```
$ pubguard check leaky-app-1.0.0.tgz --strict

pubguard scan results
4 files, 956 B

  x  Source map "dist/cli.js.map" contains sourcesContent
     — full original source code is embedded and will be published
     fix: Add "*.map" to .npmignore or disable sourcemap in bundler

  x  "dist/index.js" contains an AI system prompt (systemPrompt variable)
     fix: Move system prompts to env vars or a private config service

  x  Sensitive file ".env" detected
     fix: Add ".env" to .npmignore or use "files" whitelist in package.json

  !  "dist/index.js" references local source map "index.js.map"
     fix: Remove sourceMappingURL for production builds

  3 error(s)  1 warning(s)

  Publish blocked — fix errors above before publishing
```

## Quick Start

```bash
npx pubguard check --dry-run            # scan what npm would publish
npx pubguard check my-pkg.tgz --strict  # scan a tarball
```

**Add to your publish workflow (recommended):**

```bash
npm install -D pubguard
npm pkg set scripts.prepublishOnly="pubguard check --dry-run --strict"
```

Now `npm publish` automatically runs pubguard first. Errors block the publish.

## What It Detects

| Rule | Default | Detects |
|------|---------|---------|
| `sourcemap-leak` | error | `.map` files with `sourcesContent` — full source code exposure |
| `sourcemap-reference` | warn | `sourceMappingURL` comments pointing to map files |
| `env-file` | error | `.env`, `.npmrc`, `credentials.json`, SSH configs |
| `private-key` | error | `.pem`, `.key`, `id_rsa`, PEM-encoded private keys |
| `system-prompt` | error | AI system prompts embedded in published code |
| `unminified-source` | warn | Large unminified JS files (likely unbundled source) |
| `debug-config` | warn | `debug: true`, `NODE_ENV=development` left in builds |
| `internal-url` | warn | Internal/corporate URLs (`*.internal.*`, private IPs) |

## Why pubguard?

Existing tools find **secrets in code** or **vulnerabilities in dependencies**. Nobody checks **what's actually in your published package**:

| | Secrets in code | Source map leak | System prompt leak | .env in package |
|---|:---:|:---:|:---:|:---:|
| TruffleHog / Gitleaks | ✅ | ❌ | ❌ | ❌ |
| npm audit | ❌ | ❌ | ❌ | ❌ |
| **pubguard** | — | **✅** | **✅** | **✅** |

## Usage

```bash
pubguard check [file.tgz] [options]
pubguard init                        # create .pubguardrc.json

Options:
  --dry-run        Scan files npm would publish (no .tgz needed)
  --strict         Exit 1 on any error
  --format <fmt>   text (default), json, sarif
  --output <file>  Write report to file
  --config <path>  Custom config path
```

<details>
<summary><b>Configuration</b></summary>

```jsonc
// .pubguardrc.json
{
  "rules": {
    "sourcemap-leak": "error",    // "error" | "warn" | "info" | "off"
    "system-prompt": "error",
    "env-file": "error",
    "private-key": "error",
    "sourcemap-reference": "warn",
    "unminified-source": "warn",
    "debug-config": "warn",
    "internal-url": "warn"
  },
  "ignore": ["dist/vendor/**"],
  "thresholds": {
    "max-package-size": "10MB",
    "max-file-size": "5MB"
  }
}
```

</details>

<details>
<summary><b>Custom Rules</b></summary>

Create `.pubguard-rules/my-rule.js`:

```javascript
export default {
  id: 'my-custom-rule',
  defaultSeverity: 'warn',
  description: 'Detect something specific to my project',
  detect(file) {
    const results = [];
    if (file.path.endsWith('.secret')) {
      results.push({
        ruleId: 'my-custom-rule',
        severity: 'error',
        message: `Secret file found: ${file.path}`,
        file: file.path,
        fix: 'Remove this file from the package',
      });
    }
    return results;
  },
};
```

</details>

## CI/CD Integration

**GitHub Actions:**

```yaml
- name: Check publish safety
  uses: pubguard/action@v1
  with:
    strict: true
```

**Or directly:**

```yaml
- run: npx pubguard check --dry-run --strict
```

**Combined with secret scanning:**

```yaml
- run: npx pubguard check --dry-run --strict  # artifact content
- run: trufflehog filesystem . --fail          # secrets
- run: npm publish --provenance                # publish with SLSA
```

**SARIF for GitHub Code Scanning:**

```yaml
- run: npx pubguard check --dry-run --format sarif --output pubguard.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: pubguard.sarif
```

## How It Works

1. Reads your package contents (via `npm pack --dry-run` or `.tgz` file)
2. Runs each file through 8 detection rules
3. Reports findings with severity + fix suggestions
4. Exits non-zero if errors found → blocks `npm publish`

Zero dependencies. All local. No data leaves your machine.

## License

[Apache-2.0](LICENSE)
