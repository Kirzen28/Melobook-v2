import { Song } from '../types';
import {
  parseChordPro,
  ParsedSection,
  ParsedLine,
  detectSectionTypeFromTitle
} from '../utils/chordUtils';

export type CanonicalSectionType =
  | 'verse'
  | 'chorus'
  | 'pre_chorus'
  | 'bridge'
  | 'intro'
  | 'outro'
  | 'tag'
  | 'interlude'
  | 'other';

export interface AnalyzedLine {
  plainText: string;
  chordProLine: string;
  wordCount: number;
  charCount: number;
  tokens: string[];
  punctuationEnd: string;
}

export interface AnalyzedBlock {
  blockIndex: number;
  sectionIndex: number;
  stanzaIndex: number;
  sectionTitle: string;
  rawType: string;
  canonicalType: CanonicalSectionType;
  sectionOrdinal: number | null;
  sameSectionAsPrevious: boolean;
  lines: AnalyzedLine[];
}

export interface AlignedBlock {
  sectionTitle: string;
  canonicalType: CanonicalSectionType;
  sameSectionAsPrevious: boolean;
  primaryLines: string[];
  translatedLines: string[];
  translatedChordProLines: string[];
}

export interface StructureComparisonResult {
  structuresDiffer: boolean;
  reason:
    | 'identical'
    | 'empty'
    | 'block_count_mismatch'
    | 'line_count_mismatch'
    | 'section_type_mismatch';
  primaryBlocks: AnalyzedBlock[];
  secondaryBlocks: AnalyzedBlock[];
}

export interface AlignedLyricsResult {
  structuresDiffer: boolean;
  wasRealigned: boolean;
  reason: StructureComparisonResult['reason'];
  blocks: AlignedBlock[];
  alignedChordPro: string;
  alignedSong: Song;
}

// Cross-lingual worship lexicon for cognate/semantic pattern matching across FR / EN / ES / PT
const CONCEPT_GROUPS: string[][] = [
  ['alaba', 'alabar', 'alaben', 'adore', 'adorer', 'adoro', 'loue', 'louer', 'louez', 'louange', 'praise', 'worship', 'benis', 'benir', 'benissez', 'bless', 'exalt', 'exalte', 'exalta'],
  ['dios', 'dieu', 'god', 'deus', 'eternel', 'eternal', 'yahweh', 'jehovah', 'adonai', 'elohim'],
  ['senor', 'seigneur', 'lord', 'senhor', 'maitre', 'master', 'amo'],
  ['santo', 'saint', 'sainte', 'holy', 'sagrado', 'sacred'],
  ['aleluya', 'alleluia', 'hallelujah', 'hosanna', 'amen'],
  ['gloria', 'gloire', 'glory', 'glorieux', 'glorioso', 'glorious'],
  ['amor', 'amour', 'love', 'ama', 'aime', 'amado', 'beloved'],
  ['rey', 'roi', 'king', 'rei', 'soberano', 'souverain', 'sovereign'],
  ['cielo', 'ciel', 'cieux', 'heaven', 'heavens', 'ceu'],
  ['tierra', 'terre', 'earth', 'mundo', 'monde', 'world'],
  ['fuego', 'feu', 'fire', 'llama', 'flamme', 'flame'],
  ['espiritu', 'esprit', 'spirit', 'espirito', 'souffle', 'breath', 'wind', 'vent', 'viento'],
  ['vida', 'vie', 'life', 'vive', 'vivant', 'living', 'alive', 'vivo'],
  ['luz', 'lumiere', 'light', 'brilla', 'brille', 'shine'],
  ['paz', 'paix', 'peace', 'repos', 'rest', 'descanso'],
  ['gracia', 'grace', 'gracias', 'merci', 'thanks', 'misericorde', 'mercy', 'misericordia'],
  ['nombre', 'nom', 'name', 'nome'],
  ['corazon', 'coeur', 'heart', 'coracao', 'alma', 'ame', 'soul'],
  ['poder', 'puissance', 'power', 'fuerza', 'force', 'strength', 'fuerte', 'fort', 'strong'],
  ['digno', 'digne', 'worthy', 'merece', 'merite'],
  ['canto', 'cantar', 'chant', 'chante', 'chanter', 'sing', 'song', 'cancion'],
  ['jesus', 'jesu', 'cristo', 'christ', 'messie', 'messiah', 'sauveur', 'salvador', 'savior', 'saviour'],
  ['fe', 'foi', 'faith', 'creo', 'crois', 'believe', 'confio', 'trust'],
  ['reino', 'regne', 'kingdom', 'reign', 'reina', 'reinas'],
  ['grande', 'grand', 'great', 'majeste', 'majesty', 'majestad'],
  ['bueno', 'bon', 'good', 'bonte', 'goodness', 'bondad'],
  ['fiel', 'fidele', 'faithful', 'fidelite', 'fidelidad'],
  ['ven', 'viens', 'come', 'aqui', 'ici', 'here', 'hoy', 'aujourd', 'today'],
  ['eterno', 'eternel', 'forever', 'siempre', 'toujours', 'always', 'jamais', 'nunca', 'never'],
  ['sangre', 'sang', 'blood', 'cruz', 'croix', 'cross', 'agneau', 'cordero', 'lamb'],
  ['todo', 'todos', 'tous', 'tout', 'all', 'every', 'toda'],
  ['solo', 'seul', 'only', 'unico', 'unique']
];

