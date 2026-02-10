import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTriliumTests, createTestClient } from '../setup.js';

// Setup Trilium container for all tests
setupTriliumTests();

describe('Attachments integration tests', () => {
  let testNoteId: string;
  let createdAttachmentIds: string[] = [];

  beforeAll(async () => {
    const client = createTestClient();
    // Create a test note to use for attachment operations
    const created = await client.createNote({
      parentNoteId: 'root',
      title: 'Attachment Test Note',
      type: 'text',
      content: 'Test',
    });
    testNoteId = created.note.noteId;
  });

  afterAll(async () => {
    const client = createTestClient();
    // Clean up attachments
    for (const attachmentId of createdAttachmentIds) {
      try {
        await client.deleteAttachment(attachmentId);
      } catch {
        // Attachment might already be deleted
      }
    }
    // Clean up test note
    if (testNoteId) {
      try {
        await client.deleteNote(testNoteId);
      } catch {
        // Note might already be deleted
      }
    }
  });

  it('creates and retrieves an attachment', async () => {
    const client = createTestClient();

    // Create an attachment
    const testContent = Buffer.from('Test attachment content').toString('base64');
    const attachment = await client.createAttachment({
      ownerId: testNoteId,
      role: 'file',
      mime: 'text/plain',
      title: 'test.txt',
      content: testContent,
    });

    expect(attachment.attachmentId).toBeDefined();
    expect(attachment.ownerId).toBe(testNoteId);
    expect(attachment.role).toBe('file');
    expect(attachment.mime).toBe('text/plain');
    expect(attachment.title).toBe('test.txt');
    createdAttachmentIds.push(attachment.attachmentId);

    // Retrieve the attachment metadata
    const retrieved = await client.getAttachment(attachment.attachmentId);
    expect(retrieved.attachmentId).toBe(attachment.attachmentId);
    expect(retrieved.title).toBe('test.txt');
  });

  it('lists attachments for a note', async () => {
    const client = createTestClient();

    // Create multiple attachments
    const testContent = Buffer.from('Content').toString('base64');
    const attachment1 = await client.createAttachment({
      ownerId: testNoteId,
      role: 'file',
      mime: 'text/plain',
      title: 'file1.txt',
      content: testContent,
    });
    createdAttachmentIds.push(attachment1.attachmentId);

    const attachment2 = await client.createAttachment({
      ownerId: testNoteId,
      role: 'file',
      mime: 'text/plain',
      title: 'file2.txt',
      content: testContent,
    });
    createdAttachmentIds.push(attachment2.attachmentId);

    // List attachments
    const attachments = await client.getNoteAttachments(testNoteId);
    expect(Array.isArray(attachments)).toBe(true);
    expect(attachments.length).toBeGreaterThanOrEqual(2);

    const attachmentIds = attachments.map((a: any) => a.attachmentId);
    expect(attachmentIds).toContain(attachment1.attachmentId);
    expect(attachmentIds).toContain(attachment2.attachmentId);
  });

  it('gets and sets attachment content', async () => {
    const client = createTestClient();

    // Create an attachment
    const initialContent = Buffer.from('Initial content').toString('base64');
    const attachment = await client.createAttachment({
      ownerId: testNoteId,
      role: 'file',
      mime: 'text/plain',
      title: 'content-test.txt',
      content: initialContent,
    });
    createdAttachmentIds.push(attachment.attachmentId);

    // Get attachment content
    const content = await client.getAttachmentContent(attachment.attachmentId);
    expect(Buffer.isBuffer(content)).toBe(true);

    // Trilium returns base64-encoded content, so decode it
    const decodedContent = Buffer.from(content.toString(), 'base64').toString('utf-8');
    expect(decodedContent).toBe('Initial content');

    // Update attachment content (must be base64-encoded)
    const newContentBase64 = Buffer.from('Updated content').toString('base64');
    await client.putAttachmentContent(attachment.attachmentId, newContentBase64);

    // Verify updated content
    const updatedContent = await client.getAttachmentContent(attachment.attachmentId);
    const decodedUpdated = Buffer.from(updatedContent.toString(), 'base64').toString('utf-8');
    expect(decodedUpdated).toBe('Updated content');
  });

  it('updates attachment metadata', async () => {
    const client = createTestClient();

    // Create an attachment
    const testContent = Buffer.from('Content').toString('base64');
    const attachment = await client.createAttachment({
      ownerId: testNoteId,
      role: 'file',
      mime: 'text/plain',
      title: 'original.txt',
      content: testContent,
    });
    createdAttachmentIds.push(attachment.attachmentId);

    // Update metadata
    const updated = await client.patchAttachment(attachment.attachmentId, {
      title: 'renamed.txt',
      mime: 'text/markdown',
    });

    expect(updated.title).toBe('renamed.txt');
    expect(updated.mime).toBe('text/markdown');

    // Verify changes persisted
    const retrieved = await client.getAttachment(attachment.attachmentId);
    expect(retrieved.title).toBe('renamed.txt');
    expect(retrieved.mime).toBe('text/markdown');
  });

  it('updates attachment position', async () => {
    const client = createTestClient();

    // Create an attachment
    const testContent = Buffer.from('Content').toString('base64');
    const attachment = await client.createAttachment({
      ownerId: testNoteId,
      role: 'file',
      mime: 'text/plain',
      title: 'positioned.txt',
      content: testContent,
      position: 10,
    });
    createdAttachmentIds.push(attachment.attachmentId);

    // Update position
    const updated = await client.patchAttachment(attachment.attachmentId, {
      position: 100,
    });

    expect(updated.position).toBe(100);
  });

  it('deletes an attachment', async () => {
    const client = createTestClient();

    // Create an attachment
    const testContent = Buffer.from('Temporary content').toString('base64');
    const attachment = await client.createAttachment({
      ownerId: testNoteId,
      role: 'file',
      mime: 'text/plain',
      title: 'temp.txt',
      content: testContent,
    });

    // Delete the attachment
    await client.deleteAttachment(attachment.attachmentId);

    // Verify deletion
    await expect(client.getAttachment(attachment.attachmentId)).rejects.toThrow();
  });

  it('handles binary attachment content', async () => {
    const client = createTestClient();

    // Create a binary attachment (simple PNG-like data)
    const binaryData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    ]);
    const attachment = await client.createAttachment({
      ownerId: testNoteId,
      role: 'image',
      mime: 'image/png',
      title: 'test.png',
      content: binaryData.toString('base64'),
    });
    createdAttachmentIds.push(attachment.attachmentId);

    // Retrieve binary content
    const content = await client.getAttachmentContent(attachment.attachmentId);
    expect(Buffer.isBuffer(content)).toBe(true);

    // Trilium returns base64-encoded content, so decode it
    const decodedContent = Buffer.from(content.toString(), 'base64');
    expect(decodedContent.length).toBe(binaryData.length);

    // Verify first few bytes match (PNG signature)
    expect(decodedContent[0]).toBe(0x89);
    expect(decodedContent[1]).toBe(0x50);
    expect(decodedContent[2]).toBe(0x4e);
    expect(decodedContent[3]).toBe(0x47);
  });
});
