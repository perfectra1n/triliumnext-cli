import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Argv } from 'yargs';
import { createMockClient } from '../../helpers/mock-client.js';

vi.mock('../../../src/config.js', () => ({ getClient: vi.fn() }));
vi.mock('../../../src/output.js', () => ({ formatOutput: vi.fn() }));
vi.mock('../../../src/errors.js', () => ({ handleError: vi.fn() }));

import { registerBranchesCommands } from '../../../src/commands/branches.js';
import { getClient } from '../../../src/config.js';
import { formatOutput } from '../../../src/output.js';
import { handleError } from '../../../src/errors.js';

describe('branches commands', () => {
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

  afterEach(() => vi.clearAllMocks());

  it('gets branch by ID', async () => {
    const branch = { branchId: 'br123', noteId: 'note123', parentNoteId: 'root' };
    mockClient.getBranch.mockResolvedValue(branch);
    registerBranchesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('get')!({ branchId: 'br123', format: 'json' });
    expect(mockClient.getBranch).toHaveBeenCalledWith('br123');
    expect(formatOutput).toHaveBeenCalledWith('json', branch);
  });

  it('creates branch', async () => {
    const branch = { branchId: 'br456' };
    mockClient.createBranch.mockResolvedValue(branch);
    registerBranchesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('create')!({
      note: 'note123',
      parent: 'root',
      prefix: 'Archive:',
      position: 10,
      format: 'json',
    });
    expect(mockClient.createBranch).toHaveBeenCalledWith({
      noteId: 'note123',
      parentNoteId: 'root',
      prefix: 'Archive:',
      notePosition: 10,
      isExpanded: undefined,
    });
    expect(formatOutput).toHaveBeenCalledWith('json', branch);
  });

  it('patches branch', async () => {
    const branch = { branchId: 'br123', prefix: 'Updated:' };
    mockClient.patchBranch.mockResolvedValue(branch);
    registerBranchesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('patch')!({ branchId: 'br123', prefix: 'Updated:', format: 'json' });
    expect(mockClient.patchBranch).toHaveBeenCalledWith('br123', {
      prefix: 'Updated:',
      notePosition: undefined,
      isExpanded: undefined,
    });
    expect(formatOutput).toHaveBeenCalledWith('json', branch);
  });

  it('deletes branch', async () => {
    mockClient.deleteBranch.mockResolvedValue(undefined);
    registerBranchesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('delete')!({ branchId: 'br123', format: 'json' });
    expect(mockClient.deleteBranch).toHaveBeenCalledWith('br123');
    expect(formatOutput).toHaveBeenCalledWith('json', { success: true });
  });

  it('refreshes note ordering', async () => {
    mockClient.refreshNoteOrdering.mockResolvedValue(undefined);
    registerBranchesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('refresh-ordering')!({ parentNoteId: 'root', format: 'json' });
    expect(mockClient.refreshNoteOrdering).toHaveBeenCalledWith('root');
    expect(formatOutput).toHaveBeenCalledWith('json', { success: true });
  });

  it('handles errors', async () => {
    const error = new Error('Branch not found');
    mockClient.getBranch.mockRejectedValue(error);
    registerBranchesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('get')!({ branchId: 'invalid', format: 'json' });
    expect(handleError).toHaveBeenCalledWith(error);
  });
});
