import { AppBrandingConfig, AppBrandingFontId } from '../types';

export const APP_BRANDING_CACHE_KEY = 'melobook_app_branding';
export const APP_BRANDING_MAX_LOGO_CHARS = 260000;
export const DEFAULT_FAVICON_HREF = '/icon.svg?v=20261124-01';

export interface BrandingFontOption {
  id: AppBrandingFontId;
  label: string;
  category: 'Sans géométrique' | 'Sans éditorial' | 'Serif';
  cssFamily: string;
  googleFontsQuery: string | null;
}

export const APP_BRANDING_FONTS: readonly BrandingFontOption[] = [
  {
    id: 'plus-jakarta-sans',
    label: 'Plus Jakarta Sans',
    category: 'Sans géométrique',
    cssFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    googleFontsQuery: null
  },
  {
    id: 'outfit',
    label: 'Outfit',
    category: 'Sans géométrique',
    cssFamily: "'Outfit', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    googleFontsQuery: 'Outfit:wght@400;500;600;700;800'
  },
  {
    id: 'manrope',
    label: 'Manrope',
    category: 'Sans géométrique',
    cssFamily: "'Manrope', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    googleFontsQuery: 'Manrope:wght@400;500;600;700;800'
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    category: 'Sans géométrique',
    cssFamily: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    googleFontsQuery: 'DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400'
  },
  {
    id: 'bricolage-grotesque',
    label: 'Bricolage Grotesque',
    category: 'Sans éditorial',
    cssFamily: "'Bricolage Grotesque', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    googleFontsQuery: 'Bricolage+Grotesque:wght@400;500;600;700;800'
  },
  {
    id: 'public-sans',
    label: 'Public Sans',
    category: 'Sans éditorial',
    cssFamily: "'Public Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    googleFontsQuery: 'Public+Sans:wght@400;500;600;700;800'
  },
  {
    id: 'playfair-display',
    label: 'Playfair Display',
    category: 'Serif',
    cssFamily: "'Playfair Display', Georgia, Cambria, serif",
    googleFontsQuery: 'Playfair+Display:ital,wght@0,400;0,600;0,700;1,400'
  },
  {
    id: 'lora',
    label: 'Lora',
    category: 'Serif',
    cssFamily: "'Lora', Georgia, Cambria, serif",
    googleFontsQuery: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400'
  }
];

export const DEFAULT_APP_BRANDING: AppBrandingConfig = {
  id: 'branding',
  logoMode: 'default',
  customLogoDataUrl: null,
  accentColor: '#2563EB',
  lightBgColor: '#F4F6F9',
  lightSurfaceColor: '#FFFFFF',
  darkBgColor: '#0A0A0B',
  darkSurfaceColor: '#111112',
  fontFamily: 'plus-jakarta-sans'
};

export const ACCENT_PRESETS: ReadonlyArray<{ label: string; hex: string }> = [
  { label: 'Bleu Melobook', hex: '#2563EB' },
  { label: 'Indigo', hex: '#4F46E5' },
  { label: 'Émeraude', hex: '#059669' },
  { label: 'Teal', hex: '#0D9488' },
  { label: 'Ambre', hex: '#D97706' },
  { label: 'Corail', hex: '#E11D48' },
  { label: 'Violet', hex: '#7C3AED' },
  { label: 'Ardoise', hex: '#334155' }
];

export const SURFACE_PALETTE_PRESETS: ReadonlyArray<{
  label: string;
  lightBgColor: string;
  lightSurfaceColor: string;
  darkBgColor: string;
  darkSurfaceColor: string;
}> = [
  {
    label: 'Défaut Melobook',
    lightBgColor: '#F4F6F9',
    lightSurfaceColor: '#FFFFFF',
    darkBgColor: '#0A0A0B',
    darkSurfaceColor: '#111112'
  },
  {
    label: 'Ardoise Froide',
    lightBgColor: '#EEF2F6',
    lightSurfaceColor: '#F8FAFC',
    darkBgColor: '#0B1120',
    darkSurfaceColor: '#151E32'
  },
  {
    label: 'Papier Chaud',
    lightBgColor: '#F6F4EF',
    lightSurfaceColor: '#FCFBF8',
    darkBgColor: '#141210',
    darkSurfaceColor: '#1D1A17'
  },
  {
    label: 'Noir Studio',
    lightBgColor: '#F1F5F9',
    lightSurfaceColor: '#FFFFFF',
    darkBgColor: '#050506',
    darkSurfaceColor: '#121215'
  }
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value.trim());
}

