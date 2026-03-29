/**
 * a2native JavaScript/TypeScript SDK — type definitions
 * Mirrors the a2native protocol schema (a2native-v0.1.schema.json)
 */

// ── Component option (dropdown / radio-group / checkbox-group) ───────────────

export interface ComponentOption {
  value: string;
  label?: string;
}

// ── Component types ───────────────────────────────────────────────────────────

export type ComponentType =
  | 'text-field' | 'textarea' | 'password' | 'number-input'
  | 'dropdown' | 'checkbox' | 'toggle' | 'checkbox-group' | 'radio-group'
  | 'slider' | 'rating' | 'date-picker' | 'time-picker' | 'file-upload'
  | 'button' | 'card' | 'row'
  | 'text' | 'markdown' | 'code' | 'image' | 'divider';

export interface BaseComponent {
  id: string;
  type: ComponentType;
  label?: string;
  placeholder?: string;
  default_value?: unknown;
  required?: boolean;
  disabled?: boolean;
}

export interface TextField      extends BaseComponent { type: 'text-field';     default_value?: string; }
export interface Textarea       extends BaseComponent { type: 'textarea';       rows?: number; default_value?: string; }
export interface Password       extends BaseComponent { type: 'password'; }
export interface NumberInput    extends BaseComponent { type: 'number-input';   min?: number; max?: number; step?: number; default_value?: number; }
export interface Dropdown       extends BaseComponent { type: 'dropdown';       options: ComponentOption[]; default_value?: string; }
export interface Checkbox       extends BaseComponent { type: 'checkbox';       default_value?: boolean; }
export interface Toggle         extends BaseComponent { type: 'toggle';         default_value?: boolean; }
export interface CheckboxGroup  extends BaseComponent { type: 'checkbox-group'; options: ComponentOption[]; default_value?: string[]; }
export interface RadioGroup     extends BaseComponent { type: 'radio-group';    options: ComponentOption[]; default_value?: string; }
export interface Slider         extends BaseComponent { type: 'slider';         min?: number; max?: number; step?: number; default_value?: number; }
export interface Rating         extends BaseComponent { type: 'rating';         max?: number; default_value?: number; }
export interface DatePicker     extends BaseComponent { type: 'date-picker';    default_value?: string; }
export interface TimePicker     extends BaseComponent { type: 'time-picker';    default_value?: string; }
export interface FileUpload     extends BaseComponent { type: 'file-upload';    multiple?: boolean; }
export interface Button         extends BaseComponent { type: 'button';         action?: 'submit' | 'cancel' | string; }
export interface Card           extends BaseComponent { type: 'card';           components: Component[]; }
export interface Row            extends BaseComponent { type: 'row';            components: Component[]; }
export interface TextComp       extends BaseComponent { type: 'text';           content?: string; }
export interface MarkdownComp   extends BaseComponent { type: 'markdown';       content?: string; }
export interface CodeComp       extends BaseComponent { type: 'code';           content?: string; language?: string; }
export interface ImageComp      extends BaseComponent { type: 'image';          src?: string; alt?: string; }
export interface Divider        extends BaseComponent { type: 'divider'; }

export type Component =
  | TextField | Textarea | Password | NumberInput
  | Dropdown | Checkbox | Toggle | CheckboxGroup | RadioGroup
  | Slider | Rating | DatePicker | TimePicker | FileUpload
  | Button | Card | Row
  | TextComp | MarkdownComp | CodeComp | ImageComp | Divider;

// ── Form spec & result ────────────────────────────────────────────────────────

export interface Theme {
  dark_mode?: boolean;
  accent_color?: string;
}

export interface FormSpec {
  title?: string;
  /** Auto-close after N seconds; result status becomes "timeout" */
  timeout?: number;
  theme?: Theme;
  components: Component[];
}

export type ResultStatus = 'submitted' | 'cancelled' | 'timeout';

export interface FormResult {
  status: ResultStatus;
  /** Map of component id → user-provided value */
  values: Record<string, unknown>;
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface ClientOptions {
  /**
   * Path to the a2n binary.
   * Defaults to auto-discovery: PATH → node_modules/.bin/a2n → @a2native/a2native package
   */
  binary?: string;
}

export interface SessionOptions extends ClientOptions {
  /** Session UUID. If omitted, a random UUID v4 is generated. */
  sessionId?: string;
}

export interface SseClientOptions {
  /** Base URL of the SSE daemon, e.g. "http://127.0.0.1:8080" */
  url: string;
  /** Request timeout in milliseconds (default: 300_000 ms = 5 min) */
  timeout?: number;
}

export interface WsClientOptions {
  /** WebSocket URL, e.g. "ws://127.0.0.1:8081" */
  url: string;
  /** Connection/response timeout in milliseconds (default: 300_000 ms = 5 min) */
  timeout?: number;
}
