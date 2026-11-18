const GUEST_CODE_REGEX = /^[A-Z0-9_-]{4,32}$/;

/**
 * Extracts and validates a Melobook guest access code from raw text or a shared URL scanned from a QR code.
 */
export function extractGuestCodeFromQr(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  // 1. Check if the payload looks like a URL or query/hash string
  const looksLikeUrlOrParams =
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('/?') ||
    trimmed.startsWith('?') ||
    trimmed.includes('guestCode=') ||
    trimmed.includes('guest=');

  if (looksLikeUrlOrParams) {
    try {
      const normalizedUrl = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : trimmed.startsWith('/') || trimmed.startsWith('?')
        ? `https://melobook.local${trimmed}`
        : `https://melobook.local/?${trimmed.replace(/^\?/, '')}`;

      const url = new URL(normalizedUrl);
      const fromSearch =
        url.searchParams.get('guestCode') ||
        url.searchParams.get('guest') ||
        url.searchParams.get('code');

      let fromHash: string | null = null;
      if (!fromSearch && url.hash) {
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        fromHash =
          hashParams.get('guestCode') ||
          hashParams.get('guest') ||
          hashParams.get('code');
      }

      const candidate = (fromSearch || fromHash || '').trim().toUpperCase();
      return GUEST_CODE_REGEX.test(candidate) ? candidate : null;
    } catch {
      const match = trimmed.match(/(?:guestCode|guest|code)=([a-zA-Z0-9_-]{4,32})/i);
      if (match?.[1]) {
        const candidate = match[1].toUpperCase();
        return GUEST_CODE_REGEX.test(candidate) ? candidate : null;
      }
      return null;
    }
  }

  // 2. Direct raw guest code (e.g. "GSTK7M4P9")
  const upper = trimmed.toUpperCase();
  return GUEST_CODE_REGEX.test(upper) ? upper : null;
}
