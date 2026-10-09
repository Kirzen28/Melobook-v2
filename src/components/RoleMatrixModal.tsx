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
  Sparkles,
  BookOpen,
  ListMusic,
  Tv,
  HelpCircle
} from 'lucide-react';
import { UserRole } from '../types';

export interface RoleMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: UserRole;
}

interface PermissionRow {
  category: string;
  title: string;
  description: string;
  admin: boolean | 'admin-only';
  leader: boolean;
  editor: boolean;
  member: boolean | 'personal-only';
  viewer: boolean;
  note?: string;
}

const PERMISSION_DATA: PermissionRow[] = [
  // Catégorie : Bibliothèques & Membres
  {
    category: 'Bibliothèques & Membres',
    title: 'Créer de nouvelles bibliothèques',
    description: 'Création de répertoires indépendants et cloisonnés pour différents groupes ou assemblées.',
    admin: true,
    leader: false,
    editor: false,
    member: false,
    viewer: false,
  },
  {
    category: 'Bibliothèques & Membres',
    title: 'Modifier le nom et la description d’une bibliothèque',
    description: 'Renommer et ajuster les métadonnées de la bibliothèque active.',
    admin: true,
    leader: false,
    editor: false,
    member: false,
    viewer: false,
  },
  {
    category: 'Bibliothèques & Membres',
    title: 'Supprimer définitivement une bibliothèque',
    description: 'Suppression irréversible d’une bibliothèque et optionnellement de ses chants.',
    admin: 'admin-only',
    leader: false,
    editor: false,
    member: false,
    viewer: false,
  },
  {
    category: 'Bibliothèques & Membres',
    title: 'Attribuer ou modifier les rôles des membres',
    description: 'Promouvoir un membre en Responsable, Éditeur, ou Régie, et gérer les permissions.',
    admin: true,
    leader: false,
    editor: false,
    member: false,
    viewer: false,
  },
  {
    category: 'Bibliothèques & Membres',
    title: 'Assigner des membres aux bibliothèques (Multiselect)',
    description: 'Ajouter ou retirer des comptes musiciens dans une bibliothèque.',
    admin: true,
    leader: false,
    editor: false,
    member: false,
    viewer: false,
  },
  {
    category: 'Bibliothèques & Membres',
    title: 'Partager le code d’invitation de la bibliothèque',
    description: 'Copier et transmettre le code à 6 caractères pour permettre de rejoindre le groupe.',
    admin: true,
    leader: true,
    editor: true,
    member: true,
    viewer: true,
  },

  // Catégorie : Répertoire & Chants
  {
    category: 'Répertoire & Chants',
    title: 'Créer de nouveaux chants',
    description: 'Ajout de nouveaux chants avec éditeur ChordPro ou saisie manuelle.',
    admin: true,
    leader: true,
    editor: true,
    member: false,
    viewer: false,
  },
  {
    category: 'Répertoire & Chants',
    title: 'Importer des chants (ChordPro, .txt, Ultimate-Guitar)',
    description: 'Import de fichiers texte externes et conversion automatique en grilles d’accords.',
    admin: true,
    leader: true,
    editor: true,
    member: false,
    viewer: false,
  },
  {
    category: 'Répertoire & Chants',
    title: 'Modifier paroles, accords racine et métadonnées',
    description: 'Correction de paroles, alignement des accords ChordPro et tempo de référence.',
    admin: true,
    leader: true,
    editor: true,
    member: false,
    viewer: false,
  },
  {
    category: 'Répertoire & Chants',
    title: 'Supprimer des chants du répertoire',
    description: 'Retirer définitivement un chant de la bibliothèque partagée.',
    admin: true,
    leader: true,
    editor: true,
    member: false,
    viewer: false,
  },
  {
    category: 'Répertoire & Chants',
    title: 'Consulter l’ensemble du répertoire',
    description: 'Recherche instantanée par titre, auteur, tonalité, tags et paroles.',
    admin: true,
    leader: true,
    editor: true,
    member: true,
    viewer: true,
  },

  // Catégorie : Setlists & Conduite Musicale
  {
    category: 'Setlists & Direction',
    title: 'Créer, renommer et organiser des setlists',
    description: 'Préparation des programmes de culte, répétition ou concert avec ordre des chants.',
    admin: true,
    leader: true,
    editor: false,
    member: false,
    viewer: false,
  },
  {
    category: 'Setlists & Direction',
    title: 'Définir la tonalité & tempo par défaut pour l’équipe',
    description: 'Fixe la tonalité officielle de la setlist qui s’affichera par défaut pour tous les membres.',
    admin: true,
    leader: true,
    editor: false,
    member: false,
    viewer: false,
    note: 'S’applique à toute l’équipe connectée à la setlist'
  },
  {
    category: 'Setlists & Direction',
    title: 'Ajouter ou retirer des chants d’une setlist',
    description: 'Sélectionner des titres du répertoire pour composer le programme.',
    admin: true,
    leader: true,
    editor: false,
    member: false,
    viewer: false,
  },
  {
    category: 'Setlists & Direction',
    title: 'Supprimer des setlists',
    description: 'Suppression définitive d’une liste de chants préparée.',
    admin: true,
    leader: true,
    editor: false,
    member: false,
    viewer: false,
  },
  {
    category: 'Setlists & Direction',
    title: 'Consulter et suivre les setlists en direct',
    description: 'Accès synchronisé aux setlists créées par les responsables pour répéter et jouer.',
    admin: true,
    leader: true,
    editor: true,
    member: true,
    viewer: true,
  },

  // Catégorie : Scène, Pupitre & Régie
  {
    category: 'Scène, Pupitre & Régie',
    title: 'Transposition & Capodastre individuels sur scène',
    description: 'Changer la clé ou ajouter un capo pour son instrument personnel sans modifier la version du groupe.',
    admin: true,
    leader: true,
    editor: true,
    member: 'personal-only',
    viewer: false,
    note: 'Réglage local isolé : n’impacte aucun autre musicien'
  },
  {
    category: 'Scène, Pupitre & Régie',
    title: 'Mode Scène & Pupitre numérique',
    description: 'Affichage épuré grand écran, défilement automatique continu et passage de chant au pied/MIDI.',
    admin: true,
    leader: true,
    editor: true,
    member: true,
    viewer: true,
  },
  {
    category: 'Scène, Pupitre & Régie',
    title: 'Outils de répétition (Métronome, Accordeur, Mini Piano)',
    description: 'Outils sonores intégrés pour le travail personnel et l’écoute.',
    admin: true,
    leader: true,
    editor: true,
    member: true,
    viewer: true,
  },
  {
    category: 'Scène, Pupitre & Régie',
    title: 'Projection paroles grand écran / Régie vidéo',
    description: 'Vue plein écran adaptée pour projeter les paroles ou un retour régie sans risque d’édition.',
    admin: true,
    leader: true,
    editor: true,
    member: true,
    viewer: true,
    note: 'Idéal pour le rôle Régie / Lecteur'
  },
  {
    category: 'Scène, Pupitre & Régie',
    title: 'Sauvegarder les modifications dans le répertoire général',
    description: 'Bouton d’écrasement de la fiche source du répertoire principal.',
    admin: true,
    leader: true,
    editor: true,
    member: false,
    viewer: false,
  }
];

