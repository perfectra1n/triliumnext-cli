import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Argv } from 'yargs';
import { createMockClient } from '../../helpers/mock-client.js';

// Mock dependencies
vi.mock('../../../src/config.js', () => ({
  getClient: vi.fn(),
}));

vi.mock('../../../src/output.js', () => ({
  formatOutput: vi.fn(),
  outputBinary: vi.fn(),
}));

vi.mock('../../../src/errors.js', () => ({
  handleError: vi.fn(),
}));

import { registerRevisionsCommands } from '../../../src/commands/revisions.js';
import { getClient } from '../../../src/config.js';
import { formatOutput, outputBinary } from '../../../src/output.js';
import { handleError } from '../../../src/errors.js';

describe('revisions commands', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let mockYargs: any;
  let commandHandlers: Map<string, Function>;

  beforeEach(() => {
    mockClient = createMockClient();
    vi.mocked(getClient).mockReturnValue(mockClient as any);

    commandHandlers = new Map();
    mockYargs = {
      command: vi.fn((cmd: string, desc: string, builder: any, handler: Function) => {
        commandHandlers.set(cmd.split(' ')[0], handler);
        return mockYargs;
      }),
      demandCommand: vi.fn(() => mockYargs),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('list command', () => {
    it('registers list command', () => {
      registerRevisionsCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'list <noteId>',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('lists revisions for a note', async () => {
      const revisions = [
        { revisionId: 'rev1', dateModified: '2024-01-01' },
        { revisionId: 'rev2', dateModified: '2024-01-02' },
      ];
      mockClient.getNoteRevisions.mockResolvedValue(revisions);

      registerRevisionsCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('list')!;

      await handler({ noteId: 'note123', format: 'json' });

      expect(getClient).toHaveBeenCalled();
      expect(mockClient.getNoteRevisions).toHaveBeenCalledWith('note123');
      expect(formatOutput).toHaveBeenCalledWith('json', revisions);
    });

    it('handles errors', async () => {
      const error = new Error('Note not found');
      mockClient.getNoteRevisions.mockRejectedValue(error);

      registerRevisionsCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('list')!;

      await handler({ noteId: 'invalid', format: 'json' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('get command', () => {
    it('registers get command', () => {
      registerRevisionsCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'get <revisionId>',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('gets revision metadata', async () => {
      const revision = {
        revisionId: 'rev1',
        noteId: 'note123',
        dateModified: '2024-01-01',
      };
      mockClient.getRevision.mockResolvedValue(revision);

      registerRevisionsCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('get')!;

      await handler({ revisionId: 'rev1', format: 'json' });

      expect(mockClient.getRevision).toHaveBeenCalledWith('rev1');
      expect(formatOutput).toHaveBeenCalledWith('json', revision);
    });

    it('handles errors', async () => {
      const error = new Error('Revision not found');
      mockClient.getRevision.mockRejectedValue(error);

      registerRevisionsCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('get')!;

      await handler({ revisionId: 'invalid', format: 'json' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('content command', () => {
    it('registers content command', () => {
      registerRevisionsCommands(mockYargs as unknown as Argv);

      expect(mockYargs.command).toHaveBeenCalledWith(
        'content <revisionId>',
        expect.any(String),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('downloads revision content to stdout', async () => {
      const content = Buffer.from('Old note content');
      mockClient.getRevisionContent.mockResolvedValue(content);

      registerRevisionsCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('content')!;

      await handler({ revisionId: 'rev1' });

      expect(mockClient.getRevisionContent).toHaveBeenCalledWith('rev1');
      expect(outputBinary).toHaveBeenCalledWith(content, undefined);
    });

    it('downloads revision content to file', async () => {
      const content = Buffer.from('Old note content');
      mockClient.getRevisionContent.mockResolvedValue(content);

      registerRevisionsCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('content')!;

      await handler({ revisionId: 'rev1', output: '/tmp/revision.html' });

      expect(mockClient.getRevisionContent).toHaveBeenCalledWith('rev1');
      expect(outputBinary).toHaveBeenCalledWith(content, '/tmp/revision.html');
    });

    it('handles errors', async () => {
      const error = new Error('Revision not found');
      mockClient.getRevisionContent.mockRejectedValue(error);

      registerRevisionsCommands(mockYargs as unknown as Argv);
      const handler = commandHandlers.get('content')!;

      await handler({ revisionId: 'invalid' });

      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('command registration', () => {
    it('demands at least one subcommand', () => {
      registerRevisionsCommands(mockYargs as unknown as Argv);

      expect(mockYargs.demandCommand).toHaveBeenCalledWith(
        1,
        expect.stringContaining('subcommand')
      );
    });
  });
});
