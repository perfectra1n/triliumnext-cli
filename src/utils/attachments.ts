import { basename, extname } from "node:path";
import { readFileSync } from "node:fs";
import type { EtapiClient } from "../client/index.js";

export interface AttachmentEntry {
    data: string;
    mime: string;
    filename: string;
}

const MIME_BY_EXT: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf",
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".json": "application/json",
    ".xml": "application/xml",
    ".zip": "application/zip",
    ".html": "text/html",
    ".md": "text/markdown",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
};

export function inferMime(filepath: string): string {
    const ext = extname(filepath).toLowerCase();
    return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/**
 * Parse a `data:mime;base64,...` URL. Returns `null` if the input is not a data URL.
 */
export function parseDataUrl(data: string): { mime: string; base64: string } | null {
    const match = data.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return null;
    return { mime: match[1], base64: match[2] };
}

/**
 * Resolve either a data URL or a raw base64 string into `{ data, mime }`. Data URLs
 * override the provided MIME type.
 */
export function resolveAttachmentData(entry: { data: string; mime: string }): { data: string; mime: string } {
    const parsed = parseDataUrl(entry.data);
    if (parsed) return { data: parsed.base64, mime: parsed.mime };
    return { data: entry.data, mime: entry.mime };
}

/**
 * Load a file from disk into an `AttachmentEntry` with base64 content and inferred MIME.
 */
export function loadAttachmentFromPath(filepath: string): AttachmentEntry {
    const buf = readFileSync(filepath);
    return {
        data: buf.toString("base64"),
        mime: inferMime(filepath),
        filename: basename(filepath),
    };
}

/**
 * Upload image attachments and rewrite `src="image:N"` placeholders in HTML to the
 * real attachment URL. Images without a matching placeholder are appended at the end.
 */
export async function processImages(
    client: EtapiClient,
    ownerId: string,
    htmlContent: string,
    images: AttachmentEntry[],
): Promise<string> {
    if (images.length === 0) return htmlContent;

    const attachments = await Promise.all(
        images.map((img) => {
            const resolved = resolveAttachmentData(img);
            return client.createAttachment({
                ownerId,
                role: "image",
                mime: resolved.mime,
                title: img.filename,
                content: resolved.data,
            });
        }),
    );

    let result = htmlContent;
    const referenced = new Set<number>();

    for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        const realSrc = `api/attachments/${att.attachmentId}/image/${att.title}`;
        const placeholder = new RegExp(`src="image:${i}"`, "g");
        if (placeholder.test(result)) {
            referenced.add(i);
            result = result.replace(placeholder, `src="${realSrc}"`);
        }
    }

    for (let i = 0; i < attachments.length; i++) {
        if (!referenced.has(i)) {
            const att = attachments[i];
            const realSrc = `api/attachments/${att.attachmentId}/image/${att.title}`;
            result += `\n<p><img src="${realSrc}"></p>`;
        }
    }

    return result;
}

/**
 * Upload file attachments and rewrite `href="file:N"` placeholders in HTML to the
 * real download URL. Files without a matching placeholder are appended as download
 * links at the end.
 */
export async function processFiles(
    client: EtapiClient,
    ownerId: string,
    htmlContent: string,
    files: AttachmentEntry[],
): Promise<string> {
    if (files.length === 0) return htmlContent;

    const attachments = await Promise.all(
        files.map((file) => {
            const resolved = resolveAttachmentData(file);
            return client.createAttachment({
                ownerId,
                role: "file",
                mime: resolved.mime,
                title: file.filename,
                content: resolved.data,
            });
        }),
    );

    let result = htmlContent;
    const referenced = new Set<number>();

    for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        const realHref = `api/attachments/${att.attachmentId}/download`;
        const placeholder = new RegExp(`href="file:${i}"`, "g");
        if (placeholder.test(result)) {
            referenced.add(i);
            result = result.replace(placeholder, `href="${realHref}"`);
        }
    }

    for (let i = 0; i < attachments.length; i++) {
        if (!referenced.has(i)) {
            const att = attachments[i];
            const realHref = `api/attachments/${att.attachmentId}/download`;
            result += `\n<p><a href="${realHref}">${att.title}</a></p>`;
        }
    }

    return result;
}
