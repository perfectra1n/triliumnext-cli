import { describe, it, expect } from "vitest";
import {
    convertToHtml,
    detectContentFormat,
    htmlToMarkdown,
    markdownToHtml,
    noteReferenceHtml,
} from "../../../src/utils/markdown.js";

describe("markdownToHtml", () => {
    it("renders ATX headings", () => {
        expect(markdownToHtml("# Hello")).toContain("<h1>Hello</h1>");
        expect(markdownToHtml("### Three")).toContain("<h3>Three</h3>");
    });

    it("renders unordered and ordered lists", () => {
        const ul = markdownToHtml("- a\n- b\n");
        expect(ul).toContain("<ul>");
        expect(ul).toContain("<li>a</li>");
        const ol = markdownToHtml("1. one\n2. two\n");
        expect(ol).toContain("<ol>");
        expect(ol).toContain("<li>one</li>");
    });

    it("renders nested lists", () => {
        const html = markdownToHtml("- top\n  - nested\n");
        expect(html).toContain("<ul>");
        expect(html).toMatch(/<li>top[\s\S]*<ul>[\s\S]*<li>nested<\/li>[\s\S]*<\/ul>[\s\S]*<\/li>/);
    });

    it("renders GFM tables", () => {
        const html = markdownToHtml("| a | b |\n|---|---|\n| 1 | 2 |\n");
        expect(html).toContain("<table>");
        expect(html).toContain("<th>a</th>");
        expect(html).toContain("<td>1</td>");
    });

    it("renders blockquotes", () => {
        const html = markdownToHtml("> quoted line\n");
        expect(html).toContain("<blockquote>");
        expect(html).toContain("quoted line");
    });

    it("emits fenced code with language-X class on <code> (Trilium convention)", () => {
        const html = markdownToHtml("```js\nconst x = 1;\n```");
        expect(html).toContain('<pre><code class="language-js">');
        expect(html).toContain("const x = 1;");
    });

    it("renders inline code, bold, italic", () => {
        const html = markdownToHtml("This has `code`, **bold**, and *italic*.");
        expect(html).toContain("<code>code</code>");
        expect(html).toContain("<strong>bold</strong>");
        expect(html).toContain("<em>italic</em>");
    });

    it("renders links and images", () => {
        const link = markdownToHtml("[label](https://example.com)");
        expect(link).toContain('<a href="https://example.com">label</a>');
        const img = markdownToHtml("![alt text](https://example.com/x.png)");
        expect(img).toContain('<img src="https://example.com/x.png"');
        expect(img).toContain('alt="alt text"');
    });

    it("preserves attachment placeholder URLs (image:N / file:N)", () => {
        const html = markdownToHtml("![pic](image:0) and [doc](file:1)");
        expect(html).toContain('src="image:0"');
        expect(html).toContain('href="file:1"');
    });
});

describe("htmlToMarkdown", () => {
    it("uses ATX headings and fenced code", () => {
        const md = htmlToMarkdown("<h1>Title</h1>");
        expect(md.trimEnd()).toBe("# Title");
    });

    it("preserves bold/italic", () => {
        const md = htmlToMarkdown("<p>this is <strong>bold</strong> and <em>italic</em></p>");
        expect(md).toContain("**bold**");
        expect(md).toMatch(/_italic_|\*italic\*/);
    });

    it("converts code blocks back to fenced format", () => {
        const md = htmlToMarkdown('<pre><code class="language-js">const x = 1;\n</code></pre>');
        expect(md).toContain("```");
        expect(md).toContain("const x = 1;");
    });

    it("roundtrips a small markdown document", () => {
        const original = "# Heading\n\nA **bold** paragraph.\n\n- one\n- two\n";
        const html = markdownToHtml(original);
        const back = htmlToMarkdown(html);
        expect(back).toContain("# Heading");
        expect(back).toContain("**bold**");
        expect(back).toMatch(/[-*]\s+one/);
        expect(back).toMatch(/[-*]\s+two/);
    });
});

describe("detectContentFormat", () => {
    it("returns 'plain' for prose containing < or > characters", () => {
        expect(detectContentFormat("if 2 < 3 then ok")).toBe("plain");
        expect(detectContentFormat("a > b means a is greater")).toBe("plain");
    });

    it("returns 'html' for content beginning with a tag and a closing tag", () => {
        expect(detectContentFormat("<p>hello</p>")).toBe("html");
        expect(detectContentFormat("  <h1>Title</h1>")).toBe("html");
    });

    it("returns 'markdown' for fenced code, headings, lists, tables, blockquote", () => {
        expect(detectContentFormat("```\nx\n```")).toBe("markdown");
        expect(detectContentFormat("# Title\n\nbody")).toBe("markdown");
        expect(detectContentFormat("- item\n- item")).toBe("markdown");
        expect(detectContentFormat("1. one\n2. two")).toBe("markdown");
        expect(detectContentFormat("| a | b |\n|---|---|")).toBe("markdown");
        expect(detectContentFormat("> quoted")).toBe("markdown");
        expect(detectContentFormat("[label](https://example.com)")).toBe("markdown");
    });

    it("returns 'plain' for unadorned text", () => {
        expect(detectContentFormat("just a sentence with no markup")).toBe("plain");
    });
});

describe("convertToHtml", () => {
    it("dispatches on explicit format", () => {
        expect(convertToHtml("# Hi", "markdown")).toContain("<h1>Hi</h1>");
        expect(convertToHtml("<p>x</p>", "html")).toBe("<p>x</p>");
    });

    it("escapes plain text content and wraps in paragraphs", () => {
        const html = convertToHtml("plain with <script>alert(1)</script>", "plain");
        expect(html).toContain("&lt;script&gt;");
        expect(html).not.toContain("<script>");
        expect(html).toMatch(/^<p>/);
    });

    it("auto-detects when format is omitted", () => {
        expect(convertToHtml("# hi")).toContain("<h1>hi</h1>");
        expect(convertToHtml("<p>x</p>")).toBe("<p>x</p>");
    });
});

describe("noteReferenceHtml", () => {
    it("emits Trilium reference-link anchor structure", () => {
        const html = noteReferenceHtml("root/parentId/childId", "Click me");
        expect(html).toBe(
            '<a class="reference-link" href="#root/parentId/childId" data-note-path="root/parentId/childId">Click me</a>',
        );
    });

    it("escapes the label", () => {
        const html = noteReferenceHtml("root/x", '<bad> & "quoted"');
        expect(html).toContain("&lt;bad&gt;");
        expect(html).toContain("&amp;");
        expect(html).toContain("&quot;");
    });

    it("strips a leading # from the path", () => {
        const html = noteReferenceHtml("#root/x", "label");
        expect(html).toContain('href="#root/x"');
        expect(html).toContain('data-note-path="root/x"');
    });
});
