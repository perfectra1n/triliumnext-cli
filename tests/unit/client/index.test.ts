import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EtapiClient } from '../../../src/client/index.js';
import { setupFetchMock, mockJsonResponse, mockNoContentResponse, mockBinaryResponse } from '../../helpers/mock-fetch.js';

describe('EtapiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: EtapiClient;

  beforeEach(() => {
    fetchMock = setupFetchMock();
    client = new EtapiClient('http://localhost:8080', 'test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Auth methods', () => {
    it('login() calls postNoAuth with password', async () => {
      const response = { authToken: 'new-token' };
      fetchMock.mockResolvedValue(mockJsonResponse(response));

      const result = await EtapiClient.login('http://localhost:8080', 'password123');

      expect(result).toEqual({ ...response, resolvedBaseUrl: 'http://localhost:8080/etapi' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'password123' }),
        })
      );
    });

    it('logout() makes POST request', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.logout();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Notes methods', () => {
    it('getNote() fetches note by ID', async () => {
      const note = { noteId: '123', title: 'Test Note', type: 'text' };
      fetchMock.mockResolvedValue(mockJsonResponse(note));

      const result = await client.getNote('123');

      expect(result).toEqual(note);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notes/123'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('searchNotes() passes search params as query string', async () => {
      const searchResponse = { results: [] };
      fetchMock.mockResolvedValue(mockJsonResponse(searchResponse));

      await client.searchNotes({ search: 'test', limit: 10, fastSearch: true });

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('search=test');
      expect(callUrl).toContain('limit=10');
      expect(callUrl).toContain('fastSearch=true');
    });

    it('createNote() posts note data', async () => {
      const response = { note: { noteId: '123' }, branch: { branchId: '456' } };
      fetchMock.mockResolvedValue(mockJsonResponse(response));

      const result = await client.createNote({
        parentNoteId: 'root',
        title: 'New Note',
        type: 'text',
        content: 'Content',
      });

      expect(result).toEqual(response);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/create-note'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('New Note'),
        })
      );
    });

    it('patchNote() updates note metadata', async () => {
      const updatedNote = { noteId: '123', title: 'Updated' };
      fetchMock.mockResolvedValue(mockJsonResponse(updatedNote));

      const result = await client.patchNote('123', { title: 'Updated' });

      expect(result).toEqual(updatedNote);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notes/123'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    it('deleteNote() deletes a note', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.deleteNote('123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notes/123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('getNoteContent() retrieves note content as buffer', async () => {
      const content = Buffer.from('Note content');
      fetchMock.mockResolvedValue(mockBinaryResponse(content));

      const result = await client.getNoteContent('123');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('Note content');
    });

    it('putNoteContent() updates note content', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.putNoteContent('123', 'New content');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notes/123/content'),
        expect.objectContaining({
          method: 'PUT',
          body: 'New content',
        })
      );
    });

    it('exportNote() exports note as ZIP', async () => {
      const zipData = Buffer.from('ZIP content');
      fetchMock.mockResolvedValue(mockBinaryResponse(zipData));

      const result = await client.exportNote('123', 'markdown');

      expect(Buffer.isBuffer(result)).toBe(true);
      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('format=markdown');
    });

    it('importNote() uploads ZIP and returns note', async () => {
      const response = { note: { noteId: '123' }, branch: { branchId: '456' } };
      fetchMock.mockResolvedValue(mockJsonResponse(response));

      const result = await client.importNote('root', Buffer.from('ZIP data'));

      expect(result).toEqual(response);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notes/root/import'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('createRevision() creates note revision', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.createRevision('123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/notes/123/revision'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('undeleteNote() restores deleted note', async () => {
      fetchMock.mockResolvedValue(mockJsonResponse({ success: true }));

      const result = await client.undeleteNote('123');

      expect(result).toEqual({ success: true });
    });

    it('getNoteHistory() fetches note history', async () => {
      const history = [{ noteId: '123', dateModified: '2024-01-01' }];
      fetchMock.mockResolvedValue(mockJsonResponse(history));

      const result = await client.getNoteHistory('root');

      expect(result).toEqual(history);
      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('ancestorNoteId=root');
    });
  });

  describe('Revisions methods', () => {
    it('getNoteRevisions() fetches revisions for a note', async () => {
      const revisions = [{ revisionId: 'rev1' }, { revisionId: 'rev2' }];
      fetchMock.mockResolvedValue(mockJsonResponse(revisions));

      const result = await client.getNoteRevisions('123');

      expect(result).toEqual(revisions);
    });

    it('getRevision() fetches specific revision', async () => {
      const revision = { revisionId: 'rev1', dateModified: '2024-01-01' };
      fetchMock.mockResolvedValue(mockJsonResponse(revision));

      const result = await client.getRevision('rev1');

      expect(result).toEqual(revision);
    });

    it('getRevisionContent() fetches revision content', async () => {
      const content = Buffer.from('Old content');
      fetchMock.mockResolvedValue(mockBinaryResponse(content));

      const result = await client.getRevisionContent('rev1');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('Old content');
    });
  });

  describe('Branches methods', () => {
    it('getBranch() fetches branch by ID', async () => {
      const branch = { branchId: '123', noteId: '456', parentNoteId: 'root' };
      fetchMock.mockResolvedValue(mockJsonResponse(branch));

      const result = await client.getBranch('123');

      expect(result).toEqual(branch);
    });

    it('createBranch() creates new branch', async () => {
      const branch = { branchId: '789' };
      fetchMock.mockResolvedValue(mockJsonResponse(branch));

      const result = await client.createBranch({
        noteId: '123',
        parentNoteId: 'root',
      });

      expect(result).toEqual(branch);
    });

    it('patchBranch() updates branch properties', async () => {
      const branch = { branchId: '123', prefix: 'Updated' };
      fetchMock.mockResolvedValue(mockJsonResponse(branch));

      const result = await client.patchBranch('123', { prefix: 'Updated' });

      expect(result).toEqual(branch);
    });

    it('deleteBranch() deletes a branch', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.deleteBranch('123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/branches/123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('refreshNoteOrdering() refreshes ordering', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.refreshNoteOrdering('root');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/refresh-note-ordering/root'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Attributes methods', () => {
    it('getAttribute() fetches attribute by ID', async () => {
      const attr = { attributeId: '123', name: 'label', value: 'value' };
      fetchMock.mockResolvedValue(mockJsonResponse(attr));

      const result = await client.getAttribute('123');

      expect(result).toEqual(attr);
    });

    it('createAttribute() creates new attribute', async () => {
      const attr = { attributeId: '123' };
      fetchMock.mockResolvedValue(mockJsonResponse(attr));

      const result = await client.createAttribute({
        noteId: '456',
        type: 'label',
        name: 'test',
      });

      expect(result).toEqual(attr);
    });

    it('patchAttribute() updates attribute', async () => {
      const attr = { attributeId: '123', value: 'updated' };
      fetchMock.mockResolvedValue(mockJsonResponse(attr));

      const result = await client.patchAttribute('123', { value: 'updated' });

      expect(result).toEqual(attr);
    });

    it('deleteAttribute() deletes an attribute', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.deleteAttribute('123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/attributes/123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Attachments methods', () => {
    it('getNoteAttachments() fetches attachments for a note', async () => {
      const attachments = [{ attachmentId: 'att1' }, { attachmentId: 'att2' }];
      fetchMock.mockResolvedValue(mockJsonResponse(attachments));

      const result = await client.getNoteAttachments('123');

      expect(result).toEqual(attachments);
    });

    it('getAttachment() fetches attachment by ID', async () => {
      const attachment = { attachmentId: '123', title: 'file.png' };
      fetchMock.mockResolvedValue(mockJsonResponse(attachment));

      const result = await client.getAttachment('123');

      expect(result).toEqual(attachment);
    });

    it('createAttachment() creates new attachment', async () => {
      const attachment = { attachmentId: '123' };
      fetchMock.mockResolvedValue(mockJsonResponse(attachment));

      const result = await client.createAttachment({
        ownerId: '456',
        role: 'image',
        mime: 'image/png',
        title: 'photo.png',
        content: 'base64data',
      });

      expect(result).toEqual(attachment);
    });

    it('patchAttachment() updates attachment metadata', async () => {
      const attachment = { attachmentId: '123', title: 'updated.png' };
      fetchMock.mockResolvedValue(mockJsonResponse(attachment));

      const result = await client.patchAttachment('123', { title: 'updated.png' });

      expect(result).toEqual(attachment);
    });

    it('deleteAttachment() deletes an attachment', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.deleteAttachment('123');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/attachments/123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('getAttachmentContent() retrieves attachment content', async () => {
      const content = Buffer.from('binary data');
      fetchMock.mockResolvedValue(mockBinaryResponse(content));

      const result = await client.getAttachmentContent('123');

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('putAttachmentContent() updates attachment content', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.putAttachmentContent('123', Buffer.from('new data'));

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/attachments/123/content'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('Calendar methods', () => {
    it('getInbox() fetches inbox note', async () => {
      const inbox = { noteId: 'inbox-123' };
      fetchMock.mockResolvedValue(mockJsonResponse(inbox));

      const result = await client.getInbox('2024-01-01');

      expect(result).toEqual(inbox);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/inbox/2024-01-01'),
        expect.anything()
      );
    });

    it('getDayNote() fetches day note', async () => {
      const dayNote = { noteId: 'day-123' };
      fetchMock.mockResolvedValue(mockJsonResponse(dayNote));

      const result = await client.getDayNote('2024-01-01');

      expect(result).toEqual(dayNote);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/days/2024-01-01'),
        expect.anything()
      );
    });

    it('getWeekNote() fetches week note', async () => {
      const weekNote = { noteId: 'week-123' };
      fetchMock.mockResolvedValue(mockJsonResponse(weekNote));

      const result = await client.getWeekNote('2024-W01');

      expect(result).toEqual(weekNote);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/weeks/2024-W01'),
        expect.anything()
      );
    });

    it('getMonthNote() fetches month note', async () => {
      const monthNote = { noteId: 'month-123' };
      fetchMock.mockResolvedValue(mockJsonResponse(monthNote));

      const result = await client.getMonthNote('2024-01');

      expect(result).toEqual(monthNote);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/months/2024-01'),
        expect.anything()
      );
    });

    it('getYearNote() fetches year note', async () => {
      const yearNote = { noteId: 'year-123' };
      fetchMock.mockResolvedValue(mockJsonResponse(yearNote));

      const result = await client.getYearNote('2024');

      expect(result).toEqual(yearNote);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/years/2024'),
        expect.anything()
      );
    });

    it('getWeekFirstDayNote() fetches week first day note', async () => {
      const note = { noteId: 'week-first-123' };
      fetchMock.mockResolvedValue(mockJsonResponse(note));

      const result = await client.getWeekFirstDayNote('2024-01-01');

      expect(result).toEqual(note);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/calendar/week-first-day/2024-01-01'),
        expect.anything()
      );
    });
  });

  describe('System methods', () => {
    it('getAppInfo() fetches app information', async () => {
      const appInfo = { appVersion: '1.0.0', dbVersion: '220' };
      fetchMock.mockResolvedValue(mockJsonResponse(appInfo));

      const result = await client.getAppInfo();

      expect(result).toEqual(appInfo);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/app-info'),
        expect.anything()
      );
    });

    it('createBackup() creates database backup', async () => {
      fetchMock.mockResolvedValue(mockNoContentResponse());

      await client.createBackup('test-backup');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/backup/test-backup'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });
});
