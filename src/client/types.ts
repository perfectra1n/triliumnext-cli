import type { NoteType, AttributeType } from "@triliumnext/commons/lib/rows.js";
import type { AppInfo } from "@triliumnext/commons/lib/server_api.js";

export type { AppInfo, NoteType, AttributeType };

/**
 * Note types accepted by the ETAPI create-note endpoint.
 * This is a subset of the full NoteType — internal types like
 * noteMap, launcher, contentWidget etc. cannot be created via ETAPI.
 */
export type CreatableNoteType = Extract<NoteType,
    "text" | "code" | "file" | "image" | "search" | "book" | "relationMap" | "render"
>;

export const CREATABLE_NOTE_TYPES: readonly CreatableNoteType[] = [
    "text", "code", "file", "image", "search", "book", "relationMap", "render",
] as const;

export interface EtapiAttribute {
    attributeId: string;
    noteId: string;
    type: AttributeType;
    name: string;
    value: string;
    position: number;
    isInheritable: boolean;
    utcDateModified: string;
}

export interface EtapiNote {
    noteId: string;
    isProtected: boolean;
    title: string;
    type: NoteType;
    mime: string;
    blobId: string;
    dateCreated: string;
    dateModified: string;
    utcDateCreated: string;
    utcDateModified: string;
    parentNoteIds: string[];
    childNoteIds: string[];
    parentBranchIds: string[];
    childBranchIds: string[];
    attributes: EtapiAttribute[];
}

export interface EtapiBranch {
    branchId: string;
    noteId: string;
    parentNoteId: string;
    prefix: string | null;
    notePosition: number;
    isExpanded: boolean;
    utcDateModified: string;
}

export interface EtapiAttachment {
    attachmentId: string;
    ownerId: string;
    role: string;
    mime: string;
    title: string;
    position: number;
    blobId: string;
    dateModified: string;
    utcDateModified: string;
    utcDateScheduledForErasureSince: string | null;
    contentLength: number;
}

export interface EtapiRevision {
    revisionId: string;
    noteId: string;
    type: NoteType;
    mime: string;
    isProtected: boolean;
    title: string;
    blobId: string;
    dateLastEdited: string;
    dateCreated: string;
    utcDateLastEdited: string;
    utcDateCreated: string;
    utcDateModified: string;
    contentLength: number;
}

export interface EtapiNoteWithBranch {
    note: EtapiNote;
    branch: EtapiBranch;
}

export interface EtapiSearchResponse {
    results: EtapiNote[];
    debugInfo?: unknown;
}

export interface EtapiError {
    status: number;
    code: string;
    message: string;
}

export interface EtapiLoginResponse {
    authToken: string;
}

export interface EtapiRecentChange {
    noteId: string;
    current_isDeleted: boolean;
    current_deleteId: string;
    current_title: string;
    current_isProtected: boolean;
    title: string;
    utcDate: string;
    date: string;
    canBeUndeleted?: boolean;
}
