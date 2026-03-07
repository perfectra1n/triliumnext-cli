import { HttpClient } from "./http.js";
import type {
    EtapiNote,
    EtapiNoteWithBranch,
    EtapiSearchResponse,
    EtapiBranch,
    EtapiAttribute,
    EtapiAttachment,
    EtapiRevision,
    EtapiLoginResponse,
    EtapiRecentChange,
    AppInfo,
} from "./types.js";

export type { AppInfo };

export interface SearchNotesParams {
    search: string;
    fastSearch?: boolean;
    includeArchivedNotes?: boolean;
    ancestorNoteId?: string;
    ancestorDepth?: string;
    orderBy?: string;
    orderDirection?: "asc" | "desc";
    limit?: number;
    debug?: boolean;
}

export interface CreateNoteParams {
    parentNoteId: string;
    title: string;
    type: string;
    content: string;
    mime?: string;
    notePosition?: number;
    prefix?: string;
    isExpanded?: boolean;
    noteId?: string;
    dateCreated?: string;
    utcDateCreated?: string;
}

export interface PatchNoteParams {
    title?: string;
    type?: string;
    mime?: string;
    dateCreated?: string;
    utcDateCreated?: string;
}

export interface CreateBranchParams {
    noteId: string;
    parentNoteId: string;
    prefix?: string;
    notePosition?: number;
    isExpanded?: boolean;
}

export interface PatchBranchParams {
    prefix?: string;
    notePosition?: number;
    isExpanded?: boolean;
}

export interface CreateAttributeParams {
    noteId: string;
    type: "label" | "relation";
    name: string;
    value?: string;
    isInheritable?: boolean;
    position?: number;
}

export interface PatchAttributeParams {
    value?: string;
    position?: number;
}

export interface CreateAttachmentParams {
    ownerId: string;
    role: string;
    mime: string;
    title: string;
    content: string;
    position?: number;
}

export interface PatchAttachmentParams {
    role?: string;
    mime?: string;
    title?: string;
    position?: number;
}

export class EtapiClient {
    private http: HttpClient;

    constructor(baseUrl: string, token: string) {
        this.http = new HttpClient(baseUrl, token);
    }

    // ── Auth ────────────────────────────────────────────────────
    static async login(baseUrl: string, password: string): Promise<EtapiLoginResponse & { resolvedBaseUrl: string }> {
        const { data, resolvedBaseUrl } = await HttpClient.postNoAuth<EtapiLoginResponse>(baseUrl, "/auth/login", { password });
        return { ...data, resolvedBaseUrl };
    }

    async logout(): Promise<void> {
        await this.http.post("/auth/logout");
    }

    // ── Notes ───────────────────────────────────────────────────
    async getNote(noteId: string): Promise<EtapiNote> {
        return this.http.get<EtapiNote>(`/notes/${noteId}`);
    }

    async searchNotes(params: SearchNotesParams): Promise<EtapiSearchResponse> {
        return this.http.get<EtapiSearchResponse>("/notes", { ...params } as Record<string, string | number | boolean | undefined>);
    }

    async createNote(params: CreateNoteParams): Promise<EtapiNoteWithBranch> {
        return this.http.post<EtapiNoteWithBranch>("/create-note", params);
    }

    async patchNote(noteId: string, params: PatchNoteParams): Promise<EtapiNote> {
        return this.http.patch<EtapiNote>(`/notes/${noteId}`, params);
    }

    async deleteNote(noteId: string): Promise<void> {
        await this.http.delete(`/notes/${noteId}`);
    }

    async getNoteContent(noteId: string): Promise<Buffer> {
        return this.http.getRaw(`/notes/${noteId}/content`);
    }

    async putNoteContent(noteId: string, content: string | Buffer): Promise<void> {
        await this.http.putRaw(`/notes/${noteId}/content`, content);
    }

    async exportNote(noteId: string, format?: "html" | "markdown"): Promise<Buffer> {
        return this.http.getRaw(`/notes/${noteId}/export`, format ? { format } : undefined);
    }

    async importNote(noteId: string, zipData: Buffer): Promise<EtapiNoteWithBranch> {
        return this.http.postRaw(`/notes/${noteId}/import`, zipData, "application/octet-stream") as Promise<EtapiNoteWithBranch>;
    }

    async createRevision(noteId: string): Promise<void> {
        await this.http.post(`/notes/${noteId}/revision`);
    }

    async undeleteNote(noteId: string): Promise<{ success: boolean }> {
        return this.http.post<{ success: boolean }>(`/notes/${noteId}/undelete`);
    }

    async getNoteHistory(ancestorNoteId?: string): Promise<EtapiRecentChange[]> {
        return this.http.get<EtapiRecentChange[]>("/notes/history", ancestorNoteId ? { ancestorNoteId } : undefined);
    }

