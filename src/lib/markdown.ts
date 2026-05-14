/**
 * Lightweight markdown-to-HTML renderer for packet content.
 * Handles: headers, bold, italic, lists, paragraphs.
 * No external deps — keeps bundle small.
 */

export function renderMarkdown(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  const html: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  function closeList() {
    if (inList) {
      html.push(`</${listType}>`);
      inList = false;
    }
  }

  function inlineFormat(text: string): string {
    // Bold + italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      closeList();
      continue;
    }

    // Headers
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      closeList();
      const level = headerMatch[1].length;
      const text = inlineFormat(headerMatch[2]);
      const classes = level <= 2
        ? 'text-base font-semibold text-foreground mt-4 mb-2'
        : 'text-sm font-semibold text-foreground mt-3 mb-1';
      html.push(`<h${level} class="${classes}">${text}</h${level}>`);
      continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList();
        html.push('<ul class="space-y-1 ml-4">');
        inList = true;
        listType = 'ul';
      }
      html.push(`<li class="text-sm text-foreground list-disc ml-2">${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList();
        html.push('<ol class="space-y-1 ml-4">');
        inList = true;
        listType = 'ol';
      }
      html.push(`<li class="text-sm text-foreground list-decimal ml-2">${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    // Regular paragraph
    closeList();
    html.push(`<p class="text-sm text-foreground leading-relaxed mb-2">${inlineFormat(trimmed)}</p>`);
  }

  closeList();
  return html.join('\n');
}
