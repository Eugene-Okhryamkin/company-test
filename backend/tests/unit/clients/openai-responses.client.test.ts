import { describe, expect, it, vi } from 'vitest';
import { LlmNotConfiguredError, LlmRequestError, OpenAiResponsesClient } from '@/clients/openai-responses.client.js';
import { loadConfig } from '@/config.js';

const request = {
  instructions: 'Translate the query',
  input: 'команды с бюджетом больше 5 млн',
  schemaName: 'search_filter',
  schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const messageWith = (...content: unknown[]) => ({
  status: 'completed',
  output: [
    { type: 'reasoning', summary: [] },
    { type: 'message', role: 'assistant', content },
  ],
});

function createClient(fetchFn: typeof fetch, env: NodeJS.ProcessEnv = { OPENAI_API_KEY: 'sk-test' }) {
  return new OpenAiResponsesClient({ config: loadConfig(env), fetchFn });
}

async function rejection(promise: Promise<unknown>): Promise<LlmRequestError> {
  const error = await promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(LlmRequestError);
  return error as LlmRequestError;
}

describe('OpenAiResponsesClient', () => {
  it('is configured only when an API key is present', () => {
    expect(createClient(vi.fn(), { OPENAI_API_KEY: 'sk-test' }).isConfigured()).toBe(true);
    expect(createClient(vi.fn(), {}).isConfigured()).toBe(false);
  });

  it('refuses to call the API without a key', async () => {
    const fetchFn = vi.fn();
    await expect(createClient(fetchFn, {}).generateStructured(request)).rejects.toBeInstanceOf(LlmNotConfiguredError);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('posts a strict json_schema request to the Responses API', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(messageWith({ type: 'output_text', text: '{"ok":true}' })),
    );

    await createClient(fetchFn, { OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'test-model' }).generateStructured(request);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer sk-test', 'Content-Type': 'application/json' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init?.body as string)).toEqual({
      model: 'test-model',
      instructions: request.instructions,
      input: request.input,
      store: false,
      text: { format: { type: 'json_schema', name: 'search_filter', schema: request.schema, strict: true } },
    });
  });

  it('uses a custom base URL without doubling slashes', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ output_text: '{}' }));

    await createClient(fetchFn, { OPENAI_API_KEY: 'k', OPENAI_BASE_URL: 'http://proxy.local/v1/' }).generateStructured(
      request,
    );

    expect(fetchFn.mock.calls[0]![0]).toBe('http://proxy.local/v1/responses');
  });

  it('returns the parsed JSON from the output_text content', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(messageWith({ type: 'output_text', text: '{"levels":[3]}' })),
    );

    await expect(createClient(fetchFn).generateStructured(request)).resolves.toEqual({ levels: [3] });
  });

  it('accepts the output_text convenience field', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ output_text: '{"limit":5}' }));
    await expect(createClient(fetchFn).generateStructured(request)).resolves.toEqual({ limit: 5 });
  });

  it('maps a network failure', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
    expect((await rejection(createClient(fetchFn).generateStructured(request))).reason).toBe('network');
  });

  it('maps a timeout', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    expect((await rejection(createClient(fetchFn).generateStructured(request))).reason).toBe('timeout');
  });

  it('maps an HTTP error and keeps the status, without leaking the body', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ error: { message: 'bad key sk-x' } }, 401));
    const error = await rejection(createClient(fetchFn).generateStructured(request));

    expect(error.reason).toBe('http');
    expect(error.status).toBe(401);
    expect(error.message).not.toContain('sk-x');
  });

  it('maps a refusal', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(messageWith({ type: 'refusal', refusal: 'I cannot help with that' })),
    );
    expect((await rejection(createClient(fetchFn).generateStructured(request))).reason).toBe('refusal');
  });

  it.each([
    ['a non-JSON body', () => new Response('<html>', { status: 200 })],
    ['an incomplete response', () => jsonResponse({ status: 'incomplete', output: [] })],
    ['no text output', () => jsonResponse(messageWith())],
    ['text that is not JSON', () => jsonResponse(messageWith({ type: 'output_text', text: 'levels: 3' }))],
  ])('maps %s to invalid-response', async (_label, makeResponse) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(makeResponse());
    expect((await rejection(createClient(fetchFn).generateStructured(request))).reason).toBe('invalid-response');
  });
});
