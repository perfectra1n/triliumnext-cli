import { describe, it, expect, afterEach } from 'vitest';
import { setupTriliumTests, createTestClient } from '../setup.js';

// Setup Trilium container for all tests
setupTriliumTests();

describe('Notes integration tests', () => {
  const createdNoteIds: string[] = [];

  // Cleanup created notes after each test
  afterEach(async () => {
    const client = createTestClient();
    for (const noteId of createdNoteIds) {
      try {
        await client.deleteNote(noteId);
      } catch {
        // Note might already be deleted
      }
    }
    createdNoteIds.length = 0;
  });

  describe('CRUD operations', () => {
    it('creates, reads, updates, and deletes a note', async () => {
      const client = createTestClient();

      // Create a note
      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Integration Test Note',
        type: 'text',
        content: 'Initial content',
      });

      expect(created.note).toBeDefined();
      expect(created.note.noteId).toBeDefined();
      expect(created.note.title).toBe('Integration Test Note');
      expect(created.branch).toBeDefined();
      createdNoteIds.push(created.note.noteId);

      // Read the note
      const retrieved = await client.getNote(created.note.noteId);
      expect(retrieved.noteId).toBe(created.note.noteId);
      expect(retrieved.title).toBe('Integration Test Note');
      expect(retrieved.type).toBe('text');

      // Read note content
      const content = await client.getNoteContent(created.note.noteId);
      expect(content.toString()).toBe('Initial content');

      // Update note metadata
      const updated = await client.patchNote(created.note.noteId, {
        title: 'Updated Title',
      });
      expect(updated.title).toBe('Updated Title');

      // Update note content
      await client.putNoteContent(created.note.noteId, 'Updated content');
      const updatedContent = await client.getNoteContent(created.note.noteId);
      expect(updatedContent.toString()).toBe('Updated content');

      // Delete the note
      await client.deleteNote(created.note.noteId);

      // Verify deletion
      await expect(client.getNote(created.note.noteId)).rejects.toThrow();
      createdNoteIds.length = 0; // Already deleted
    });

    it('creates a code note with MIME type', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Code Note',
        type: 'code',
        content: 'console.log("Hello");',
        mime: 'application/javascript',
      });

      expect(created.note.type).toBe('code');
      expect(created.note.mime).toBe('application/javascript');
      createdNoteIds.push(created.note.noteId);

      const content = await client.getNoteContent(created.note.noteId);
      expect(content.toString()).toBe('console.log("Hello");');
    });
  });

  describe('Search functionality', () => {
    it('searches for notes', async () => {
      const client = createTestClient();

      // Create a test note
      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Searchable Note',
        type: 'text',
        content: 'This note contains unique search term xyz123',
      });
      createdNoteIds.push(created.note.noteId);

      // Search for the note
      const results = await client.searchNotes({
        search: 'xyz123',
      });

      expect(results.results).toBeDefined();
      expect(Array.isArray(results.results)).toBe(true);
      // The note should be found (may need a moment for indexing)
      const found = results.results.some((r: any) => r.noteId === created.note.noteId);
      if (!found) {
        // Retry once after a delay for indexing
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResults = await client.searchNotes({ search: 'xyz123' });
        expect(retryResults.results.some((r: any) => r.noteId === created.note.noteId)).toBe(true);
      }
    });

    it('searches with filters', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Filtered Note',
        type: 'text',
        content: 'Test content',
      });
      createdNoteIds.push(created.note.noteId);

      const results = await client.searchNotes({
        search: 'Filtered',
        ancestorNoteId: 'root',
        limit: 10,
      });

      expect(results.results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Revision management', () => {
    it('creates and retrieves revisions', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Revision Test',
        type: 'text',
        content: 'Original content',
      });
      createdNoteIds.push(created.note.noteId);

      // Update content to create a revision
      await client.putNoteContent(created.note.noteId, 'Updated content');

      // Create an explicit revision
      await client.createRevision(created.note.noteId);

      // List revisions
      const revisions = await client.getNoteRevisions(created.note.noteId);
      expect(Array.isArray(revisions)).toBe(true);
      expect(revisions.length).toBeGreaterThan(0);

      if (revisions.length > 0) {
        // Get a specific revision
        const revision = await client.getRevision(revisions[0].revisionId);
        expect(revision.revisionId).toBe(revisions[0].revisionId);

        // Get revision content
        const revisionContent = await client.getRevisionContent(revisions[0].revisionId);
        expect(Buffer.isBuffer(revisionContent)).toBe(true);
      }
    });
  });

  describe('Export and import', () => {
    it('exports a note as ZIP', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Export Test',
        type: 'text',
        content: 'Content to export',
      });
      createdNoteIds.push(created.note.noteId);

      // Export as HTML
      const exportedHtml = await client.exportNote(created.note.noteId, 'html');
      expect(Buffer.isBuffer(exportedHtml)).toBe(true);
      expect(exportedHtml.length).toBeGreaterThan(0);

      // Export as Markdown
      const exportedMd = await client.exportNote(created.note.noteId, 'markdown');
      expect(Buffer.isBuffer(exportedMd)).toBe(true);
      expect(exportedMd.length).toBeGreaterThan(0);
    });
  });

  describe('Note history', () => {
    it('retrieves note history', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'History Test',
        type: 'text',
        content: 'Test',
      });
      createdNoteIds.push(created.note.noteId);

      // Get all history
      const history = await client.getNoteHistory();
      expect(Array.isArray(history)).toBe(true);

      // Get history for root subtree
      const rootHistory = await client.getNoteHistory('root');
      expect(Array.isArray(rootHistory)).toBe(true);
    });
  });
});