const TOKEN_TO_CONCEPT = new Map<string, number>();
CONCEPT_GROUPS.forEach((group, idx) => {
  group.forEach((word) => TOKEN_TO_CONCEPT.set(word, idx));
});

function normalizeText(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function tokenizeLine(raw: string): string[] {
  const norm = normalizeText(raw).replace(/[^a-z0-9\s]/g, ' ');
  return norm.split(/\s+/).filter(Boolean);
}

function extractCanonicalSectionInfo(
  title: string,
  parsedType: string
): { canonicalType: CanonicalSectionType; ordinal: number | null } {
  const norm = normalizeText(title);
  const ordMatch = norm.match(/(\d+)/);
  const ordinal = ordMatch ? parseInt(ordMatch[1], 10) : null;

  if (/\b(pre[\s_-]?coro|pre[\s_-]?chorus|pre[\s_-]?refrain)\b/i.test(norm) || parsedType === 'pre_chorus') {
    return { canonicalType: 'pre_chorus', ordinal };
  }
  if (/\b(coro|chorus|refrain|estribillo)\b/i.test(norm) || parsedType === 'chorus') {
    return { canonicalType: 'chorus', ordinal };
  }
  if (/\b(puente|pont|bridge|ponte)\b/i.test(norm) || parsedType === 'bridge') {
    return { canonicalType: 'bridge', ordinal };
  }
  if (/\b(verso|couplet|verse|strophe|estrofa)\b/i.test(norm) || parsedType === 'verse') {
    return { canonicalType: 'verse', ordinal };
  }
  if (/\b(intro|introduction)\b/i.test(norm) || parsedType === 'intro') {
    return { canonicalType: 'intro', ordinal };
  }
  if (/\b(outro|fin|final|ending)\b/i.test(norm) || parsedType === 'outro' || parsedType === 'finale') {
    return { canonicalType: 'outro', ordinal };
  }
  if (/\b(tag|coda)\b/i.test(norm) || parsedType === 'tag') {
    return { canonicalType: 'tag', ordinal };
  }
  if (/\b(interlude|intermedio|instrumental|solo)\b/i.test(norm) || parsedType === 'interlude') {
    return { canonicalType: 'interlude', ordinal };
  }

  return { canonicalType: 'other', ordinal };
}

function buildAnalyzedLine(plainText: string, chordProLine: string): AnalyzedLine {
  const trimmedPlain = plainText.trim();
  const trimmedChordPro = chordProLine.trim() || trimmedPlain;
  const tokens = tokenizeLine(trimmedPlain);
  const punctMatch = trimmedPlain.match(/[.,;!?]+$/);
  return {
    plainText: trimmedPlain,
    chordProLine: trimmedChordPro,
    wordCount: tokens.length,
    charCount: trimmedPlain.length,
    tokens,
    punctuationEnd: punctMatch ? punctMatch[0] : ''
  };
}

function lineToChordProText(line: ParsedLine): { plain: string; chordPro: string } {
  const plain = line.items.map((it) => it.lyrics || '').join('').trim();
  const chordPro = line.items
    .map((it) => (it.chord ? `[${it.chord}]` : '') + (it.lyrics || ''))
    .join('')
    .trim();
  return { plain, chordPro };
}

function extractAnalyzedBlocksFromChordPro(chordProText: string): AnalyzedBlock[] {
  const parsed = parseChordPro(chordProText || '');
  const blocks: AnalyzedBlock[] = [];

  parsed.sections.forEach((section: ParsedSection, sIdx: number) => {
    const secTitle = (section.title || section.type || '').trim() || 'Paroles';
    const typeLower = (section.type || '').toLowerCase();

    if (
      section.blockKind === 'grid' ||
      section.blockKind === 'tab' ||
      typeLower === 'grid' ||
      typeLower === 'tab'
    ) {
      return;
    }

    if (
      ['solo', 'intro', 'outro', 'interlude', 'instrumental'].includes(typeLower) &&
      (!secTitle || /intro|solo|instru/i.test(secTitle))
    ) {
      const hasLyrics = section.lines.some(
        (l) => l.type === 'lyrics' && l.items.some((it) => it.lyrics && it.lyrics.trim().length > 0)
      );
      if (!hasLyrics) return;
    }

    const stanzas: AnalyzedLine[][] = [];
    let currentStanza: AnalyzedLine[] = [];

    for (const l of section.lines) {
      if (l.type === 'empty') {
        if (currentStanza.length > 0) {
          stanzas.push(currentStanza);
          currentStanza = [];
        }
        continue;
      }

      if (
        l.type === 'comment' ||
        l.type === 'comment_italic' ||
        l.type === 'comment_box' ||
        l.type === 'grid_row' ||
        l.type === 'tab_row'
      ) {
        continue;
      }

      const { plain, chordPro } = lineToChordProText(l);
      if (plain) {
        currentStanza.push(buildAnalyzedLine(plain, chordPro));
      }
    }
    if (currentStanza.length > 0) {
      stanzas.push(currentStanza);
    }

    const { canonicalType, ordinal } = extractCanonicalSectionInfo(secTitle, typeLower);
    stanzas.forEach((stanzaLines, stIdx) => {
      blocks.push({
        blockIndex: blocks.length,
        sectionIndex: sIdx,
        stanzaIndex: stIdx,
        sectionTitle: secTitle,
        rawType: typeLower,
        canonicalType,
        sectionOrdinal: ordinal,
        sameSectionAsPrevious: stIdx > 0,
        lines: stanzaLines
      });
    });
  });

  if (blocks.length === 0 && (chordProText || '').trim()) {
    const fallbackLines = (chordProText || '')
      .split('\n')
      .map((raw) => {
        const plain = raw.replace(/\[[^\]]*\]/g, '').replace(/\{[^}]*\}/g, '').trim();
        const chordPro = raw.replace(/\{[^}]*\}/g, '').trim();
        return { plain, chordPro };
      })
      .filter((x) => x.plain.length > 0)
      .map((x) => buildAnalyzedLine(x.plain, x.chordPro));

    if (fallbackLines.length > 0) {
      blocks.push({
        blockIndex: 0,
        sectionIndex: 0,
        stanzaIndex: 0,
        sectionTitle: 'Paroles',
        rawType: 'general',
        canonicalType: 'other',
        sectionOrdinal: null,
        sameSectionAsPrevious: false,
        lines: fallbackLines
      });
    }
  }

  return blocks;
}

