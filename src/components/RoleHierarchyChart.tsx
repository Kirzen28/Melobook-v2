import React, { useState } from 'react';
import { 
  Shield, 
  Award, 
  FileEdit, 
  UserCheck, 
  Monitor, 
  ChevronRight, 
  ArrowDown, 
  Check, 
  X, 
  Info, 
  Sparkles, 
  Users, 
  Layers, 
  SlidersHorizontal,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';

interface RoleNode {
  role: UserRole;
  level: number;
  levelLabel: string;
  label: string;
  emoji: string;
  icon: React.FC<{ className?: string }>;
  tagline: string;
  theme: {
    bg: string;
    border: string;
    text: string;
    ring: string;
    badge: string;
    glow: string;
    connector: string;
  };
  delegationFrom: string;
  delegationTo: string;
  canDo: string[];
  cannotDo: string[];
}

const HIERARCHY_ROLES: RoleNode[] = [
  {
    role: 'admin',
    level: 5,
    levelLabel: 'Niveau 5 · Gouvernance & Gestion Totale',
    label: 'Administrateur',
    emoji: '👑',
    icon: Shield,
    tagline: 'Accès absolu. Contrôle les bibliothèques, les rôles, les répertoires et les réglages.',
    theme: {
      bg: 'bg-blue-600/10 hover:bg-blue-600/15',
      border: 'border-blue-500/40 hover:border-blue-500/70',
      text: 'text-blue-300',
      ring: 'ring-blue-500/40',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      glow: 'shadow-blue-500/10',
      connector: 'from-blue-500 to-emerald-500'
    },
    delegationFrom: 'Super-administrateur (Propriétaire de l’espace)',
    delegationTo: 'Responsables, Éditeurs, Membres & Régie',
    canDo: [
      'Créer, modifier et supprimer des bibliothèques',
      'Attribuer les rôles et permissions de tous les utilisateurs',
      'Créer, modifier et supprimer chants et setlists',
      'Définir les tonalités par défaut pour tout le groupe',
      'Accès aux réglages avancés et synchronisation Firestore'
    ],
    cannotDo: []
  },
  {
    role: 'leader',
    level: 4,
    levelLabel: 'Niveau 4 · Direction Musicale & Cultes',
    label: 'Responsable',
    emoji: '⚡',
    icon: Award,
    tagline: 'Chef de louange / Directeur musical. Fixe les programmes, l’ordre et les tonalités officielles.',
    theme: {
      bg: 'bg-emerald-600/10 hover:bg-emerald-600/15',
      border: 'border-emerald-500/40 hover:border-emerald-500/70',
      text: 'text-emerald-300',
      ring: 'ring-emerald-500/40',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      glow: 'shadow-emerald-500/10',
      connector: 'from-emerald-500 to-amber-500'
    },
    delegationFrom: 'Administrateur',
    delegationTo: 'Membres (Musiciens) & Régie',
    canDo: [
      'Créer, organiser et ordonner les setlists de concert/culte',
      'Fixer la tonalité et le tempo par défaut du groupe',
      'Ajouter, éditer et supprimer des chants du répertoire',
      'Mode Scène, métronome, accordeur et historique'
    ],
    cannotDo: [
      'Créer ou supprimer des bibliothèques partagées',
      'Changer les rôles des autres membres ou nommer des admins',
      'Accéder aux réglages de synchronisation générale'
    ]
  },
  {
    role: 'editor',
    level: 3,
    levelLabel: 'Niveau 3 · Enrichissement & Scribe ChordPro',
    label: 'Éditeur',
    emoji: '✍️',
    icon: FileEdit,
    tagline: 'Responsable des partitions. Saisie, import et correction des grilles d’accords et paroles.',
    theme: {
      bg: 'bg-amber-600/10 hover:bg-amber-600/15',
      border: 'border-amber-500/40 hover:border-amber-500/70',
      text: 'text-amber-300',
      ring: 'ring-amber-500/40',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      glow: 'shadow-amber-500/10',
      connector: 'from-amber-500 to-purple-500'
    },
    delegationFrom: 'Administrateur',
    delegationTo: 'Alimente le répertoire partagé',
    canDo: [
      'Créer et importer des chants (ChordPro, texte, UG)',
      'Modifier paroles, accords racine et métadonnées du répertoire',
      'Consulter toutes les setlists synchronisées',
      'Mode Scène et transposition personnelle'
    ],
    cannotDo: [
      'Modifier ou supprimer les setlists officielles',
      'Imposer une tonalité par défaut à toute l’équipe',
      'Gérer les membres ou les bibliothèques'
    ]
  },
  {
    role: 'member',
    level: 2,
    levelLabel: 'Niveau 2 · Pupitre, Musiciens & Choristes',
    label: 'Membre',
    emoji: '🎵',
    icon: UserCheck,
    tagline: 'Musicien ou chantre. Répète et joue en direct avec transposition & capo personnels isolés.',
    theme: {
      bg: 'bg-purple-600/10 hover:bg-purple-600/15',
      border: 'border-purple-500/40 hover:border-purple-500/70',
      text: 'text-purple-300',
      ring: 'ring-purple-500/40',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      glow: 'shadow-purple-500/10',
      connector: 'from-purple-500 to-cyan-500'
    },
    delegationFrom: 'Responsable & Administrateur',
    delegationTo: 'Usage individuel sur scène / pupitre',
    canDo: [
      'Consulter en direct le répertoire et les setlists du groupe',
      'Régler sa transposition et son capo personnels (sans toucher au groupe)',
      'Mode Scène (défilement automatique, métronome, accordeur)',
      'Passage des chants au pied (pédalier Bluetooth / MIDI)'
    ],
    cannotDo: [
      'Modifier les chants de la bibliothèque globale',
      'Modifier ou créer des setlists pour le groupe',
      'Imposer sa propre tonalité aux autres musiciens'
    ]
  },
  {
    role: 'viewer',
    level: 1,
    levelLabel: 'Niveau 1 · Régie Vidéo & Écran Retour',
    label: 'Régie / Lecteur',
    emoji: '🖥️',
    icon: Monitor,
    tagline: 'Projection grand écran ou observateur. Lecture seule protégée contre toute fausse manipulation.',
    theme: {
      bg: 'bg-cyan-600/10 hover:bg-cyan-600/15',
      border: 'border-cyan-500/40 hover:border-cyan-500/70',
      text: 'text-cyan-300',
      ring: 'ring-cyan-500/40',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      glow: 'shadow-cyan-500/10',
      connector: 'from-cyan-500 to-gray-600'
    },
    delegationFrom: 'Responsable & Administrateur',
    delegationTo: 'Affichage public / Régie son & vidéo',
    canDo: [
      'Affichage grand écran des paroles et accords',
      'Consultation des setlists en direct',
      'Sécurité totale anti-fausse manipulation'
    ],
    cannotDo: [
      'Modifier les chants ou les setlists',
      'Écraser les données du répertoire',
      'Gérer les membres ou les paramètres'
    ]
  }
];

// Actions tests pour le simulateur d'autorisations interactif
interface CapabilityTest {
  id: string;
  name: string;
  description: string;
  allowedRoles: UserRole[];
  personalRoles?: UserRole[];
  explanation: string;
}

const CAPABILITY_TESTS: CapabilityTest[] = [
  {
    id: 'manage-setlist',
    name: 'Créer & ordonner une setlist de concert/culte',
    description: 'Préparer la liste officielle des chants pour l’équipe.',
    allowedRoles: ['admin', 'leader'],
    explanation: 'Seuls l’Administrateur et le Responsable ont l’autorité de construire le programme officiel.'
  },
  {
    id: 'set-default-key',
    name: 'Fixer la tonalité par défaut pour toute l’équipe',
    description: 'Définir la clé de référence qui s’affiche pour tous les membres.',
    allowedRoles: ['admin', 'leader'],
    explanation: 'Le Responsable ou l’Admin définit la clé collective synchronisée en temps réel.'
  },
  {
    id: 'personal-transpose',
    name: 'Transposer ou mettre un Capo pour soi-même',
    description: 'Ajuster son instrument personnel sans modifier la version du groupe.',
    allowedRoles: ['admin', 'leader', 'editor', 'member'],
    personalRoles: ['member'],
    explanation: 'Tous les musiciens peuvent ajuster leur tonalité ou leur capo localement sur leur pupitre.'
  },
  {
    id: 'edit-chordpro',
    name: 'Créer & corriger les grilles ChordPro dans le répertoire',
    description: 'Saisir les paroles et enrichir les accords sources.',
    allowedRoles: ['admin', 'leader', 'editor'],
    explanation: 'L’Éditeur, le Responsable et l’Admin maintiennent le répertoire partagé.'
  },
  {
    id: 'manage-libraries',
    name: 'Créer, renommer ou supprimer une bibliothèque',
    description: 'Gouvernance globale et cloisonnement des espaces.',
    allowedRoles: ['admin'],
    explanation: 'Pouvoir exclusif de l’Administrateur pour protéger l’intégrité des données.'
  },
  {
    id: 'assign-roles',
    name: 'Nommer des responsables et changer les rôles',
    description: 'Gérer les permissions des comptes musiciens.',
    allowedRoles: ['admin'],
    explanation: 'Réservé à l’Administrateur afin de garantir une gouvernance claire.'
  },
  {
    id: 'projection-mode',
    name: 'Projeter les paroles en régie grand écran',
    description: 'Affichage des paroles sans risque d’édition accidentelle.',
    allowedRoles: ['admin', 'leader', 'editor', 'member', 'viewer'],
    explanation: 'Accessible à tous les rôles, et spécialement optimisé pour la Régie / Lecteur.'
  }
];

interface RoleHierarchyChartProps {
  allUsers: UserProfile[];
  currentRole?: UserRole;
  onOpenMatrixModal?: () => void;
}

export const RoleHierarchyChart: React.FC<RoleHierarchyChartProps> = ({
  allUsers,
  currentRole,
  onOpenMatrixModal
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole || 'leader');
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  const activeNode = HIERARCHY_ROLES.find(r => r.role === selectedRole) || HIERARCHY_ROLES[0];
  const activeTest = CAPABILITY_TESTS.find(t => t.id === activeTestId);

  // Nombre d'utilisateurs par rôle
  const userCountsByRole = React.useMemo(() => {
    const counts: Record<UserRole, number> = {
      admin: 0,
      leader: 0,
      editor: 0,
      member: 0,
      viewer: 0
    };
    allUsers.forEach(u => {
      const r = (u.role as UserRole) || 'member';
      if (counts[r] !== undefined) {
        counts[r]++;
      } else {
        counts.member++;
      }
    });
    return counts;
  }, [allUsers]);

  return (
    <div className="bg-[#121217] border border-[#262634] rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
      
      {/* En-tête du diagramme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#22222E]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/30 via-indigo-600/20 to-purple-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Arborescence & Hiérarchie des Rôles</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                Interactif
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Explorez les 5 niveaux de délégation et testez les permissions en direct.
            </p>
          </div>
        </div>

        {onOpenMatrixModal && (
          <button
            type="button"
            onClick={onOpenMatrixModal}
            className="px-3 py-1.5 rounded-lg bg-[#1A1A24] hover:bg-[#242432] text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 self-start sm:self-auto"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Tableau comparatif détaillé</span>
          </button>
        )}
      </div>

      {/* Simulateur d'actions interactif (testeur de droits) */}
      <div className="p-3.5 rounded-xl bg-[#161620] border border-[#252534] space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Simulateur interactif : Qui peut faire cette action ?</span>
          </div>
          {activeTestId && (
            <button
              type="button"
              onClick={() => setActiveTestId(null)}
              className="text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Réinitialiser le simulateur
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
          {CAPABILITY_TESTS.map(t => {
            const isSelected = activeTestId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTestId(isSelected ? null : t.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold shadow-xs ring-1 ring-blue-400'
                    : 'bg-[#1C1C26] hover:bg-[#252532] text-gray-300 border border-[#2B2B3C]'
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        {activeTest && (
          <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-200">{activeTest.name} : </span>
              <span className="text-gray-300">{activeTest.explanation}</span>
            </div>
          </div>
        )}
      </div>

      {/* Disposition principale : Diagramme hiérarchique (gauche) & Fiche inspecteur (droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Colonne gauche : Diagramme vertical en cascade / pyramide */}
        <div className="lg:col-span-7 space-y-3">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Ordre hiérarchique & Cascade de délégation</span>
            <span className="text-gray-500 font-normal">Cliquez sur un rôle pour inspecter</span>
          </div>

          <div className="space-y-2 relative">
            {HIERARCHY_ROLES.map((node, index) => {
              const isSelected = selectedRole === node.role;
              const userCount = userCountsByRole[node.role] || 0;
              const IconComp = node.icon;
              
              // Statut vis-à-vis du test interactif actif
              const isTestAllowed = activeTest?.allowedRoles.includes(node.role);
              const isTestPersonal = activeTest?.personalRoles?.includes(node.role);

              return (
                <div key={node.role} className="relative">
                  {/* Connecteur visuel vers le bas sauf pour le dernier */}
                  {index < HIERARCHY_ROLES.length - 1 && (
                    <div className="absolute left-6 top-full h-2 w-0.5 bg-gradient-to-b from-[#333345] to-[#252534] z-0" />
                  )}

                  <div
                    onClick={() => setSelectedRole(node.role)}
                    className={`relative z-10 p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? `${node.theme.bg} ${node.theme.border} ring-2 ${node.theme.ring} shadow-md`
                        : 'bg-[#15151C] hover:bg-[#1A1A24] border-[#252532] text-gray-300'
                    } ${activeTest && !isTestAllowed ? 'opacity-40 hover:opacity-70' : ''}`}
                  >
                    {/* Partie gauche : Badge niveau + Icône + Nom du rôle */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${node.theme.badge}`}>
                        <IconComp className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                            <span>{node.emoji}</span>
                            <span>{node.label}</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            NV {node.level}
                          </span>
                          {currentRole === node.role && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-600/30 text-blue-300 border border-blue-500/40">
                              Votre Rôle
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 truncate mt-0.5 max-w-xs sm:max-w-md">
                          {node.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Partie droite : Résultat du test OU décompte membres */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {activeTest ? (
                        isTestAllowed ? (
                          isTestPersonal ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                              <span>Perso</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Autorisé</span>
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Bloqué</span>
                          </span>
                        )
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#1A1A24] px-2 py-1 rounded-lg border border-[#2B2B3A]">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span className="font-semibold text-white">{userCount}</span>
                          <span className="hidden sm:inline text-[11px]">membre{userCount > 1 ? 's' : ''}</span>
                        </div>
                      )}

                      <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-white' : 'text-gray-500'}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-[#14141B] border border-[#22222E] flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Principe d’héritage : l’Administrateur possède automatiquement les droits des niveaux inférieurs.</span>
            </span>
          </div>
        </div>

        {/* Colonne droite : Fiche d'inspection du rôle sélectionné */}
        <div className="lg:col-span-5 bg-[#16161F] border border-[#2A2A3A] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#242434]">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{activeNode.emoji}</span>
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{activeNode.label}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${activeNode.theme.badge}`}>
                    {activeNode.role}
                  </span>
                </h4>
                <span className="text-[11px] text-gray-400">{activeNode.levelLabel}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-gray-400 block">Effectif actuel</span>
              <span className="text-sm font-bold text-white">
                {userCountsByRole[activeNode.role] || 0} utilisateur{(userCountsByRole[activeNode.role] || 0) > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            {activeNode.tagline}
          </p>

          {/* Relations de délégation */}
          <div className="p-2.5 rounded-lg bg-[#111116] border border-[#22222E] text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-400 text-[11px]">Délégation reçue de :</span>
              <span className="text-white font-medium text-[11px]">{activeNode.delegationFrom}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-400 text-[11px]">Délégation accordée à :</span>
              <span className="text-white font-medium text-[11px]">{activeNode.delegationTo}</span>
            </div>
          </div>

          {/* Ce que ce rôle PEUT faire */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Pouvoirs & Droits d’accès :</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-300">
              {activeNode.canDo.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ce que ce rôle NE PEUT PAS faire */}
          {activeNode.cannotDo.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[#22222E]">
              <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 stroke-[3]" />
                <span>Restrictions & Limites :</span>
              </div>
              <ul className="space-y-1 text-xs text-gray-400">
                {activeNode.cannotDo.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-400/80 font-bold shrink-0">✗</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Astuce de fonctionnement */}
          <div className="p-2.5 rounded-lg bg-[#13131A] border border-[#22222E] text-[11px] text-gray-400 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Sur scène :</strong> Même avec le rôle <em>{activeNode.label}</em>, les réglages de tonalité et de capo modifiés dans le pupitre restent personnels et n’affectent jamais les fiches sources du groupe.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
