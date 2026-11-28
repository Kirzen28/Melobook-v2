import { MemberSkillsConfig, MemberSkillsMutation } from '../types';

export const MEMBER_SKILLS_CACHE_KEY = 'melobook_member_skills_config';
export const MAX_DEFAULT_INSTRUMENTS = 50;
export const MAX_DEFAULT_VOCAL_ROLES = 30;
export const MAX_MEMBER_INSTRUMENTS = 20;
export const MAX_MEMBER_VOCAL_ROLES = 10;

export const DEFAULT_INSTRUMENTS: string[] = [
  'Piano / Clavier',
  'Guitare acoustique',
  'Guitare électrique',
  'Basse',
  'Batterie',
  'Percussions',
  'Violon',
  'Violoncelle',
  'Cuivres / Sax'
];

export const DEFAULT_VOCAL_ROLES: string[] = [
  'Direction / Lead',
  'Chant Lead',
  'Chœur',
  'Soprano',
  'Alto',
  'Ténor',
  'Baryton'
];

export const DEFAULT_MEMBER_SKILLS_CONFIG: MemberSkillsConfig = {
  id: 'member_skills',
  instruments: [...DEFAULT_INSTRUMENTS],
  vocalRoles: [...DEFAULT_VOCAL_ROLES]
};

export const sanitizeSkillList = (
  raw: unknown,
  fallback: string[],
  maxItems: number
): string[] => {
  if (!Array.isArray(raw)) return [...fallback].slice(0, maxItems);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim().slice(0, 80);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= maxItems) break;
  }
  return result;
};

export const sanitizeMemberSkillsConfig = (raw: unknown): MemberSkillsConfig => {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    id: 'member_skills',
    instruments: sanitizeSkillList(obj.instruments, DEFAULT_INSTRUMENTS, MAX_DEFAULT_INSTRUMENTS),
    vocalRoles: sanitizeSkillList(obj.vocalRoles, DEFAULT_VOCAL_ROLES, MAX_DEFAULT_VOCAL_ROLES),
    updatedBy: typeof obj.updatedBy === 'string' ? obj.updatedBy : undefined,
    updatedAt: obj.updatedAt
  };
};

export const readCachedMemberSkillsConfig = (): MemberSkillsConfig => {
  if (typeof window === 'undefined') return DEFAULT_MEMBER_SKILLS_CONFIG;
  try {
    const raw = localStorage.getItem(MEMBER_SKILLS_CACHE_KEY);
    if (!raw) return DEFAULT_MEMBER_SKILLS_CONFIG;
    return sanitizeMemberSkillsConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_MEMBER_SKILLS_CONFIG;
  }
};

export const writeCachedMemberSkillsConfig = (config: MemberSkillsConfig): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      MEMBER_SKILLS_CACHE_KEY,
      JSON.stringify({
        id: 'member_skills',
        instruments: config.instruments,
        vocalRoles: config.vocalRoles
      })
    );
  } catch {}
};

export const applySkillMutationsToList = (
  currentList: string[] | undefined,
  renames: Array<{ from: string; to: string }> = [],
  deletions: string[] = [],
  maxItems = MAX_MEMBER_INSTRUMENTS
): { next: string[]; changed: boolean } => {
  if (!Array.isArray(currentList) || currentList.length === 0) {
    return { next: [], changed: false };
  }

  const renameMap = new Map<string, string>();
  for (const r of renames) {
    const fromKey = r.from.trim().toLowerCase();
    const toVal = r.to.trim().slice(0, 80);
    if (fromKey && toVal) renameMap.set(fromKey, toVal);
  }

  const deleteSet = new Set<string>(
    deletions.map(d => d.trim().toLowerCase()).filter(Boolean)
  );

  const seen = new Set<string>();
  const next: string[] = [];

  for (const rawItem of currentList) {
    if (typeof rawItem !== 'string') continue;
    const trimmed = rawItem.trim().slice(0, 80);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();

    if (deleteSet.has(key)) continue;

    const finalVal = renameMap.get(key) ?? trimmed;
    const finalKey = finalVal.toLowerCase();
    if (seen.has(finalKey)) continue;
    seen.add(finalKey);
    next.push(finalVal);
    if (next.length >= maxItems) break;
  }

  const changed =
    next.length !== currentList.length ||
    next.some((val, idx) => val !== currentList[idx]);

  return { next, changed };
};

export const applySkillsMutationToProfile = (
  instruments: string[] | undefined,
  vocalRoles: string[] | undefined,
  mutation?: MemberSkillsMutation
): { instruments: string[]; vocalRoles: string[]; changed: boolean } => {
  const instRes = applySkillMutationsToList(
    instruments,
    mutation?.instrumentRenames,
    mutation?.instrumentDeletions,
    MAX_MEMBER_INSTRUMENTS
  );
  const vocRes = applySkillMutationsToList(
    vocalRoles,
    mutation?.vocalRoleRenames,
    mutation?.vocalRoleDeletions,
    MAX_MEMBER_VOCAL_ROLES
  );
  return {
    instruments: instRes.next,
    vocalRoles: vocRes.next,
    changed: instRes.changed || vocRes.changed
  };
};