/**
 * Analyzes the line structure of a song and its linked translation.
 */
export function compareSongStructures(
  primarySong: Song,
  translatedSong: Song
): StructureComparisonResult {
  const primaryBlocks = extractAnalyzedBlocksFromChordPro(
    primarySong.contentChordPro || primarySong.content || ''
  );
  const secondaryBlocks = extractAnalyzedBlocksFromChordPro(
    translatedSong.contentChordPro || translatedSong.content || ''
  );

  if (primaryBlocks.length === 0 || secondaryBlocks.length === 0) {
    return {
      structuresDiffer: false,
      reason: 'empty',
      primaryBlocks,
      secondaryBlocks
    };
  }

  if (primaryBlocks.length !== secondaryBlocks.length) {
    return {
      structuresDiffer: true,
      reason: 'block_count_mismatch',
      primaryBlocks,
      secondaryBlocks
    };
  }

  for (let i = 0; i < primaryBlocks.length; i++) {
    const p = primaryBlocks[i];
    const s = secondaryBlocks[i];

    if (p.lines.length !== s.lines.length) {
      return {
        structuresDiffer: true,
        reason: 'line_count_mismatch',
        primaryBlocks,
        secondaryBlocks
      };
    }

    const bothTyped = p.canonicalType !== 'other' && s.canonicalType !== 'other';
    if (bothTyped && p.canonicalType !== s.canonicalType) {
      return {
        structuresDiffer: true,
        reason: 'section_type_mismatch',
        primaryBlocks,
        secondaryBlocks
      };
    }
  }

  return {
    structuresDiffer: false,
    reason: 'identical',
    primaryBlocks,
    secondaryBlocks
  };
}

function linePatternSimilarity(a: AnalyzedLine, b: AnalyzedLine): number {
  const maxChars = Math.max(a.charCount, b.charCount, 1);
  const lenRatio = 1 - Math.abs(a.charCount - b.charCount) / maxChars;

  const maxWords = Math.max(a.wordCount, b.wordCount, 1);
  const wordRatio = Math.min(a.wordCount, b.wordCount) / maxWords;

  let conceptHits = 0;
  const aConcepts = new Set<number>();
  const aTokenSet = new Set(a.tokens);
  a.tokens.forEach((t) => {
    const c = TOKEN_TO_CONCEPT.get(t);
    if (c !== undefined) aConcepts.add(c);
  });

  let directTokenHits = 0;
  b.tokens.forEach((t) => {
    if (t.length >= 3 && aTokenSet.has(t)) {
      directTokenHits++;
    } else {
      const c = TOKEN_TO_CONCEPT.get(t);
      if (c !== undefined && aConcepts.has(c)) conceptHits++;
    }
  });

  const denom = Math.max(1, Math.min(a.tokens.length, b.tokens.length));
  const semanticScore = Math.min(1, (directTokenHits * 1.2 + conceptHits) / denom);

  const punctScore =
    a.punctuationEnd && b.punctuationEnd && a.punctuationEnd === b.punctuationEnd
      ? 1
      : a.punctuationEnd && b.punctuationEnd
      ? 0.4
      : 0;

  return 0.42 * lenRatio + 0.23 * wordRatio + 0.3 * semanticScore + 0.05 * punctScore;
}

function linePatternDistance(a: AnalyzedLine, b: AnalyzedLine): number {
  return 1 - linePatternSimilarity(a, b);
}

