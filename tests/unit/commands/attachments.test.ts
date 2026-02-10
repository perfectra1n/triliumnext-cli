import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Argv } from 'yargs';
import { createMockClient } from '../../helpers/mock-client.js';

vi.mock('../../../src/config.js', () => ({ getClient: vi.fn() }));
vi.mock('../../../src/output.js', () => ({ formatOutput: vi.fn(), outputBinary: vi.fn() }));
vi.mock('../../../src/errors.js', () => ({ handleError: vi.fn() }));
vi.mock('../../../src/stdin.js', () => ({ readStdin: vi.fn() }));

import { registerAttachmentsCommands } from '../../../src/commands/attachments.js';
import { getClient } from '../../../src/config.js';
import { formatOutput, outputBinary } from '../../../src/output.js';
import { handleError } from '../../../src/errors.js';
import { readStdin } from '../../../src/stdin.js';

describe('attachments commands', () => {
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

  it('lists attachments for a note', async () => {
    const attachments = [{ attachmentId: 'att1' }, { attachmentId: 'att2' }];
    mockClient.getNoteAttachments.mockResolvedValue(attachments);
    registerAttachmentsCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('list')!({ noteId: 'note123', format: 'json' });
    expect(mockClient.getNoteAttachments).toHaveBeenCalledWith('note123');
    expect(formatOutput).toHaveBeenCalledWith('json', attachments);
  });

  it('gets attachment by ID', async () => {
    const attachment = { attachmentId: 'att123', title: 'photo.png', mime: 'image/png' };
    mockClient.getAttachment.mockResolvedValue(attachment);
    registerAttachmentsCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('get')!({ attachmentId: 'att123', format: 'json' });
    expect(mockClient.getAttachment).toHaveBeenCalledWith('att123');
    expect(formatOutput).toHaveBeenCalledWith('json', attachment);
  });

  it('creates attachment with content', async () => {
    const attachment = { attachmentId: 'att456' };
    mockClient.createAttachment.mockResolvedValue(attachment);
    registerAttachmentsCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('create')!({
      owner: 'note123',
      role: 'image',
      mime: 'image/png',
      title: 'photo.png',
      content: 'base64data',
      format: 'json',
    });
    expect(mockClient.createAttachment).toHaveBeenCalledWith({
      ownerId: 'note123',
      role: 'image',
      mime: 'image/png',
      title: 'photo.png',
      content: 'base64data',
      position: undefined,
    });
    expect(formatOutput).toHaveBeenCalledWith('json', attachment);
  });

  it('patches attachment', async () => {
    const attachment = { attachmentId: 'att123', title: 'updated.png' };
    mockClient.patchAttachment.mockResolvedValue(attachment);
    registerAttachmentsCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('patch')!({ attachmentId: 'att123', title: 'updated.png', format: 'json' });
    expect(mockClient.patchAttachment).toHaveBeenCalledWith('att123', {
      title: 'updated.png',
      role: undefined,
      mime: undefined,
      position: undefined,
    });
    expect(formatOutput).toHaveBeenCalledWith('json', attachment);
  });

  it('deletes attachment', async () => {
    mockClient.deleteAttachment.mockResolvedValue(undefined);
    registerAttachmentsCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('delete')!({ attachmentId: 'att123', format: 'json' });
    expect(mockClient.deleteAttachment).toHaveBeenCalledWith('att123');
    expect(formatOutput).toHaveBeenCalledWith('json', { success: true });
  });

  it('gets attachment content', async () => {
    const content = Buffer.from('binary data');
    mockClient.getAttachmentContent.mockResolvedValue(content);
    registerAttachmentsCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('get-content')!({ attachmentId: 'att123' });
    expect(mockClient.getAttachmentContent).toHaveBeenCalledWith('att123');
    expect(outputBinary).toHaveBeenCalledWith(content, undefined);
  });

  it('sets attachment content', async () => {
    mockClient.putAttachmentContent.mockResolvedValue(undefined);
    registerAttachmentsCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('set-content')!({ attachmentId: 'att123', content: 'new data', format: 'json' });
    expect(mockClient.putAttachmentContent).toHaveBeenCalledWith('att123', Buffer.from('new data', 'utf-8'));
    expect(formatOutput).toHaveBeenCalledWith('json', { success: true });
  });

  it('handles errors', async () => {
    const error = new Error('Attachment not found');
    mockClient.getAttachment.mockRejectedValue(error);
    registerAttachmentsCommands(mockYargs as unknown as Argv);
    await commandHandlers.get('get')!({ attachmentId: 'invalid', format: 'json' });
    expect(handleError).toHaveBeenCalledWith(error);
  });
});
