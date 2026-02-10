import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpClient, EtapiClientError } from '../../../src/client/http.js';
import { setupFetchMock, mockJsonResponse, mockErrorResponse, mockBinaryResponse, mockNoContentResponse } from '../../helpers/mock-fetch.js';

describe('HttpClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: HttpClient;

  beforeEach(() => {
    fetchMock = setupFetchMock();
    client = new HttpClient('http://localhost:8080', 'test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('strips trailing slashes from baseUrl', () => {
      const c = new HttpClient('http://localhost:8080///', 'token');
      expect(c).toBeDefined();
    });

    it('adds /etapi suffix if not present', async () => {
      const c = new HttpClient('http://localhost:8080', 'token');
      fetchMock.mockResolvedValue(mockJsonResponse({}));
      await c.get('/test');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/etapi/test',
        expect.any(Object)
      );
    });

    it('preserves /etapi suffix if already present', async () => {
      const c = new HttpClient('http://localhost:8080/etapi', 'token');
      fetchMock.mockResolvedValue(mockJsonResponse({}));
      await c.get('/test');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/etapi/test',
        expect.any(Object)
      );
    });
  });

  describe('get()', () => {
    it('makes GET request with Authorization header', async () => {
      const responseData = { id: '123', title: 'Test Note' };
      fetchMock.mockResolvedValue(mockJsonResponse(responseData));

      const result = await client.get('/notes/123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/etapi/notes/123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ Authorization: 'test-token' }),
        })
      );
      expect(result).toEqual(responseData);
    });

    it('includes query parameters in URL', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));

      await client.get('/notes', { search: 'test', limit: 10, fastSearch: true });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/etapi/notes?search=test&limit=10&fastSearch=true',
        expect.any(Object)
      );
    });

    it('skips undefined query parameters', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));

      await client.get('/notes', { search: 'test', limit: undefined });

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('search=test');
      expect(callUrl).not.toContain('limit');
    });

    it('throws EtapiClientError on error response with JSON body', async () => {
      fetchMock.mockResolvedValue(mockErrorResponse(404, 'NOTE_NOT_FOUND', 'Note not found'));

      await expect(client.get('/notes/invalid')).rejects.toMatchObject({
        name: 'EtapiClientError',
        status: 404,
        code: 'NOTE_NOT_FOUND',
        message: 'Note not found',
      });
    });

    it('throws EtapiClientError with UNKNOWN code when error body is not JSON', async () => {
      fetchMock.mockResolvedValue(new Response('Server Error', { status: 500 }));

      await expect(client.get('/notes/123')).rejects.toMatchObject({
        status: 500,
        code: 'UNKNOWN',
      });
    });
  });

  describe('post()', () => {
    it('makes POST request with JSON body', async () => {
      const requestBody = { title: 'New Note', type: 'text', content: 'Hello' };
      const responseData = { noteId: '123', branchId: '456' };
      fetchMock.mockResolvedValue(mockJsonResponse(responseData));

      const result = await client.post('/create-note', requestBody);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/etapi/create-note',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(responseData);
    });

    it('handles POST with no body', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.post('/notes/123/revision');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });

    it('handles 204 No Content response', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      const result = await client.post('/auth/logout');

      expect(result).toBeUndefined();
    });
  });

  describe('put()', () => {
    it('makes PUT request with JSON body', async () => {
      const requestBody = { key: 'value' };
      fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

      await client.put('/test', requestBody);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('handles PUT with no body', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.put('/backup/test-backup');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: undefined,
        })
      );
    });
  });

  describe('patch()', () => {
    it('makes PATCH request with JSON body', async () => {
      const requestBody = { title: 'Updated Title' };
      const responseData = { noteId: '123', title: 'Updated Title' };
      fetchMock.mockResolvedValue(mockJsonResponse(responseData));

      const result = await client.patch('/notes/123', requestBody);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/etapi/notes/123',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(responseData);
    });
  });

  describe('delete()', () => {
    it('makes DELETE request', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.delete('/notes/123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/etapi/notes/123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'test-token',
          }),
        })
      );
    });

    it('throws on error response', async () => {
      fetchMock.mockResolvedValue(mockErrorResponse(404, 'NOTE_NOT_FOUND', 'Note not found'));

      await expect(client.delete('/notes/invalid')).rejects.toThrow(EtapiClientError);
    });
  });

  describe('getRaw()', () => {
    it('returns Buffer for binary content', async () => {
      const content = Buffer.from('Binary content');
      fetchMock.mockResolvedValue(mockBinaryResponse(content));

      const result = await client.getRaw('/notes/123/content');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('Binary content');
    });

    it('includes query parameters', async () => {
      fetchMock.mockResolvedValue(mockBinaryResponse('data'));

      await client.getRaw('/notes/123/export', { format: 'markdown' });

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('format=markdown');
    });

    it('throws EtapiClientError on error response', async () => {
      fetchMock.mockResolvedValue(mockErrorResponse(404, 'NOTE_NOT_FOUND', 'Note not found'));

      await expect(client.getRaw('/notes/invalid/content')).rejects.toThrow(EtapiClientError);
    });

    it('throws with UNKNOWN code when error body is not JSON', async () => {
      fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }));

      await expect(client.getRaw('/notes/123/content')).rejects.toMatchObject({
        status: 502,
        code: 'UNKNOWN',
      });
    });
  });

  describe('putRaw()', () => {
    it('uploads Buffer content', async () => {
      const content = Buffer.from('Note content');
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      await client.putRaw('/notes/123/content', content);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/etapi/notes/123/content',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'test-token',
            'Content-Type': 'text/plain',
          }),
          body: content,
        })
      );
    });

    it('uploads string content', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      await client.putRaw('/notes/123/content', 'Text content');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: 'Text content',
        })
      );
    });

    it('uses custom content type', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      await client.putRaw('/attachments/123/content', Buffer.from('data'), 'image/png');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'image/png',
          }),
        })
      );
    });

    it('throws on error response', async () => {
      fetchMock.mockResolvedValue(mockErrorResponse(400, 'INVALID_CONTENT', 'Invalid content'));

      await expect(client.putRaw('/notes/123/content', 'data')).rejects.toThrow(EtapiClientError);
    });
  });

  describe('postRaw()', () => {
    it('uploads binary content and returns JSON response', async () => {
      const zipData = Buffer.from('ZIP content');
      const responseData = { noteId: '123', branchId: '456' };
      fetchMock.mockResolvedValue(mockJsonResponse(responseData));

      const result = await client.postRaw('/notes/root/import', zipData, 'application/zip');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/etapi/notes/root/import',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'test-token',
            'Content-Type': 'application/zip',
          }),
          body: zipData,
        })
      );
      expect(result).toEqual(responseData);
    });

    it('handles 204 No Content response', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      const result = await client.postRaw('/test', Buffer.from('data'), 'application/octet-stream');

      expect(result).toBeUndefined();
    });

    it('returns undefined for non-JSON responses', async () => {
      fetchMock.mockResolvedValue(new Response('OK', { status: 200 }));

      const result = await client.postRaw('/test', Buffer.from('data'), 'text/plain');

      expect(result).toBeUndefined();
    });

    it('throws on error response', async () => {
      fetchMock.mockResolvedValue(mockErrorResponse(400, 'INVALID_ZIP', 'Invalid ZIP file'));

      await expect(
        client.postRaw('/notes/123/import', Buffer.from('bad'), 'application/zip')
      ).rejects.toThrow(EtapiClientError);
    });
  });

  describe('postNoAuth()', () => {
    it('makes POST request without Authorization header', async () => {
      const responseData = { authToken: 'new-token' };
      fetchMock.mockResolvedValue(mockJsonResponse(responseData));

      const result = await HttpClient.postNoAuth(
        'http://localhost:8080',
        '/auth/login',
        { password: 'secret' }
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/etapi/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: 'secret' }),
        })
      );
      expect(result).toEqual(responseData);
    });

    it('handles baseUrl with /etapi suffix', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));

      await HttpClient.postNoAuth('http://localhost:8080/etapi', '/auth/login', {});

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toBe('http://localhost:8080/etapi/auth/login');
    });

    it('strips trailing slashes from baseUrl', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({}));

      await HttpClient.postNoAuth('http://localhost:8080///', '/auth/login', {});

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toBe('http://localhost:8080/etapi/auth/login');
    });

    it('throws on error response', async () => {
      fetchMock.mockResolvedValue(mockErrorResponse(401, 'UNAUTHORIZED', 'Invalid password'));

      await expect(
        HttpClient.postNoAuth('http://localhost:8080', '/auth/login', { password: 'wrong' })
      ).rejects.toMatchObject({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Invalid password',
      });
    });
  });
});
