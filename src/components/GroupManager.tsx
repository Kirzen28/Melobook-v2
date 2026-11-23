import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Users, 
  Library,
  Plus, 
  KeyRound, 
  Copy, 
  Check, 
  ShieldCheck, 
  UserCheck, 
  Sparkles, 
  Share2, 
  Layers,
  ArrowRight,
  Info,
  Mail,
  Shield,
  User as UserIcon,
  Lock,
  Unlock,
  Trash2,
  Award,
  Pencil,
  X,
  ChevronDown,
  BookOpen,
  Eye,
  AlertTriangle,
  Loader2,
  UserPlus,
  UserMinus,
  Search,
  FileEdit,
  Monitor,
  RefreshCw,
  Link2,
  QrCode
} from 'lucide-react';
import { UserRole, Group } from '../types';
import { AssignMembersModal } from './AssignMembersModal';
import { RoleMatrixModal } from './RoleMatrixModal';
import { RoleHierarchyChart } from './RoleHierarchyChart';
import { GuestQrCodeModal } from './GuestQrCodeModal';
import { GuestQrScannerModal } from './GuestQrScannerModal';
import { UserAvatar } from '../utils/avatarPresets';
import { DuplicateCleanerSection } from './DuplicateCleanerSection';

// Configuration détaillée des rôles avec l'intégralité des informations du tooltip
const ROLE_CONFIGS: Record<UserRole, {
  role: UserRole;
  label: string;
  emoji: string;
  shortBadge: string;
  icon: React.FC<{ className?: string }>;
  iconBoxStyle: string;
  badgeStyle: string;
  tagStyle: string;
  dotColor: string;
  description: string;
  permissions: string[];
}> = {
  admin: {
    role: 'admin',
    label: 'Administrateur',
    emoji: '👑',
    shortBadge: 'Accès Total',
    icon: Shield,
    iconBoxStyle: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    badgeStyle: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
    tagStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    dotColor: 'bg-blue-400',
    description: "Contrôle total : accès à tous les réglages, création/suppression de bibliothèques et attribution des rôles.",
    permissions: [
      "Création, modification et suppression des bibliothèques",
      "Attribution des rôles et gestion de tous les membres",
      "Création, édition et suppression des chants & setlists",
      "Accès aux réglages généraux et synchronisation Firestore"
    ]
  },
  leader: {
    role: 'leader',
    label: 'Responsable',
    emoji: '⚡',
    shortBadge: 'Musique & Setlists',
    icon: Award,
    iconBoxStyle: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    badgeStyle: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
    tagStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dotColor: 'bg-emerald-400',
    description: "Conduite musicale : création des setlists, fixation des tonalités, choix des chants et conduite des cultes/concerts.",
    permissions: [
      "Création, organisation et gestion des setlists",
      "Définition des tonalités et tempos par défaut du groupe",
      "Création et modification des chants dans le répertoire",
      "Mode Scène, métronome, accordeur et historique"
    ]
  },
  editor: {
    role: 'editor',
    label: 'Éditeur',
    emoji: '✍️',
    shortBadge: 'Gestion Chants',
    icon: FileEdit,
    iconBoxStyle: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    badgeStyle: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
    tagStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dotColor: 'bg-amber-400',
    description: "Saisie et enrichissement du répertoire : création de chants, import ChordPro, retouche des accords et des paroles. Ne modifie pas les setlists.",
    permissions: [
      "Création, édition et import de chants ChordPro",
      "Organisation des dossiers, tags, clés et métadonnées",
      "Consultation des setlists sans droit de modification",
      "Mode Scène et transposition personnelle"
    ]
  },
  member: {
    role: 'member',
    label: 'Membre',
    emoji: '🎵',
    shortBadge: 'Musicien / Chant',
    icon: UserCheck,
    iconBoxStyle: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    badgeStyle: 'bg-[#1C1C1E] text-gray-300 border-[#333]',
    tagStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    dotColor: 'bg-purple-400',
    description: "Musicien ou choriste. Synchronisation directe des setlists, répétitions en direct, transposition et capodastre personnels.",
    permissions: [
      "Lecture seule synchronisée du répertoire et des setlists",
      "Accès aux répétitions en direct et Mode Scène",
      "Transposition et capodastre personnels (sans impacter le groupe)",
      "Pas de modification des chants racine ni des setlists officielles"
    ]
  },
  viewer: {
    role: 'viewer',
    label: 'Régie / Lecteur',
    emoji: '🖥️',
    shortBadge: 'Projection',
    icon: Monitor,
    iconBoxStyle: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    badgeStyle: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40',
    tagStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    dotColor: 'bg-cyan-400',
    description: "Régie vidéo, projection des paroles ou observateur. Consultation en direct sans risque de modification involontaire.",
    permissions: [
      "Consultation en lecture seule des chants et setlists",
      "Vue plein écran adaptée pour projection de paroles ou écran retour",
      "Aucune modification possible (sécurité totale anti-fausse manip)",
      "Pas de modification de chants ni de setlists"
    ]
  }
};