const ROLES_INFO: {
  role: UserRole;
  label: string;
  emoji: string;
  icon: React.FC<{ className?: string }>;
  tagStyle: string;
  bgHighlight: string;
  borderColor: string;
  forWhom: string;
  summary: string;
}[] = [
  {
    role: 'admin',
    label: 'Administrateur',
    emoji: '👑',
    icon: Shield,
    tagStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    bgHighlight: 'bg-blue-500/5',
    borderColor: 'border-blue-500/30',
    forWhom: 'Pasteur, Coordinateur, Responsable Technique',
    summary: 'Accès absolu : gestion des bibliothèques, rôles des comptes, réglages généraux et répertoire.'
  },
  {
    role: 'leader',
    label: 'Responsable',
    emoji: '⚡',
    icon: Award,
    tagStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    bgHighlight: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/30',
    forWhom: 'Chef de louange, Directeur musical, Chef de chœur',
    summary: 'Direction musicale : création des setlists, fixation des tonalités pour tous, gestion des chants.'
  },
  {
    role: 'editor',
    label: 'Éditeur',
    emoji: '✍️',
    icon: FileEdit,
    tagStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    bgHighlight: 'bg-amber-500/5',
    borderColor: 'border-amber-500/30',
    forWhom: 'Scribe, Secrétaire musical, Rédacteur de chants',
    summary: 'Enrichissement du répertoire : création et correction des paroles et accords ChordPro (pas de setlist).'
  },
  {
    role: 'member',
    label: 'Membre',
    emoji: '🎵',
    icon: UserCheck,
    tagStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    bgHighlight: 'bg-purple-500/5',
    borderColor: 'border-purple-500/30',
    forWhom: 'Musiciens, Instrumentistes, Choristes',
    summary: 'Jeu sur scène : consultation des setlists en direct, transposition & capo personnels isolés.'
  },
  {
    role: 'viewer',
    label: 'Régie / Lecteur',
    emoji: '🖥️',
    icon: Monitor,
    tagStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    bgHighlight: 'bg-cyan-500/5',
    borderColor: 'border-cyan-500/30',
    forWhom: 'Régie vidéo / projection, Observateur, Remplaçant',
    summary: 'Lecture seule absolue : projection des paroles, aucune fausse manipulation possible.'
  }
];

