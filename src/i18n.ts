export type Dict = Record<string, string>;

const VAR_RE = /\{([^}]+)\}/g;

const substitute = (template: string, vars: Record<string, string> | undefined): string => {
  if (!vars) return template;
  return template.replace(VAR_RE, (match, name: string) =>
    Object.hasOwn(vars, name) ? (vars[name] as string) : match,
  );
};

export const createTranslator = (
  dict: Dict,
  fallback?: Dict,
): ((key: string, vars?: Record<string, string>) => string) => {
  return (key, vars) => {
    if (Object.hasOwn(dict, key)) return substitute(dict[key] as string, vars);
    if (fallback && Object.hasOwn(fallback, key)) return substitute(fallback[key] as string, vars);
    return `{${key}}`;
  };
};

export const EN: Dict = {
  'share.title': 'Share this document',
  'share.copy': 'Copy link',
  'share.qr': 'QR code',
  'help.title': 'Keyboard shortcuts',
  'stats.words': '{count} words',
};
