const CODE_REGEX = /^[A-Z0-9_-]{3,32}$/;
const TARGET_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export interface ShareTargetFromQr {
  code: string;
  setlistId?: string;
  songId?: string;
}

/**
 * Extracts and validates the single Melobook library code and optional targeted setlistId/songId from raw text or a shared URL.
 */
export function extractShareTargetFromQr(raw: string): ShareTargetFromQr | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  const paramKeys = ['inviteCode', 'joinCode', 'invite', 'code'];
  const looksLikeUrlOrParams =
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('/?') ||
    trimmed.startsWith('?') ||
    /(?:inviteCode|joinCode|invite|code)=/i.test(trimmed);

  if (looksLikeUrlOrParams) {
    try {
      const normalizedUrl = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : trimmed.startsWith('/') || trimmed.startsWith('?')
        ? `https://melobook.local${trimmed}`
        : `https://melobook.local/?${trimmed.replace(/^\?/, '')}`;

      const url = new URL(normalizedUrl);
      const hashParams = url.hash ? new URLSearchParams(url.hash.replace(/^#/, '')) : null;

      const matched =
        paramKeys.map((k) => url.searchParams.get(k) || hashParams?.get(k)).find(Boolean) || '';

      const candidate = matched.trim().toUpperCase();
      if (!CODE_REGEX.test(candidate)) return null;

      const rawSetlistId = (url.searchParams.get('setlistId') || hashParams?.get('setlistId') || '').trim();
      const rawSongId = (url.searchParams.get('songId') || hashParams?.get('songId') || '').trim();

      return {
        code: candidate,
        ...(rawSetlistId && TARGET_ID_REGEX.test(rawSetlistId) ? { setlistId: rawSetlistId } : {}),
        ...(rawSongId && TARGET_ID_REGEX.test(rawSongId) ? { songId: rawSongId } : {}),
      };
    } catch {
      const pattern = new RegExp(`(?:${paramKeys.join('|')})=([a-zA-Z0-9_-]{3,32})`, 'i');
      const match = trimmed.match(pattern);
      if (match?.[1]) {
        const candidate = match[1].toUpperCase();
        return CODE_REGEX.test(candidate) ? { code: candidate } : null;
      }
      return null;
    }
  }

  const upper = trimmed.toUpperCase();
  return CODE_REGEX.test(upper) ? { code: upper } : null;
}

export function extractLibraryCodeFromQr(raw: string): string | null {
  return extractShareTargetFromQr(raw)?.code || null;
}

export const extractInviteCodeFromQr = extractLibraryCodeFromQr;
export const extractGuestCodeFromQr = extractLibraryCodeFromQr;
