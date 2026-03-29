/**
 * Binary discovery — find the a2n executable.
 *
 * Search order:
 *  1. Explicit path provided by caller
 *  2. `a2n` / `a2n.exe` on PATH (which covers globally installed binaries)
 *  3. node_modules/.bin/a2n  (installed via @a2native/a2native npm package)
 *  4. @a2native/a2native package bin directory (require.resolve)
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const IS_WIN = process.platform === 'win32';
const BIN_NAME = IS_WIN ? 'a2n.exe' : 'a2n';

function isExecutable(p: string): boolean {
  try {
    execFileSync(p, ['--version'], { stdio: 'pipe', timeout: 3000 });
    return true;
  } catch {
    // also accept exit code != 0 — binary exists but --version may not be a flag
    return existsSync(p);
  }
}

function fromPath(): string | null {
  try {
    const cmd = IS_WIN ? 'where' : 'which';
    const result = execFileSync(cmd, [BIN_NAME], { stdio: 'pipe', encoding: 'utf8' });
    const p = result.trim().split('\n')[0].trim();
    if (p && existsSync(p)) return p;
  } catch { /* not found */ }
  return null;
}

function fromNodeModules(): string | null {
  // Walk up from cwd looking for node_modules/.bin/a2n
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'node_modules', '.bin', BIN_NAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function fromPackage(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require.resolve('@a2native/a2native/package.json');
    const candidate = join(dirname(pkg), 'bin', BIN_NAME);
    if (existsSync(candidate)) return candidate;
  } catch { /* package not installed */ }
  return null;
}

/**
 * Resolve the path to the `a2n` binary.
 * @param explicit - optional explicit path provided by the caller
 * @throws {Error} if the binary cannot be found
 */
export function resolveBinary(explicit?: string): string {
  if (explicit) {
    if (!existsSync(explicit)) {
      throw new Error(`a2n binary not found at explicit path: ${explicit}`);
    }
    return explicit;
  }

  const found = fromPath() ?? fromNodeModules() ?? fromPackage();
  if (found) return found;

  throw new Error(
    'Could not find the a2n binary. Install it via one of:\n' +
    '  • npm install @a2native/a2native\n' +
    '  • Download from https://github.com/a2native/a2native/releases\n' +
    '  • cargo install a2native\n' +
    'Or pass { binary: "/path/to/a2n" } in client options.'
  );
}
