/**
 * SSE (HTTP Server-Sent Events) client for a2native daemon mode.
 *
 * Usage:
 *   Start daemon:  a2n --session my-session --sse 8080
 *   Connect here:  new SseClient({ url: "http://127.0.0.1:8080" })
 */

import * as http from 'node:http';
import * as https from 'node:https';
import type { FormSpec, FormResult, SseClientOptions } from './types.js';

const DEFAULT_TIMEOUT = 300_000; // 5 minutes

/**
 * Client for a2native's HTTP/SSE daemon endpoint.
 *
 * POST /form  — body: FormSpec JSON → response: text/event-stream
 *   event: waiting  — form is displayed, user is filling it
 *   event: result   — user submitted; data is FormResult JSON
 *
 * GET  /health — liveness probe
 *
 * @example
 * ```ts
 * const client = new SseClient({ url: "http://127.0.0.1:8080" });
 *
 * // optional liveness check
 * await client.health();
 *
 * const result = await client.showForm({
 *   title: "Pick environment",
 *   components: [
 *     { id: "env", type: "radio-group", label: "Target",
 *       options: [{ value: "prod", label: "Production" }] },
 *     { id: "go", type: "button", label: "Deploy", action: "submit" },
 *   ],
 * });
 * console.log(result.values.env);
 * ```
 */
export class SseClient {
  private readonly baseUrl: URL;
  private readonly timeout: number;

  constructor(options: SseClientOptions) {
    this.baseUrl = new URL(options.url);
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  /** Check that the daemon is alive. Resolves if healthy, rejects otherwise. */
  async health(): Promise<void> {
    await this.get('/health');
  }

  /**
   * Send a form spec to the daemon and wait for the user's response via SSE.
   */
  showForm(spec: FormSpec): Promise<FormResult> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(spec);
      const url = new URL('/form', this.baseUrl);
      const lib = url.protocol === 'https:' ? https : http;

      const req = lib.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Accept': 'text/event-stream',
        },
      }, (res: http.IncomingMessage) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new Error(`a2native SSE server returned ${res.statusCode}`));
          return;
        }

        let buf = '';
        let eventType = '';

        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          buf += chunk;
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (eventType === 'result' || eventType === '') {
                try {
                  const parsed = JSON.parse(data);
                  // Handle both raw FormResult and wrapped {event, data} shapes
                  const result: FormResult = parsed.data ?? parsed;
                  resolve(result);
                  res.destroy();
                } catch (e) {
                  reject(new Error(`Failed to parse SSE result: ${data}`));
                }
              }
              eventType = '';
            }
          }
        });

        res.on('error', reject);
        res.on('end', () => {
          reject(new Error('SSE stream ended before receiving a result'));
        });
      });

      req.setTimeout(this.timeout, () => {
        req.destroy(new Error(`a2native SSE request timed out after ${this.timeout}ms`));
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private get(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const lib = url.protocol === 'https:' ? https : http;

      const req = lib.get(url, (res: http.IncomingMessage) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (d: string) => { body += d; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          } else {
            resolve(body);
          }
        });
        res.on('error', reject);
      });

      req.on('error', reject);
    });
  }
}