function mergeAnalyzedLines(lines: AnalyzedLine[]): AnalyzedLine {
  const plain = lines.map((l) => l.plainText).filter(Boolean).join(' ');
  const chordPro = lines.map((l) => l.chordProLine).filter(Boolean).join(' ');
  return buildAnalyzedLine(plain, chordPro);
}

/**
 * Splits a single ChordPro line into `partCount` balanced pieces proportionally to `targetLengths`,
 * preferring punctuation or word boundaries without breaking [chord] tokens.
 */
function splitChordProLineProportionally(
  line: AnalyzedLine,
  targetLengths: number[]
): AnalyzedLine[] {
  const k = targetLengths.length;
  if (k <= 1) return [line];

  const totalTarget = targetLengths.reduce((s, n) => s + Math.max(1, n), 0);
  const plain = line.plainText;

  // Tokenize raw ChordPro line into plain characters + attached chord tags at their plain offsets
  const chordMap = new Map<number, string[]>();
  let plainBuffer = '';
  const regex = /(\[[^\]]+\])|([^\[]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line.chordProLine)) !== null) {
    if (match[1]) {
      const pos = plainBuffer.length;
      const list = chordMap.get(pos) || [];
      list.push(match[1]);
      chordMap.set(pos, list);
    } else if (match[2]) {
      plainBuffer += match[2];
    }
  }

  const effectivePlain = plainBuffer || plain;
  const plainLen = effectivePlain.length;
  if (plainLen === 0) {
    return Array.from({ length: k }, () => buildAnalyzedLine('', ''));
  }

  // Find candidate break indices (punctuation boundaries preferred, then spaces)
  const breakCandidates: { idx: number; bonus: number }[] = [];
  for (let i = 1; i < plainLen - 1; i++) {
    const ch = effectivePlain[i];
    if (ch === ' ') {
      const prev = effectivePlain[i - 1];
      const isStrongPunct = prev === ',' || prev === ';' || prev === '/' || prev === '!' || prev === '?';
      breakCandidates.push({ idx: i, bonus: isStrongPunct ? 0 : 12 });
    }
  }

  const splitPoints: number[] = [0];
  let cumulative = 0;
  for (let part = 0; part < k - 1; part++) {
    cumulative += Math.max(1, targetLengths[part]);
    const idealIdx = Math.round((cumulative / totalTarget) * plainLen);
    const minIdx = splitPoints[splitPoints.length - 1] + 1;
    const maxIdx = plainLen - (k - 1 - part);

    let bestIdx = Math.max(minIdx, Math.min(maxIdx, idealIdx));
    let bestScore = Infinity;

    for (const cand of breakCandidates) {
      if (cand.idx < minIdx || cand.idx > maxIdx) continue;
      const score = Math.abs(cand.idx - idealIdx) + cand.bonus;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = cand.idx;
      }
    }

    splitPoints.push(bestIdx);
  }
  splitPoints.push(plainLen);

  // Reconstruct each chunk along with chords residing in its plain index range
  const chunks: AnalyzedLine[] = [];
  for (let p = 0; p < k; p++) {
    const start = splitPoints[p];
    const end = splitPoints[p + 1];
    let chunkChordPro = '';

    for (let pos = start; pos <= end; pos++) {
      // Attach chords at `pos` only if inside [start, end) or at the very end of the final chunk
      if (pos < end || (p === k - 1 && pos === end)) {
        const chords = chordMap.get(pos);
        if (chords) chunkChordPro += chords.join('');
      }
      if (pos < end) {
        chunkChordPro += effectivePlain[pos];
      }
    }

    const chunkPlain = effectivePlain.slice(start, end).trim();
    const cleanedChordPro = chunkChordPro.trim() || chunkPlain;
    chunks.push(buildAnalyzedLine(chunkPlain, cleanedChordPro));
  }

  return chunks;
}

/**
 * Dynamic-programming sequence alignment for lines inside a matched block.
 * Supports 1-to-1, 1-to-many (split), many-to-1 (merge), and exact line repetitions.
 */
