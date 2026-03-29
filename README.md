# @a2native/js

> JavaScript/TypeScript SDK for **[a2native](https://github.com/a2native/a2native)** — native desktop UI forms for AI agents.

[![npm](https://img.shields.io/npm/v/@a2native/js)](https://www.npmjs.com/package/@a2native/js)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![CI](https://github.com/a2native/a2native-js/actions/workflows/ci.yml/badge.svg)](https://github.com/a2native/a2native-js/actions)

a2native lets AI agents collect structured user input via **native OS windows** — one JSON in, one native form, one JSON out. No browser, no server, no chat loop.

This SDK wraps a2native's three integration modes so Node.js / Bun agents can use it without shell-scripting.

---

## Prerequisites

Install the `a2n` binary (one of):

```bash
# via npm (installs the right platform binary automatically)
npm install @a2native/a2native

# or download from GitHub Releases
# https://github.com/a2native/a2native/releases

# or build from source
cargo install a2native
```

---

## Installation

```bash
npm install @a2native/js
```

Requires **Node.js ≥ 18**.

---

## Usage

### Mode 1 — One-shot (`showForm`)

Spawn a window, wait for the user, get the result. The simplest integration.

```typescript
import { showForm } from '@a2native/js';

const result = await showForm({
  title: "Deploy to production?",
  components: [
    {
      id: "env",
      type: "radio-group",
      label: "Target environment",
      options: [
        { value: "prod",  label: "Production" },
        { value: "stag",  label: "Staging" },
        { value: "dev",   label: "Development" },
      ],
    },
    {
      id: "confirm",
      type: "checkbox",
      label: "I understand this will affect live users",
    },
    { id: "go", type: "button", label: "Deploy", action: "submit" },
  ],
});

if (result.status === "submitted") {
  console.log("Environment:", result.values.env);  // "prod"
  console.log("Confirmed:",   result.values.confirm); // true
}
```

### Mode 2 — Session (multi-turn)

Keep the same window open across multiple agent turns. No flicker, no re-spawn — inspired by [agent-browser](https://github.com/vercel-labs/agent-browser)'s client-daemon pattern.

```typescript
import { Session } from '@a2native/js';

const session = new Session(); // auto-generates a UUID

// Turn 1 — window opens
const step1 = await session.show({
  title: "New project — Step 1/3: Basics",
  components: [
    { id: "name",  type: "text-field", label: "Project name", required: true },
    { id: "lang",  type: "dropdown",   label: "Language",
      options: [{ value: "ts", label: "TypeScript" }, { value: "py", label: "Python" }] },
    { id: "next",  type: "button", label: "Next →", action: "submit" },
  ],
});

// Turn 2 — same window, form replaced, no flicker
const step2 = await session.show({
  title: "New project — Step 2/3: Config",
  components: [
    { id: "port",  type: "number-input", label: "Port", default_value: 3000, min: 1024, max: 65535 },
    { id: "next",  type: "button", label: "Next →", action: "submit" },
  ],
});

// Turn 3
const step3 = await session.show({
  title: "New project — Step 3/3: Confirm",
  components: [
    { id: "summary", type: "markdown", content: `**${step1.values.name}** on port ${step2.values.port}` },
    { id: "ok",  type: "button", label: "Create project", action: "submit" },
    { id: "cancel", type: "button", label: "Cancel", action: "cancel" },
  ],
});

await session.close(); // closes the window
```

You can also provide an explicit session ID (useful for reconnecting to an existing window):

```typescript
const session = new Session({ sessionId: "my-stable-id" });
```

### Mode 3 — SSE daemon (HTTP / Server-Sent Events)

Start the daemon separately, then push forms over HTTP. Ideal when your agent is a long-running server process.

```bash
# Start the daemon (no initial form needed)
a2n --session my-session --sse 8080
```

```typescript
import { SseClient } from '@a2native/js';

const client = new SseClient({ url: "http://127.0.0.1:8080" });

// Optional liveness check
await client.health();

const result = await client.showForm({
  title: "Approve pull request merge?",
  components: [
    { id: "pr",     type: "text",    content: "PR #42: feat: add caching layer" },
    { id: "action", type: "radio-group", label: "Decision",
      options: [{ value: "merge", label: "Merge" }, { value: "close", label: "Close" }] },
    { id: "note",   type: "textarea", label: "Comment (optional)" },
    { id: "ok",     type: "button", label: "Submit", action: "submit" },
  ],
});
```

### Mode 4 — WebSocket daemon

For persistent bidirectional connections. One connection handles multiple sequential forms.

```bash
a2n --session my-session --ws 8081
```

```typescript
import { WsClient } from '@a2native/js';

const client = new WsClient({ url: "ws://127.0.0.1:8081" });
await client.connect();

// Send multiple forms on the same connection
const r1 = await client.showForm({ title: "Step 1", components: [...] });
const r2 = await client.showForm({ title: "Step 2", components: [...] });

client.close();
```

---

## API Reference

### `showForm(spec, options?)`

| Param | Type | Description |
|-------|------|-------------|
| `spec` | `FormSpec` | The form to display |
| `options.binary` | `string` | Override path to `a2n` binary |

Returns `Promise<FormResult>`.

### `new Session(options?)`

| Option | Type | Description |
|--------|------|-------------|
| `sessionId` | `string` | UUID for the session (auto-generated if omitted) |
| `binary` | `string` | Override path to `a2n` binary |

Methods: `show(spec): Promise<FormResult>`, `close(): Promise<void>`

### `new SseClient(options)`

| Option | Type | Description |
|--------|------|-------------|
| `url` | `string` | Base URL, e.g. `"http://127.0.0.1:8080"` |
| `timeout` | `number` | Request timeout ms (default 300 000) |

Methods: `health(): Promise<void>`, `showForm(spec): Promise<FormResult>`

### `new WsClient(options)`

| Option | Type | Description |
|--------|------|-------------|
| `url` | `string` | WebSocket URL, e.g. `"ws://127.0.0.1:8081"` |
| `timeout` | `number` | Response timeout ms (default 300 000) |

Methods: `connect(): Promise<void>`, `showForm(spec): Promise<FormResult>`, `close(): void`

---

## `FormSpec` and component types

Full TypeScript types are exported. Quick reference:

```typescript
interface FormSpec {
  title?:      string;
  timeout?:    number;   // auto-close after N seconds
  theme?:      { dark_mode?: boolean; accent_color?: string };
  components:  Component[];
}

interface FormResult {
  status: "submitted" | "cancelled" | "timeout";
  values: Record<string, unknown>;
}
```

**Component types:**

| Type | Output | Notes |
|------|--------|-------|
| `text-field` | string | Single-line text |
| `textarea` | string | Multi-line, `rows` option |
| `password` | string | Masked input |
| `number-input` | number | `min` / `max` / `step` |
| `dropdown` | string | ComboBox |
| `checkbox` | boolean | Single toggle |
| `toggle` | boolean | On/off switch |
| `checkbox-group` | string[] | Multi-select |
| `radio-group` | string | Single-select |
| `slider` | number | Range slider |
| `rating` | number | Star rating (0 = unset) |
| `date-picker` | string | YYYY-MM-DD |
| `time-picker` | string | HH:MM |
| `file-upload` | string | Native file dialog |
| `button` | — | `action: "submit"` \| `"cancel"` |
| `card` | — | Nested vertical group |
| `row` | — | Horizontal layout |
| `text` / `markdown` / `code` / `image` / `divider` | — | Display only |

---

## Security

Every a2native window shows an amber warning banner:

> ⚠ This interface was generated by an AI agent. Your input will be sent to the agent and may be seen by others — do not enter sensitive information.

This banner cannot be suppressed by the form spec. See the [security section](https://a2native.github.io/#security) of the docs.

**Never** use a2native to collect real passwords, private keys, or payment information.

---

## Related

- **[a2native](https://github.com/a2native/a2native)** — the core Rust binary
- **[a2native.github.io](https://a2native.github.io)** — documentation site
- **[Google A2UI](https://github.com/google/a2ui)** — declarative JSON UI spec (a2native is compatible)
- **[AG-UI](https://github.com/ag-ui-protocol/ag-ui)** — streaming web agent protocol (a2native is compatible)

---

## License

Apache-2.0 © a2native contributors
