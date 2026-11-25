import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  Award,
  FileEdit,
  UserCheck,
  Monitor,
  X,
  Check,
  Search,
  Info,
  Sparkles
} from 'lucide-react';
import { AccessPermission, UserRole } from '../types';
import { includesIgnoreAccents } from '../utils/songSearchUtils';
import { ACCESS_DEFINITIONS, ACCESS_ORDER, legacyRoleToAccesses } from '../utils/accessUtils';

export interface RoleMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccesses?: AccessPermission[];
  currentRole?: UserRole;
}

interface PermissionRow {
  category: string;
  title: string;
  description: string;
  admin: boolean | 'admin-only';
  setlists: boolean;
  chants: boolean;
  pupitre: boolean | 'personal-only';
  regie: boolean;
  note?: string;
}

const PERMISSION_DATA: PermissionRow[] = [
  {
    category: 'Bibliothèques & Membres',
    title: 'Créer, renommer ou supprimer une bibliothèque',
    description: 'Gestion complète des bibliothèques et des paramètres d’invitation.',
    admin: 'admin-only',
    setlists: false,
    chants: false,
    pupitre: false,
    regie: false
  },
  {
    category: 'Bibliothèques & Membres',
    title: 'Attribuer les accès cumulables aux membres',
    description: 'Cocher ou décocher Admin, Setlists, Chants, Pupitre et Régie par bibliothèque.',
    admin: 'admin-only',
    setlists: false,
    chants: false,
    pupitre: false,
    regie: false
  },
  {
    category: 'Bibliothèques & Membres',
    title: 'Consulter la page Bibliothèques & Réglages',
    description: 'Accès aux bibliothèques partagées, codes d’invitation et préférences personnelles.',
    admin: true,
    setlists: true,
    chants: true,
    pupitre: true,
    regie: false,
    note: 'Masqué si le compte possède uniquement l’accès Régie'
  },
  {
    category: 'Répertoire & Chants',
    title: 'Créer, importer et modifier des chants',
    description: 'Éditeur ChordPro, import texte/web, catégories, tonalités et traductions enregistrées.',
    admin: true,
    setlists: false,
    chants: true,
    pupitre: false,
    regie: false
  },
  {
    category: 'Répertoire & Chants',
    title: 'Supprimer des chants du répertoire',
    description: 'Retirer définitivement un chant de la bibliothèque partagée.',
    admin: true,
    setlists: false,
    chants: true,
    pupitre: false,
    regie: false
  },
  {
    category: 'Répertoire & Chants',
    title: 'Consulter l’onglet Chants (Répertoire)',
    description: 'Recherche et lecture des fiches de chants.',
    admin: true,
    setlists: true,
    chants: true,
    pupitre: true,
    regie: false
  },
  {
    category: 'Setlists & Direction',
    title: 'Créer, organiser et supprimer des setlists',
    description: 'Préparation des programmes et fixation des tonalités/tempos par défaut de l’équipe.',
    admin: true,
    setlists: true,
    chants: false,
    pupitre: false,
    regie: false
  },
  {
    category: 'Setlists & Direction',
    title: 'Consulter l’onglet Setlists et suivre le programme',
    description: 'Accès en lecture aux setlists synchronisées du groupe.',
    admin: true,
    setlists: true,
    chants: false,
    pupitre: true,
    regie: false
  },
  {
    category: 'Pupitre & Scène',
    title: 'Mode Scène, transposition & capo personnels',
    description: 'Affichage pupitre et réglages individuels sans impact sur la bibliothèque.',
    admin: true,
    setlists: true,
    chants: true,
    pupitre: 'personal-only',
    regie: false
  },
  {
    category: 'Pupitre & Scène',
    title: 'Outils musiciens (Métronome, Mini clavier, Accordeur)',
    description: 'Outils sonores accessibles dans la barre de navigation.',
    admin: true,
    setlists: true,
    chants: true,
    pupitre: true,
    regie: false
  },
  {
    category: 'Projections (Régie)',
    title: 'Module Projections & écran de diffusion',
    description: 'Projection des paroles, passages bibliques, médias et compte à rebours.',
    admin: true,
    setlists: true,
    chants: true,
    pupitre: true,
    regie: true,
    note: 'Avec Régie seul : uniquement le module Projections est accessible'
  }
];

const ACCESS_COLUMNS: {
  key: AccessPermission;
  icon: React.FC<{ className?: string }>;
  headerColor: string;
}[] = [
  { key: 'admin', icon: Shield, headerColor: 'text-blue-300 bg-blue-500/5' },
  { key: 'setlists', icon: Award, headerColor: 'text-emerald-300 bg-emerald-500/5' },
  { key: 'chants', icon: FileEdit, headerColor: 'text-amber-300 bg-amber-500/5' },
  { key: 'pupitre', icon: UserCheck, headerColor: 'text-purple-300 bg-purple-500/5' },
  { key: 'regie', icon: Monitor, headerColor: 'text-cyan-300 bg-cyan-500/5' }
];