export function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!HEX_COLOR_RE.test(trimmed)) return fallback;
  return trimmed.toUpperCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHexColor(hex, '#2563EB').slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map(n => n.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function mixHexColors(hexA: string, hexB: string, weightB: number): string {
  const w = Math.max(0, Math.min(1, weightB));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r * (1 - w) + b.r * w,
    a.g * (1 - w) + b.g * w,
    a.b * (1 - w) + b.b * w
  );
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastTextColor(bgHex: string): '#FFFFFF' | '#0F172A' {
  return getRelativeLuminance(bgHex) > 0.36 ? '#0F172A' : '#FFFFFF';
}

export function isValidBrandingFontId(value: unknown): value is AppBrandingFontId {
  return typeof value === 'string' && APP_BRANDING_FONTS.some(f => f.id === value);
}

export function getBrandingFontMeta(fontId: AppBrandingFontId): BrandingFontOption {
  return APP_BRANDING_FONTS.find(f => f.id === fontId) || APP_BRANDING_FONTS[0];
}

export function isSafeCustomLogoDataUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > APP_BRANDING_MAX_LOGO_CHARS) {
    return false;
  }
  return (
    value.startsWith('data:image/png;base64,') ||
    value.startsWith('data:image/jpeg;base64,') ||
    value.startsWith('data:image/webp;base64,') ||
    value.startsWith('data:image/svg+xml;base64,') ||
    value.startsWith('data:image/svg+xml;charset=utf-8,')
  );
}

