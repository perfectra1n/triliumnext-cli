import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { formatOutput, outputBinary } from '../../src/output.js';
import { spyOnConsole } from '../helpers/console-spy.js';

vi.mock('node:fs');

describe('output', () => {
  let consoleSpy: ReturnType<typeof spyOnConsole>;

  beforeEach(() => {
    consoleSpy = spyOnConsole();
  });

  afterEach(() => {
    consoleSpy.restore();
    vi.restoreAllMocks();
  });

  describe('formatOutput - json', () => {
    it('outputs pretty-printed JSON for objects', () => {
      const data = { noteId: '123', title: 'Test Note' };
      formatOutput('json', data);

      expect(consoleSpy.log).toHaveBeenCalledOnce();
      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('"noteId": "123"');
      expect(output).toContain('"title": "Test Note"');
    });

    it('outputs pretty-printed JSON for arrays', () => {
      const data = [{ id: '1' }, { id: '2' }];
      formatOutput('json', data);

      expect(consoleSpy.log).toHaveBeenCalledOnce();
      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('[');
      expect(output).toContain('"id": "1"');
      expect(output).toContain('"id": "2"');
    });

    it('outputs primitives as JSON', () => {
      formatOutput('json', 'hello');
      expect(consoleSpy.log).toHaveBeenCalledWith('"hello"');

      consoleSpy.log.mockClear();
      formatOutput('json', 123);
      expect(consoleSpy.log).toHaveBeenCalledWith('123');

      consoleSpy.log.mockClear();
      formatOutput('json', true);
      expect(consoleSpy.log).toHaveBeenCalledWith('true');

      consoleSpy.log.mockClear();
      formatOutput('json', null);
      expect(consoleSpy.log).toHaveBeenCalledWith('null');
    });
  });

  describe('formatOutput - table', () => {
    it('displays empty array with no output', () => {
      formatOutput('table', []);

      expect(consoleSpy.table).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('displays array of objects with column filtering', () => {
      const data = [
        { noteId: '123', title: 'Note 1', type: 'text', extraField: 'hidden' },
        { noteId: '456', title: 'Note 2', type: 'code', extraField: 'hidden' },
      ];

      formatOutput('table', data);

      expect(consoleSpy.table).toHaveBeenCalledOnce();
      expect(consoleSpy.table).toHaveBeenCalledWith(
        data,
        expect.arrayContaining(['noteId', 'title', 'type'])
      );
      // Should NOT include extraField in columns
      const columns = consoleSpy.table.mock.calls[0][1] as string[];
      expect(columns).not.toContain('extraField');
    });

    it('displays array of objects with no recognized columns using default console.table', () => {
      const data = [{ unknown: 'field1' }, { unknown: 'field2' }];

      formatOutput('table', data);

      expect(consoleSpy.table).toHaveBeenCalledWith(data);
    });

    it('displays array of non-objects using default console.table', () => {
      const data = ['string1', 'string2', 123];

      formatOutput('table', data);

      expect(consoleSpy.table).toHaveBeenCalledWith(data);
    });

    it('displays single object as key-value pairs', () => {
      const data = { noteId: '123', title: 'Test Note', type: 'text' };

      formatOutput('table', data);

      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
      expect(consoleSpy.log).toHaveBeenCalledWith('noteId: 123');
      expect(consoleSpy.log).toHaveBeenCalledWith('title: Test Note');
      expect(consoleSpy.log).toHaveBeenCalledWith('type: text');
    });

    it('displays primitives as strings', () => {
      formatOutput('table', 'hello world');
      expect(consoleSpy.log).toHaveBeenCalledWith('hello world');

      consoleSpy.log.mockClear();
      formatOutput('table', 42);
      expect(consoleSpy.log).toHaveBeenCalledWith('42');
    });
  });

  describe('formatOutput - quiet', () => {
    it('extracts noteId from single object', () => {
      const data = { noteId: '123', title: 'Test' };
      formatOutput('quiet', data);

      expect(consoleSpy.log).toHaveBeenCalledWith('123');
    });

    it('extracts branchId when noteId is not present', () => {
      const data = { branchId: '456' };
      formatOutput('quiet', data);

      expect(consoleSpy.log).toHaveBeenCalledWith('456');
    });

    it('extracts attributeId when noteId and branchId are not present', () => {
      const data = { attributeId: '789' };
      formatOutput('quiet', data);

      expect(consoleSpy.log).toHaveBeenCalledWith('789');
    });

    it('prefers noteId over other ID fields', () => {
      const data = { noteId: '123', branchId: '456', attributeId: '789' };
      formatOutput('quiet', data);

      expect(consoleSpy.log).toHaveBeenCalledWith('123');
    });

    it('falls back to JSON when no ID field is found', () => {
      const data = { title: 'Test', type: 'text' };
      formatOutput('quiet', data);

      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('"title"');
      expect(output).toContain('"type"');
    });

    it('extracts IDs from array of objects', () => {
      const data = [
        { noteId: '123', title: 'Note 1' },
        { noteId: '456', title: 'Note 2' },
        { branchId: '789', title: 'Branch' },
      ];

      formatOutput('quiet', data);

      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
      expect(consoleSpy.log).toHaveBeenNthCalledWith(1, '123');
      expect(consoleSpy.log).toHaveBeenNthCalledWith(2, '456');
      expect(consoleSpy.log).toHaveBeenNthCalledWith(3, '789');
    });

    it('falls back to JSON for array elements without ID fields', () => {
      const data = [
        { noteId: '123' },
        { title: 'No ID' },
        'primitive',
      ];

      formatOutput('quiet', data);

      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
      expect(consoleSpy.log).toHaveBeenNthCalledWith(1, '123');
      expect(consoleSpy.log).toHaveBeenNthCalledWith(2, '{"title":"No ID"}');
      expect(consoleSpy.log).toHaveBeenNthCalledWith(3, '"primitive"');
    });

    it('falls back to JSON for primitives', () => {
      formatOutput('quiet', 'hello');
      expect(consoleSpy.log).toHaveBeenCalledWith('"hello"');

      consoleSpy.log.mockClear();
      formatOutput('quiet', 123);
      expect(consoleSpy.log).toHaveBeenCalledWith('123');
    });
  });

  describe('outputBinary', () => {
    const mockBuffer = Buffer.from('binary content');

    it('writes buffer to file when outputPath is provided', () => {
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      outputBinary(mockBuffer, '/tmp/output.bin');

      expect(fs.writeFileSync).toHaveBeenCalledWith('/tmp/output.bin', mockBuffer);
    });

    it('writes buffer to stdout when outputPath is not provided', () => {
      const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      outputBinary(mockBuffer);

      expect(stdoutWriteSpy).toHaveBeenCalledWith(mockBuffer);

      stdoutWriteSpy.mockRestore();
    });
  });
});