function alignLinesPatternMatching(
  primaryLines: AnalyzedLine[],
  secondaryLines: AnalyzedLine[]
): AnalyzedLine[] {
  const a = primaryLines.length;
  const b = secondaryLines.length;

  if (a === 0) return [];
  if (b === 0) return primaryLines.map(() => buildAnalyzedLine('', ''));
  if (a === b) return secondaryLines;

  interface Step {
    cost: number;
    prevI: number;
    prevJ: number;
    kind: 'match' | 'merge' | 'split' | 'repeat' | 'skip_p' | 'skip_s';
  }

  const dp: number[][] = Array.from({ length: a + 1 }, () => new Array(b + 1).fill(Infinity));
  const trace: (Step | null)[][] = Array.from({ length: a + 1 }, () => new Array(b + 1).fill(null));
  dp[0][0] = 0;

  const setIfBetter = (
    ni: number,
    nj: number,
    newCost: number,
    prevI: number,
    prevJ: number,
    kind: Step['kind']
  ) => {
    if (newCost < dp[ni][nj]) {
      dp[ni][nj] = newCost;
      trace[ni][nj] = { cost: newCost, prevI, prevJ, kind };
    }
  };

  for (let i = 0; i <= a; i++) {
    for (let j = 0; j <= b; j++) {
      const base = dp[i][j];
      if (!Number.isFinite(base)) continue;

      // 1. 1-to-1 match
      if (i < a && j < b) {
        const d = linePatternDistance(primaryLines[i], secondaryLines[j]);
        setIfBetter(i + 1, j + 1, base + d, i, j, 'match');
      }

      // 2. Many-to-1 merge (primary has fewer lines than secondary)
      if (i < a && j + 1 < b) {
        for (let k = 2; k <= 3 && j + k <= b; k++) {
          const merged = mergeAnalyzedLines(secondaryLines.slice(j, j + k));
          const d = linePatternDistance(primaryLines[i], merged) + 0.14 * (k - 1);
          setIfBetter(i + 1, j + k, base + d, i, j, 'merge');
        }
      }

      // 3. 1-to-many split (primary has more lines than secondary)
      if (i + 1 < a && j < b) {
        for (let k = 2; k <= 3 && i + k <= a; k++) {
          const targets = primaryLines.slice(i, i + k).map((l) => l.charCount);
          const parts = splitChordProLineProportionally(secondaryLines[j], targets);
          const avgDist =
            parts.reduce((acc, pPart, idx) => acc + linePatternDistance(primaryLines[i + idx], pPart), 0) / k;
          setIfBetter(i + k, j + 1, base + avgDist + 0.16 * (k - 1), i, j, 'split');
        }
      }

      // 4. Consecutive line repetition in primary
      if (i > 0 && i < a && primaryLines[i].plainText.toLowerCase() === primaryLines[i - 1].plainText.toLowerCase()) {
        setIfBetter(i + 1, j, base + 0.08, i, j, 'repeat');
      }

      // 5. Fallback skips (high penalty)
      if (i < a) {
        setIfBetter(i + 1, j, base + 1.4, i, j, 'skip_p');
      }
      if (j < b) {
        setIfBetter(i, j + 1, base + 1.15, i, j, 'skip_s');
      }
    }
  }

  // Reconstruct steps
  const steps: { pi: number; pj: number; ni: number; nj: number; kind: Step['kind'] }[] = [];
  let ci = a;
  let cj = b;
  while (ci > 0 || cj > 0) {
    const tr = trace[ci][cj];
    if (!tr) break;
    steps.unshift({ pi: tr.prevI, pj: tr.prevJ, ni: ci, nj: cj, kind: tr.kind });
    ci = tr.prevI;
    cj = tr.prevJ;
  }

  const out: AnalyzedLine[] = new Array(a);
  for (const st of steps) {
    if (st.kind === 'match') {
      out[st.pi] = secondaryLines[st.pj];
    } else if (st.kind === 'merge') {
      out[st.pi] = mergeAnalyzedLines(secondaryLines.slice(st.pj, st.nj));
    } else if (st.kind === 'split') {
      const k = st.ni - st.pi;
      const targets = primaryLines.slice(st.pi, st.ni).map((l) => l.charCount);
      const parts = splitChordProLineProportionally(secondaryLines[st.pj], targets);
      for (let t = 0; t < k; t++) {
        out[st.pi + t] = parts[t];
      }
    } else if (st.kind === 'repeat') {
      out[st.pi] = st.pi > 0 && out[st.pi - 1] ? out[st.pi - 1] : buildAnalyzedLine('', '');
    } else if (st.kind === 'skip_p') {
      out[st.pi] = buildAnalyzedLine('', '');
    }
  }

  for (let i = 0; i < a; i++) {
    if (!out[i]) out[i] = buildAnalyzedLine('', '');
  }
  return out;
}

function blockPairScore(
  pBlock: AnalyzedBlock,
  pTotal: number,
  sBlock: AnalyzedBlock,
  sTotal: number
): number {
  let score = 0;

  // 1. Canonical section type & ordinal compatibility
  if (pBlock.canonicalType !== 'other' && sBlock.canonicalType !== 'other') {
    if (pBlock.canonicalType === sBlock.canonicalType) {
      score += 4.5;
      if (pBlock.sectionOrdinal !== null && sBlock.sectionOrdinal !== null) {
        score += pBlock.sectionOrdinal === sBlock.sectionOrdinal ? 3.0 : -1.5;
      }
    } else {
      score -= 3.5;
    }
  }

  // 2. Line count & total character balance
  const pChars = pBlock.lines.reduce((s, l) => s + l.charCount, 0);
  const sChars = sBlock.lines.reduce((s, l) => s + l.charCount, 0);
  const lineRatio =
    Math.min(pBlock.lines.length, sBlock.lines.length) /
    Math.max(pBlock.lines.length, sBlock.lines.length, 1);
  const charRatio = Math.min(pChars, sChars) / Math.max(pChars, sChars, 1);
  score += lineRatio * 1.8 + charRatio * 1.4;

  // 3. Relative order affinity
  const pRel = pBlock.blockIndex / Math.max(1, pTotal);
  const sRel = sBlock.blockIndex / Math.max(1, sTotal);
  score += (1 - Math.abs(pRel - sRel)) * 1.1;

  // 4. Average line-by-line cross-lingual pattern match
  const sampleCount = Math.min(pBlock.lines.length, sBlock.lines.length);
  if (sampleCount > 0) {
    let simSum = 0;
    for (let i = 0; i < sampleCount; i++) {
      simSum += linePatternSimilarity(pBlock.lines[i], sBlock.lines[i]);
    }
    score += (simSum / sampleCount) * 3.0;
  }

  return score;
}