    // ── Revisions ───────────────────────────────────────────────
    async getNoteRevisions(noteId: string): Promise<EtapiRevision[]> {
        return this.http.get<EtapiRevision[]>(`/notes/${noteId}/revisions`);
    }

    async getRevision(revisionId: string): Promise<EtapiRevision> {
        return this.http.get<EtapiRevision>(`/revisions/${revisionId}`);
    }

    async getRevisionContent(revisionId: string): Promise<Buffer> {
        return this.http.getRaw(`/revisions/${revisionId}/content`);
    }

    // ── Branches ────────────────────────────────────────────────
    async getBranch(branchId: string): Promise<EtapiBranch> {
        return this.http.get<EtapiBranch>(`/branches/${branchId}`);
    }

    async createBranch(params: CreateBranchParams): Promise<EtapiBranch> {
        return this.http.post<EtapiBranch>("/branches", params);
    }

    async patchBranch(branchId: string, params: PatchBranchParams): Promise<EtapiBranch> {
        return this.http.patch<EtapiBranch>(`/branches/${branchId}`, params);
    }

    async deleteBranch(branchId: string): Promise<void> {
        await this.http.delete(`/branches/${branchId}`);
    }

    async refreshNoteOrdering(parentNoteId: string): Promise<void> {
        await this.http.post(`/refresh-note-ordering/${parentNoteId}`);
    }

    // ── Attributes ──────────────────────────────────────────────
    async getAttribute(attributeId: string): Promise<EtapiAttribute> {
        return this.http.get<EtapiAttribute>(`/attributes/${attributeId}`);
    }

    async createAttribute(params: CreateAttributeParams): Promise<EtapiAttribute> {
        return this.http.post<EtapiAttribute>("/attributes", params);
    }

    async patchAttribute(attributeId: string, params: PatchAttributeParams): Promise<EtapiAttribute> {
        return this.http.patch<EtapiAttribute>(`/attributes/${attributeId}`, params);
    }

    async deleteAttribute(attributeId: string): Promise<void> {
        await this.http.delete(`/attributes/${attributeId}`);
    }

    // ── Attachments ─────────────────────────────────────────────
    async getNoteAttachments(noteId: string): Promise<EtapiAttachment[]> {
        return this.http.get<EtapiAttachment[]>(`/notes/${noteId}/attachments`);
    }

    async getAttachment(attachmentId: string): Promise<EtapiAttachment> {
        return this.http.get<EtapiAttachment>(`/attachments/${attachmentId}`);
    }

    async createAttachment(params: CreateAttachmentParams): Promise<EtapiAttachment> {
        return this.http.post<EtapiAttachment>("/attachments", params);
    }

    async patchAttachment(attachmentId: string, params: PatchAttachmentParams): Promise<EtapiAttachment> {
        return this.http.patch<EtapiAttachment>(`/attachments/${attachmentId}`, params);
    }

    async deleteAttachment(attachmentId: string): Promise<void> {
        await this.http.delete(`/attachments/${attachmentId}`);
    }

    async getAttachmentContent(attachmentId: string): Promise<Buffer> {
        return this.http.getRaw(`/attachments/${attachmentId}/content`);
    }

    async putAttachmentContent(attachmentId: string, content: string | Buffer): Promise<void> {
        await this.http.putRaw(`/attachments/${attachmentId}/content`, content);
    }

    // ── Calendar ────────────────────────────────────────────────
    async getInbox(date: string): Promise<EtapiNote> {
        return this.http.get<EtapiNote>(`/inbox/${date}`);
    }

    async getDayNote(date: string): Promise<EtapiNote> {
        return this.http.get<EtapiNote>(`/calendar/days/${date}`);
    }

    async getWeekNote(week: string): Promise<EtapiNote> {
        return this.http.get<EtapiNote>(`/calendar/weeks/${week}`);
    }

    async getMonthNote(month: string): Promise<EtapiNote> {
        return this.http.get<EtapiNote>(`/calendar/months/${month}`);
    }

    async getYearNote(year: string): Promise<EtapiNote> {
        return this.http.get<EtapiNote>(`/calendar/years/${year}`);
    }

    async getWeekFirstDayNote(date: string): Promise<EtapiNote> {
        return this.http.get<EtapiNote>(`/calendar/week-first-day/${date}`);
    }

    // ── System ──────────────────────────────────────────────────
    async getAppInfo(): Promise<AppInfo> {
        return this.http.get<AppInfo>("/app-info");
    }

    async createBackup(backupName: string): Promise<void> {
        await this.http.put(`/backup/${backupName}`);
    }
}
