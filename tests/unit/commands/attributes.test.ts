import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Argv } from 'yargs';
import { createMockClient } from '../../helpers/mock-client.js';

vi.mock('../../../src/config.js', () => ({ getClient: vi.fn() }));
vi.mock('../../../src/output.js', () => ({ formatOutput: vi.fn() }));
vi.mock('../../../src/errors.js', () => ({ handleError: vi.fn() }));

import { registerAttributesCommands } from '../../../src/commands/attributes.js';
import { getClient } from '../../../src/config.js';
import { formatOutput } from '../../../src/output.js';
import { handleError } from '../../../src/errors.js';

describe('attributes commands', () => {
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

  it('gets attribute by ID', async () => {
    const attr = { attributeId: 'attr123', name: 'priority', value: 'high' };
    mockClient.getAttribute.mockResolvedValue(attr);
    registerAttributesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('get')!({ attributeId: 'attr123', format: 'json' });
    expect(mockClient.getAttribute).toHaveBeenCalledWith('attr123');
    expect(formatOutput).toHaveBeenCalledWith('json', attr);
  });

  it('creates attribute', async () => {
    const attr = { attributeId: 'attr456' };
    mockClient.createAttribute.mockResolvedValue(attr);
    registerAttributesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('create')!({
      note: 'note123',
      type: 'label',
      name: 'priority',
      value: 'high',
      format: 'json',
    });
    expect(mockClient.createAttribute).toHaveBeenCalledWith({
      noteId: 'note123',
      type: 'label',
      name: 'priority',
      value: 'high',
      isInheritable: undefined,
      position: undefined,
    });
    expect(formatOutput).toHaveBeenCalledWith('json', attr);
  });

  it('patches attribute', async () => {
    const attr = { attributeId: 'attr123', value: 'urgent' };
    mockClient.patchAttribute.mockResolvedValue(attr);
    registerAttributesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('patch')!({ attributeId: 'attr123', value: 'urgent', format: 'json' });
    expect(mockClient.patchAttribute).toHaveBeenCalledWith('attr123', {
      value: 'urgent',
      position: undefined,
    });
    expect(formatOutput).toHaveBeenCalledWith('json', attr);
  });

  it('deletes attribute', async () => {
    mockClient.deleteAttribute.mockResolvedValue(undefined);
    registerAttributesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('delete')!({ attributeId: 'attr123', format: 'json' });
    expect(mockClient.deleteAttribute).toHaveBeenCalledWith('attr123');
    expect(formatOutput).toHaveBeenCalledWith('json', { success: true });
  });

  it('handles errors', async () => {
    const error = new Error('Attribute not found');
    mockClient.getAttribute.mockRejectedValue(error);
    registerAttributesCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('get')!({ attributeId: 'invalid', format: 'json' });
    expect(handleError).toHaveBeenCalledWith(error);
  });
});