const REPEATABLE_TYPES = new Set<CanonicalSectionType>(['chorus', 'pre_chorus', 'tag', 'outro']);

function matchAndAlignBlocks(
  primaryBlocks: AnalyzedBlock[],
  secondaryBlocks: AnalyzedBlock[]
): AlignedBlock[] {
  const m = primaryBlocks.length;
  const n = secondaryBlocks.length;
  const usedSecondary = new Set<number>();

  // Track which primary blocks were already handled as part of a 2-block split
  const resultBlocks: (AlignedBlock | null)[] = new Array(m).fill(null);

  for (let i = 0; i < m; i++) {
    if (resultBlocks[i]) continue;
    const pBlock = primaryBlocks[i];
    const isRepeatable = REPEATABLE_TYPES.has(pBlock.canonicalType);

    // Check if primary split one section into 2 consecutive stanzas while secondary kept it as 1 block
    const nextP = i + 1 < m ? primaryBlocks[i + 1] : null;
    const canPairNextP = Boolean(
      nextP &&
      (nextP.sameSectionAsPrevious ||
        (pBlock.canonicalType !== 'other' &&
          nextP.canonicalType === pBlock.canonicalType &&
          pBlock.sectionOrdinal === nextP.sectionOrdinal))
    );

    let bestScore = -Infinity;
    let bestMode: 'single' | 'merge_sec' | 'split_sec' = 'single';
    let bestSIdx = 0;

    for (let j = 0; j < n; j++) {
      const sBlock = secondaryBlocks[j];
      const reusePenalty = !isRepeatable && usedSecondary.has(j) ? 2.4 : 0;

      // Mode 1: 1-to-1 block match
      const singleScore = blockPairScore(pBlock, m, sBlock, n) - reusePenalty;
      if (singleScore > bestScore) {
        bestScore = singleScore;
        bestMode = 'single';
        bestSIdx = j;
      }

      // Mode 2: Merge adjacent secondary stanzas (S_j + S_{j+1}) into P_i
      if (j + 1 < n) {
        const sNext = secondaryBlocks[j + 1];
        const sameSecGroup =
          sNext.sameSectionAsPrevious ||
          (sBlock.canonicalType !== 'other' &&
            sBlock.canonicalType === sNext.canonicalType &&
            sBlock.sectionOrdinal === sNext.sectionOrdinal);
        if (sameSecGroup) {
          const mergedSec: AnalyzedBlock = {
            ...sBlock,
            lines: [...sBlock.lines, ...sNext.lines]
          };
          const mergedLenDiff = Math.abs(pBlock.lines.length - mergedSec.lines.length);
          const singleLenDiff = Math.abs(pBlock.lines.length - sBlock.lines.length);
          if (mergedLenDiff < singleLenDiff) {
            const mergeReuse = !isRepeatable && (usedSecondary.has(j) || usedSecondary.has(j + 1)) ? 2.4 : 0;
            const mergeScore = blockPairScore(pBlock, m, mergedSec, n) + 0.6 - mergeReuse;
            if (mergeScore > bestScore) {
              bestScore = mergeScore;
              bestMode = 'merge_sec';
              bestSIdx = j;
            }
          }
        }
      }

      // Mode 3: Split 1 secondary block S_j across P_i and P_{i+1}
      if (canPairNextP && nextP) {
        const combinedPLen = pBlock.lines.length + nextP.lines.length;
        const splitLenDiff = Math.abs(combinedPLen - sBlock.lines.length);
        const singleLenDiff = Math.abs(pBlock.lines.length - sBlock.lines.length);
        if (splitLenDiff < singleLenDiff && sBlock.lines.length >= 2) {
          const combinedP: AnalyzedBlock = {
            ...pBlock,
            lines: [...pBlock.lines, ...nextP.lines]
          };
          const splitScore = blockPairScore(combinedP, m, sBlock, n) + 0.6 - reusePenalty;
          if (splitScore > bestScore) {
            bestScore = splitScore;
            bestMode = 'split_sec';
            bestSIdx = j;
          }
        }
      }
    }

    if (bestMode === 'split_sec' && nextP) {
      usedSecondary.add(bestSIdx);
      const sBlock = secondaryBlocks[bestSIdx];
      const combinedP = [...pBlock.lines, ...nextP.lines];
      const alignedCombined = alignLinesPatternMatching(combinedP, sBlock.lines);
      const firstCount = pBlock.lines.length;
      const firstLines = alignedCombined.slice(0, firstCount);
      const secondLines = alignedCombined.slice(firstCount);

      resultBlocks[i] = {
        sectionTitle: sBlock.sectionTitle || pBlock.sectionTitle,
        canonicalType: pBlock.canonicalType,
        sameSectionAsPrevious: pBlock.sameSectionAsPrevious,
        primaryLines: pBlock.lines.map((l) => l.plainText),
        translatedLines: firstLines.map((l) => l.plainText),
        translatedChordProLines: firstLines.map((l) => l.chordProLine)
      };
      resultBlocks[i + 1] = {
        sectionTitle: sBlock.sectionTitle || nextP.sectionTitle,
        canonicalType: nextP.canonicalType,
        sameSectionAsPrevious: nextP.sameSectionAsPrevious,
        primaryLines: nextP.lines.map((l) => l.plainText),
        translatedLines: secondLines.map((l) => l.plainText),
        translatedChordProLines: secondLines.map((l) => l.chordProLine)
      };
    } else if (bestMode === 'merge_sec') {
      usedSecondary.add(bestSIdx);
      usedSecondary.add(bestSIdx + 1);
      const sBlock = secondaryBlocks[bestSIdx];
      const sNext = secondaryBlocks[bestSIdx + 1];
      const aligned = alignLinesPatternMatching(pBlock.lines, [...sBlock.lines, ...sNext.lines]);

      resultBlocks[i] = {
        sectionTitle: sBlock.sectionTitle || pBlock.sectionTitle,
        canonicalType: pBlock.canonicalType,
        sameSectionAsPrevious: pBlock.sameSectionAsPrevious,
        primaryLines: pBlock.lines.map((l) => l.plainText),
        translatedLines: aligned.map((l) => l.plainText),
        translatedChordProLines: aligned.map((l) => l.chordProLine)
      };
    } else {
      usedSecondary.add(bestSIdx);
      const sBlock = secondaryBlocks[bestSIdx];
      const aligned = alignLinesPatternMatching(pBlock.lines, sBlock.lines);

      resultBlocks[i] = {
        sectionTitle: sBlock.sectionTitle || pBlock.sectionTitle,
        canonicalType: pBlock.canonicalType,
        sameSectionAsPrevious: pBlock.sameSectionAsPrevious,
        primaryLines: pBlock.lines.map((l) => l.plainText),
        translatedLines: aligned.map((l) => l.plainText),
        translatedChordProLines: aligned.map((l) => l.chordProLine)
      };
    }
  }

  return resultBlocks.map((b, idx) =>
    b || {
      sectionTitle: primaryBlocks[idx].sectionTitle,
      canonicalType: primaryBlocks[idx].canonicalType,
      sameSectionAsPrevious: primaryBlocks[idx].sameSectionAsPrevious,
      primaryLines: primaryBlocks[idx].lines.map((l) => l.plainText),
      translatedLines: primaryBlocks[idx].lines.map(() => ''),
      translatedChordProLines: primaryBlocks[idx].lines.map(() => '')
    }
  );
}

