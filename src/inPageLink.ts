/**
 * The id an in-document link (`#slug`, `#fn1`) points at, or null for
 * anything else. Such links must scroll rather than navigate: navigating
 * replaces the `#d=…` fragment that *is* the shared document.
 */
export const inPageTargetId = (href: string | null): string | null => {
  if (!href?.startsWith('#') || href.length < 2) return null;
  const raw = href.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};