export const RoleMatrixModal: React.FC<RoleMatrixModalProps> = ({
  isOpen,
  onClose,
  currentAccesses,
  currentRole
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeAccesses = useMemo(() => {
    if (currentAccesses && currentAccesses.length > 0) return currentAccesses;
    if (currentRole) return legacyRoleToAccesses(currentRole);
    return [];
  }, [currentAccesses, currentRole]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const categories = useMemo(() => {
    const set = new Set(PERMISSION_DATA.map(p => p.category));
    return ['all', ...Array.from(set)];
  }, []);

  const filteredPermissions = useMemo(() => {
    return PERMISSION_DATA.filter(item => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.trim();
      const matchSearch = !q ||
        includesIgnoreAccents(item.title, q) ||
        includesIgnoreAccents(item.description, q) ||
        includesIgnoreAccents(item.category, q);
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const renderBadge = (val: boolean | 'admin-only' | 'personal-only') => {
    if (val === true) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
          <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
          <span>Oui</span>
        </span>
      );
    }
    if (val === 'admin-only') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 whitespace-nowrap" title="Exclusif Admin">
          <Shield className="w-3 h-3 text-blue-400" />
          <span>Admin</span>
        </span>
      );
    }
    if (val === 'personal-only') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/20 text-purple-200 border border-purple-500/40 whitespace-nowrap" title="Réglage personnel isolé">
          <Check className="w-3 h-3 text-purple-300 stroke-[2.5]" />
          <span>Perso</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 font-bold text-xs" title="Non inclus">
        —
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#111116] border border-[#2A2A38] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-[#E0E0E0]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-[#242430] bg-[#14141B] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Tableau Comparatif des Accès Cumulables
                </h2>
                {activeAccesses.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30">
                    Vos accès : {ACCESS_ORDER.filter(a => activeAccesses.includes(a)).map(a => ACCESS_DEFINITIONS[a].label).join(' · ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Chaque membre peut cumuler plusieurs accès selon son rôle dans la bibliothèque. Admin active automatiquement les 4 autres accès.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#20202C] transition-colors cursor-pointer shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
              {categories.map(cat => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer text-xs ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'bg-[#181820] hover:bg-[#22222C] text-gray-300 border border-[#282836]'
                    }`}
                  >
                    {cat === 'all' ? 'Toutes les catégories' : cat}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-64 shrink-0">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer une permission..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#181820] border border-[#2E2E3C] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#262634] overflow-hidden bg-[#14141B] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-[#242432] bg-[#181822]">
                    <th className="py-3 px-4 font-bold text-gray-300 w-[34%] align-top">
                      <div>Fonctionnalité & Module</div>
                      <div className="text-[10px] font-normal text-gray-400 mt-1">
                        Survolez un accès pour voir son détail
                      </div>
                    </th>
                    {ACCESS_COLUMNS.map((col) => {
                      const meta = ACCESS_DEFINITIONS[col.key];
                      const Icon = col.icon;
                      const isHeld = activeAccesses.includes(col.key);
                      return (
                        <th
                          key={col.key}
                          title={meta.description}
                          className={`py-3 px-2.5 font-bold text-center border-l border-[#242432] align-top ${col.headerColor} ${
                            isHeld ? 'ring-1 ring-inset ring-blue-500/50 bg-blue-500/10' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <Icon className="w-4 h-4" />
                            <span>{meta.label}</span>
                            {isHeld && (
                              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-200 border border-blue-400/40 font-semibold">
                                Actif
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#20202C]">
                  {filteredPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Aucune permission ne correspond à votre recherche « {searchQuery} ».
                      </td>
                    </tr>
                  ) : (
                    filteredPermissions.map((row, idx) => {
                      const isCatFirst = idx === 0 || filteredPermissions[idx - 1].category !== row.category;
                      return (
                        <React.Fragment key={`${row.category}-${row.title}-${idx}`}>
                          {isCatFirst && selectedCategory === 'all' && (
                            <tr className="bg-[#121218]">
                              <td colSpan={6} className="py-2 px-4 text-[11px] font-bold uppercase tracking-wider text-blue-400 border-t border-b border-[#282838]">
                                {row.category}
                              </td>
                            </tr>
                          )}
                          <tr className="hover:bg-[#1A1A24] transition-colors">
                            <td className="py-3 px-4 align-middle">
                              <div className="font-semibold text-white">{row.title}</div>
                              <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                                {row.description}
                              </div>
                              {row.note && (
                                <div className="inline-flex items-center gap-1 text-[10px] text-amber-400 mt-1 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                                  <Info className="w-2.5 h-2.5 shrink-0" />
                                  <span>{row.note}</span>
                                </div>
                              )}
                            </td>
                            {ACCESS_COLUMNS.map(col => (
                              <td
                                key={col.key}
                                className={`py-3 px-3 text-center align-middle border-l border-[#22222E] ${
                                  activeAccesses.includes(col.key) ? 'bg-blue-500/8' : ''
                                }`}
                              >
                                {renderBadge(row[col.key])}
                              </td>
                            ))}
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#16161E] border border-[#242432] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-1.5">
              <div className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Principe du cumul des accès :</span>
              </div>
              <p className="text-[11px] text-gray-300">
                Un membre reçoit la somme de ses accès cochés. Exemple : <strong>Chants + Régie</strong> gère le répertoire et la projection sans pouvoir modifier les setlists ; <strong>Régie</strong> seul n’ouvre que le module Projections.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#242430] bg-[#14141B] flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            {filteredPermissions.length} règle{filteredPermissions.length > 1 ? 's' : ''} affichée{filteredPermissions.length > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
