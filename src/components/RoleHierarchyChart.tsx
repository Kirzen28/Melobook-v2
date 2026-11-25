import React, { useState } from 'react';
import {
  Shield,
  Award,
  FileEdit,
  UserCheck,
  Monitor,
  ChevronRight,
  Check,
  Info,
  Sparkles,
  Users,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { AccessPermission, Group, UserProfile, UserRole } from '../types';
import {
  ACCESS_DEFINITIONS,
  ACCESS_ORDER,
  legacyRoleToAccesses,
  resolveMemberAccesses
} from '../utils/accessUtils';

const ACCESS_ICONS: Record<AccessPermission, React.FC<{ className?: string }>> = {
  admin: Shield,
  setlists: Award,
  chants: FileEdit,
  pupitre: UserCheck,
  regie: Monitor
};

interface CapabilityTest {
  id: string;
  name: string;
  allowedAccesses: AccessPermission[];
  personalAccesses?: AccessPermission[];
  explanation: string;
}

const CAPABILITY_TESTS: CapabilityTest[] = [
  {
    id: 'manage-libraries',
    name: 'Gérer la bibliothèque et les accès des membres',
    allowedAccesses: ['admin'],
    explanation: 'Réservé à l’accès Admin (et au propriétaire de la bibliothèque).'
  },
  {
    id: 'manage-setlist',
    name: 'Créer, organiser et fixer les clés d’une setlist',
    allowedAccesses: ['admin', 'setlists'],
    explanation: 'Accessible avec Admin ou Setlists.'
  },
  {
    id: 'edit-chordpro',
    name: 'Créer, importer et modifier des chants',
    allowedAccesses: ['admin', 'chants'],
    explanation: 'Accessible avec Admin ou Chants.'
  },
  {
    id: 'personal-transpose',
    name: 'Lire les chants/setlists & transposer en Mode Scène',
    allowedAccesses: ['admin', 'setlists', 'chants', 'pupitre'],
    personalAccesses: ['pupitre'],
    explanation: 'Inclus dans Pupitre (accès par défaut) ainsi que Chants, Setlists et Admin.'
  },
  {
    id: 'projection-mode',
    name: 'Piloter le module Projections',
    allowedAccesses: ['admin', 'setlists', 'chants', 'pupitre', 'regie'],
    explanation: 'Seule fonctionnalité ouverte lorsque le membre possède uniquement Régie.'
  }
];

interface RoleHierarchyChartProps {
  allUsers: UserProfile[];
  currentGroup?: Group | null;
  currentAccesses?: AccessPermission[];
  currentRole?: UserRole;
  onOpenMatrixModal?: () => void;
}

export const RoleHierarchyChart: React.FC<RoleHierarchyChartProps> = ({
  allUsers,
  currentGroup,
  currentAccesses,
  currentRole,
  onOpenMatrixModal
}) => {
  const [selectedAccess, setSelectedAccess] = useState<AccessPermission>('pupitre');
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  const activeAccessList = currentAccesses || (currentRole ? legacyRoleToAccesses(currentRole) : []);
  const activeMeta = ACCESS_DEFINITIONS[selectedAccess];
  const activeTest = CAPABILITY_TESTS.find(t => t.id === activeTestId);

  const userCountsByAccess = React.useMemo(() => {
    const counts: Record<AccessPermission, number> = {
      admin: 0,
      setlists: 0,
      chants: 0,
      pupitre: 0,
      regie: 0
    };
    allUsers.forEach(u => {
      const list = resolveMemberAccesses(currentGroup, u.uid, u.role, u.accesses);
      list.forEach(acc => {
        counts[acc] = (counts[acc] || 0) + 1;
      });
    });
    return counts;
  }, [allUsers, currentGroup]);

  return (
    <div className="bg-[#121217] border border-[#262634] rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#22222E]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Guide des Accès Cumulables
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Chaque accès est combinable librement pour chaque membre et chaque bibliothèque.
            </p>
          </div>
        </div>

        {onOpenMatrixModal && (
          <button
            type="button"
            onClick={onOpenMatrixModal}
            className="px-3 py-1.5 rounded-lg bg-[#1A1A24] hover:bg-[#242432] text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Tableau comparatif détaillé</span>
          </button>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-[#161620] border border-[#252534] space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Simulateur : Quel accès permet cette action ?</span>
          </div>
          {activeTestId && (
            <button
              type="button"
              onClick={() => setActiveTestId(null)}
              className="text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Réinitialiser
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
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-[#1C1C26] hover:bg-[#252532] text-gray-300 border border-[#2B2B3C]'
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        {activeTest && (
          <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-200">{activeTest.name} : </span>
              <span className="text-gray-300">{activeTest.explanation}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-2">
          {ACCESS_ORDER.map((accKey) => {
            const meta = ACCESS_DEFINITIONS[accKey];
            const IconComp = ACCESS_ICONS[accKey];
            const isSelected = selectedAccess === accKey;
            const isHeld = activeAccessList.includes(accKey);
            const userCount = userCountsByAccess[accKey] || 0;
            const isTestAllowed = activeTest?.allowedAccesses.includes(accKey);
            const isTestPersonal = activeTest?.personalAccesses?.includes(accKey);

            return (
              <div
                key={accKey}
                onClick={() => setSelectedAccess(accKey)}
                className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#1A1A26] border-blue-500/60 ring-1 ring-blue-500/30'
                    : 'bg-[#15151C] hover:bg-[#1A1A24] border-[#252532]'
                } ${activeTest && !isTestAllowed ? 'opacity-40 hover:opacity-70' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBoxStyle}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{meta.label}</span>
                      {isHeld && (
                        <span className="text-[10px] font-semibold text-blue-300">
                          · Actif pour vous
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5 max-w-xs sm:max-w-md">
                      {meta.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {activeTest ? (
                    isTestAllowed ? (
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1 ${
                        isTestPersonal
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isTestPersonal ? 'Perso' : 'Autorisé'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Non inclus</span>
                      </span>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#1A1A24] px-2 py-1 rounded-lg border border-[#2B2B3A]">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="font-semibold text-white">{userCount}</span>
                    </div>
                  )}
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-white' : 'text-gray-500'}`} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-5 bg-[#16161F] border border-[#2A2A3A] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#242434]">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <span>Accès {activeMeta.label}</span>
              </h4>
              <span className="text-[11px] text-gray-400 font-mono">{activeMeta.key}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 block">Membres</span>
              <span className="text-sm font-bold text-white">
                {userCountsByAccess[activeMeta.key] || 0}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">{activeMeta.description}</p>

          <div className="space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Ce que cet accès débloque :</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-300">
              {activeMeta.permissions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-2.5 rounded-lg bg-[#13131A] border border-[#22222E] text-[11px] text-gray-400 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Cumul flexible :</strong> Cochez autant d’accès que nécessaire pour chaque personne. Si seul <strong>Régie</strong> est actif, seul le module Projections reste accessible.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
