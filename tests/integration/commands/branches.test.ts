import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTriliumTests, createTestClient } from '../setup.js';

// Setup Trilium container for all tests
setupTriliumTests();

describe('Branches integration tests', () => {
  let testNoteId: string;
  let createdBranchIds: string[] = [];

  beforeAll(async () => {
    const client = createTestClient();
    // Create a test note to use for branch operations
    const created = await client.createNote({
      parentNoteId: 'root',
      title: 'Branch Test Note',
      type: 'text',
      content: 'Test',
    });
    testNoteId = created.note.noteId;
  });

  afterAll(async () => {
    const client = createTestClient();
    // Clean up branches
    for (const branchId of createdBranchIds) {
      try {
        await client.deleteBranch(branchId);
      } catch {
        // Branch might already be deleted
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

  it('creates and retrieves a branch (clones note to another parent)', async () => {
    const client = createTestClient();

    // Create a second parent note
    const parent = await client.createNote({
      parentNoteId: 'root',
      title: 'Second Parent',
      type: 'text',
      content: 'Parent',
    });

    // Create a branch (clone the test note under the second parent)
    const branch = await client.createBranch({
      noteId: testNoteId,
      parentNoteId: parent.note.noteId,
      prefix: 'Clone:',
    });

    expect(branch.branchId).toBeDefined();
    expect(branch.noteId).toBe(testNoteId);
    expect(branch.parentNoteId).toBe(parent.note.noteId);
    expect(branch.prefix).toBe('Clone:');
    createdBranchIds.push(branch.branchId);

    // Retrieve the branch
    const retrieved = await client.getBranch(branch.branchId);
    expect(retrieved.branchId).toBe(branch.branchId);
    expect(retrieved.prefix).toBe('Clone:');

    // Clean up parent note
    await client.deleteNote(parent.note.noteId);
  });

  it('updates branch properties', async () => {
    const client = createTestClient();

    // Create a parent and branch
    const parent = await client.createNote({
      parentNoteId: 'root',
      title: 'Update Parent',
      type: 'text',
      content: 'Parent',
    });

    const branch = await client.createBranch({
      noteId: testNoteId,
      parentNoteId: parent.note.noteId,
    });
    createdBranchIds.push(branch.branchId);

    // Update the branch
    const updated = await client.patchBranch(branch.branchId, {
      prefix: 'Updated:',
      notePosition: 100,
    });

    expect(updated.prefix).toBe('Updated:');
    expect(updated.notePosition).toBe(100);

    // Clean up
    await client.deleteNote(parent.note.noteId);
  });

  it('deletes a branch without deleting the note', async () => {
    const client = createTestClient();

    const parent = await client.createNote({
      parentNoteId: 'root',
      title: 'Delete Parent',
      type: 'text',
      content: 'Parent',
    });

    const branch = await client.createBranch({
      noteId: testNoteId,
      parentNoteId: parent.note.noteId,
    });

    // Delete the branch
    await client.deleteBranch(branch.branchId);

    // Verify branch is gone
    await expect(client.getBranch(branch.branchId)).rejects.toThrow();

    // Verify note still exists
    const note = await client.getNote(testNoteId);
    expect(note.noteId).toBe(testNoteId);

    // Clean up parent
    await client.deleteNote(parent.note.noteId);
  });

  it('refreshes note ordering', async () => {
    const client = createTestClient();

    const parent = await client.createNote({
      parentNoteId: 'root',
      title: 'Ordering Parent',
      type: 'text',
      content: 'Parent',
    });

    // Refresh ordering should not throw
    await expect(client.refreshNoteOrdering(parent.note.noteId)).resolves.not.toThrow();

    // Clean up
    await client.deleteNote(parent.note.noteId);
  });
});
