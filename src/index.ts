/**
 * @a2native/js — JavaScript/TypeScript SDK for a2native
 *
 * Three integration modes:
 *
 *  1. One-shot:  showForm(spec)           — spawns a2n process, waits for result
 *  2. Session:   new Session()            — persistent window, multi-turn
 *  3. SSE:       new SseClient({ url })   — HTTP/SSE daemon (no CLI required)
 *  4. WebSocket: new WsClient({ url })    — WebSocket daemon (no CLI required)
 */

export { showForm } from './client.js';
export { Session } from './client.js';
export { SseClient } from './sse.js';
export { WsClient } from './ws.js';
export { resolveBinary } from './binary.js';

export type {
  // Form spec
  FormSpec,
  FormResult,
  ResultStatus,
  Theme,
  Component,
  ComponentType,
  ComponentOption,
  // Individual component types
  TextField,
  Textarea,
  Password,
  NumberInput,
  Dropdown,
  Checkbox,
  Toggle,
  CheckboxGroup,
  RadioGroup,
  Slider,
  Rating,
  DatePicker,
  TimePicker,
  FileUpload,
  Button,
  Card,
  Row,
  TextComp,
  MarkdownComp,
  CodeComp,
  ImageComp,
  Divider,
  // Client options
  ClientOptions,
  SessionOptions,
  SseClientOptions,
  WsClientOptions,
} from './types.js';
