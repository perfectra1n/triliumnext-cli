import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTriliumTests, createTestClient } from '../setup.js';

// Setup Trilium container for all tests
setupTriliumTests();

describe('Attributes integration tests', () => {
  let testNoteId: string;
  let createdAttributeIds: string[] = [];

  beforeAll(async () => {
    const client = createTestClient();
    // Create a test note to use for attribute operations
    const created = await client.createNote({
      parentNoteId: 'root',
      title: 'Attribute Test Note',
      type: 'text',
      content: 'Test',
    });
    testNoteId = created.note.noteId;
  });

  afterAll(async () => {
    const client = createTestClient();
    // Clean up attributes
    for (const attributeId of createdAttributeIds) {
      try {
        await client.deleteAttribute(attributeId);
      } catch {
        // Attribute might already be deleted
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

  it('creates and retrieves a label attribute', async () => {
    const client = createTestClient();

    // Create a label
    const attribute = await client.createAttribute({
      noteId: testNoteId,
      type: 'label',
      name: 'priority',
      value: 'high',
    });

    expect(attribute.attributeId).toBeDefined();
    expect(attribute.noteId).toBe(testNoteId);
    expect(attribute.type).toBe('label');
    expect(attribute.name).toBe('priority');
    expect(attribute.value).toBe('high');
    createdAttributeIds.push(attribute.attributeId);

    // Retrieve the attribute
    const retrieved = await client.getAttribute(attribute.attributeId);
    expect(retrieved.attributeId).toBe(attribute.attributeId);
    expect(retrieved.name).toBe('priority');
    expect(retrieved.value).toBe('high');
  });

  it('creates and retrieves a relation attribute', async () => {
    const client = createTestClient();

    // Create a target note for the relation
    const target = await client.createNote({
      parentNoteId: 'root',
      title: 'Relation Target',
      type: 'text',
      content: 'Target',
    });

    // Create a relation
    const attribute = await client.createAttribute({
      noteId: testNoteId,
      type: 'relation',
      name: 'relatedTo',
      value: target.note.noteId,
    });

    expect(attribute.attributeId).toBeDefined();
    expect(attribute.type).toBe('relation');
    expect(attribute.name).toBe('relatedTo');
    expect(attribute.value).toBe(target.note.noteId);
    createdAttributeIds.push(attribute.attributeId);

    // Clean up target note
    await client.deleteNote(target.note.noteId);
  });

  it('updates attribute value', async () => {
    const client = createTestClient();

    // Create an attribute
    const attribute = await client.createAttribute({
      noteId: testNoteId,
      type: 'label',
      name: 'status',
      value: 'draft',
    });
    createdAttributeIds.push(attribute.attributeId);

    // Update the attribute
    const updated = await client.patchAttribute(attribute.attributeId, {
      value: 'published',
    });

    expect(updated.value).toBe('published');

    // Verify the change persisted
    const retrieved = await client.getAttribute(attribute.attributeId);
    expect(retrieved.value).toBe('published');
  });

  it('updates attribute position', async () => {
    const client = createTestClient();

    // Create an attribute
    const attribute = await client.createAttribute({
      noteId: testNoteId,
      type: 'label',
      name: 'category',
      value: 'work',
      position: 10,
    });
    createdAttributeIds.push(attribute.attributeId);

    // Update position
    const updated = await client.patchAttribute(attribute.attributeId, {
      position: 100,
    });

    expect(updated.position).toBe(100);
  });

  it('deletes an attribute', async () => {
    const client = createTestClient();

    const attribute = await client.createAttribute({
      noteId: testNoteId,
      type: 'label',
      name: 'temporary',
      value: 'yes',
    });

    // Delete the attribute
    await client.deleteAttribute(attribute.attributeId);

    // Verify deletion
    await expect(client.getAttribute(attribute.attributeId)).rejects.toThrow();
  });
});
