/**
 * LinkedIn compose "rich text" is unicode mathematical alphanumeric styles —
 * not HTML. Same approach OutreachGenie uses.
 */

const BOLD_OFFSETS: Record<string, number> = {
  A: 0x1d400,
  a: 0x1d41a,
  '0': 0x1d7ce,
};

const ITALIC_OFFSETS: Record<string, number> = {
  A: 0x1d434,
  a: 0x1d44e,
};

function mapChar(ch: string, kind: 'bold' | 'italic'): string {
  const code = ch.codePointAt(0);
  if (code == null) return ch;
  if (kind === 'bold') {
    if (code >= 0x41 && code <= 0x5a) return String.fromCodePoint(BOLD_OFFSETS.A + (code - 0x41));
    if (code >= 0x61 && code <= 0x7a) return String.fromCodePoint(BOLD_OFFSETS.a + (code - 0x61));
    if (code >= 0x30 && code <= 0x39) return String.fromCodePoint(BOLD_OFFSETS['0'] + (code - 0x30));
  } else {
    if (code >= 0x41 && code <= 0x5a) return String.fromCodePoint(ITALIC_OFFSETS.A + (code - 0x41));
    if (code >= 0x61 && code <= 0x7a) return String.fromCodePoint(ITALIC_OFFSETS.a + (code - 0x61));
  }
  return ch;
}

function unmapChar(ch: string): string {
  const code = ch.codePointAt(0);
  if (code == null) return ch;
  // Bold A-Z / a-z / 0-9
  if (code >= 0x1d400 && code <= 0x1d419) return String.fromCodePoint(0x41 + (code - 0x1d400));
  if (code >= 0x1d41a && code <= 0x1d433) return String.fromCodePoint(0x61 + (code - 0x1d41a));
  if (code >= 0x1d7ce && code <= 0x1d7d7) return String.fromCodePoint(0x30 + (code - 0x1d7ce));
  // Italic A-Z / a-z (skip h which is special in some fonts — still map range)
  if (code >= 0x1d434 && code <= 0x1d44d) return String.fromCodePoint(0x41 + (code - 0x1d434));
  if (code >= 0x1d44e && code <= 0x1d467) return String.fromCodePoint(0x61 + (code - 0x1d44e));
  return ch;
}

export function applyLinkedInStyle(
  text: string,
  kind: 'bold' | 'italic',
): string {
  // Toggle: if already styled, strip back to ASCII.
  const stripped = [...text].map(unmapChar).join('');
  const already =
    kind === 'bold'
      ? [...text].some((c) => {
          const cp = c.codePointAt(0) ?? 0;
          return (cp >= 0x1d400 && cp <= 0x1d433) || (cp >= 0x1d7ce && cp <= 0x1d7d7);
        })
      : [...text].some((c) => {
          const cp = c.codePointAt(0) ?? 0;
          return cp >= 0x1d434 && cp <= 0x1d467;
        });
  if (already) return stripped;
  return [...stripped].map((c) => mapChar(c, kind)).join('');
}

export function wrapSelection(
  value: string,
  start: number,
  end: number,
  kind: 'bold' | 'italic' | 'bullet' | 'number',
): { value: string; selectionStart: number; selectionEnd: number } {
  if (start === end && (kind === 'bold' || kind === 'italic')) {
    return { value, selectionStart: start, selectionEnd: end };
  }

  if (kind === 'bold' || kind === 'italic') {
    const selected = value.slice(start, end);
    const next = applyLinkedInStyle(selected, kind);
    const out = value.slice(0, start) + next + value.slice(end);
    return { value: out, selectionStart: start, selectionEnd: start + next.length };
  }

  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEndIdx = value.indexOf('\n', end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const mapped = lines.map((line, i) => {
    const trimmed = line.replace(/^(\d+\.\s+|•\s+)/, '');
    if (kind === 'bullet') return `• ${trimmed}`;
    return `${i + 1}. ${trimmed}`;
  });
  const nextBlock = mapped.join('\n');
  const out = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  return {
    value: out,
    selectionStart: lineStart,
    selectionEnd: lineStart + nextBlock.length,
  };
}

/** Highlight #hashtags for LinkedIn-like preview. */
export function renderLinkedInPreviewHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(
    /(^|\s)(#[\p{L}\p{N}_]+)/gu,
    '$1<span class="text-[#0a66c2]">$2</span>',
  ).replace(/\n/g, '<br/>');
}
