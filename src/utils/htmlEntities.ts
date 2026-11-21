const NAMED_HTML_ENTITIES: Record<string, string> = {
  quot: '"',
  amp: '&',
  lt: '<',
  gt: '>',
  apos: "'",
  nbsp: ' ',
  iexcl: '¡',
  iquest: '¿',
  laquo: '«',
  raquo: '»',
  lsaquo: '‹',
  rsaquo: '›',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  bull: '•',
  middot: '·',
  deg: '°',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  ordf: 'ª',
  ordm: 'º',
  // French & Spanish lowercase
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  atilde: 'ã',
  auml: 'ä',
  aring: 'å',
  aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  igrave: 'ì',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  ntilde: 'ñ',
  ograve: 'ò',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  ouml: 'ö',
  oelig: 'œ',
  ugrave: 'ù',
  uacute: 'ú',
  ucirc: 'û',
  uuml: 'ü',
  yacute: 'ý',
  yuml: 'ÿ',
  // French & Spanish uppercase
  Agrave: 'À',
  Aacute: 'Á',
  Acirc: 'Â',
  Atilde: 'Ã',
  Auml: 'Ä',
  Aring: 'Å',
  AElig: 'Æ',
  Ccedil: 'Ç',
  Egrave: 'È',
  Eacute: 'É',
  Ecirc: 'Ê',
  Euml: 'Ë',
  Igrave: 'Ì',
  Iacute: 'Í',
  Icirc: 'Î',
  Iuml: 'Ï',
  Ntilde: 'Ñ',
  Ograve: 'Ò',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Otilde: 'Õ',
  Ouml: 'Ö',
  OElig: 'Œ',
  Ugrave: 'Ù',
  Uacute: 'Ú',
  Ucirc: 'Û',
  Uuml: 'Ü',
  Yacute: 'Ý',
  Yuml: 'Ÿ',
};

function decodeHtmlPass(str: string): string {
  return str.replace(/&([a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/g, (full, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const cp = parseInt(entity.slice(2), 16);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
    }
    if (entity.startsWith('#')) {
      const cp = parseInt(entity.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_HTML_ENTITIES, entity)
      ? NAMED_HTML_ENTITIES[entity]
      : full;
  });
}

/**
 * Decodes HTML entities (including all French/Spanish accents and numeric entities).
 * Pass `passes = 2` for display strings that may be double-encoded (e.g. &amp;iacute;).
 */
export function decodeHtmlEntities(str: string, passes: 1 | 2 = 1): string {
  if (!str) return '';
  let out = decodeHtmlPass(str);
  if (passes === 2 && out.includes('&')) {
    out = decodeHtmlPass(out);
  }
  return out;
}

/**
 * Decodes raw bytes as UTF-8 when valid, falling back to Windows-1252/ISO-8859-1
 * so French/Spanish accented texts never turn into replacement characters.
 */
export function decodeTextBuffer(buffer: ArrayBuffer | Uint8Array, contentType?: string | null): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('iso-8859-1') || ct.includes('latin1') || ct.includes('windows-1252')) {
    return new TextDecoder('windows-1252').decode(bytes);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}
