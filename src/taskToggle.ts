const TASK_LINE = /^(\s*(?:[-*+]|\d+\.)\s+)\[([ xX])\]/;

export const toggleTaskAtLine = (source: string, line: number): string => {
  const lines = source.split('\n');
  const text = lines[line];
  if (text === undefined) return source;
  const match = TASK_LINE.exec(text);
  if (!match) return source;
  const prefixLen = match[0].length - 3;
  const checked = text[prefixLen + 1] !== ' ';
  const marker = checked ? '[ ]' : '[x]';
  lines[line] = text.slice(0, prefixLen) + marker + text.slice(prefixLen + 3);
  return lines.join('\n');
};
