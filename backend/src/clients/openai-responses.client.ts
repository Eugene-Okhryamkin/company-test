import type { AppConfig } from '@/config.js';

export interface StructuredOutputRequest {
  /** System-level instructions. */
  instructions: string;
  /** User input. */
  input: string;
  schemaName: string;
  /** JSON Schema compatible with strict structured outputs. */
  schema: object;
}

/** Port the business logic depends on; the OpenAI adapter below is one implementation. */
export interface LlmClient {
  isConfigured(): boolean;
  /** Resolves with the parsed JSON answer (not validated against the schema). */
  generateStructured(request: StructuredOutputRequest): Promise<unknown>;
}

export class LlmNotConfiguredError extends Error {
  constructor() {
    super('LLM API key is not configured');
    this.name = 'LlmNotConfiguredError';
  }
}

export type LlmFailureReason = 'network' | 'timeout' | 'http' | 'refusal' | 'invalid-response';

export class LlmRequestError extends Error {
  readonly reason: LlmFailureReason;
  readonly status: number | undefined;

  constructor(reason: LlmFailureReason, message: string, status?: number) {
    super(message);
    this.name = 'LlmRequestError';
    this.reason = reason;
    this.status = status;
  }
}

export interface OpenAiResponsesClientDeps {
  config: AppConfig;
  fetchFn: typeof fetch;
}

interface ResponseContent {
  type?: unknown;
  text?: unknown;
}

interface ResponseBody {
  status?: unknown;
  output_text?: unknown;
  output?: Array<{ type?: unknown; content?: ResponseContent[] }>;
}

/** Collects the model text; throws on a refusal or when there is no text at all. */
function extractOutputText(body: ResponseBody): string {
  if (typeof body.output_text === 'string') return body.output_text;
  if (body.status !== undefined && body.status !== 'completed') {
    throw new LlmRequestError('invalid-response', `Response status is ${String(body.status)}`);
  }

  let text = '';
  for (const item of body.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      if (part.type === 'refusal') throw new LlmRequestError('refusal', 'The model refused to answer');
      if (part.type === 'output_text' && typeof part.text === 'string') text += part.text;
    }
  }
  if (text === '') throw new LlmRequestError('invalid-response', 'Response has no text output');
  return text;
}

const isAbort = (error: unknown) =>
  error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');

/**
 * Minimal adapter for the OpenAI Responses API with Structured Outputs
 * (`text.format: json_schema, strict: true`). Plain fetch keeps the dependency surface small
 * and makes the transport injectable in tests.
 */
export class OpenAiResponsesClient implements LlmClient {
  private readonly settings: AppConfig['aiSearch'];
  private readonly fetchFn: typeof fetch;

  constructor({ config, fetchFn }: OpenAiResponsesClientDeps) {
    this.settings = config.aiSearch;
    this.fetchFn = fetchFn;
  }

  isConfigured(): boolean {
    return this.settings.apiKey !== undefined;
  }

  async generateStructured({ instructions, input, schemaName, schema }: StructuredOutputRequest): Promise<unknown> {
    const { apiKey, model, baseUrl, timeoutMs } = this.settings;
    if (apiKey === undefined) throw new LlmNotConfiguredError();

    let response: Response;
    try {
      response = await this.fetchFn(`${baseUrl.replace(/\/+$/, '')}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          instructions,
          input,
          // Search queries are not kept on the provider side.
          store: false,
          text: { format: { type: 'json_schema', name: schemaName, schema, strict: true } },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (isAbort(error)) throw new LlmRequestError('timeout', `LLM request timed out after ${timeoutMs} ms`);
      throw new LlmRequestError('network', 'LLM request failed');
    }

    // The error body may echo request details; only the status is kept.
    if (!response.ok) throw new LlmRequestError('http', `LLM responded with status ${response.status}`, response.status);

    let body: ResponseBody;
    try {
      body = (await response.json()) as ResponseBody;
    } catch (error) {
      if (isAbort(error)) throw new LlmRequestError('timeout', `LLM request timed out after ${timeoutMs} ms`);
      throw new LlmRequestError('invalid-response', 'LLM response is not JSON');
    }

    const text = extractOutputText(body);
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new LlmRequestError('invalid-response', 'LLM output is not valid JSON');
    }
  }
}
