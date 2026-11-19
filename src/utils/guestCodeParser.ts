const CODE_REGEX = /^[A-Z0-9_-]{3,32}$/;
const GUEST_CODE_REGEX = /^[A-Z0-9_-]{4,32}$/;

function extractCodeFromQr(raw: string, mode: 'guest' | 'member'): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  const isGuest = mode === 'guest';
  const paramKeys = isGuest ? ['guestCode', 'guest', 'code'] : ['inviteCode', 'joinCode', 'invite', 'code'];
  const otherKeys = isGuest ? ['inviteCode', 'joinCode', 'invite'] : ['guestCode', 'guest'];
  const regex = isGuest ? GUEST_CODE_REGEX : CODE_REGEX;

  const looksLikeUrlOrParams =
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('/?') ||
    trimmed.startsWith('?') ||
    /(?:guestCode|guest|inviteCode|joinCode|invite|code)=/i.test(trimmed);

  if (looksLikeUrlOrParams) {
    try {
      const normalizedUrl = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : trimmed.startsWith('/') || trimmed.startsWith('?')
        ? `https://melobook.local${trimmed}`
        : `https://melobook.local/?${trimmed.replace(/^\?/, '')}`;

      const url = new URL(normalizedUrl);
      const hashParams = url.hash ? new URLSearchParams(url.hash.replace(/^#/, '')) : null;

      // Reject explicitly mismatched QR type (e.g., member QR scanned in guest mode)
      const hasOtherParam = otherKeys.some((k) => url.searchParams.has(k) || hashParams?.has(k));
      const matched =
        paramKeys.map((k) => url.searchParams.get(k) || hashParams?.get(k)).find(Boolean) || '';

      if (hasOtherParam && !matched) return null;
      const candidate = matched.trim().toUpperCase();
      return regex.test(candidate) ? candidate : null;
    } catch {
      const pattern = new RegExp(`(?:${paramKeys.join('|')})=([a-zA-Z0-9_-]{3,32})`, 'i');
      const match = trimmed.match(pattern);
      if (match?.[1]) {
        const candidate = match[1].toUpperCase();
        return regex.test(candidate) ? candidate : null;
      }
      return null;
    }
  }

  const upper = trimmed.toUpperCase();
  return regex.test(upper) ? upper : null;
}

/**
 * Extracts and validates a Melobook guest access code from raw text or a shared URL scanned from a QR code.
 */
export function extractGuestCodeFromQr(raw: string): string | null {
  return extractCodeFromQr(raw, 'guest');
}

/**
 * Extracts and validates a Melobook library member invite code from raw text or a shared URL scanned from a QR code.
 */
export function extractInviteCodeFromQr(raw: string): string | null {
  return extractCodeFromQr(raw, 'member');
}
