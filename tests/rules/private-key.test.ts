import { describe, it, expect } from 'vitest';
import { privateKeyRule } from '../../src/rules/private-key.js';
import type { FileEntry } from '../../src/types.js';

function makeFile(path: string, content = ''): FileEntry {
  return { path, size: Buffer.byteLength(content), content: Buffer.from(content) };
}

describe('private-key rule', () => {
  it('detects .pem files', () => {
    const results = privateKeyRule.detect(makeFile('package/server.pem'));
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
  });

  it('detects .key files', () => {
    const results = privateKeyRule.detect(makeFile('package/tls.key'));
    expect(results).toHaveLength(1);
  });

  it('detects id_rsa', () => {
    const results = privateKeyRule.detect(makeFile('package/id_rsa'));
    expect(results).toHaveLength(1);
  });

  it('detects private key content in arbitrary files', () => {
    const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK...';
    const results = privateKeyRule.detect(makeFile('package/config/key.txt', content));
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('error');
  });

  it('detects certificates with warn severity', () => {
    const content = '-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWg...';
    const results = privateKeyRule.detect(makeFile('package/cert.txt', content));
    expect(results).toHaveLength(1);
    expect(results[0].severity).toBe('warn');
  });

  it('ignores normal files', () => {
    const results = privateKeyRule.detect(makeFile('package/index.js', 'console.log("hi")'));
    expect(results).toHaveLength(0);
  });
});
