import { execFile } from 'node:child_process';

/**
 * Run `npm pack --dry-run --json` to get the list of files that would be published.
 * Returns file paths relative to the package root.
 */
export async function getNpmPackList(cwd: string): Promise<string[]> {
  const output = await exec('npm', ['pack', '--dry-run', '--json'], cwd);
  try {
    const parsed = JSON.parse(output);
    // npm pack --json returns an array with one entry containing a `files` array
    const files: Array<{ path: string }> = parsed[0]?.files ?? [];
    return files.map((f) => f.path);
  } catch {
    // Fallback: parse text output (npm < 10 or non-JSON mode)
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('npm') && !line.startsWith('Tarball'));
  }
}

function exec(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} ${args.join(' ')} failed: ${stderr || err.message}`));
      } else {
        resolve(stdout);
      }
    });
  });
}
