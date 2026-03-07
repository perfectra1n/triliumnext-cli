import { describe, it, expect, afterEach } from 'vitest';
import { setupTriliumTests, createTestClient } from '../setup.js';
import { convertToHtml } from '../../../src/utils/markdown.js';

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

  describe('Note types', () => {
    it('creates a file note with binary content', async () => {
      const client = createTestClient();
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]).toString('base64');

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'file-test.bin',
        type: 'file',
        content: binaryContent,
        mime: 'application/octet-stream',
      });
      createdNoteIds.push(created.note.noteId);

      expect(created.note.type).toBe('file');
      expect(created.note.mime).toBe('application/octet-stream');

      const content = await client.getNoteContent(created.note.noteId);
      expect(Buffer.isBuffer(content)).toBe(true);
    });

    it('creates an image note', async () => {
      const client = createTestClient();
      // Minimal PNG header bytes
      const pngBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      ]).toString('base64');

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'test-image.png',
        type: 'image',
        content: pngBytes,
        mime: 'image/png',
      });
      createdNoteIds.push(created.note.noteId);

      expect(created.note.type).toBe('image');
      expect(created.note.mime).toBe('image/png');

      const content = await client.getNoteContent(created.note.noteId);
      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });

    it('creates a search note', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Search Note',
        type: 'search',
        content: '#journal',
      });
      createdNoteIds.push(created.note.noteId);

      expect(created.note.type).toBe('search');

      const content = await client.getNoteContent(created.note.noteId);
      expect(content.toString()).toContain('#journal');
    });

    it('creates a book note (container)', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Book Note',
        type: 'book',
        content: '',
      });
      createdNoteIds.push(created.note.noteId);

      expect(created.note.type).toBe('book');
    });

    it('creates a relationMap note', async () => {
      const client = createTestClient();
      const mapData = JSON.stringify({ notes: [], relations: [] });

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Relation Map',
        type: 'relationMap',
        content: mapData,
        mime: 'application/json',
      });
      createdNoteIds.push(created.note.noteId);

      expect(created.note.type).toBe('relationMap');

      const content = await client.getNoteContent(created.note.noteId);
      const parsed = JSON.parse(content.toString());
      expect(parsed).toEqual({ notes: [], relations: [] });
    });

    it('creates a render note', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Render Note',
        type: 'render',
        content: '',
      });
      createdNoteIds.push(created.note.noteId);

      expect(created.note.type).toBe('render');
    });
  });

  describe('Content operations', () => {
    it('sets and gets text content exactly', async () => {
      const client = createTestClient();
      const htmlContent = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> text.</p>';

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Content Test',
        type: 'text',
        content: htmlContent,
      });
      createdNoteIds.push(created.note.noteId);

      const retrieved = await client.getNoteContent(created.note.noteId);
      expect(retrieved.toString()).toBe(htmlContent);
    });

    it('sets and gets content via putNoteContent', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Put Content Test',
        type: 'text',
        content: 'initial',
      });
      createdNoteIds.push(created.note.noteId);

      const newHtml = '<p>Replaced content with <em>emphasis</em></p>';
      await client.putNoteContent(created.note.noteId, newHtml);

      const retrieved = await client.getNoteContent(created.note.noteId);
      expect(retrieved.toString()).toBe(newHtml);
    });

    it('handles large content (100KB+)', async () => {
      const client = createTestClient();
      const largeContent = '<p>' + 'A'.repeat(100 * 1024) + '</p>';

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Large Content Test',
        type: 'text',
        content: largeContent,
      });
      createdNoteIds.push(created.note.noteId);

      const retrieved = await client.getNoteContent(created.note.noteId);
      expect(retrieved.toString()).toBe(largeContent);
      expect(retrieved.length).toBeGreaterThanOrEqual(100 * 1024);
    });

    it('handles empty content', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Empty Content Test',
        type: 'text',
        content: '',
      });
      createdNoteIds.push(created.note.noteId);

      const retrieved = await client.getNoteContent(created.note.noteId);
      expect(retrieved.toString()).toBe('');
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
    it('exports a note as HTML ZIP', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Export HTML Test',
        type: 'text',
        content: '<p>Content to export as HTML</p>',
      });
      createdNoteIds.push(created.note.noteId);

      const exported = await client.exportNote(created.note.noteId, 'html');
      expect(Buffer.isBuffer(exported)).toBe(true);
      expect(exported.length).toBeGreaterThan(0);
      // ZIP files start with PK (0x50, 0x4B)
      expect(exported[0]).toBe(0x50);
      expect(exported[1]).toBe(0x4B);
    });

    it('exports a note as Markdown ZIP', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Export MD Test',
        type: 'text',
        content: '<p>Content to export as markdown</p>',
      });
      createdNoteIds.push(created.note.noteId);

      const exported = await client.exportNote(created.note.noteId, 'markdown');
      expect(Buffer.isBuffer(exported)).toBe(true);
      expect(exported.length).toBeGreaterThan(0);
      // ZIP files start with PK (0x50, 0x4B)
      expect(exported[0]).toBe(0x50);
      expect(exported[1]).toBe(0x4B);
    });

    it('exports a subtree with child notes', async () => {
      const client = createTestClient();

      // Create parent
      const parent = await client.createNote({
        parentNoteId: 'root',
        title: 'Export Subtree Parent',
        type: 'text',
        content: '<p>Parent content</p>',
      });
      createdNoteIds.push(parent.note.noteId);

      // Create child
      const child = await client.createNote({
        parentNoteId: parent.note.noteId,
        title: 'Export Subtree Child',
        type: 'text',
        content: '<p>Child content</p>',
      });
      createdNoteIds.push(child.note.noteId);

      const exported = await client.exportNote(parent.note.noteId, 'html');
      expect(Buffer.isBuffer(exported)).toBe(true);
      // Should be bigger than a single-note export since it includes the child
      expect(exported.length).toBeGreaterThan(100);
      // ZIP magic bytes
      expect(exported[0]).toBe(0x50);
      expect(exported[1]).toBe(0x4B);
    });

    it('round-trips export and import', async () => {
      const client = createTestClient();

      // Create a source note with known content
      const source = await client.createNote({
        parentNoteId: 'root',
        title: 'Import Source Note',
        type: 'text',
        content: '<p>Content for import round-trip test</p>',
      });
      createdNoteIds.push(source.note.noteId);

      // Export it
      const exported = await client.exportNote(source.note.noteId, 'html');
      expect(Buffer.isBuffer(exported)).toBe(true);

      // Create a target parent to import into
      const target = await client.createNote({
        parentNoteId: 'root',
        title: 'Import Target',
        type: 'text',
        content: '',
      });
      createdNoteIds.push(target.note.noteId);

      // Import the ZIP into the target
      const imported = await client.importNote(target.note.noteId, exported);
      expect(imported).toBeDefined();
      expect(imported.note).toBeDefined();
      expect(imported.note.noteId).toBeDefined();
      createdNoteIds.push(imported.note.noteId);
    });
  });

  describe('Undelete', () => {
    it('restores a deleted note', async () => {
      const client = createTestClient();

      // Create a note
      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Undelete Test Note',
        type: 'text',
        content: 'Content to preserve',
      });
      const noteId = created.note.noteId;

      // Delete it
      await client.deleteNote(noteId);

      // Verify it's deleted
      await expect(client.getNote(noteId)).rejects.toThrow();

      // Undelete it
      const result = await client.undeleteNote(noteId);
      expect(result).toBeDefined();

      // Verify it's restored
      const restored = await client.getNote(noteId);
      expect(restored.noteId).toBe(noteId);
      expect(restored.title).toBe('Undelete Test Note');

      // Clean up
      createdNoteIds.push(noteId);
    });
  });

  describe('Markdown content', () => {
    it('creates a note with converted markdown content', async () => {
      const client = createTestClient();
      const markdown = '# Heading\n\nSome **bold** text and a [link](https://example.com).\n\n- item 1\n- item 2\n\n`inline code`';
      const html = convertToHtml(markdown, 'markdown');

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Markdown Test',
        type: 'text',
        content: html,
      });
      createdNoteIds.push(created.note.noteId);

      const content = await client.getNoteContent(created.note.noteId);
      const contentStr = content.toString();

      expect(contentStr).toContain('<h1');
      expect(contentStr).toContain('<strong>');
      expect(contentStr).toContain('<a');
      expect(contentStr).toContain('<code>');
      expect(contentStr).toContain('<li>');
    });

    it('updates content with converted markdown via putNoteContent', async () => {
      const client = createTestClient();

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Markdown Update Test',
        type: 'text',
        content: '<p>initial</p>',
      });
      createdNoteIds.push(created.note.noteId);

      const markdown = '## Subheading\n\nA paragraph with *emphasis* and **strong**.\n\n- first\n- second';
      const html = convertToHtml(markdown, 'markdown');
      await client.putNoteContent(created.note.noteId, html);

      const content = await client.getNoteContent(created.note.noteId);
      const contentStr = content.toString();

      expect(contentStr).toContain('<h2');
      expect(contentStr).toContain('<em>');
      expect(contentStr).toContain('<strong>');
      expect(contentStr).toContain('<li>');
    });

    it('round-trips markdown-created note through export', async () => {
      const client = createTestClient();
      const markdown = '# Export MD Test\n\nParagraph content here.';
      const html = convertToHtml(markdown, 'markdown');

      const created = await client.createNote({
        parentNoteId: 'root',
        title: 'Markdown Export Test',
        type: 'text',
        content: html,
      });
      createdNoteIds.push(created.note.noteId);

      const exported = await client.exportNote(created.note.noteId, 'markdown');
      expect(Buffer.isBuffer(exported)).toBe(true);
      expect(exported.length).toBeGreaterThan(0);
      // ZIP magic bytes
      expect(exported[0]).toBe(0x50);
      expect(exported[1]).toBe(0x4B);
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

      try {
        // Get all history
        const history = await client.getNoteHistory();
        expect(Array.isArray(history)).toBe(true);

        // Get history for root subtree
        const rootHistory = await client.getNoteHistory('root');
        expect(Array.isArray(rootHistory)).toBe(true);
      } catch (error: any) {
        // History endpoint might not be available in some Trilium versions
        if (error.message?.includes('not found') || error.message?.includes('Router not found')) {
          console.log('Note history endpoint not available, skipping test');
          return;
        }
        throw error;
      }
    });
  });
});
