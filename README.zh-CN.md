<div align="center">
  <h1>PubGuard</h1>
  <p><strong>守护你的每一次发布。</strong></p>
  <p>在 npm 包发布前，自动检测 source map 泄露、AI system prompt 暴露、敏感文件残留。</p>
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License"></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node"></a>
    <img src="https://img.shields.io/badge/dependencies-0-brightgreen.svg" alt="Zero Dependencies">
  </p>
  <p>
    <a href="https://www.npmjs.com/package/pubguard"><img src="https://img.shields.io/npm/v/pubguard.svg" alt="npm"></a>
  </p>
  <p><a href="./README.md">English</a> | <strong>中文</strong></p>
</div>

---

源于 [Claude Code source map 泄露事件](https://dev.to/gabrielanhaia/claude-codes-entire-source-code-was-just-leaked-via-npm-source-maps-heres-whats-inside-cjo) — 一个 57MB 的 `.map` 文件将 51.2 万行源码暴露在 npm 上。没有任何工具拦截。**PubGuard 能做到。**

<picture>
  <img alt="PubGuard demo" src="assets/demo.svg" width="100%">
</picture>

## 快速开始

```bash
npx pubguard check --dry-run            # 扫描 npm 将要发布的文件
npx pubguard check my-pkg.tgz --strict  # 扫描指定 tarball
```

**加入发布流程（推荐）：**

```bash
npm install -D pubguard
npm pkg set scripts.prepublishOnly="pubguard check --dry-run --strict"
```

之后 `npm publish` 会自动先运行 PubGuard，发现 error 级问题则阻断发布。

## 检测规则

- **`sourcemap-leak`** &mdash; `.map` 文件含 `sourcesContent` — 完整源码泄露
- **`sourcemap-reference`** &mdash; JS/CSS 中的 `sourceMappingURL` 引用
- **`env-file`** &mdash; `.env`、`.npmrc`、`credentials.json`、SSH 配置等
- **`private-key`** &mdash; `.pem`、`.key`、`id_rsa`、PEM 编码私钥
- **`system-prompt`** &mdash; 代码中嵌入的 AI system prompt
- **`unminified-source`** &mdash; 大型未混淆 JS 文件（疑似未打包的源码）
- **`debug-config`** &mdash; `debug: true`、`NODE_ENV=development` 等调试配置
- **`internal-url`** &mdash; 内部 URL（`*.internal.*`、私有 IP 地址）

## 为什么需要 PubGuard？

现有工具覆盖代码中的密钥和依赖漏洞，但没有工具检查**发布包里的实际内容**：

| | 代码密钥 | Source map 泄露 | System prompt 暴露 | .env 误发布 |
|---|:---:|:---:|:---:|:---:|
| TruffleHog / Gitleaks | ✅ | ❌ | ❌ | ❌ |
| npm audit | ❌ | ❌ | ❌ | ❌ |
| **PubGuard** | — | ✅ | ✅ | ✅ |

<details>
<summary><b>配置文件</b></summary>

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
<summary><b>自定义规则</b></summary>

创建 `.pubguard-rules/my-rule.js`：

```javascript
export default {
  id: 'my-custom-rule',
  defaultSeverity: 'warn',
  description: '检测项目特有的敏感内容',
  detect(file) {
    const results = [];
    if (file.path.endsWith('.secret')) {
      results.push({
        ruleId: 'my-custom-rule',
        severity: 'error',
        message: `发现敏感文件: ${file.path}`,
        file: file.path,
        fix: '从发布包中移除此文件',
      });
    }
    return results;
  },
};
```

</details>

<details>
<summary><b>CI/CD 集成</b></summary>

**GitHub Actions：**

```yaml
- name: 发布安全检查
  uses: pubguard/action@v1
  with:
    strict: true
```

**直接调用：**

```yaml
- run: npx pubguard check --dry-run --strict
```

**完整发布流水线：**

```yaml
- run: npx pubguard check --dry-run --strict  # 产物内容检测
- run: trufflehog filesystem . --fail          # 密钥扫描
- run: npm publish --provenance                # 带 SLSA 签名发布
```

</details>

<details>
<summary><b>CLI 参考</b></summary>

```
pubguard check [file.tgz] [options]
pubguard init                        # 创建 .pubguardrc.json 配置文件

选项:
  --dry-run        扫描 npm 将要发布的文件（无需 .tgz）
  --strict         发现 error 级问题时 exit 1
  --format <fmt>   输出格式：text（默认）、json、sarif
  --output <file>  输出到文件
  --config <path>  指定配置文件路径
```

</details>

## 工作原理

1. 读取包内容（通过 `npm pack --dry-run` 或 `.tgz` 文件）
2. 8 条检测规则逐文件扫描
3. 输出发现 + 严重级别 + 修复建议
4. error 级发现 &rarr; 非零退出码 &rarr; 阻断 `npm publish`

零依赖。全部本地执行。不外发任何数据。

## 许可证

[Apache-2.0](LICENSE)
