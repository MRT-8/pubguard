import type { Rule, FileEntry, RuleResult } from '../types.js';

const KEY_FILE_EXTENSIONS = ['.pem', '.key', '.p12', '.pfx', '.jks', '.keystore'];
const KEY_FILE_NAMES = ['id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519'];

// Build markers at runtime to avoid false positives when pubguard scans itself
const BEGIN = '-----' + 'BEGIN ';
const END = '-----';
const KEY_CONTENT_MARKERS = [
  `${BEGIN}RSA PRIVATE KEY${END}`,
  `${BEGIN}DSA PRIVATE KEY${END}`,
  `${BEGIN}EC PRIVATE KEY${END}`,
  `${BEGIN}OPENSSH PRIVATE KEY${END}`,
  `${BEGIN}PRIVATE KEY${END}`,
  `${BEGIN}ENCRYPTED PRIVATE KEY${END}`,
  `${BEGIN}PGP PRIVATE KEY BLOCK${END}`,
  `${BEGIN}CERTIFICATE${END}`, // Not a secret, but shouldn't be in npm packages
];

export const privateKeyRule: Rule = {
  id: 'private-key',
  defaultSeverity: 'error',
  description: 'Detect private keys and certificate files',

  detect(file: FileEntry): RuleResult[] {
    const results: RuleResult[] = [];
    const basename = file.path.split('/').pop() || '';
    const ext = '.' + (basename.split('.').pop() || '');

    // Check file extension
    if (KEY_FILE_EXTENSIONS.includes(ext.toLowerCase())) {
      results.push({
        ruleId: this.id,
        severity: this.defaultSeverity,
        message: `Key/certificate file "${file.path}" detected — private keys must never be published`,
        file: file.path,
        fix: `Remove "${basename}" from the package. Add "${ext}" files to .npmignore or exclude from the "files" field in package.json`,
      });
      return results;
    }

    // Check filename
    if (KEY_FILE_NAMES.includes(basename)) {
      results.push({
        ruleId: this.id,
        severity: this.defaultSeverity,
        message: `SSH private key "${file.path}" detected — this file must never be published`,
        file: file.path,
        fix: `Remove "${basename}" from the package immediately and rotate the key`,
      });
      return results;
    }

    // Check file content for key markers (only for text files under 1MB)
    if (file.size > 1024 * 1024) return results;

    const head = file.content.toString('utf-8', 0, Math.min(file.content.length, 4096));
    for (const marker of KEY_CONTENT_MARKERS) {
      if (head.includes(marker)) {
        const isCert = marker.includes('CERTIFICATE');
        results.push({
          ruleId: this.id,
          severity: isCert ? 'warn' : 'error',
          message: `"${file.path}" contains ${isCert ? 'a certificate' : 'a private key'} (${marker})`,
          file: file.path,
          fix: isCert
            ? `Verify this certificate is intended to be public. If not, remove it from the package`
            : `Remove this file immediately and rotate the compromised key`,
        });
        break;
      }
    }

    return results;
  },
};
