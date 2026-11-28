import assert from 'node:assert/strict';
import {
  DEFAULT_APP_BRANDING,
  getContrastTextColor,
  isValidHexColor,
  normalizeHexColor,
  sanitizeBrandingConfig,
  sanitizeSvgMarkup
} from './brandingUtils';

// 1. Hex validation & normalization
assert.equal(isValidHexColor('#2563eb'), true);
assert.equal(isValidHexColor('#GGGGGG'), false);
assert.equal(isValidHexColor('blue'), false);
assert.equal(normalizeHexColor(' #4f46e5 ', '#000000'), '#4F46E5');
assert.equal(normalizeHexColor('invalid', '#2563EB'), '#2563EB');

// 2. Contrast polarity for custom accent buttons
assert.equal(getContrastTextColor('#2563EB'), '#FFFFFF');
assert.equal(getContrastTextColor('#FACC15'), '#0F172A');

// 3. SVG XSS sanitization strips scripts, inline handlers, and external hrefs
const dirtySvg =
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><circle cx="10" cy="10" r="8" onclick="evil()"/><a href="javascript:alert(3)"><rect width="5" height="5"/></a></svg>';
const sanitizedDataUrl = sanitizeSvgMarkup(dirtySvg);
const decodedSvg = decodeURIComponent(sanitizedDataUrl.replace('data:image/svg+xml;charset=utf-8,', ''));
assert.equal(decodedSvg.includes('<script'), false);
assert.equal(decodedSvg.includes('onload='), false);
assert.equal(decodedSvg.includes('onclick='), false);
assert.equal(decodedSvg.includes('javascript:'), false);
assert.equal(decodedSvg.includes('<circle'), true);

// 4. Config sanitization falls back safely on invalid values and rejects unsafe logo URLs
const sanitized = sanitizeBrandingConfig({
  logoMode: 'custom',
  customLogoDataUrl: 'https://evil.example/logo.png',
  accentColor: 'not-a-hex',
  fontFamily: 'comic-sans'
});
assert.equal(sanitized.logoMode, 'default');
assert.equal(sanitized.customLogoDataUrl, null);
assert.equal(sanitized.accentColor, DEFAULT_APP_BRANDING.accentColor);
assert.equal(sanitized.fontFamily, DEFAULT_APP_BRANDING.fontFamily);