export function sanitizeSvgMarkup(svgText: string): string {
  if (typeof svgText !== 'string' || !svgText.toLowerCase().includes('<svg')) {
    throw new Error('Fichier SVG invalide.');
  }
  const cleaned = svgText
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<(script|iframe|object|embed|foreignObject)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|iframe|object|embed|foreignObject)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|xlink:href)\s*=\s*(['"])\s*(javascript:|data:text\/html|https?:\/\/)[\s\S]*?\2/gi, '')
    .trim();

  if (!/<svg[\s>]/i.test(cleaned)) {
    throw new Error('Balise SVG introuvable après nettoyage.');
  }

  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleaned)}`;
  if (encoded.length > APP_BRANDING_MAX_LOGO_CHARS) {
    throw new Error('Le fichier SVG dépasse la taille maximale autorisée.');
  }
  return encoded;
}

export async function processLogoFile(file: File): Promise<string> {
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
  if (isSvg) {
    const rawText = await file.text();
    return sanitizeSvgMarkup(rawText);
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Format non pris en charge. Utilisez un fichier PNG, JPG, WebP ou SVG.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Format d'image non pris en charge."));
    image.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Traitement d'image indisponible.");
  }

  const maxDim = 256;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.9, 0.78, 0.64]) {
    const webp = canvas.toDataURL('image/webp', quality);
    const candidate = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
    if (candidate.length <= APP_BRANDING_MAX_LOGO_CHARS) {
      return candidate;
    }
  }

  const pngFallback = canvas.toDataURL('image/png');
  if (pngFallback.length <= APP_BRANDING_MAX_LOGO_CHARS) {
    return pngFallback;
  }

  throw new Error('Logo trop volumineux même après compression (max 256×256).');
}

export function sanitizeBrandingConfig(raw: unknown): AppBrandingConfig {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const customLogoDataUrl =
    input.logoMode === 'custom' && isSafeCustomLogoDataUrl(input.customLogoDataUrl)
      ? input.customLogoDataUrl
      : null;

  return {
    id: 'branding',
    logoMode: customLogoDataUrl ? 'custom' : 'default',
    customLogoDataUrl,
    accentColor: normalizeHexColor(input.accentColor, DEFAULT_APP_BRANDING.accentColor),
    lightBgColor: normalizeHexColor(input.lightBgColor, DEFAULT_APP_BRANDING.lightBgColor),
    lightSurfaceColor: normalizeHexColor(input.lightSurfaceColor, DEFAULT_APP_BRANDING.lightSurfaceColor),
    darkBgColor: normalizeHexColor(input.darkBgColor, DEFAULT_APP_BRANDING.darkBgColor),
    darkSurfaceColor: normalizeHexColor(input.darkSurfaceColor, DEFAULT_APP_BRANDING.darkSurfaceColor),
    fontFamily: isValidBrandingFontId(input.fontFamily) ? input.fontFamily : DEFAULT_APP_BRANDING.fontFamily,
    updatedBy: typeof input.updatedBy === 'string' ? input.updatedBy : undefined,
    updatedAt: input.updatedAt
  };
}

export function readCachedBrandingConfig(): AppBrandingConfig {
  if (typeof window === 'undefined') return DEFAULT_APP_BRANDING;
  try {
    const raw = localStorage.getItem(APP_BRANDING_CACHE_KEY);
    if (!raw) return DEFAULT_APP_BRANDING;
    return sanitizeBrandingConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_APP_BRANDING;
  }
}

export function hasCustomSurfaces(config: AppBrandingConfig): boolean {
  return (
    config.lightBgColor !== DEFAULT_APP_BRANDING.lightBgColor ||
    config.lightSurfaceColor !== DEFAULT_APP_BRANDING.lightSurfaceColor ||
    config.darkBgColor !== DEFAULT_APP_BRANDING.darkBgColor ||
    config.darkSurfaceColor !== DEFAULT_APP_BRANDING.darkSurfaceColor
  );
}

export function applyAppBrandingToDocument(config: AppBrandingConfig): void {
  if (typeof document === 'undefined') return;
  const isPresentation =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('mode') === 'presentation' ||
      window.location.hash === '#presentation');
  const normalized = sanitizeBrandingConfig(config);
  const root = document.documentElement;
  if (isPresentation) {
    root.removeAttribute('data-custom-accent');
    root.removeAttribute('data-custom-surface');
    return;
  }
  const fontMeta = getBrandingFontMeta(normalized.fontFamily);

  const isDefaultAccent = normalized.accentColor === DEFAULT_APP_BRANDING.accentColor;
  const accent = normalized.accentColor;
  const accentOn = getContrastTextColor(accent);
  const accentHover = mixHexColors(accent, '#FFFFFF', 0.14);
  const accentLight = mixHexColors(accent, '#FFFFFF', 0.34);
  const accentSoftText = mixHexColors(accent, '#FFFFFF', 0.52);
  const accentDark = mixHexColors(accent, '#000000', 0.18);
  const accentTintLight = mixHexColors(accent, '#FFFFFF', 0.92);
  const accentTintDark = mixHexColors(accent, '#09090B', 0.84);

  root.style.setProperty('--app-accent', accent);
  root.style.setProperty('--app-accent-on', accentOn);
  root.style.setProperty('--app-accent-hover', accentHover);
  root.style.setProperty('--app-bg-light', normalized.lightBgColor);
  root.style.setProperty('--app-surface-light', normalized.lightSurfaceColor);
  root.style.setProperty('--app-bg-dark', normalized.darkBgColor);
  root.style.setProperty('--app-surface-dark', normalized.darkSurfaceColor);
  root.style.setProperty('--font-sans', fontMeta.cssFamily);

  if (isDefaultAccent) {
    root.removeAttribute('data-custom-accent');
    ['--color-blue-50', '--color-blue-200', '--color-blue-300', '--color-blue-400', '--color-blue-500', '--color-blue-600', '--color-blue-700', '--color-blue-950'].forEach(prop => {
      root.style.removeProperty(prop);
    });
  } else {
    root.setAttribute('data-custom-accent', 'true');
    root.style.setProperty('--color-blue-50', accentTintLight);
    root.style.setProperty('--color-blue-200', accentSoftText);
    root.style.setProperty('--color-blue-300', accentLight);
    root.style.setProperty('--color-blue-400', accentLight);
    root.style.setProperty('--color-blue-500', accentHover);
    root.style.setProperty('--color-blue-600', accent);
    root.style.setProperty('--color-blue-700', accentDark);
    root.style.setProperty('--color-blue-950', accentTintDark);
  }

  if (hasCustomSurfaces(normalized)) {
    root.setAttribute('data-custom-surface', 'true');
  } else {
    root.removeAttribute('data-custom-surface');
  }

  // Dynamic Google Font injection for non-default fonts
  const fontLinkId = 'melobook-dynamic-font';
  const existingFontLink = document.getElementById(fontLinkId) as HTMLLinkElement | null;
  if (fontMeta.googleFontsQuery) {
    const href = `https://fonts.googleapis.com/css2?family=${fontMeta.googleFontsQuery}&display=swap`;
    if (existingFontLink) {
      if (existingFontLink.href !== href) existingFontLink.href = href;
    } else {
      const link = document.createElement('link');
      link.id = fontLinkId;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  } else if (existingFontLink) {
    existingFontLink.remove();
  }

  // Update browser favicon when custom logo is active
  const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
  if (iconLink) {
    iconLink.href =
      normalized.logoMode === 'custom' && normalized.customLogoDataUrl
        ? normalized.customLogoDataUrl
        : DEFAULT_FAVICON_HREF;
  }

  try {
    localStorage.setItem(APP_BRANDING_CACHE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage quota errors
  }
}
