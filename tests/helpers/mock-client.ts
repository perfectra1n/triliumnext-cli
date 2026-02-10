import { vi } from 'vitest';
import type { EtapiClient } from '../../src/client/index.js';

/**
 * Creates a mock EtapiClient with all methods stubbed using vi.fn()
 * Each test can configure specific method return values as needed
 */
export function createMockClient(): EtapiClient {
  return {
    // Auth
    logout: vi.fn(),

    // Notes
    getNote: vi.fn(),
    searchNotes: vi.fn(),
    createNote: vi.fn(),
    patchNote: vi.fn(),
    deleteNote: vi.fn(),
    getNoteContent: vi.fn(),
    putNoteContent: vi.fn(),
    exportNote: vi.fn(),
    importNote: vi.fn(),
    createRevision: vi.fn(),
    undeleteNote: vi.fn(),
    getNoteHistory: vi.fn(),

    // Revisions
    getNoteRevisions: vi.fn(),
    getRevision: vi.fn(),
    getRevisionContent: vi.fn(),

    // Branches
    getBranch: vi.fn(),
    createBranch: vi.fn(),
    patchBranch: vi.fn(),
    deleteBranch: vi.fn(),
    refreshNoteOrdering: vi.fn(),

    // Attributes
    getAttribute: vi.fn(),
    createAttribute: vi.fn(),
    patchAttribute: vi.fn(),
    deleteAttribute: vi.fn(),

    // Attachments
    getNoteAttachments: vi.fn(),
    getAttachment: vi.fn(),
    createAttachment: vi.fn(),
    patchAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
    getAttachmentContent: vi.fn(),
    putAttachmentContent: vi.fn(),

    // Calendar
    getInbox: vi.fn(),
    getDayNote: vi.fn(),
    getWeekNote: vi.fn(),
    getMonthNote: vi.fn(),
    getYearNote: vi.fn(),
    getWeekFirstDayNote: vi.fn(),

    // System
    getAppInfo: vi.fn(),
    createBackup: vi.fn(),
  } as unknown as EtapiClient;
}
