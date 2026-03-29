/**
 * One-shot and session clients — wraps the a2n CLI process.
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolveBinary } from './binary.js';
import type { FormSpec, FormResult, ClientOptions, SessionOptions } from './types.js';

function runProcess(binary: string, args: string[], stdin: string): Promise<FormResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d: string) => { stdout += d; });
    child.stderr.on('data', (d: string) => { stderr += d; });

    child.on('error', reject);

    child.on('close', (code: number | null) => {
      const out = stdout.trim();
      if (!out) {
        reject(new Error(`a2n exited with code ${code}. stderr: ${stderr.trim()}`));
        return;
      }
      try {
        resolve(JSON.parse(out) as FormResult);
      } catch {
        reject(new Error(`a2n output is not valid JSON: ${out}`));
      }
    });

    child.stdin.write(stdin);
    child.stdin.end();
  });
}

/**
 * Show a form and wait for the user to submit or cancel.
 * Spawns a new a2n process for each call (one-shot mode).
 *
 * @example
 * ```ts
 * const result = await showForm({
 *   title: "Deploy?",
 *   components: [
 *     { id: "env", type: "radio-group", label: "Environment",
 *       options: [{ value: "prod", label: "Production" }, { value: "stag", label: "Staging" }] },
 *     { id: "go", type: "button", label: "Deploy", action: "submit" },
 *   ],
 * });
 * console.log(result.values.env); // "prod"
 * ```
 */
export async function showForm(spec: FormSpec, options: ClientOptions = {}): Promise<FormResult> {
  const binary = resolveBinary(options.binary);
  return runProcess(binary, [], JSON.stringify(spec));
}

/**
 * Multi-turn session client.
 * The native window stays open between calls — no flicker, no re-spawn.
 *
 * @example
 * ```ts
 * const session = new Session();
 *
 * const step1 = await session.show({ title: "Step 1/2", components: [...] });
 * const step2 = await session.show({ title: "Step 2/2", components: [...] });
 *
 * await session.close();
 * ```
 */
export class Session {
  readonly sessionId: string;
  private readonly binary: string;

  constructor(options: SessionOptions = {}) {
    this.sessionId = options.sessionId ?? randomUUID();
    this.binary = resolveBinary(options.binary);
  }

  /**
   * Send a new form to the existing window and wait for the user's response.
   * On the first call the window is created; subsequent calls update it in place.
   */
  show(spec: FormSpec): Promise<FormResult> {
    return runProcess(this.binary, ['--session', this.sessionId], JSON.stringify(spec));
  }

  /**
   * Close the session window and clean up the daemon.
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.binary, ['--close', this.sessionId], { stdio: 'ignore' });
      child.on('error', reject);
      child.on('close', () => resolve());
    });
  }
}