function buildAlignedChordPro(
  blocks: AlignedBlock[],
  meta: { title?: string; artist?: string; key?: string; tempo?: number }
): string {
  const lines: string[] = [];
  if (meta.title?.trim()) lines.push(`{title: ${meta.title.trim()}}`);
  if (meta.artist?.trim()) lines.push(`{artist: ${meta.artist.trim()}}`);
  if (meta.key?.trim()) lines.push(`{key: ${meta.key.trim()}}`);
  if (meta.tempo) lines.push(`{tempo: ${meta.tempo}}`);

  const tagMap: Record<string, string> = {
    verse: 'verse',
    chorus: 'chorus',
    bridge: 'bridge',
    pre_chorus: 'pre_chorus',
    intro: 'intro',
    outro: 'outro',
    interlude: 'interlude',
    tag: 'tag'
  };

  let openTag: string | null = null;

  blocks.forEach((block, idx) => {
    const cleanSec = (block.sectionTitle || 'Paroles').trim();
    if (idx === 0 || !block.sameSectionAsPrevious) {
      if (openTag) {
        lines.push(`{end_of_${openTag}}`);
        openTag = null;
      }
      if (lines.length > 0) lines.push('');
      const detected = detectSectionTypeFromTitle(cleanSec);
      const secTag =
        (detected.isKnown && tagMap[detected.type]) ||
        tagMap[block.canonicalType] ||
        'verse';
      const escaped = cleanSec.replace(/"/g, '\\"');
      lines.push(`{start_of_${secTag}: label="${escaped}"}`);
      openTag = secTag;
    } else {
      lines.push('');
    }

    const contentLines = block.translatedChordProLines.some((l) => l.trim().length > 0)
      ? block.translatedChordProLines
      : block.translatedLines;
    contentLines.forEach((l) => lines.push(l));
  });

  if (openTag) {
    lines.push(`{end_of_${openTag}}`);
  }

  return lines.join('\n');
}

/**
 * Analyzes the line structure of `primarySong` and `translatedSong`.
 * When their structures differ, re-aligns the translation blocks and lines
 * line-by-line via pattern matching so the reader & projector stay synchronized.
 */
export function alignSongAndTranslation(
  primarySong: Song,
  translatedSong: Song
): AlignedLyricsResult {
  const comparison = compareSongStructures(primarySong, translatedSong);

  if (!comparison.structuresDiffer) {
    const blocks: AlignedBlock[] = comparison.primaryBlocks.map((pBlock, idx) => {
      const sBlock = comparison.secondaryBlocks[idx];
      return {
        sectionTitle: sBlock?.sectionTitle || pBlock.sectionTitle,
        canonicalType: pBlock.canonicalType,
        sameSectionAsPrevious: pBlock.sameSectionAsPrevious,
        primaryLines: pBlock.lines.map((l) => l.plainText),
        translatedLines: sBlock ? sBlock.lines.map((l) => l.plainText) : pBlock.lines.map(() => ''),
        translatedChordProLines: sBlock ? sBlock.lines.map((l) => l.chordProLine) : pBlock.lines.map(() => '')
      };
    });

    return {
      structuresDiffer: false,
      wasRealigned: false,
      reason: comparison.reason,
      blocks,
      alignedChordPro: translatedSong.contentChordPro || translatedSong.content || '',
      alignedSong: translatedSong
    };
  }

  const alignedBlocks = matchAndAlignBlocks(
    comparison.primaryBlocks,
    comparison.secondaryBlocks
  );
  const alignedChordPro = buildAlignedChordPro(alignedBlocks, {
    title: translatedSong.title,
    artist: translatedSong.artist,
    key: translatedSong.key,
    tempo: translatedSong.tempo
  });

  return {
    structuresDiffer: true,
    wasRealigned: true,
    reason: comparison.reason,
    blocks: alignedBlocks,
    alignedChordPro,
    alignedSong: {
      ...translatedSong,
      contentChordPro: alignedChordPro
    }
  };
}

/**
 * Raw ChordPro variant for presentation utilities that work directly from ChordPro strings.
 */
export function alignChordProStructures(
  primaryChordPro: string,
  secondaryChordPro: string,
  primaryTitle: string = '',
  secondaryTitle: string = ''
): { structuresDiffer: boolean; alignedSecondaryChordPro: string } {
  const dummyPrimary: Song = {
    id: '_p',
    groupId: '',
    title: primaryTitle,
    artist: '',
    key: 'C',
    tempo: 80,
    contentChordPro: primaryChordPro
  };
  const dummySecondary: Song = {
    id: '_s',
    groupId: '',
    title: secondaryTitle,
    artist: '',
    key: 'C',
    tempo: 80,
    contentChordPro: secondaryChordPro
  };
  const res = alignSongAndTranslation(dummyPrimary, dummySecondary);
  return {
    structuresDiffer: res.structuresDiffer,
    alignedSecondaryChordPro: res.alignedChordPro
  };
}

/**
 * Self-check verifying that differing structures (e.g., repeated chorus / merged lines)
 * are detected and re-aligned 1-to-1 line-by-line with the primary song.
 */
export function testSongAlignmentService(): boolean {
  const primary: Song = {
    id: 'alaba',
    groupId: 'g1',
    title: 'Alaba',
    artist: 'Test',
    key: 'G',
    tempo: 75,
    language: 'Espagnol',
    contentChordPro: [
      '{start_of_verse: label="Verso 1"}',
      '[G]Alaba a Dios',
      '[C]Con todo el corazón',
      '{end_of_verse}',
      '',
      '{start_of_chorus: label="Coro"}',
      '[G]Santo es el Señor',
      '[D]Digno de gloria',
      '{end_of_chorus}',
      '',
      '{start_of_verse: label="Verso 2"}',
      '[Em]Canta aleluya',
      '[C]Por siempre amén',
      '{end_of_verse}',
      '',
      '{start_of_chorus: label="Coro"}',
      '[G]Santo es el Señor',
      '[D]Digno de gloria',
      '{end_of_chorus}'
    ].join('\n')
  };

  // Linked translation omits the repeated Chorus and combines Verse 1 onto a single line
  const translated: Song = {
    id: 'benis',
    groupId: 'g1',
    title: 'Bénis',
    artist: 'Test',
    key: 'G',
    tempo: 75,
    language: 'Français',
    contentChordPro: [
      '{start_of_verse: label="Couplet 1"}',
      '[G]Bénis Dieu, [C]de tout ton cœur',
      '{end_of_verse}',
      '',
      '{start_of_chorus: label="Refrain"}',
      '[G]Saint est le Seigneur',
      '[D]Digne de gloire',
      '{end_of_chorus}',
      '',
      '{start_of_verse: label="Couplet 2"}',
      '[Em]Chante alléluia',
      '[C]Pour toujours amen',
      '{end_of_verse}'
    ].join('\n')
  };

  const result = alignSongAndTranslation(primary, translated);
  const rechecked = compareSongStructures(primary, result.alignedSong);

  return (
    result.structuresDiffer === true &&
    result.wasRealigned === true &&
    result.blocks.length === 4 &&
    result.blocks[0].translatedLines.length === 2 &&
    result.blocks[3].translatedLines[0] === 'Saint est le Seigneur' &&
    rechecked.structuresDiffer === false
  );
}
