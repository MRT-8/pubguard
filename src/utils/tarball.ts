import { createGunzip } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import type { FileEntry } from '../types.js';

/**
 * Minimal tar parser — reads POSIX ustar/GNU tar archives.
 * Each entry is a 512-byte header followed by ceil(size/512)*512 bytes of data.
 */
function parseTar(buf: Buffer): FileEntry[] {
  const entries: FileEntry[] = [];
  let offset = 0;

  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512);

    // Empty block = end of archive
    if (header.every((b) => b === 0)) break;

    // Extract filename (bytes 0-99, NUL-terminated)
    let name = header.subarray(0, 100).toString('utf-8').replace(/\0+$/, '');

    // USTAR prefix (bytes 345-499)
    const prefix = header.subarray(345, 500).toString('utf-8').replace(/\0+$/, '');
    if (prefix) name = prefix + '/' + name;

    // File size in octal (bytes 124-135)
    const sizeStr = header.subarray(124, 136).toString('utf-8').replace(/\0+$/, '').trim();
    const size = parseInt(sizeStr, 8) || 0;

    // Type flag (byte 156): '0' or '\0' = regular file, '5' = directory
    const typeFlag = header[156];

    offset += 512; // Move past header

    if (typeFlag === 0x30 || typeFlag === 0x00) {
      // Regular file
      const content = Buffer.from(buf.subarray(offset, offset + size));
      entries.push({ path: name, size, content });
    }

    // Advance past data blocks (rounded up to 512)
    offset += Math.ceil(size / 512) * 512;
  }

  return entries;
}

/**
 * Read and parse a .tgz (gzipped tar) file, returning all file entries.
 */
export async function readTarball(filePath: string): Promise<FileEntry[]> {
  const compressed = await readFile(filePath);
  const decompressed = await gunzip(compressed);
  return parseTar(decompressed);
}

/**
 * Parse a tar buffer directly (for already-decompressed data).
 */
export function parseTarBuffer(buf: Buffer): FileEntry[] {
  return parseTar(buf);
}

function gunzip(buf: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const gz = createGunzip();
    gz.on('data', (chunk: Buffer) => chunks.push(chunk));
    gz.on('end', () => resolve(Buffer.concat(chunks)));
    gz.on('error', reject);
    gz.end(buf);
  });
}