export const RoleMatrixModal: React.FC<RoleMatrixModalProps> = ({
  isOpen,
  onClose,
  currentRole
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape key
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
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 whitespace-nowrap" title="Exclusif Administrateur">
          <Shield className="w-3 h-3 text-blue-400" />
          <span>Admin</span>
        </span>
      );
    }
    if (val === 'personal-only') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/20 text-purple-200 border border-purple-500/40 whitespace-nowrap" title="Réglage personnel sans impacter le groupe">
          <Check className="w-3 h-3 text-purple-300 stroke-[2.5]" />
          <span>Perso</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-500 font-bold text-xs" title="Non autorisé">
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
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-[#242430] bg-[#14141B] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Tableau Comparatif des Rôles & Permissions
                </h2>
                {currentRole && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30">
                    Votre rôle actuel : {ROLES_INFO.find(r => r.role === currentRole)?.label || currentRole}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Visualisez facilement les privilèges de chaque profil pour collaborer sereinement au sein de vos équipes.
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

        {/* Corps déroulant */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Cartes de synthèse des 5 rôles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {ROLES_INFO.map(r => {
              const isCurrent = currentRole === r.role;
              const IconComp = r.icon;
              return (
                <div 
                  key={r.role}
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    isCurrent 
                      ? `${r.bgHighlight} border-blue-500 ring-1 ring-blue-500/40` 
                      : 'bg-[#16161E] border-[#262634]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{r.emoji}</span>
                        <span className="font-bold text-xs text-white truncate">{r.label}</span>
                      </div>
                      <IconComp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </div>

                    <div className="mb-2">
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${r.tagStyle}`}>
                        {r.role}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-300 leading-snug mb-2 font-normal">
                      {r.summary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#22222E] text-[10px] text-gray-400 italic">
                    <span className="text-gray-500 block not-italic font-semibold">Idéal pour :</span>
                    {r.forWhom}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barre de filtres et recherche */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
            {/* Onglets de catégories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
              {categories.map(cat => {
                const label = 
                  cat === 'all' ? 'Toutes les catégories' :
                  cat === 'Bibliothèques & Membres' ? '📁 Bibliothèques & Membres' :
                  cat === 'Répertoire & Chants' ? '📖 Chants & Répertoire' :
                  cat === 'Setlists & Direction' ? '📋 Setlists & Conduite' :
                  cat === 'Scène, Pupitre & Régie' ? '🎸 Scène, Pupitre & Régie' : cat;
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
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Champ de recherche */}
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

          {/* Tableau Comparatif Principal */}
          <div className="rounded-xl border border-[#262634] overflow-hidden bg-[#14141B] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#242432] bg-[#181822]">
                    <th className="py-3 px-4 font-bold text-gray-300 w-2/5">
                      Fonctionnalité & Droit d’accès
                    </th>
                    <th className="py-3 px-3 font-bold text-center text-blue-300 border-l border-[#242432] w-1/8 bg-blue-500/5">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">👑</span>
                        <span>Admin</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 font-bold text-center text-emerald-300 border-l border-[#242432] w-1/8 bg-emerald-500/5">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">⚡</span>
                        <span>Responsable</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 font-bold text-center text-amber-300 border-l border-[#242432] w-1/8 bg-amber-500/5">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">✍️</span>
                        <span>Éditeur</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 font-bold text-center text-purple-300 border-l border-[#242432] w-1/8 bg-purple-500/5">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">🎵</span>
                        <span>Membre</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 font-bold text-center text-cyan-300 border-l border-[#242432] w-1/8 bg-cyan-500/5">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">🖥️</span>
                        <span>Régie</span>
                      </div>
                    </th>
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
                            <td className="py-3 px-3 text-center align-middle border-l border-[#22222E] bg-blue-500/2">
                              {renderBadge(row.admin)}
                            </td>
                            <td className="py-3 px-3 text-center align-middle border-l border-[#22222E] bg-emerald-500/2">
                              {renderBadge(row.leader)}
                            </td>
                            <td className="py-3 px-3 text-center align-middle border-l border-[#22222E] bg-amber-500/2">
                              {renderBadge(row.editor)}
                            </td>
                            <td className="py-3 px-3 text-center align-middle border-l border-[#22222E] bg-purple-500/2">
                              {renderBadge(row.member)}
                            </td>
                            <td className="py-3 px-3 text-center align-middle border-l border-[#22222E] bg-cyan-500/2">
                              {renderBadge(row.viewer)}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Légende explicative & règles de collaboration */}
          <div className="p-4 rounded-xl bg-[#16161E] border border-[#242432] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-1.5">
              <div className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Légende du comparatif :</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap text-[11px] text-gray-300">
                <span className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">Oui</span>
                  <span>Autorisé pour ce rôle</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-200 border border-purple-500/30 font-bold">Perso</span>
                  <span>Réglage individuel isolé (n’affecte pas les autres membres)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-bold">—</span>
                  <span>Accès refusé / Action non permise</span>
                </span>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 max-w-sm">
              💡 <strong>Règle d’or Melobook :</strong> Le créateur de la setlist fixe la tonalité par défaut, mais chaque musicien peut librement transposer et régler son capodastre pour son pupitre sans altérer la bibliothèque.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#242430] bg-[#14141B] flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            {filteredPermissions.length} règle{filteredPermissions.length > 1 ? 's' : ''} de permission affichée{filteredPermissions.length > 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Fermer le tableau
          </button>
        </div>

      </div>
    </div>
  );
};
