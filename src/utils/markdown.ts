/**
 * Simple markdown to HTML converter for common patterns
 * This provides basic markdown support without heavy dependencies
 */

/**
 * Convert markdown text to HTML
 * Supports common markdown patterns:
 * - Headers (#, ##, ###)
 * - Bold (**text** or __text__)
 * - Italic (*text* or _text_)
 * - Links ([text](url))
 * - Code blocks (```lang\ncode\n```)
 * - Inline code (`code`)
 * - Lists (- item or * item)
 * - Paragraphs (separated by blank lines)
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Code blocks (must be processed first to avoid conflicts)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langClass}>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Split into lines for line-by-line processing
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip lines that are already in code blocks
    if (line.includes('<pre><code')) {
      processedLines.push(line);
      continue;
    }

    // Headers
    if (line.match(/^(#{1,6})\s+(.+)$/)) {
      line = line.replace(/^(#{1,6})\s+(.+)$/, (_, hashes, content) => {
        const level = hashes.length;
        return `<h${level}>${processInlineMarkdown(content)}</h${level}>`;
      });
    }
    // Unordered lists
    else if (line.match(/^[\s]*[-*]\s+(.+)$/)) {
      const content = line.replace(/^[\s]*[-*]\s+(.+)$/, '$1');
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      line = `<li>${processInlineMarkdown(content)}</li>`;
    }
    // End list if we were in one and hit a non-list line
    else if (inList && !line.match(/^[\s]*[-*]\s+/)) {
      processedLines.push('</ul>');
      inList = false;
    }

    // Paragraphs (non-empty lines that aren't already wrapped)
    if (
      line.trim() &&
      !line.match(/^<[^>]+>/) &&
      !line.includes('<pre><code') &&
      !line.match(/^[\s]*[-*]\s+/)
    ) {
      line = `<p>${processInlineMarkdown(line)}</p>`;
    }

    processedLines.push(line);
  }

  // Close any open list
  if (inList) {
    processedLines.push('</ul>');
  }

  html = processedLines.join('\n');

  return html;
}

/**
 * Process inline markdown patterns (bold, italic, links, inline code)
 */
function processInlineMarkdown(text: string): string {
  // Inline code (must be processed first)
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold (** or __)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic (* or _) - must come after bold
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

  return text;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Detect if content is likely markdown or HTML
 * @param content The content to check
 * @returns 'markdown' | 'html' | 'plain'
 */
export function detectContentFormat(content: string): 'markdown' | 'html' | 'plain' {
  // Check for HTML tags
  if (content.match(/<[^>]+>/)) {
    return 'html';
  }

  // Check for markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s+/m, // Headers
    /\*\*[^*]+\*\*/,  // Bold
    /__[^_]+__/,  // Bold
    /\[.+\]\(.+\)/, // Links
    /^[-*]\s+/m, // Lists
    /```/,  // Code blocks
  ];

  for (const pattern of markdownPatterns) {
    if (content.match(pattern)) {
      return 'markdown';
    }
  }

  return 'plain';
}

/**
 * Convert content to HTML based on detected or specified format
 * @param content The content to convert
 * @param format The format of the content (auto-detected if not specified)
 * @returns HTML content
 */
export function convertToHtml(content: string, format?: 'markdown' | 'html' | 'plain'): string {
  const detectedFormat = format || detectContentFormat(content);

  switch (detectedFormat) {
    case 'markdown':
      return markdownToHtml(content);
    case 'html':
      return content;
    case 'plain':
      // Wrap plain text in paragraphs
      return content
        .split(/\n\n+/)
        .filter((p) => p.trim())
        .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
        .join('\n');
  }
}
