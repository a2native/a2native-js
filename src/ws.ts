/**
 * WebSocket client for a2native daemon mode.
 *
 * Usage:
 *   Start daemon:  a2n --session my-session --ws 8081
 *   Connect here:  new WsClient({ url: "ws://127.0.0.1:8081" })
 *
 * Protocol:
 *   → send: FormSpec JSON (text frame)
 *   ← recv: { type: "waiting" }   — form is displayed
 *   ← recv: { type: "result", data: FormResult }   — user submitted
 *
 * One persistent connection handles multiple sequential forms.
 */

import { createRequire } from 'node:module';
import type { FormSpec, FormResult, WsClientOptions } from './types.js';

const DEFAULT_TIMEOUT = 300_000;

type WsMessage = { type: 'waiting' } | { type: 'result'; data: FormResult };

/**
 * Lazily resolve the `ws` package if available, else fall back to the
 * built-in WebSocket (Node.js ≥ 21).
 */
function getWebSocketClass(): typeof WebSocket {
  // Node 21+ has globalThis.WebSocket
  if (typeof globalThis.WebSocket !== 'undefined') {
    return globalThis.WebSocket as typeof WebSocket;
  }
  try {
    const require = createRequire(import.meta.url);
    return require('ws') as typeof WebSocket;
  } catch {
    throw new Error(
      'No WebSocket implementation found.\n' +
      'Either upgrade to Node.js 21+ or install the "ws" package:\n' +
      '  npm install ws'
    );
  }
}

/**
 * Client for a2native's WebSocket daemon endpoint.
 * Maintains a single connection and multiplexes sequential form requests.
 *
 * @example
 * ```ts
 * const client = new WsClient({ url: "ws://127.0.0.1:8081" });
 * await client.connect();
 *
 * // Send forms one at a time on the same connection
 * const r1 = await client.showForm({ title: "Step 1", components: [...] });
 * const r2 = await client.showForm({ title: "Step 2", components: [...] });
 *
 * client.close();
 * ```
 */
export class WsClient {
  private readonly url: string;
  private readonly timeout: number;
  private ws: WebSocket | null = null;

  constructor(options: WsClientOptions) {
    this.url = options.url;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  /** Open the WebSocket connection. Must be called before showForm(). */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const WS = getWebSocketClass();
      const ws = new WS(this.url);
      this.ws = ws;

      const timer = setTimeout(() => {
        ws.close();
        reject(new Error(`WebSocket connection to ${this.url} timed out`));
      }, 10_000);

      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener('error', (ev) => {
        clearTimeout(timer);
        reject(new Error(`WebSocket error: ${(ev as ErrorEvent).message ?? 'unknown'}`));
      });
    });
  }

  /**
   * Send a form spec and wait for the user's response.
   * Reuses the existing connection — call connect() first.
   */
  showForm(spec: FormSpec): Promise<FormResult> {
    if (!this.ws || this.ws.readyState !== 1 /* OPEN */) {
      return Promise.reject(new Error('WebSocket is not connected. Call connect() first.'));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`WsClient.showForm timed out after ${this.timeout}ms`));
      }, this.timeout);

      const handler = (ev: MessageEvent) => {
        try {
          const msg: WsMessage = JSON.parse(ev.data as string);
          if (msg.type === 'result') {
            clearTimeout(timer);
            this.ws!.removeEventListener('message', handler);
            resolve(msg.data);
          }
          // "waiting" messages are silently consumed
        } catch {
          clearTimeout(timer);
          this.ws!.removeEventListener('message', handler);
          reject(new Error(`Failed to parse WebSocket message: ${ev.data}`));
        }
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(JSON.stringify(spec));
    });
  }

  /** Close the WebSocket connection. */
  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
