export interface EditResult {
  value: string;
  start: number;
  end: number;
}

const LIST_PATTERN = /^(\s*)(?:([-*+])|(\d+)\.)\s+(\[[ xX]\]\s+)?/;
const URL_PATTERN = /^https?:\/\/\S+$/;

export const toggleWrap = (
  value: string,
  start: number,
  end: number,
  marker: string,
): EditResult => {
  const before = value.slice(0, start);
  const middle = value.slice(start, end);
  const after = value.slice(end);
  const m = marker.length;

  if (middle.length >= m * 2 && middle.startsWith(marker) && middle.endsWith(marker)) {
    const stripped = middle.slice(m, middle.length - m);
    return { value: before + stripped + after, start, end: start + stripped.length };
  }

  if (before.endsWith(marker) && after.startsWith(marker)) {
    return {
      value: before.slice(0, -m) + middle + after.slice(m),
      start: start - m,
      end: end - m,
    };
  }

  return {
    value: before + marker + middle + marker + after,
    start: start + m,
    end: end + m,
  };
};

export const wrapLink = (value: string, start: number, end: number, url: string): EditResult => {
  const before = value.slice(0, start);
  const middle = value.slice(start, end);
  const after = value.slice(end);
  const text = middle.length > 0 ? middle : 'text';
  const urlPart = url.length > 0 ? url : 'url';
  const inserted = `[${text}](${urlPart})`;

  if (middle.length === 0) {
    const textStart = before.length + 1;
    return { value: before + inserted + after, start: textStart, end: textStart + text.length };
  }

  if (url.length === 0) {
    const urlStart = before.length + text.length + 3;
    return { value: before + inserted + after, start: urlStart, end: urlStart + urlPart.length };
  }

  const endPos = before.length + inserted.length;
  return { value: before + inserted + after, start: endPos, end: endPos };
};

export interface ContinueResult {
  value: string;
  cursor: number;
}

export const continueList = (value: string, cursor: number): ContinueResult | null => {
  if (cursor < value.length && value[cursor] !== '\n') return null;
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1;
  const line = value.slice(lineStart, cursor);
  const match = LIST_PATTERN.exec(line);
  if (!match) return null;
  const [prefix, indent, bullet, num, task] = match;

  if (line === prefix) {
    return { value: value.slice(0, lineStart) + value.slice(cursor), cursor: lineStart };
  }

  const bulletPart = bullet ? `${bullet} ` : `${Number(num) + 1}. `;
  const taskPart = task ? '[ ] ' : '';
  const insert = `\n${indent}${bulletPart}${taskPart}`;
  return {
    value: value.slice(0, cursor) + insert + value.slice(cursor),
    cursor: cursor + insert.length,
  };
};

export const continueIndent = (value: string, cursor: number): ContinueResult | null => {
  if (cursor < value.length && value[cursor] !== '\n') return null;
  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1;
  const line = value.slice(lineStart, cursor);
  const match = /^[ \t]+/.exec(line);
  if (!match) return null;
  const indent = match[0];
  if (line.length === indent.length) return null;
  const insert = `\n${indent}`;
  return {
    value: value.slice(0, cursor) + insert + value.slice(cursor),
    cursor: cursor + insert.length,
  };
};

export const isUrl = (text: string): boolean => URL_PATTERN.test(text.trim());
