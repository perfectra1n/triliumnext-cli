import { describe, it, expect, vi } from "vitest";
import {
    inferMime,
    parseDataUrl,
    processFiles,
    processImages,
    resolveAttachmentData,
} from "../../../src/utils/attachments.js";
import type { EtapiClient } from "../../../src/client/index.js";

function makeClient(prefix: string): EtapiClient {
    let n = 0;
    return {
        createAttachment: vi.fn(async (params: { title: string }) => ({
            attachmentId: `${prefix}${n++}`,
            ownerId: "owner",
            role: "image",
            mime: "image/png",
            title: params.title,
            position: 0,
            isProtected: false,
            blobId: "b",
            dateModified: "",
            utcDateModified: "",
            utcDateScheduledForErasureSince: null,
            contentLength: 0,
        })),
    } as unknown as EtapiClient;
}

describe("inferMime", () => {
    it("maps common extensions", () => {
        expect(inferMime("foo.png")).toBe("image/png");
        expect(inferMime("foo.JPG")).toBe("image/jpeg");
        expect(inferMime("dir/sub/foo.pdf")).toBe("application/pdf");
        expect(inferMime("foo.csv")).toBe("text/csv");
    });

    it("falls back to application/octet-stream for unknown extensions", () => {
        expect(inferMime("foo.unknown")).toBe("application/octet-stream");
        expect(inferMime("noext")).toBe("application/octet-stream");
    });
});

describe("parseDataUrl", () => {
    it("parses a well-formed data URL", () => {
        const out = parseDataUrl("data:image/png;base64,AAAA");
        expect(out).toEqual({ mime: "image/png", base64: "AAAA" });
    });

    it("handles multi-line base64 payloads", () => {
        const out = parseDataUrl("data:application/pdf;base64,line1\nline2");
        expect(out?.mime).toBe("application/pdf");
        expect(out?.base64).toBe("line1\nline2");
    });

    it("returns null for raw base64 (no data URL prefix)", () => {
        expect(parseDataUrl("AAAA")).toBeNull();
    });

    it("returns null for malformed input", () => {
        expect(parseDataUrl("data:image/png,AAAA")).toBeNull(); // missing ;base64
        expect(parseDataUrl("not-a-url")).toBeNull();
    });
});

describe("resolveAttachmentData", () => {
    it("uses the data URL's MIME when present (overrides explicit mime)", () => {
        const out = resolveAttachmentData({ data: "data:image/jpeg;base64,XYZ", mime: "image/png" });
        expect(out).toEqual({ data: "XYZ", mime: "image/jpeg" });
    });

    it("passes raw base64 through with the explicit MIME", () => {
        const out = resolveAttachmentData({ data: "AAAA", mime: "image/png" });
        expect(out).toEqual({ data: "AAAA", mime: "image/png" });
    });
});

describe("processImages", () => {
    it("returns the input unchanged when no images are provided", async () => {
        const client = makeClient("att-");
        const html = "<p>text</p>";
        expect(await processImages(client, "owner", html, [])).toBe(html);
        expect(client.createAttachment).not.toHaveBeenCalled();
    });

    it("rewrites src=\"image:N\" placeholders to attachment URLs", async () => {
        const client = makeClient("img-");
        const html = '<p><img src="image:0"> and <img src="image:1"></p>';
        const out = await processImages(client, "owner", html, [
            { data: "AAA", mime: "image/png", filename: "a.png" },
            { data: "BBB", mime: "image/png", filename: "b.png" },
        ]);
        expect(out).toContain('src="api/attachments/img-0/image/a.png"');
        expect(out).toContain('src="api/attachments/img-1/image/b.png"');
        expect(out).not.toContain("image:0");
        expect(client.createAttachment).toHaveBeenCalledTimes(2);
    });

    it("appends unreferenced images at the end of the content", async () => {
        const client = makeClient("img-");
        const html = "<p>no placeholders here</p>";
        const out = await processImages(client, "owner", html, [
            { data: "AAA", mime: "image/png", filename: "solo.png" },
        ]);
        expect(out.startsWith(html)).toBe(true);
        expect(out).toContain('<img src="api/attachments/img-0/image/solo.png">');
    });

    it("handles a mix of referenced and unreferenced images", async () => {
        const client = makeClient("img-");
        const html = '<p>see <img src="image:0"> here</p>';
        const out = await processImages(client, "owner", html, [
            { data: "A", mime: "image/png", filename: "ref.png" },
            { data: "B", mime: "image/png", filename: "extra.png" },
        ]);
        expect(out).toContain('src="api/attachments/img-0/image/ref.png"');
        expect(out).toContain('<p><img src="api/attachments/img-1/image/extra.png">');
    });

    it("respects data URLs and overrides MIME", async () => {
        const createAttachment = vi.fn(async (p: { title: string; mime: string }) => ({
            attachmentId: "id",
            title: p.title,
            mime: p.mime,
        }));
        const client = { createAttachment } as unknown as EtapiClient;
        await processImages(client, "owner", '<img src="image:0">', [
            { data: "data:image/jpeg;base64,XYZ", mime: "image/png", filename: "x.jpg" },
        ]);
        expect(createAttachment).toHaveBeenCalledWith(
            expect.objectContaining({ mime: "image/jpeg", content: "XYZ" }),
        );
    });
});

describe("processFiles", () => {
    it("rewrites href=\"file:N\" placeholders to download URLs", async () => {
        const client = makeClient("file-");
        const html = '<p>see <a href="file:0">my report</a></p>';
        const out = await processFiles(client, "owner", html, [
            { data: "AAA", mime: "application/pdf", filename: "report.pdf" },
        ]);
        expect(out).toContain('href="api/attachments/file-0/download"');
        expect(out).not.toContain("file:0");
    });

    it("appends unreferenced files as download links", async () => {
        const client = makeClient("file-");
        const out = await processFiles(client, "owner", "<p>body</p>", [
            { data: "AAA", mime: "application/pdf", filename: "extra.pdf" },
        ]);
        expect(out).toContain('<a href="api/attachments/file-0/download">extra.pdf</a>');
    });
});
