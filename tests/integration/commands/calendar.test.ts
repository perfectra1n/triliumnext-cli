import { describe, it, expect } from 'vitest';
import { setupTriliumTests, createTestClient } from '../setup.js';

// Setup Trilium container for all tests
setupTriliumTests();

describe('Calendar integration tests', () => {
  it('gets inbox note', async () => {
    const client = createTestClient();

    // Get inbox note for today
    const today = new Date().toISOString().split('T')[0];
    const inbox = await client.getInbox(today);

    expect(inbox).toBeDefined();
    expect(inbox.noteId).toBeDefined();
    expect(inbox.title).toBeDefined();
    expect(inbox.type).toBeDefined();
  });

  it('gets inbox note for specific date', async () => {
    const client = createTestClient();

    // Get inbox note for a specific date
    const date = '2024-01-15';
    const inbox = await client.getInbox(date);

    expect(inbox).toBeDefined();
    expect(inbox.noteId).toBeDefined();
  });

  it('gets day note', async () => {
    const client = createTestClient();

    // Get day note for a specific date (will create if doesn't exist)
    const date = '2024-01-15';
    const dayNote = await client.getDayNote(date);

    expect(dayNote).toBeDefined();
    expect(dayNote.noteId).toBeDefined();
    // Day notes have title like "15 - Monday"
    expect(dayNote.title).toBeDefined();
  });

  it('gets today note', async () => {
    const client = createTestClient();

    // Get today's note (default behavior when no date provided)
    const today = new Date().toISOString().split('T')[0];
    const todayNote = await client.getDayNote(today);

    expect(todayNote).toBeDefined();
    expect(todayNote.noteId).toBeDefined();
    expect(todayNote.title).toBeDefined();
  });

  it('gets week note', async () => {
    const client = createTestClient();

    // Get week note for a specific week (format: YYYY-WNN)
    const week = '2024-W03';
    const weekNote = await client.getWeekNote(week);

    expect(weekNote).toBeDefined();
    expect(weekNote.noteId).toBeDefined();
    expect(weekNote.title).toBeDefined();
  });

  it('gets week first day note', async () => {
    const client = createTestClient();

    // Get week first day note for a specific date
    const date = '2024-01-15';
    const weekFirstDayNote = await client.getWeekFirstDayNote(date);

    expect(weekFirstDayNote).toBeDefined();
    expect(weekFirstDayNote.noteId).toBeDefined();
    expect(weekFirstDayNote.title).toBeDefined();
  });

  it('gets month note', async () => {
    const client = createTestClient();

    // Get month note for a specific month
    const month = '2024-01';
    const monthNote = await client.getMonthNote(month);

    expect(monthNote).toBeDefined();
    expect(monthNote.noteId).toBeDefined();
    expect(monthNote.title).toContain('2024');
    expect(monthNote.title).toContain('01');
  });

  it('gets year note', async () => {
    const client = createTestClient();

    // Get year note for a specific year
    const year = '2024';
    const yearNote = await client.getYearNote(year);

    expect(yearNote).toBeDefined();
    expect(yearNote.noteId).toBeDefined();
    expect(yearNote.title).toContain('2024');
  });

  it('creates day notes for different dates', async () => {
    const client = createTestClient();

    // Create day notes for multiple dates
    const dates = ['2024-01-10', '2024-01-11', '2024-01-12'];
    const dayNotes = [];

    for (const date of dates) {
      const dayNote = await client.getDayNote(date);
      dayNotes.push(dayNote);
      expect(dayNote.noteId).toBeDefined();
      expect(dayNote.title).toContain(date);
    }

    // Verify all notes are different
    const noteIds = dayNotes.map((n) => n.noteId);
    const uniqueNoteIds = new Set(noteIds);
    expect(uniqueNoteIds.size).toBe(dates.length);
  });

  it('handles calendar hierarchy', async () => {
    const client = createTestClient();

    // Get notes at different levels of the calendar hierarchy
    const year = '2024';
    const month = '2024-01';
    const day = '2024-01-15';

    const yearNote = await client.getYearNote(year);
    const monthNote = await client.getMonthNote(month);
    const dayNote = await client.getDayNote(day);

    // All should be valid notes
    expect(yearNote.noteId).toBeDefined();
    expect(monthNote.noteId).toBeDefined();
    expect(dayNote.noteId).toBeDefined();

    // All should have different IDs (different notes in hierarchy)
    expect(yearNote.noteId).not.toBe(monthNote.noteId);
    expect(monthNote.noteId).not.toBe(dayNote.noteId);
    expect(yearNote.noteId).not.toBe(dayNote.noteId);
  });

  it('gets current week note', async () => {
    const client = createTestClient();

    // Get current week note (format: YYYY-WNN)
    const now = new Date();
    const year = now.getFullYear();
    // Simple week calculation (week 1 = first week of year)
    const weekNum = Math.ceil((now.getDate() + now.getDay()) / 7);
    const week = `${year}-W${String(weekNum).padStart(2, '0')}`;
    const currentWeekNote = await client.getWeekNote(week);

    expect(currentWeekNote).toBeDefined();
    expect(currentWeekNote.noteId).toBeDefined();
    expect(currentWeekNote.title).toBeDefined();
  });

  it('gets current month note', async () => {
    const client = createTestClient();

    // Get current month note
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthNote = await client.getMonthNote(currentMonth);

    expect(currentMonthNote).toBeDefined();
    expect(currentMonthNote.noteId).toBeDefined();
    expect(currentMonthNote.title).toContain(String(today.getFullYear()));
  });

  it('gets current year note', async () => {
    const client = createTestClient();

    // Get current year note
    const currentYear = String(new Date().getFullYear());
    const currentYearNote = await client.getYearNote(currentYear);

    expect(currentYearNote).toBeDefined();
    expect(currentYearNote.noteId).toBeDefined();
    expect(currentYearNote.title).toContain(currentYear);
  });
});
