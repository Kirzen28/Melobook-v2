import { AccessPermission, Group, UserRole } from '../types';

export const ALL_ACCESSES: AccessPermission[] = [
  'admin',
  'setlists',
  'chants',
  'pupitre',
  'regie'
];

export const ACCESS_ORDER: AccessPermission[] = [
  'admin',
  'setlists',
  'chants',
  'pupitre',
  'regie'
];

export interface AccessMeta {
  key: AccessPermission;
  label: string;
  shortLabel: string;
  description: string;
  permissions: string[];
  badgeStyle: string;
  iconBoxStyle: string;
  dotColor: string;
}

export const ACCESS_DEFINITIONS: Record<AccessPermission, AccessMeta> = {
  admin: {
    key: 'admin',
    label: 'Admin',
    shortLabel: 'Admin',
    description: 'Accès complet automatique : gestion de la bibliothèque, attribution des accès aux membres et contrôle de tous les modules.',
    permissions: [
      'Inclut automatiquement Setlists, Chants, Pupitre et Régie',
      'Création, modification et suppression des bibliothèques',
      'Attribution des accès et gestion des membres'
    ],
    badgeStyle: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
    iconBoxStyle: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    dotColor: 'bg-blue-400'
  },
  setlists: {
    key: 'setlists',
    label: 'Setlists',
    shortLabel: 'Setlists',
    description: 'Direction des programmes : création, organisation et suppression des setlists, fixation des tonalités et tempos par défaut.',
    permissions: [
      'Créer, modifier, réordonner et supprimer des setlists',
      'Définir la tonalité et le tempo par défaut pour l’équipe',
      'Consulter les setlists et le répertoire associé'
    ],
    badgeStyle: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
    iconBoxStyle: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    dotColor: 'bg-emerald-400'
  },
  chants: {
    key: 'chants',
    label: 'Chants',
    shortLabel: 'Chants',
    description: 'Gestion du répertoire : création, import ChordPro, correction des paroles, accords et métadonnées.',
    permissions: [
      'Créer, importer et éditer les chants du répertoire',
      'Supprimer des chants et gérer les catégories',
      'Sauvegarder les traductions dans la bibliothèque'
    ],
    badgeStyle: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
    iconBoxStyle: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    dotColor: 'bg-amber-400'
  },
  pupitre: {
    key: 'pupitre',
    label: 'Pupitre',
    shortLabel: 'Pupitre',
    description: 'Musicien & chantre : lecture des chants et setlists, Mode Scène, transposition/capo perso et outils musiciens.',
    permissions: [
      'Consulter le répertoire et suivre les setlists en direct',
      'Mode Scène avec transposition et capodastre personnels',
      'Outils musiciens (Métronome, Mini clavier, Accordeur) et Réglages'
    ],
    badgeStyle: 'bg-purple-600/20 text-purple-300 border-purple-500/40',
    iconBoxStyle: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    dotColor: 'bg-purple-400'
  },
  regie: {
    key: 'regie',
    label: 'Régie',
    shortLabel: 'Régie',
    description: 'Module Projections uniquement : affichage et pilotage de la projection grand écran, sans accès au reste.',
    permissions: [
      'Accès exclusif au module Projections et à l’écran de diffusion',
      'Aucun accès aux onglets Chants, Setlists, Édition ou Réglages si utilisé seul',
      'Cumulable à tout moment avec Pupitre, Chants ou Setlists'
    ],
    badgeStyle: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40',
    iconBoxStyle: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    dotColor: 'bg-cyan-400'
  }
};

export function isValidAccessPermission(val: unknown): val is AccessPermission {
  return typeof val === 'string' && (ALL_ACCESSES as string[]).includes(val);
}

export function legacyRoleToAccesses(role?: UserRole | string | null): AccessPermission[] {
  switch (role) {
    case 'admin':
      return [...ALL_ACCESSES];
    case 'leader':
      return ['setlists', 'chants', 'pupitre', 'regie'];
    case 'editor':
      return ['chants', 'pupitre'];
    case 'viewer':
      return ['regie'];
    case 'member':
    default:
      return ['pupitre'];
  }
}

export function normalizeAccessList(
  input?: AccessPermission[] | null,
  fallbackRole?: UserRole | string | null
): AccessPermission[] {
  if (!Array.isArray(input)) {
    return legacyRoleToAccesses(fallbackRole);
  }
  const unique = new Set<AccessPermission>();
  for (const item of input) {
    if (isValidAccessPermission(item)) {
      unique.add(item);
    }
  }
  if (unique.has('admin')) {
    return [...ALL_ACCESSES];
  }
  return ACCESS_ORDER.filter(acc => unique.has(acc));
}

export function toggleAccessInList(
  current: AccessPermission[],
  target: AccessPermission,
  isOwner = false
): AccessPermission[] {
  const normalized = normalizeAccessList(current);
  if (isOwner) {
    return [...ALL_ACCESSES];
  }

  if (target === 'admin') {
    if (normalized.includes('admin')) {
      // Uncheck Admin only, keep the 4 functional accesses enabled
      return ['setlists', 'chants', 'pupitre', 'regie'];
    }
    return [...ALL_ACCESSES];
  }

  const next = new Set<AccessPermission>(normalized);
  if (next.has(target)) {
    // Removing a sub-access also removes 'admin' because Admin includes all accesses
    next.delete('admin');
    next.delete(target);
  } else {
    next.add(target);
  }
  return ACCESS_ORDER.filter(acc => next.has(acc));
}

export function resolveMemberAccesses(
  group: Group | null | undefined,
  uid: string | undefined,
  userFallbackRole?: UserRole | null,
  userFallbackAccesses?: AccessPermission[] | null
): AccessPermission[] {
  if (!uid) return [];
  if (group?.ownerId === uid) {
    return [...ALL_ACCESSES];
  }
  const groupAccesses = group?.memberAccesses?.[uid];
  if (Array.isArray(groupAccesses)) {
    return normalizeAccessList(groupAccesses);
  }
  const groupRole = group?.memberRoles?.[uid];
  if (groupRole) {
    return legacyRoleToAccesses(groupRole);
  }
  if (Array.isArray(userFallbackAccesses)) {
    return normalizeAccessList(userFallbackAccesses);
  }
  if (userFallbackRole) {
    return legacyRoleToAccesses(userFallbackRole);
  }
  return ['pupitre'];
}

export function accessesToLegacyRole(accesses: AccessPermission[]): UserRole {
  if (accesses.includes('admin')) return 'admin';
  if (accesses.includes('setlists')) return 'leader';
  if (accesses.includes('chants')) return 'editor';
  if (accesses.includes('pupitre')) return 'member';
  return 'viewer';
}

export function isRegieOnlyAccesses(accesses: AccessPermission[]): boolean {
  return (
    accesses.includes('regie') &&
    !accesses.includes('admin') &&
    !accesses.includes('setlists') &&
    !accesses.includes('chants') &&
    !accesses.includes('pupitre')
  );
}

export function formatAccessSummary(accesses: AccessPermission[]): string {
  const normalized = normalizeAccessList(accesses);
  if (normalized.length === 0) return 'Aucun accès';
  if (normalized.includes('admin')) return 'Admin (Accès complet)';
  return normalized.map(a => ACCESS_DEFINITIONS[a].label).join(' · ');
}
