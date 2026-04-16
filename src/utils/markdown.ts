import { marked } from "marked";
import TurndownService from "turndown";

export type ContentFormat = "markdown" | "html" | "plain";

const HTML_ESCAPE_MAP: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
};

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

export function markdownToHtml(md: string): string {
    return marked.parse(md, { async: false }) as string;
}

let turndownInstance: TurndownService | null = null;

function turndown(): TurndownService {
    if (!turndownInstance) {
        turndownInstance = new TurndownService({
            headingStyle: "atx",
            codeBlockStyle: "fenced",
        });
    }
    return turndownInstance;
}

export function htmlToMarkdown(html: string): string {
    return turndown().turndown(html);
}

function plainToHtml(content: string): string {
    return content
        .split(/\n\n+/)
        .filter((p) => p.trim())
        .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
        .join("\n");
}

/**
 * Detect whether content is HTML, markdown, or plain text.
 *
 * Conservative on HTML: only flags content that *starts* with a tag and has
 * a matching closing tag, so paragraphs containing `2 < 3` aren't misclassified.
 */
export function detectContentFormat(content: string): ContentFormat {
    const trimmed = content.trimStart();
    if (trimmed.startsWith("<") && /<\/[a-zA-Z][\w-]*\s*>/.test(trimmed)) {
        return "html";
    }
    const markdownSignals = [
        /^```/m,
        /^#{1,6}\s+\S/m,
        /^[-*+]\s+\S/m,
        /^\d+\.\s+\S/m,
        /\[[^\]]+\]\([^)]+\)/,
        /!\[[^\]]*\]\([^)]+\)/,
        /^\|.+\|\s*$/m,
        /^>\s+\S/m,
    ];
    if (markdownSignals.some((re) => re.test(content))) {
        return "markdown";
    }
    return "plain";
}

export function convertToHtml(content: string, format?: ContentFormat): string {
    const fmt = format ?? detectContentFormat(content);
    switch (fmt) {
        case "markdown":
            return markdownToHtml(content);
        case "html":
            return content;
        case "plain":
            return plainToHtml(content);
    }
}

/**
 * Build a Trilium internal note-link anchor.
 *
 * Trilium expects `<a class="reference-link" href="#root/.../noteId" data-note-path="root/.../noteId">label</a>`.
 * Caller is responsible for supplying a valid note path (e.g. `root/parentId/childId`).
 */
export function noteReferenceHtml(notePath: string, label: string): string {
    const path = notePath.replace(/^#/, "");
    return `<a class="reference-link" href="#${path}" data-note-path="${path}">${escapeHtml(label)}</a>`;
}
