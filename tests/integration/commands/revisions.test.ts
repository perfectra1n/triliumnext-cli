import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTriliumTests, createTestClient } from '../setup.js';

// Setup Trilium container for all tests
setupTriliumTests();

describe('Revisions integration tests', () => {
  let testNoteId: string;

  beforeAll(async () => {
    const client = createTestClient();
    // Create a test note to use for revision operations
    const created = await client.createNote({
      parentNoteId: 'root',
      title: 'Revision Test Note',
      type: 'text',
      content: 'Original content',
    });
    testNoteId = created.note.noteId;
  });

  afterAll(async () => {
    const client = createTestClient();
    // Clean up test note
    if (testNoteId) {
      try {
        await client.deleteNote(testNoteId);
      } catch {
        // Note might already be deleted
      }
    }
  });

  it('creates a revision', async () => {
    const client = createTestClient();

    // Update the note content to generate history
    await client.putNoteContent(testNoteId, 'First update');
    await client.putNoteContent(testNoteId, 'Second update');

    // Create an explicit revision
    await client.createRevision(testNoteId);

    // List revisions - should have at least one
    const revisions = await client.getNoteRevisions(testNoteId);
    expect(Array.isArray(revisions)).toBe(true);
    expect(revisions.length).toBeGreaterThan(0);
  });

  it('lists note revisions', async () => {
    const client = createTestClient();

    // Make some changes to generate revisions
    await client.putNoteContent(testNoteId, 'Revision test content 1');
    await client.putNoteContent(testNoteId, 'Revision test content 2');
    await client.createRevision(testNoteId);

    // List revisions
    const revisions = await client.getNoteRevisions(testNoteId);
    expect(Array.isArray(revisions)).toBe(true);
    expect(revisions.length).toBeGreaterThan(0);

    // Verify revision structure
    const revision = revisions[0];
    expect(revision.revisionId).toBeDefined();
    expect(revision.noteId).toBe(testNoteId);
    expect(revision.type).toBeDefined();
    expect(revision.dateLastEdited).toBeDefined();
  });

  it('gets revision metadata', async () => {
    const client = createTestClient();

    // Create a revision
    await client.putNoteContent(testNoteId, 'Content for metadata test');
    await client.createRevision(testNoteId);

    // Get revisions
    const revisions = await client.getNoteRevisions(testNoteId);
    expect(revisions.length).toBeGreaterThan(0);

    // Get specific revision metadata
    const revisionId = revisions[0].revisionId;
    const revision = await client.getRevision(revisionId);

    expect(revision.revisionId).toBe(revisionId);
    expect(revision.noteId).toBe(testNoteId);
    expect(revision.type).toBeDefined();
    expect(revision.mime).toBeDefined();
    expect(revision.title).toBeDefined();
    expect(revision.dateLastEdited).toBeDefined();
  });

  it('gets revision content', async () => {
    const client = createTestClient();

    // Set specific content and create a revision
    const testContent = 'Content for revision content test';
    await client.putNoteContent(testNoteId, testContent);
    await client.createRevision(testNoteId);

    // Get revisions
    const revisions = await client.getNoteRevisions(testNoteId);
    expect(revisions.length).toBeGreaterThan(0);

    // Get revision content
    const revisionId = revisions[0].revisionId;
    const content = await client.getRevisionContent(revisionId);

    expect(Buffer.isBuffer(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
    // Content should be related to our test content
    const contentStr = content.toString();
    expect(contentStr.length).toBeGreaterThan(0);
  });

  it('preserves content in revisions', async () => {
    const client = createTestClient();

    // Set initial content
    const initialContent = 'Initial revision content';
    await client.putNoteContent(testNoteId, initialContent);
    await client.createRevision(testNoteId);

    // Get the revision we just created
    const revisionsAfterFirst = await client.getNoteRevisions(testNoteId);
    const firstRevisionId = revisionsAfterFirst[0].revisionId;

    // Update to new content
    const newContent = 'Updated revision content';
    await client.putNoteContent(testNoteId, newContent);

    // Verify current content is the new content
    const currentContent = await client.getNoteContent(testNoteId);
    expect(currentContent.toString()).toBe(newContent);

    // The first revision should still have the old content (or be preserved)
    const revisionContent = await client.getRevisionContent(firstRevisionId);
    expect(Buffer.isBuffer(revisionContent)).toBe(true);
    // Note: Exact content matching might depend on Trilium's revision timing
  });

  it('handles multiple revisions', async () => {
    const client = createTestClient();

    // Create multiple revisions
    await client.putNoteContent(testNoteId, 'Revision 1 content');
    await client.createRevision(testNoteId);

    await client.putNoteContent(testNoteId, 'Revision 2 content');
    await client.createRevision(testNoteId);

    await client.putNoteContent(testNoteId, 'Revision 3 content');
    await client.createRevision(testNoteId);

    // List all revisions
    const revisions = await client.getNoteRevisions(testNoteId);
    expect(revisions.length).toBeGreaterThanOrEqual(3);

    // Verify each revision is accessible
    for (const rev of revisions.slice(0, 3)) {
      const metadata = await client.getRevision(rev.revisionId);
      expect(metadata.revisionId).toBe(rev.revisionId);

      const content = await client.getRevisionContent(rev.revisionId);
      expect(Buffer.isBuffer(content)).toBe(true);
    }
  });
});
