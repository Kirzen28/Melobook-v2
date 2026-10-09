import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Database, 
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
  HelpCircle,
  ChevronDown,
  BookOpen,
  Eye,
  AlertTriangle,
  Loader2,
  UserPlus,
  UserMinus,
  Search,
  FileEdit,
  Monitor
} from 'lucide-react';
import { UserRole, Group } from '../types';
import { AssignMembersModal } from './AssignMembersModal';
import { RoleMatrixModal } from './RoleMatrixModal';
import { RoleHierarchyChart } from './RoleHierarchyChart';

// Composant Tooltip interactif compact (hover & click/touch)
const InfoTooltip: React.FC<{ content: React.ReactNode; label?: string }> = ({ content, label = "Informations" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }
  }, [open]);

  return (
    <div 
      ref={ref} 
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-[#1E1E24] transition-colors cursor-pointer"
        title={label}
        aria-label={label}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 w-64 sm:w-72 p-2.5 rounded-lg bg-[#18181E] border border-[#2E2E38] shadow-2xl text-[11px] text-gray-300 leading-normal z-50 animate-in fade-in duration-150">
          {content}
          <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-full -mt-1 border-4 border-transparent border-t-[#18181E]" />
        </div>
      )}
    </div>
  );
};

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
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-80 sm:w-96 bg-[#121217] border border-[#2E2E38] rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left`}
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
    seedDemoDataToFirestore,
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
    canAccessSettings
  } = useApp();

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinStatus, setJoinStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isCopied, setIsCopied] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // Modal d'assignation multiselect
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalTargetGroupId, setAssignModalTargetGroupId] = useState<string | undefined>(undefined);
  const [memberFilterTab, setMemberFilterTab] = useState<'all' | 'libraryOnly'>('all');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [isRoleMatrixOpen, setIsRoleMatrixOpen] = useState(false);
  const [roleSectionTab, setRoleSectionTab] = useState<'members' | 'hierarchy'>('members');

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

  const canDeleteLibrary = (g: Group) => {
    if (g.id === 'default-group') return false;
    return currentUser?.role === 'admin';
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

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchesSearch = !memberSearchTerm.trim() || 
        (u.displayName || '').toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(memberSearchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (memberFilterTab === 'libraryOnly') {
        return (currentGroup?.members || []).includes(u.uid);
      }
      return true;
    });
  }, [allUsers, memberSearchTerm, memberFilterTab, currentGroup?.members]);

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

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedDemoDataToFirestore();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
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
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Library className="w-6 h-6 text-blue-400" />
          <span>Gestion des Bibliothèques</span>
        </h1>
      </div>

      {/* Bandeau consultation visiteur */}
      {!currentUser && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-[#141724] to-[#121217] border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-white truncate flex items-center gap-2">
                <span>Accès libre pour visiteurs & musiciens non connectés</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">Consultation</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Sélectionnez une bibliothèque ou entrez un code pour consulter librement son répertoire, transposer, changer la tonalité et voir ses différentes versions.
              </p>
            </div>
          </div>

          {currentGroup && (
            <button
              type="button"
              onClick={() => setActiveTab('repertoire')}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ouvrir la bibliothèque</span>
            </button>
          )}
        </div>
      )}

      {/* Espace Unifié : Vos Bibliothèques, Bibliothèque Active & Rôles des Membres */}
      <div className="bg-[#111112] border border-[#222224] rounded-2xl p-4 sm:p-6 mb-8 shadow-sm space-y-6">
        
        {/* 1. En-tête : Bibliothèque Active, Actions & Code d'invitation */}
        {currentGroup && (
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-[#222224]">
            {/* Colonne gauche : Identité de la bibliothèque active et code d'invitation ergonomique */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  Bibliothèque Active
                </span>
                <InfoTooltip 
                  label="Identifiant technique" 
                  content={`ID : ${currentGroup.id}`} 
                />
                {!canManageGroups && (
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium bg-[#16161A] px-2 py-0.5 rounded border border-[#222228]">
                    <Lock className="w-3 h-3 text-gray-500" />
                    <span>Consultation seule</span>
                  </span>
                )}
              </div>

              {isEditingGroup ? (
                <form onSubmit={handleSaveGroupEdit} className="mt-3 space-y-2.5 max-w-lg">
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

                    {currentGroup.id !== 'default-group' && canDeleteLibrary(currentGroup) && (
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
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {currentGroup.name}
                  </h2>
                  {currentGroup.description && (
                    <p className="text-xs text-gray-300 mt-1">
                      {currentGroup.description}
                    </p>
                  )}

                  {/* Boîte et bouton du code d'invitation intégrés de manière ergonomique */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <div 
                      onClick={handleCopyInviteCode}
                      className="group inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0A0A0B] hover:bg-[#141418] border border-[#222224] hover:border-blue-500/50 shadow-xs cursor-pointer transition-all active:scale-98 select-none"
                      title="Cliquer pour copier le code d'invitation"
                    >
                      <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-blue-400 transition-colors">
                        <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px] font-semibold">Code d'invitation :</span>
                      </div>
                      <span className="text-sm font-bold font-mono tracking-widest text-blue-400 group-hover:text-blue-300">
                        {currentGroup.inviteCode || 'LOUAN7'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyInviteCode();
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                        title="Copier le code d'invitation"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>

                    <InfoTooltip 
                      label="Code d'accès" 
                      content="Transmettez ce code aux musiciens pour qu'ils rejoignent directement cette bibliothèque partagée." 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Colonne droite : Actions principales de gestion de la bibliothèque */}
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
              {currentGroup.id !== 'default-group' && canDeleteLibrary(currentGroup) && !isEditingGroup && (
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
          </div>
        )}

        {/* 2. Sélecteur intégré : Vos Bibliothèques */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Library className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white">Vos Bibliothèques — {groups.length} au total</h3>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Chaque bibliothèque est privée : seuls les membres et administrateurs qui en font partie peuvent la voir et y accéder.
              </p>
            </div>
            <span className="text-[11px] text-gray-400 hidden sm:inline whitespace-nowrap">
              Cliquez pour changer de bibliothèque active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {groups.map((g, index) => {
              const isActive = currentGroup?.id === g.id;
              const groupKey = g.id ? `group-${g.id}-${index}` : `group-${index}`;
              const isProtected = g.id === 'default-group';
              const userCanDelete = canDeleteLibrary(g);
              return (
                <div
                  key={groupKey}
                  onClick={() => switchGroup(g.id)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between group/card ${
                    isActive 
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-xs ring-1 ring-blue-500/30' 
                      : 'bg-[#16161A] hover:bg-[#1E1E24] border-[#2A2A32] text-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className={`font-semibold text-xs truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
                      {g.name}
                    </span>
                    {isActive ? (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500 text-white flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Actif
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-gray-400 group-hover/card:text-blue-400 font-mono">
                        {g.inviteCode}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                    <span>{g.members?.length || 1} membre{(g.members?.length || 1) > 1 ? 's' : ''}</span>
                    <div className="flex items-center gap-1.5">
                      {canManageGroups && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignModal(g.id);
                          }}
                          className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                          title={`Assigner des membres à ${g.name}`}
                          aria-label={`Assigner des membres à ${g.name}`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!isProtected ? (
                        userCanDelete ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLibraryToDelete(g);
                            }}
                            className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                            title={`Supprimer la bibliothèque « ${g.name} »`}
                            aria-label={`Supprimer la bibliothèque ${g.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="p-1 text-gray-600" title="Suppression réservée à l'administrateur ou créateur">
                            <Lock className="w-3 h-3" />
                          </span>
                        )
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#202026] text-gray-400 font-medium" title="Bibliothèque par défaut protégée">
                          Protégée
                        </span>
                      )}

                      <span className="text-[10px] text-blue-400 font-medium">
                        {isActive ? 'Active' : 'Activer →'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Séparateur et Section Membres & Rôles */}
        <div className="pt-5 border-t border-[#222224]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#222224]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-white">Rôles & Membres</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1C1C1E] text-gray-400 font-medium border border-[#2A2A32]">
                    {allUsers.length} compte{allUsers.length > 1 ? 's' : ''} au total
                  </span>
                  <InfoTooltip 
                    label="Permissions des rôles" 
                    content="Admin : gestion totale, bibliothèques, rôles. Responsable : direction musicale, setlists, tonalités. Éditeur : chants et accords. Membre : pupitre & transposition perso. Régie : projection." 
                  />
                  <button
                    type="button"
                    onClick={() => setRoleSectionTab(prev => prev === 'hierarchy' ? 'members' : 'hierarchy')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
                      roleSectionTab === 'hierarchy'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                        : 'bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 hover:text-white border border-indigo-500/30'
                    }`}
                    title="Afficher l'arborescence et le diagramme interactif de la hiérarchie des rôles"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{roleSectionTab === 'hierarchy' ? 'Liste des membres' : 'Hiérarchie visuelle'}</span>
                  </button>
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
                    <span>Multiselect : Assigner des membres</span>
                  </button>
                )}

                {/* Formulaire d'attribution par e-mail ou statut invité */}
                {canManageGroups ? (
                  <form onSubmit={handlePromoteAdminEmail} className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="email"
                      placeholder="email@utilisateur.com"
                      value={adminEmailInput}
                      onChange={(e) => setAdminEmailInput(e.target.value)}
                      className="bg-[#1C1C1E] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-36 sm:w-44"
                      required
                    />
                    <RoleDropdown
                      value={promoteRole}
                      onChange={setPromoteRole}
                      align="left"
                    />
                    <button
                      type="submit"
                      disabled={isPromoting || !adminEmailInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-[#22222A] hover:bg-[#2C2C36] text-white font-semibold text-xs border border-[#383846] transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                    >
                      {isPromoting ? '...' : 'Rôle'}
                    </button>
                  </form>
                ) : !currentUser ? (
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

            {/* Onglets principaux de la section Rôles & Membres */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#22222E]/80 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#16161C] p-1 rounded-xl border border-[#262632]">
                <button
                  type="button"
                  onClick={() => setRoleSectionTab('members')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    roleSectionTab === 'members'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Comptes & Membres ({allUsers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoleSectionTab('hierarchy')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    roleSectionTab === 'hierarchy'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Arborescence & Hiérarchie des Rôles</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/25 text-blue-200 border border-blue-400/30 font-bold">
                    Interactif
                  </span>
                </button>
              </div>

              {roleSectionTab === 'members' ? (
                <button
                  type="button"
                  onClick={() => setRoleSectionTab('hierarchy')}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Voir le diagramme hiérarchique des 5 rôles →</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRoleSectionTab('members')}
                  className="text-xs text-gray-400 hover:text-white hover:underline flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>← Revenir à la liste des comptes</span>
                </button>
              )}
            </div>

            {roleSectionTab === 'hierarchy' ? (
              <RoleHierarchyChart
                allUsers={allUsers}
                currentRole={currentUser?.role}
                onOpenMatrixModal={() => setIsRoleMatrixOpen(true)}
              />
            ) : (
              <>
            {/* Filtrage des membres de la bibliothèque active */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-1 bg-[#16161C] p-1 rounded-lg border border-[#262632] w-fit">
                <button
                  type="button"
                  onClick={() => setMemberFilterTab('all')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    memberFilterTab === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Tous les comptes — {allUsers.length}
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilterTab('libraryOnly')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    memberFilterTab === 'libraryOnly'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Membres de cette bibliothèque — {allUsers.filter(u => (currentGroup?.members || []).includes(u.uid)).length}
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrer les membres..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="bg-[#16161C] border border-[#262632] rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full sm:w-48"
                />
              </div>
            </div>

            {/* Liste des utilisateurs inscrits avec gestion de rôle et assignation */}
            {allUsers.length > 0 ? (
              <div className="border border-[#222228] rounded-lg bg-[#141416] overflow-hidden">
                {/* Barre d'en-tête de la liste */}
                <div className="px-3 py-2 bg-[#101014] border-b border-[#222228] flex items-center justify-between text-[11px] text-gray-400">
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
                    const isAssigned = (currentGroup?.members || []).includes(u.uid);
                    const isSelected = selectedUserUids.includes(u.uid);
                    const userKey = u.uid ? `user-${u.uid}-${index}` : (u.email ? `user-${u.email}-${index}` : `user-${index}`);

                    return (
                      <div 
                        key={userKey} 
                        className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                          isSelected ? 'bg-blue-600/10' : 'hover:bg-[#181820]/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
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

                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            isAdmin 
                              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' 
                              : isLeader
                              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                              : u.role === 'editor'
                              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                              : u.role === 'viewer'
                              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                              : 'bg-[#222228] text-gray-300 border border-[#333]'
                          }`}>
                            {u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate flex items-center gap-1.5">
                              <span>{u.displayName || 'Utilisateur'}</span>
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 font-medium">
                                  Vous
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate font-mono">
                              {u.email || 'Sans e-mail'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
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
                                className="px-2 py-1 rounded text-[10px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer flex items-center gap-1"
                                title="Retirer de cette bibliothèque"
                              >
                                <UserMinus className="w-3 h-3" />
                                <span>Retirer</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => assignMembersToGroup(currentGroup.id, [u.uid])}
                                className="px-2 py-1 rounded text-[10px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-colors cursor-pointer flex items-center gap-1"
                                title="Assigner à cette bibliothèque"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>+ Assigner</span>
                              </button>
                            )
                          )}

                          {canManageGroups ? (
                            <RoleDropdown
                              value={u.role || 'member'}
                              onChange={(newRole) => updateUserRole(u.uid, newRole)}
                              align="right"
                            />
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
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
        )}
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
          <InfoTooltip 
            label="Informations bibliothèques" 
            content="Entrez un code à 6 caractères pour synchroniser une bibliothèque existante, ou créez un nouvel espace indépendant pour vos chants et setlists, réservé à l'Administrateur."
          />
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
              <InfoTooltip 
                label="Aide Rejoindre" 
                content="Entrez le code à 6 caractères exemple LOUAN7 pour accéder immédiatement à la bibliothèque partagée de chants et de setlists."
              />
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

          {/* Colonne / Ligne 2 : Créer une nouvelle bibliothèque (réservé Admin) */}
          <div className="space-y-3 pt-4 lg:pt-0 lg:pl-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                Créer une nouvelle bibliothèque
              </span>
              <InfoTooltip 
                label="Aide Création" 
                content={
                  canManageGroups 
                    ? "Crée un nouvel espace avec sa propre bibliothèque dédiée de chants, dossiers et setlists, et son propre code d'invitation pour vos musiciens."
                    : "Seul l'Administrateur a le privilège de créer, supprimer et administrer les bibliothèques. Les Responsables ont tous les droits musicaux sur les chants et les setlists de la bibliothèque actuelle."
                }
              />
            </div>

            {canManageGroups ? (
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
            ) : (
              <div className="p-3 rounded-lg bg-[#16161A] border border-[#25252D] text-xs text-gray-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Création réservée à l'Administrateur</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Seul le compte Administrateur peut créer, supprimer et administrer les bibliothèques. Les Responsables et Membres peuvent rejoindre une bibliothèque existante via son code d'invitation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cloud Firestore Demo Seeder Tool */}
      <div className="bg-[#111112] border border-[#222224] rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Synchronisation Firestore & Chants de Démonstration</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Injecte le répertoire d'exemple avec 6 chants ChordPro, dossiers et 2 setlists dans Cloud Firestore.
          </p>
        </div>

        <button
          onClick={handleSeedData}
          disabled={isSeeding}
          className="px-3.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 hover:text-white border border-[#333] font-medium text-xs transition-colors whitespace-nowrap"
        >
          {seedSuccess ? 'Synchronisé avec succès !' : (isSeeding ? 'Synchronisation...' : 'Restaurer Chants Démo')}
        </button>
      </div>

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
              const songCount = songs.filter(s => (s.groupId || 'default-group') === libraryToDelete.id).length;
              const setlistCount = setlists.filter(st => (st.groupId || 'default-group') === libraryToDelete.id).length;
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

    </div>
  );
};
