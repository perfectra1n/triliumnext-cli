import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleError } from '../../src/errors.js';
import { EtapiClientError } from '../../src/client/http.js';

describe('errors', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('handleError with EtapiClientError', () => {
    it('handles 401 Unauthorized', () => {
      const err = new EtapiClientError(401, 'UNAUTHORIZED', 'Invalid token');
      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failed')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Check your auth token')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles 403 Forbidden', () => {
      const err = new EtapiClientError(403, 'FORBIDDEN', 'Access denied');
      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Access denied')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('lack permissions')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles 404 Not Found', () => {
      const err = new EtapiClientError(404, 'NOTE_NOT_FOUND', 'Note not found');
      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Entity not found')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Verify the ID')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles 429 Rate Limited', () => {
      const err = new EtapiClientError(429, 'RATE_LIMITED', 'Too many requests');
      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limited')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('wait and try again')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles other ETAPI errors with status and message', () => {
      const err = new EtapiClientError(500, 'SERVER_ERROR', 'Internal server error');
      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/500.*SERVER_ERROR.*Internal server error/)
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('handleError with connection errors', () => {
    it('detects ECONNREFUSED from error code', () => {
      const err = Object.assign(new Error('fetch failed'), {
        cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:8080'), {
          code: 'ECONNREFUSED',
        }),
      });

      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection refused')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('127.0.0.1:8080')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('detects ECONNREFUSED from message', () => {
      const err = new Error('connect ECONNREFUSED localhost:8080');

      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection refused')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('extracts URL from HTTP error message', () => {
      const err = Object.assign(new Error('fetch failed'), {
        cause: new Error('connect ECONNREFUSED http://localhost:8080/etapi'),
      });

      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:8080/etapi')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('extracts host:port from ECONNREFUSED message', () => {
      const err = Object.assign(new Error('fetch failed'), {
        cause: Object.assign(new Error('connect ECONNREFUSED 192.168.1.1:37740'), {
          code: 'ECONNREFUSED',
        }),
      });

      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.1:37740')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('shows generic message when URL cannot be extracted', () => {
      const err = Object.assign(new Error('fetch failed'), {
        cause: Object.assign(new Error('ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        }),
      });

      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection refused')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('configured server')
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('handleError with generic errors', () => {
    it('handles generic Error instances', () => {
      const err = new Error('Something went wrong');
      handleError(err);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Something went wrong');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles non-Error values', () => {
      handleError('string error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: An unexpected error occurred.');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles null', () => {
      handleError(null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: An unexpected error occurred.');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles undefined', () => {
      handleError(undefined);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: An unexpected error occurred.');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
