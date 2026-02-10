import { vi } from 'vitest';

/**
 * Creates a successful JSON response
 * Note: Response bodies can only be read once, so this creates a fresh Response each time
 */
export function mockJsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Creates an ETAPI error response
 * Note: Response bodies can only be read once, so this creates a fresh Response each time
 */
export function mockErrorResponse(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ status, code, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Creates a binary response
 */
export function mockBinaryResponse(data: Buffer | string, status = 200): Response {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;
  return new Response(buffer, {
    status,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
}

/**
 * Creates a 204 No Content response
 */
export function mockNoContentResponse(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Sets up global fetch mock and returns the mock function
 */
export function setupFetchMock(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
