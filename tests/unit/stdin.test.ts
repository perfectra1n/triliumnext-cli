import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import { readStdin } from '../../src/stdin.js';

describe('stdin', () => {
  let originalStdin: typeof process.stdin;

  beforeEach(() => {
    originalStdin = process.stdin;
  });

  afterEach(() => {
    // Restore original stdin
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
      configurable: true,
    });
  });

  describe('readStdin', () => {
    it('returns null when stdin is a TTY', async () => {
      // Mock stdin as TTY
      const mockStdin = new Readable() as typeof process.stdin;
      mockStdin.isTTY = true;

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      const result = await readStdin();
      expect(result).toBeNull();
    });

    it('reads data from stdin when not a TTY', async () => {
      const content = 'Hello from stdin!';
      const mockStdin = Readable.from([content]) as typeof process.stdin;
      mockStdin.isTTY = false;

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      const result = await readStdin();
      expect(result).toBeInstanceOf(Buffer);
      expect(result?.toString()).toBe(content);
    });

    it('reads multiple chunks from stdin', async () => {
      const chunks = ['chunk1', 'chunk2', 'chunk3'];
      const mockStdin = Readable.from(chunks) as typeof process.stdin;
      mockStdin.isTTY = false;

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      const result = await readStdin();
      expect(result).toBeInstanceOf(Buffer);
      expect(result?.toString()).toBe('chunk1chunk2chunk3');
    });

    it('handles Buffer chunks from stdin', async () => {
      const chunks = [Buffer.from('buf1'), Buffer.from('buf2')];
      const mockStdin = Readable.from(chunks) as typeof process.stdin;
      mockStdin.isTTY = false;

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      const result = await readStdin();
      expect(result).toBeInstanceOf(Buffer);
      expect(result?.toString()).toBe('buf1buf2');
    });

    it('handles empty stdin stream', async () => {
      const mockStdin = Readable.from([]) as typeof process.stdin;
      mockStdin.isTTY = false;

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      const result = await readStdin();
      expect(result).toBeInstanceOf(Buffer);
      expect(result?.length).toBe(0);
    });

    it('handles binary data from stdin', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
      const mockStdin = Readable.from([binaryData]) as typeof process.stdin;
      mockStdin.isTTY = false;

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      const result = await readStdin();
      expect(result).toBeInstanceOf(Buffer);
      expect(result).toEqual(binaryData);
    });

    it('handles mixed string and Buffer chunks', async () => {
      const chunks = ['string', Buffer.from('buffer'), 'more'];
      const mockStdin = Readable.from(chunks) as typeof process.stdin;
      mockStdin.isTTY = false;

      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      const result = await readStdin();
      expect(result).toBeInstanceOf(Buffer);
      expect(result?.toString()).toBe('stringbuffermore');
    });
  });
});