// Sélecteur de rôle personnalisé intégré à l'application (non natif OS)
const RoleFilterDropdown: React.FC<{
  value: string;
  onChange: (role: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const allOption = { key: 'all', label: 'Tous les rôles', emoji: '👥', icon: Users };
  const roleOptions = [
    allOption,
    ...(['admin', 'leader', 'editor', 'member', 'viewer'] as UserRole[]).map(r => ({
      key: r,
      label: ROLE_CONFIGS[r].label,
      emoji: ROLE_CONFIGS[r].emoji,
      icon: ROLE_CONFIGS[r].icon,
      badgeStyle: ROLE_CONFIGS[r].badgeStyle,
      tagStyle: ROLE_CONFIGS[r].tagStyle,
      iconBoxStyle: ROLE_CONFIGS[r].iconBoxStyle,
    }))
  ];
  const current = roleOptions.find(o => o.key === value) || allOption;
  const CurrentIcon = current.icon;

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs min-w-[140px] justify-between ${
          isOpen
            ? 'bg-[#1C1C24] border-blue-500 ring-2 ring-blue-500/30 text-white'
            : value === 'all'
            ? 'bg-[#16161C] border-[#262632] text-gray-300 hover:border-[#383846] hover:text-white'
            : (current as any).badgeStyle + ' hover:brightness-110 hover:border-gray-500'
        }`}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1.5 truncate">
          <CurrentIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{current.label}</span>
          {value !== 'all' && <span className="text-[11px]">{current.emoji}</span>}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 shrink-0 ${
          isOpen ? 'rotate-180 opacity-100 text-blue-400' : ''
        }`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#121217] border border-[#2E2E38] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 mb-1 border-b border-[#24242C]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Filtrer par rôle</span>
          </div>
          <div className="space-y-0.5">
            {roleOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = value === opt.key;
              const roleConfig = opt.key !== 'all' ? ROLE_CONFIGS[opt.key as UserRole] : null;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => { onChange(opt.key); setIsOpen(false); }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                      : 'text-gray-300 hover:bg-[#1E1E26] hover:text-white border border-transparent'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] ${
                    roleConfig ? roleConfig.iconBoxStyle : 'bg-[#26262E] text-gray-400 border border-[#333]'
                  }`}>
                    <Icon className="w-3 h-3" />
                  </span>
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.key !== 'all' && <span className="text-[12px]">{opt.emoji}</span>}
                  {isSelected && (
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Sélecteur de rôle personnalisé intégré à l'application (non natif OS)
const RoleDropdown: React.FC<{
  value: UserRole;
  onChange: (newRole: UserRole) => void;
  disabled?: boolean;
  align?: 'left' | 'right';
  className?: string;
}> = ({ value, onChange, disabled = false, align = 'right', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const currentConfig = ROLE_CONFIGS[value] || ROLE_CONFIGS.member;
  const CurrentIcon = currentConfig.icon;

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs ${
          isOpen
            ? 'bg-[#1C1C24] border-blue-500 ring-2 ring-blue-500/30 text-white'
            : currentConfig.badgeStyle + ' hover:brightness-110 hover:border-gray-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-expanded={isOpen}
        title="Changer le niveau d'autorisation"
      >
        <span className="flex items-center gap-1.5 truncate">
          <CurrentIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{currentConfig.label}</span>
          <span className="text-[11px]">{currentConfig.emoji}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180 opacity-100 text-blue-400' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className={`absolute ${align === 'right' ? 'left-0 sm:left-auto sm:right-0' : 'left-0'} top-full mt-1.5 w-[min(20rem,calc(100vw-2.5rem))] sm:w-96 bg-[#121217] border border-[#2E2E38] rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left`}
        >
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#24242C] mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Niveau d'autorisation du compte</span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium">Sélecteur intégré</span>
          </div>

          <div className="space-y-1.5 max-h-[75vh] overflow-y-auto pr-0.5 custom-scrollbar">
            {(['admin', 'leader', 'editor', 'member', 'viewer'] as UserRole[]).map((roleKey) => {
              const config = ROLE_CONFIGS[roleKey];
              const isSelected = value === roleKey;
              const Icon = config.icon;

              return (
                <div
                  key={roleKey}
                  onClick={() => {
                    onChange(roleKey);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer block group ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/60 shadow-xs ring-1 ring-blue-500/30'
                      : 'bg-[#18181E] hover:bg-[#202028] border-[#262630] hover:border-[#383846]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${config.iconBoxStyle}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                        {config.label} {config.emoji}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border shrink-0 ${config.tagStyle}`}>
                        {config.shortBadge}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Description détaillée complète issue du tooltip */}
                  <p className="text-[11px] text-gray-300 leading-normal pl-8 mb-2">
                    {config.description}
                  </p>

                  {/* Liste des permissions clés */}
                  <div className="pl-8 space-y-1 bg-[#101014] p-2 rounded-md border border-[#222228]">
                    <div className="text-[9px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">Permissions accordées :</div>
                    {config.permissions.map((perm, pIdx) => (
                      <div key={pIdx} className="text-[10px] text-gray-300 flex items-start gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${config.dotColor}`} />
                        <span className="leading-tight">{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-2 pt-2 mt-2 border-t border-[#24242C] text-[10px] text-gray-500 flex items-center justify-between">
            <span>Détails complets des permissions</span>
            <span className="text-emerald-400 font-medium">Prise d'effet immédiate</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const GroupManager: React.FC = () => {
  const { 
    currentUser, 
    currentGroup, 
    groups, 
    songs,
    setlists,
    switchGroup, 
    createGroup, 
    updateGroup,
    deleteGroup,
    joinGroup, 
    allUsers,
    updateUserRole,
    bulkUpdateUserRole,
    bulkRemoveMembersFromGroup,
    bulkDeleteUserAccounts,
    setAdminByEmail,
    assignMembersToGroup,
    removeMemberFromGroup,
    setIsAuthModalOpen,
    setActiveTab,
    canManageGroups,
    canManageSongs,
    canAccessSettings,
    toggleLibraryGuestMode,
    regenerateGuestCode
  } = useApp();

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinStatus, setJoinStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isCopied, setIsCopied] = useState(false);
  const [isMemberLinkCopied, setIsMemberLinkCopied] = useState(false);
  const [isGuestCopied, setIsGuestCopied] = useState(false);
  const [isGuestLinkCopied, setIsGuestLinkCopied] = useState(false);
  const [isUpdatingGuestMode, setIsUpdatingGuestMode] = useState(false);
  const [isRegeneratingGuestCode, setIsRegeneratingGuestCode] = useState(false);
  const [qrModalMode, setQrModalMode] = useState<'guest' | 'member' | null>(null);
  const [shareAccessTab, setShareAccessTab] = useState<'member' | 'guest'>('member');
  const [isJoinQrScannerOpen, setIsJoinQrScannerOpen] = useState(false);

  // Modal d'assignation multiselect
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalTargetGroupId, setAssignModalTargetGroupId] = useState<string | undefined>(undefined);
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>('all');
  const [isRoleMatrixOpen, setIsRoleMatrixOpen] = useState(false);

  const openAssignModal = (groupId?: string) => {
    setAssignModalTargetGroupId(groupId || currentGroup?.id);
    setIsAssignModalOpen(true);
  };

  // Group editing state
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [isSavingGroupEdit, setIsSavingGroupEdit] = useState(false);

  // Deletion modal state
  const [libraryToDelete, setLibraryToDelete] = useState<Group | null>(null);
  const [isDeletingLibrary, setIsDeletingLibrary] = useState(false);
  const [deleteAssociatedData, setDeleteAssociatedData] = useState(true);

  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);

  const canDeleteLibrary = (g: Group) => {
    return Boolean(currentUser?.uid && g.ownerId === currentUser.uid);
  };

  const handleConfirmDelete = async () => {
    if (!libraryToDelete) return;
    setIsDeletingLibrary(true);
    try {
      await deleteGroup(libraryToDelete.id, { deleteAssociatedData });
      if (isEditingGroup && currentGroup?.id === libraryToDelete.id) {
        setIsEditingGroup(false);
      }
      setLibraryToDelete(null);
    } catch (err) {
      console.error('Delete library error:', err);
    } finally {
      setIsDeletingLibrary(false);
    }
  };

  // Administration des rôles par e-mail
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [promoteRole, setPromoteRole] = useState<UserRole>('leader');
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteStatusMsg, setPromoteStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Multiselect pour le tableau des membres
  const [selectedUserUids, setSelectedUserUids] = useState<string[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [bulkRoleMenuOpen, setBulkRoleMenuOpen] = useState(false);
  const [bulkLibraryMenuOpen, setBulkLibraryMenuOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Vérifie si un utilisateur fait partie d'une bibliothèque donnée
  const isMemberOfGroup = useCallback((groupId: string | undefined, members: string[] | undefined, userUid: string): boolean => {
    if (!groupId) return false;
    return (members || []).includes(userUid);
  }, []);

  // Décompte précis des membres réels enregistrés dans la bibliothèque
  const getGroupValidMemberCount = useCallback((g: Group): number => {
    return allUsers.filter(u => isMemberOfGroup(g.id, g.members, u.uid)).length;
  }, [allUsers, isMemberOfGroup]);

  const libraryMembersCount = useMemo(() => {
    return allUsers.filter(u => isMemberOfGroup(currentGroup?.id, currentGroup?.members, u.uid)).length;
  }, [allUsers, currentGroup?.id, currentGroup?.members, isMemberOfGroup]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      if (!isMemberOfGroup(currentGroup?.id, currentGroup?.members, u.uid)) return false;
      return memberRoleFilter === 'all' || u.role === memberRoleFilter;
    });
  }, [allUsers, memberRoleFilter, currentGroup?.id, currentGroup?.members, isMemberOfGroup]);

  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserUids.includes(u.uid));
  const isSomeSelected = filteredUsers.some(u => selectedUserUids.includes(u.uid)) && !isAllSelected;

  const toggleSelectUser = (uid: string) => {
    setSelectedUserUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const visibleUids = new Set(filteredUsers.map(u => u.uid));
      setSelectedUserUids(prev => prev.filter(id => !visibleUids.has(id)));
    } else {
      const combined = new Set([...selectedUserUids, ...filteredUsers.map(u => u.uid)]);
      setSelectedUserUids(Array.from(combined));
    }
  };

  const handleBulkChangeRole = async (newRole: UserRole) => {
    if (selectedUserUids.length === 0) return;
    setIsBulkActionLoading(true);
    setBulkRoleMenuOpen(false);
    try {
      await bulkUpdateUserRole(selectedUserUids, newRole);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkAddToLibrary = async (targetGroupId: string) => {
    if (selectedUserUids.length === 0) return;
    setIsBulkActionLoading(true);
    setBulkLibraryMenuOpen(false);
    try {
      await assignMembersToGroup(targetGroupId, selectedUserUids);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkRemoveFromCurrentLibrary = async () => {
    if (!currentGroup || selectedUserUids.length === 0) return;
    setIsBulkActionLoading(true);
    try {
      await bulkRemoveMembersFromGroup(currentGroup.id, selectedUserUids);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedUserUids.length === 0) return;
    setIsBulkActionLoading(true);
    try {
      await bulkDeleteUserAccounts(selectedUserUids);
      setSelectedUserUids([]);
      setIsBulkDeleteModalOpen(false);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  // Copy invite code or link
  const handleCopyInviteCode = () => {
    if (!currentGroup?.inviteCode) return;
    navigator.clipboard.writeText(currentGroup.inviteCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!currentGroup?.inviteCode) return;
    const url = `${window.location.origin}/?inviteCode=${encodeURIComponent(currentGroup.inviteCode)}`;
    navigator.clipboard.writeText(url);
    setIsMemberLinkCopied(true);
    setTimeout(() => setIsMemberLinkCopied(false), 2000);
  };

  const handleCopyGuestCode = () => {
    if (!currentGroup?.guestCode) return;
    navigator.clipboard.writeText(currentGroup.guestCode);
    setIsGuestCopied(true);
    setTimeout(() => setIsGuestCopied(false), 2000);
  };

  const handleCopyGuestLink = () => {
    if (!currentGroup?.guestCode) return;
    const url = `${window.location.origin}/?guestCode=${encodeURIComponent(currentGroup.guestCode)}`;
    navigator.clipboard.writeText(url);
    setIsGuestLinkCopied(true);
    setTimeout(() => setIsGuestLinkCopied(false), 2000);
  };

  const handleToggleGuestMode = async () => {
    if (!currentGroup || isUpdatingGuestMode) return;
    setIsUpdatingGuestMode(true);
    try {
      await toggleLibraryGuestMode(currentGroup.id, !currentGroup.guestEnabled);
    } finally {
      setIsUpdatingGuestMode(false);
    }
  };

  const handleRegenerateGuestCode = async () => {
    if (!currentGroup || isRegeneratingGuestCode) return;
    setIsRegeneratingGuestCode(true);
    try {
      await regenerateGuestCode(currentGroup.id);
    } finally {
      setIsRegeneratingGuestCode(false);
    }
  };

  const [createStatus, setCreateStatus] = useState<string | null>(null);

  const startEditGroup = () => {
    if (!currentGroup) return;
    setEditGroupName(currentGroup.name);
    setEditGroupDesc(currentGroup.description || '');
    setIsEditingGroup(true);
  };

  const handleSaveGroupEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup || !editGroupName.trim()) return;
    setIsSavingGroupEdit(true);
    await updateGroup(currentGroup.id, {
      name: editGroupName.trim(),
      description: editGroupDesc.trim()
    });
    setIsSavingGroupEdit(false);
    setIsEditingGroup(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const name = newGroupName.trim();
    await createGroup(name, newGroupDesc.trim());
    setNewGroupName('');
    setNewGroupDesc('');
    setCreateStatus(`La bibliothèque « ${name} » a été créée avec succès.`);
    setTimeout(() => setCreateStatus(null), 4000);
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    const success = await joinGroup(joinCodeInput.trim());
    if (success) {
      setJoinStatus('success');
      setJoinCodeInput('');
      setTimeout(() => setJoinStatus('idle'), 3000);
    } else {
      setJoinStatus('error');
      setTimeout(() => setJoinStatus('idle'), 3000);
    }
  };

  const handleScannedJoinCode = async (scannedCode: string) => {
    setIsJoinQrScannerOpen(false);
    setJoinCodeInput(scannedCode);
    const success = await joinGroup(scannedCode);
    if (success) {
      setJoinStatus('success');
      setJoinCodeInput('');
      setTimeout(() => setJoinStatus('idle'), 3000);
    } else {
      setJoinStatus('error');
      setTimeout(() => setJoinStatus('idle'), 3000);
    }
  };

  const handlePromoteAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim()) return;
    setIsPromoting(true);
    setPromoteStatusMsg(null);
    try {
      await setAdminByEmail(adminEmailInput.trim(), promoteRole);
      const roleLabel = promoteRole === 'admin' ? 'Administrateur' : promoteRole === 'leader' ? 'Responsable' : 'Membre';
      setPromoteStatusMsg({
        text: `L'adresse ${adminEmailInput.trim()} a été configurée avec le rôle ${roleLabel}.`,
        type: 'success'
      });
      setAdminEmailInput('');
      setTimeout(() => setPromoteStatusMsg(null), 4000);
    } catch (err: any) {
      setPromoteStatusMsg({
        text: err?.message || "Erreur lors de l'attribution du rôle",
        type: 'error'
      });
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-12 text-[#E0E0E0]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 sm:gap-2.5">
            <Library className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0" />
            <span>Gestion des Bibliothèques</span>
          </h1>
        </div>
      </div>

      {/* Espace Unifié : Sélection de Bibliothèque, Actions & Rôles des Membres */}
      <div className="bg-[#111112] border border-[#222224] rounded-2xl p-4 sm:p-6 mb-8 shadow-sm space-y-6">
        
        {/* 1. En-tête unifié : Sélecteur de bibliothèque, Actions, Invitation & Accès Invité */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-[#222224]">
          {/* Colonne gauche : Sélecteur + identité + partages */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative inline-flex items-center min-w-[210px] max-w-full">
                <Library className="w-3.5 h-3.5 text-blue-400 absolute left-3 pointer-events-none shrink-0" />
                <select
                  aria-label="Choisir la bibliothèque active"
                  value={currentGroup?.id || ''}
                  onChange={(e) => {
                    if (e.target.value) switchGroup(e.target.value);
                  }}
                  disabled={groups.length === 0}
                  className="appearance-none bg-[#16161C] hover:bg-[#1C1C24] border border-[#2E2E3A] focus:border-blue-500 rounded-lg pl-8 pr-8 py-1.5 text-xs sm:text-sm font-bold text-white focus:outline-none transition-colors cursor-pointer max-w-full truncate"
                >
                  {groups.length === 0 ? (
                    <option value="">Aucune bibliothèque</option>
                  ) : (
                    groups
                      .filter(g => !currentUser?.uid || g.ownerId === currentUser.uid || (g.members || []).includes(currentUser.uid))
                      .map((g, index) => {
                        const isOwner = Boolean(currentUser?.uid && g.ownerId === currentUser.uid);
                        const memberCount = (g.members || []).length;
                        return (
                          <option key={g.id || `group-${index}`} value={g.id} className="bg-[#141418] text-white">
                            {g.name} ({isOwner ? 'Propriétaire' : 'Membre'} · {memberCount} membre{memberCount > 1 ? 's' : ''})
                          </option>
                        );
                      })
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none shrink-0" />
              </div>

              {currentGroup && !canManageGroups && (
                <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium bg-[#16161A] px-2 py-0.5 rounded border border-[#222228]">
                  <Lock className="w-3 h-3 text-gray-500" />
                  <span>Consultation seule</span>
                </span>
              )}
            </div>

            {currentGroup && (
              isEditingGroup ? (
                <form onSubmit={handleSaveGroupEdit} className="mt-2 space-y-2.5 max-w-lg">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">Nom de la bibliothèque :</label>
                    <input
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">Description :</label>
                    <input
                      type="text"
                      value={editGroupDesc}
                      onChange={(e) => setEditGroupDesc(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-[#333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#222228]">
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isSavingGroupEdit || !editGroupName.trim()}
                        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSavingGroupEdit ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingGroup(false)}
                        className="px-3 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-xs transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>

                    {canDeleteLibrary(currentGroup) && (
                      <button
                        type="button"
                        onClick={() => setLibraryToDelete(currentGroup)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer py-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer cette bibliothèque...</span>
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  {currentGroup.description && (
                    <p className="text-xs text-gray-300">
                      {currentGroup.description}
                    </p>
                  )}

                  <div className="flex flex-col items-start gap-2">
                    {(() => {
                      const isOwner = Boolean(currentUser?.uid && currentGroup.ownerId === currentUser.uid);
                      const activeShareTab = isOwner ? shareAccessTab : 'member';
                      return (
                        <>
                          {isOwner && (
                            <div className="inline-flex items-center gap-1 bg-[#0C0C0F] p-0.5 rounded-lg border border-[#24242D]">
                              <button
                                type="button"
                                onClick={() => setShareAccessTab('member')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                  activeShareTab === 'member'
                                    ? 'bg-[#1C1C24] text-blue-300 border border-[#323240] shadow-xs'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>Invitation membre</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setShareAccessTab('guest')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                  activeShareTab === 'guest'
                                    ? 'bg-[#1C1C24] text-amber-300 border border-[#323240] shadow-xs'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                              >
                                <Eye className="w-3 h-3" />
                                <span>Accès invité</span>
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    currentGroup.guestEnabled ? 'bg-emerald-400' : 'bg-gray-500'
                                  }`}
                                />
                              </button>
                            </div>
                          )}

                          {activeShareTab === 'member' ? (
                            <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16161C] border border-[#2A2A35]">
                              <KeyRound className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <div className="text-[11px] text-gray-400">
                                Identifiant membre :{' '}
                                <span className="font-mono font-bold text-blue-300 tracking-wider select-all">
                                  {currentGroup.inviteCode}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={handleCopyInviteCode}
                                className="px-2 py-0.5 rounded bg-[#1E1E26] hover:bg-[#282834] text-gray-200 border border-[#343440] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{isCopied ? 'Copié' : 'Copier'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleCopyInviteLink}
                                className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Copier le lien d'inscription directe à cette bibliothèque"
                              >
                                {isMemberLinkCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Link2 className="w-3 h-3" />}
                                <span>{isMemberLinkCopied ? 'Lien copié' : 'Copier le lien'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setQrModalMode('member')}
                                className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Afficher et télécharger le QR Code d'invitation membre"
                              >
                                <QrCode className="w-3 h-3" />
                                <span>QR Code</span>
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg bg-[#16161C] border border-[#2A2A35]">
                              <Eye className={`w-3.5 h-3.5 shrink-0 ${currentGroup.guestEnabled ? 'text-amber-400' : 'text-gray-500'}`} />
                              <span className="text-[11px] text-gray-400">Accès invité :</span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={Boolean(currentGroup.guestEnabled)}
                                aria-label="Activer ou désactiver l'accès invité"
                                onClick={handleToggleGuestMode}
                                disabled={isUpdatingGuestMode}
                                className="inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 focus:outline-none group"
                                title={currentGroup.guestEnabled ? 'Cliquer pour désactiver le mode invité' : 'Cliquer pour activer le mode invité (lecture seule)'}
                              >
                                <span
                                  className={`relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 ${
                                    currentGroup.guestEnabled ? 'bg-emerald-500' : 'bg-[#2E2E36]'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                                      currentGroup.guestEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                                    }`}
                                  />
                                </span>
                                <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                                  currentGroup.guestEnabled ? 'text-emerald-300' : 'text-gray-400 group-hover:text-gray-200'
                                }`}>
                                  {isUpdatingGuestMode && <Loader2 className="w-3 h-3 animate-spin" />}
                                  <span>{currentGroup.guestEnabled ? 'Activé' : 'Désactivé'}</span>
                                </span>
                              </button>

                              {currentGroup.guestEnabled && currentGroup.guestCode && (
                                <>
                                  <span className="font-mono font-bold text-[11px] text-amber-300 tracking-wider select-all">
                                    {currentGroup.guestCode}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleCopyGuestCode}
                                    className="px-2 py-0.5 rounded bg-[#1E1E26] hover:bg-[#282834] text-gray-200 border border-[#343440] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    {isGuestCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    <span>{isGuestCopied ? 'Copié' : 'Copier'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCopyGuestLink}
                                    className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    {isGuestLinkCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Link2 className="w-3 h-3" />}
                                    <span>{isGuestLinkCopied ? 'Lien copié' : 'Copier le lien'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setQrModalMode('guest')}
                                    className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Afficher et télécharger le QR Code invité"
                                  >
                                    <QrCode className="w-3 h-3" />
                                    <span>QR Code</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleRegenerateGuestCode}
                                    disabled={isRegeneratingGuestCode}
                                    className="px-2 py-0.5 rounded bg-[#1E1E26] hover:bg-[#282834] text-gray-300 hover:text-white border border-[#343440] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Révoquer l'ancien code et en générer un nouveau"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${isRegeneratingGuestCode ? 'animate-spin' : ''}`} />
                                    <span>Régénérer</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Colonne droite : Actions principales de gestion de la bibliothèque */}
          {currentGroup && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap md:self-start">
              {canManageGroups && !isEditingGroup && (
                <>
                  <button
                    type="button"
                    onClick={() => openAssignModal(currentGroup.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Assigner des membres à cette bibliothèque avec le multiselect"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-white" />
                    <span>Assigner des membres</span>
                  </button>
                  <button
                    type="button"
                    onClick={startEditGroup}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Modifier le nom et la description"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-400" />
                    <span>Gérer</span>
                  </button>
                </>
              )}
              {canDeleteLibrary(currentGroup) && !isEditingGroup && (
                <button
                  type="button"
                  onClick={() => setLibraryToDelete(currentGroup)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Supprimer définitivement cette bibliothèque"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. Section Membres & Rôles */}
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#222224]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-white">Rôles & Membres</h3>

                  <button
                    type="button"
                    onClick={() => setIsRoleMatrixOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Consulter le tableau comparatif complet des rôles et permissions"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tableau comparatif</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsRoleMatrixOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#181822] hover:bg-[#20202E] text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 sm:hidden"
                  title="Consulter le tableau comparatif complet des rôles et permissions"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Permissions</span>
                </button>

                {canManageGroups && (
                  <button
                    type="button"
                    onClick={() => openAssignModal(currentGroup.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all active:scale-98 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                )}

                {!canManageGroups && !currentUser ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Mode invité</span>
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <UserIcon className="w-3 h-3" />
                      <span>Se connecter</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {promoteStatusMsg && (
              <div className={`mb-3 p-2.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                promoteStatusMsg.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}>
                <Info className="w-4 h-4 shrink-0" />
                <span>{promoteStatusMsg.text}</span>
              </div>
            )}



            <>
            {/* Filtrage des membres de la bibliothèque active */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3">
              <div className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                <span>Membres de cette bibliothèque</span>
                <span className="px-2 py-0.5 rounded-md bg-[#16161C] border border-[#262632] text-blue-400 font-bold">
                  {libraryMembersCount}
                </span>
              </div>

              <RoleFilterDropdown
                value={memberRoleFilter}
                onChange={setMemberRoleFilter}
              />
            </div>

            {/* Liste des utilisateurs inscrits avec gestion de rôle et assignation */}
            {libraryMembersCount > 0 ? (
              <div className="border border-[#222228] rounded-lg bg-[#141416]">
                {/* Barre d'en-tête de la liste */}
                <div className="px-3 py-2 bg-[#101014] border-b border-[#222228] rounded-t-lg flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-2.5">
                    {canManageGroups && (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isAllSelected 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-xs' 
                            : isSomeSelected
                            ? 'bg-blue-600/40 border-blue-400 text-white'
                            : 'border-[#444] bg-[#181820]'
                        }`}>
                          {isAllSelected ? (
                            <Check className="w-3 h-3 stroke-[3]" />
                          ) : isSomeSelected ? (
                            <span className="w-2 h-0.5 bg-white rounded" />
                          ) : null}
                        </div>
                        <span className="font-semibold text-xs text-gray-300">
                          {isAllSelected ? 'Tout désélectionner' : 'Sélectionner tout'}
                        </span>
                      </button>
                    )}
                    {!canManageGroups && <span>Membres inscrits</span>}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {filteredUsers.length} affiché{filteredUsers.length > 1 ? 's' : ''}
                  </div>
                </div>

                <div className="divide-y divide-[#222228]">
                  {filteredUsers.map((u, index) => {
                    const isAdmin = u.role === 'admin';
                    const isLeader = u.role === 'leader';
                    const isSelf = currentUser?.uid === u.uid;
                    const isAssigned = isMemberOfGroup(currentGroup?.id, currentGroup?.members, u.uid);
                    const isSelected = selectedUserUids.includes(u.uid);
                    const userKey = u.uid ? `user-${u.uid}-${index}` : (u.email ? `user-${u.email}-${index}` : `user-${index}`);

                    return (
                      <div 
                        key={userKey} 
                        className={`p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 text-xs transition-colors ${
                          isSelected ? 'bg-blue-600/10' : 'hover:bg-[#181820]/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {canManageGroups && (
                            <button
                              type="button"
                              onClick={() => toggleSelectUser(u.uid)}
                              className="shrink-0 cursor-pointer p-0.5"
                              title={isSelected ? 'Désélectionner' : 'Sélectionner'}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-blue-600 border-blue-500 text-white shadow-xs' : 'border-[#444] bg-[#181820] hover:border-blue-400'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          )}

                          <UserAvatar
                            photoURL={u.photoURL}
                            displayName={u.displayName}
                            sizeClass="w-8 h-8 sm:w-7 sm:h-7 text-xs sm:text-[11px]"
                            iconClass="w-3.5 h-3.5"
                            fallbackClassName={
                              isAdmin 
                                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' 
                                : isLeader
                                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                                : u.role === 'editor'
                                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                                : u.role === 'viewer'
                                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                                : 'bg-[#222228] text-gray-300 border border-[#333]'
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{u.displayName || 'Utilisateur'}</span>
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 font-medium shrink-0">
                                  Vous
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate font-mono">
                              {u.email || 'Sans e-mail'}
                            </div>
                          </div>
                        </div>

                        <div className={`flex items-center justify-between sm:justify-end gap-2 shrink-0 ${canManageGroups ? 'pl-6 sm:pl-0' : 'pl-10 sm:pl-0'}`}>
                          {/* Statut d'assignation à la bibliothèque active */}
                          {isAssigned ? (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                              <Check className="w-2.5 h-2.5" />
                              <span>Assigné</span>
                            </span>
                          ) : (
                            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#1C1C24] text-gray-400 border border-[#2A2A34] font-medium">
                              Non assigné
                            </span>
                          )}

                          {/* Bouton rapide d'assignation ou de retrait pour l'admin */}
                          {canManageGroups && currentGroup && (
                            isAssigned ? (
                              <button
                                type="button"
                                onClick={() => removeMemberFromGroup(currentGroup.id, u.uid)}
                                className="order-2 sm:order-1 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg sm:rounded text-[11px] sm:text-[10px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer flex items-center gap-1.5 sm:gap-1 shrink-0"
                                title="Retirer de cette bibliothèque"
                              >
                                <UserMinus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                <span>Retirer</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => assignMembersToGroup(currentGroup.id, [u.uid])}
                                className="order-2 sm:order-1 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-lg sm:rounded text-[11px] sm:text-[10px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors cursor-pointer flex items-center gap-1.5 sm:gap-1 shrink-0"
                                title="Assigner à cette bibliothèque"
                              >
                                <UserPlus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                <span>+ Assigner</span>
                              </button>
                            )
                          )}

                          {canManageGroups ? (
                            <div className="order-1 sm:order-2">
                              <RoleDropdown
                                value={u.role || 'member'}
                                onChange={(newRole) => updateUserRole(u.uid, newRole)}
                                align="right"
                              />
                            </div>
                          ) : (
                            <span className={`order-1 sm:order-2 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              isAdmin 
                                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' 
                                : isLeader
                                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                                : u.role === 'editor'
                                ? 'bg-amber-600/20 text-amber-300 border-amber-500/40'
                                : u.role === 'viewer'
                                ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-[#1C1C1E] text-gray-400 border-[#333]'
                            }`}>
                              {isAdmin ? 'Admin 👑' : isLeader ? 'Responsable ⚡' : u.role === 'editor' ? 'Éditeur ✍️' : u.role === 'viewer' ? 'Régie 🖥️' : 'Membre 🎵'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-gray-500 bg-[#141416] rounded-lg border border-[#222228]">
                Aucun compte utilisateur enregistré dans la base pour le moment.
              </div>
            )}
          </>
          </div>
        </div>

      {/* Section : Rejoindre ou Créer une Bibliothèque (Deux colonnes sur laptop, deux lignes sur smartphone et tablette) */}
      <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 sm:p-5 mb-8 shadow-sm">
        {/* Titre de section */}
        <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-[#222224]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Library className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Rejoindre ou Créer une Bibliothèque</h3>
            </div>
          </div>
        </div>

        {/* Grille : 2 colonnes en laptop (lg:), 2 lignes en smartphone et tablette (grid-cols-1) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 divide-y lg:divide-y-0 lg:divide-x divide-[#222228]">
          {/* Colonne / Ligne 1 : Rejoindre une bibliothèque existante */}
          <div className="space-y-3 pr-0 lg:pr-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                Rejoindre une bibliothèque existante
              </span>
            </div>

            <form onSubmit={handleJoinGroup} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder="Code exemple LOUAN7"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="flex-1 bg-[#16161A] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-center font-mono font-bold text-xs tracking-widest text-blue-400 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                maxLength={8}
                required
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                Rejoindre
              </button>
              <button
                type="button"
                onClick={() => setIsJoinQrScannerOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#18181E] hover:bg-[#22222C] border border-[#2E2E3A] text-cyan-300 hover:text-cyan-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                title="Scanner un QR code d'invitation membre"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scanner</span>
              </button>
            </form>

            {joinStatus === 'success' && (
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 text-center flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Bibliothèque rejointe avec succès !</span>
              </div>
            )}
            {joinStatus === 'error' && (
              <div className="p-2 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-semibold border border-rose-500/30 text-center">
                Code d'invitation introuvable.
              </div>
            )}
          </div>

          {/* Colonne / Ligne 2 : Créer une nouvelle bibliothèque */}
          <div className="space-y-3 pt-4 lg:pt-0 lg:pl-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                Créer une nouvelle bibliothèque
              </span>
            </div>

            {currentUser ? (
              <form onSubmit={handleCreateGroup} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Nom de la bibliothèque"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="flex-1 bg-[#16161A] border border-[#2A2A32] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Description facultative"
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="flex-1 bg-[#16161A] border border-[#2A2A32] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  Créer la bibliothèque
                </button>
                {createStatus && (
                  <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 text-center flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>{createStatus}</span>
                  </div>
                )}
              </form>
            ) : null}
          </div>
        </div>
      </div>

      {/* Nettoyage des doublons (réservé au propriétaire de la bibliothèque active) */}
      {currentGroup && currentUser?.uid && currentGroup.ownerId === currentUser.uid && (
        <div className="mb-8">
          <DuplicateCleanerSection
            isOpen={isDuplicatesOpen}
            onToggle={() => setIsDuplicatesOpen(prev => !prev)}
          />
        </div>
      )}

      {/* Modal de suppression de bibliothèque avec avertissement et options */}
      {libraryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#141418] border border-[#2E2E38] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">
                  Supprimer la bibliothèque ?
                </h3>
                <p className="text-xs text-gray-300 mt-0.5 truncate">
                  « <strong className="text-white">{libraryToDelete.name}</strong> »
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingLibrary && setLibraryToDelete(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#202028] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avertissement */}
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Cette action est <strong>irréversible</strong>. Les musiciens utilisant le code d'invitation <span className="font-mono font-bold text-white bg-black/40 px-1 py-0.5 rounded">{libraryToDelete.inviteCode}</span> ne pourront plus y accéder.
              </div>
            </div>

            {/* Infos sur le contenu lié */}
            {(() => {
              const songCount = songs.filter(s => s.groupId === libraryToDelete.id).length;
              const setlistCount = setlists.filter(st => st.groupId === libraryToDelete.id).length;
              return (
                <div className="bg-[#0D0D10] border border-[#222228] rounded-xl p-3 text-xs space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Contenu rattaché à cette bibliothèque :
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-gray-300">
                    <div className="p-2 rounded-lg bg-[#16161C] border border-[#262632] flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span><strong>{songCount}</strong> chant{songCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#16161C] border border-[#262632] flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span><strong>{setlistCount}</strong> setlist{setlistCount > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 pt-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deleteAssociatedData}
                      onChange={(e) => setDeleteAssociatedData(e.target.checked)}
                      className="w-4 h-4 rounded border-[#333] text-rose-600 focus:ring-0 focus:outline-none accent-rose-600 cursor-pointer"
                    />
                    <span className="text-[11px] text-gray-300">
                      Supprimer également tous les chants et setlists rattachés
                    </span>
                  </label>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#222228]">
              <button
                type="button"
                disabled={isDeletingLibrary}
                onClick={() => setLibraryToDelete(null)}
                className="px-3.5 py-2 rounded-xl bg-[#1E1E24] hover:bg-[#282832] text-gray-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeletingLibrary}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingLibrary ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Suppression en cours...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer définitivement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal du tableau comparatif des rôles et permissions */}
      <RoleMatrixModal
        isOpen={isRoleMatrixOpen}
        onClose={() => setIsRoleMatrixOpen(false)}
        currentRole={currentUser?.role}
      />

      {/* Modal d'assignation des membres avec multiselect */}
      <AssignMembersModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        targetGroupId={assignModalTargetGroupId}
      />

      {/* Modal de confirmation suppression de comptes en masse */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#16161C] border border-[#2E2E3C] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Supprimer {selectedUserUids.length} compte{selectedUserUids.length > 1 ? 's' : ''} ?</h3>
                <p className="text-xs text-gray-400">Action irréversible sur la base de données</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Les comptes sélectionnés seront définitivement supprimés et automatiquement retirés de toutes les bibliothèques partagées.
            </p>

            {currentUser && selectedUserUids.includes(currentUser.uid) && (
              <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px]">
                Information : votre propre compte actif restera préservé et ne sera pas supprimé.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#262634]">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#202028] hover:bg-[#2A2A34] text-gray-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isBulkActionLoading}
                onClick={handleBulkDeleteConfirm}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isBulkActionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmer la suppression</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentGroup && qrModalMode === 'member' && currentGroup.inviteCode && (
        <GuestQrCodeModal
          isOpen
          onClose={() => setQrModalMode(null)}
          mode="member"
          code={currentGroup.inviteCode}
          libraryName={currentGroup.name}
        />
      )}

      {currentGroup?.guestEnabled && currentGroup.guestCode && qrModalMode === 'guest' && (
        <GuestQrCodeModal
          isOpen
          onClose={() => setQrModalMode(null)}
          mode="guest"
          guestCode={currentGroup.guestCode}
          libraryName={currentGroup.name}
        />
      )}

      <GuestQrScannerModal
        isOpen={isJoinQrScannerOpen}
        onClose={() => setIsJoinQrScannerOpen(false)}
        onScanCode={handleScannedJoinCode}
        mode="member"
      />

    </div>
  );
};
