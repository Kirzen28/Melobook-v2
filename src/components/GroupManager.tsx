import React, { useState, useRef, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { UserRole, Group } from '../types';

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
    shortBadge: 'Musique & Chants',
    icon: Award,
    iconBoxStyle: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    badgeStyle: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
    tagStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dotColor: 'bg-emerald-400',
    description: "Mêmes droits que l'Admin sur la musique : chants, setlists et cultes. Sans gestion de bibliothèques ni réglages.",
    permissions: [
      "Gestion complète des chants, dossiers et versions",
      "Création, organisation et conduite des setlists & cultes",
      "Mode Scène, métronome et transposition en direct",
      "Pas de suppression de bibliothèques ni de réglages système"
    ]
  },
  member: {
    role: 'member',
    label: 'Membre',
    emoji: '🎵',
    shortBadge: 'Synchronisé',
    icon: UserCheck,
    iconBoxStyle: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    badgeStyle: 'bg-[#1C1C1E] text-gray-300 border-[#333]',
    tagStyle: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    dotColor: 'bg-gray-400',
    description: "Compte connecté. Synchronisation directe des setlists de la bibliothèque, répétitions en direct et Mode Scène.",
    permissions: [
      "Lecture seule synchronisée du répertoire de la bibliothèque",
      "Accès aux setlists et répétitions en direct",
      "Transposition et affichage personnalisé",
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
        title="Changer le niveau d'autorisation (menu personnalisé avec permissions détaillées)"
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
            {(['admin', 'leader', 'member'] as UserRole[]).map((roleKey) => {
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
    setAdminByEmail,
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

  // Copy invite code or link
  const handleCopyInviteCode = () => {
    if (!currentGroup?.inviteCode) return;
    navigator.clipboard.writeText(currentGroup.inviteCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [groupActionTab, setGroupActionTab] = useState<'join' | 'create' | 'both'>('join');

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
        <p className="text-xs text-gray-400 mt-1">
          Chaque bibliothèque possède son propre répertoire indépendant de chants et de setlists, accessible à tous ses membres et visiteurs
        </p>
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

      {/* Mes Bibliothèques Selector (si plus d'une bibliothèque ou pour visualiser ses espaces) */}
      <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Library className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white">Vos Bibliothèques ({groups.length})</h3>
          </div>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
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
                  <div className="flex items-center gap-2">
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

      {/* Current Active Group Card with Invite Code & Admin Edit */}
      {currentGroup && (
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 sm:p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  Bibliothèque Active
                </span>
                <span className="text-xs text-gray-400">ID: {currentGroup.id}</span>
                {canManageGroups && !isEditingGroup && (
                  <button
                    type="button"
                    onClick={startEditGroup}
                    className="px-2.5 py-1 rounded text-[11px] font-medium bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Modifier le nom et la description"
                  >
                    <Pencil className="w-3 h-3 text-blue-400" />
                    <span>Gérer la bibliothèque</span>
                  </button>
                )}
                {currentGroup.id !== 'default-group' && canDeleteLibrary(currentGroup) && !isEditingGroup && (
                  <button
                    type="button"
                    onClick={() => setLibraryToDelete(currentGroup)}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Supprimer définitivement cette bibliothèque"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Supprimer cette bibliothèque</span>
                  </button>
                )}
                {!canManageGroups && (
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3 text-gray-500" />
                    <span>Gestion réservée à l'Administrateur</span>
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
                <>
                  <h2 className="text-lg sm:text-xl font-bold text-white mt-1.5">
                    {currentGroup.name}
                  </h2>
                  {currentGroup.description ? (
                    <p className="text-xs text-gray-300 mt-1">
                      {currentGroup.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">
                      Répertoire et setlists synchronisés pour cette bibliothèque.
                    </p>
                  )}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('repertoire')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Consulter les chants ({currentGroup.name}) →</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Invite Code Box */}
            <div className="bg-[#0A0A0B] border border-[#222224] rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-semibold text-gray-400">Code d'invitation de la bibliothèque :</span>
                <div className="text-xl font-bold font-mono tracking-widest text-blue-400">
                  {currentGroup.inviteCode || 'LOUAN7'}
                </div>
                <span className="text-[10px] text-gray-500 block">Les membres l'entrent pour rejoindre cette bibliothèque</span>
              </div>

              <button
                onClick={handleCopyInviteCode}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier le code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Role status & User Info */}
          <div className="mt-5 pt-4 border-t border-[#222224] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">Votre compte actuel :</span>
              {currentUser ? (
                currentUser.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30">
                    <ShieldCheck className="w-4 h-4" /> Administrateur 👑 (Accès total à tous les réglages & gestion des bibliothèques)
                  </span>
                ) : currentUser.role === 'leader' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600/15 text-emerald-400 font-semibold border border-emerald-500/30">
                    <Award className="w-4 h-4" /> Responsable ⚡ (Gestion complète des chants & setlists - Hors bibliothèques & réglages)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1C1C1E] text-gray-300 font-semibold border border-[#333]">
                    <UserCheck className="w-4 h-4" /> Membre 🎵 (Lecture seule synchronisée & Mode Scène)
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1C1C1E] text-amber-400 font-semibold border border-amber-500/30">
                  <UserIcon className="w-4 h-4" /> Non connecté (Mode invité lecture seule)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!currentUser && (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Se connecter</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section Gestion des Rôles & Membres */}
      <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#222224]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Gestion des Rôles & Niveaux d'Accès</h3>
            </div>
          </div>

          {/* Formulaire rapide pour attribuer un rôle par email (réservé Administrateur) */}
          {canManageGroups ? (
            <form onSubmit={handlePromoteAdminEmail} className="flex items-center gap-1.5 flex-wrap">
              <input
                type="email"
                placeholder="email@utilisateur.com"
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                className="bg-[#1C1C1E] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-44 sm:w-48"
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
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {isPromoting ? '...' : 'Attribuer'}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16161A] border border-[#25252D] text-xs text-gray-400">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Attribution des rôles réservée à l'Administrateur</span>
            </div>
          )}
        </div>

        {promoteStatusMsg && (
          <div className={`mb-4 p-2.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${
            promoteStatusMsg.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}>
            <Info className="w-4 h-4 shrink-0" />
            <span>{promoteStatusMsg.text}</span>
          </div>
        )}

        {/* Liste des utilisateurs inscrits avec gestion de rôle */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>Comptes enregistrés ({allUsers.length})</span>
            {!canManageGroups && (
              <span className="text-[11px] font-normal lowercase text-gray-500 italic">
                (Seul l'administrateur peut modifier les rôles)
              </span>
            )}
          </div>

          {allUsers.length > 0 ? (
            <div className="divide-y divide-[#222228] border border-[#222228] rounded-lg bg-[#141416]">
              {allUsers.map((u, index) => {
                const isAdmin = u.role === 'admin';
                const isLeader = u.role === 'leader';
                const isSelf = currentUser?.uid === u.uid;
                const userKey = u.uid ? `user-${u.uid}-${index}` : (u.email ? `user-${u.email}-${index}` : `user-${index}`);

                return (
                  <div key={userKey} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        isAdmin 
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' 
                          : isLeader
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#222228] text-gray-300 border border-[#333]'
                      }`}>
                        {u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate flex items-center gap-1.5">
                          <span>{u.displayName || 'Utilisateur'}</span>
                          {isSelf && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#2A2A32] text-gray-400 font-normal">
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
                      {/* Sélecteur de rôle personnalisé intégré à l'outil (ou badge si lecture seule) */}
                      {canManageGroups ? (
                        <RoleDropdown
                          value={u.role || 'member'}
                          onChange={(newRole) => updateUserRole(u.uid, newRole)}
                          align="right"
                        />
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          isAdmin 
                            ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' 
                            : isLeader
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-[#1C1C1E] text-gray-400 border-[#333]'
                        }`}>
                          {isAdmin ? 'Administrateur 👑' : isLeader ? 'Responsable ⚡' : 'Membre 🎵'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-gray-500 bg-[#141416] rounded-lg border border-[#222228]">
              Aucun compte utilisateur enregistré dans la base pour le moment.
            </div>
          )}
        </div>
      </div>

      {/* Section Regroupée et Compacte : Rejoindre ou Créer une Bibliothèque */}
      <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 sm:p-5 mb-8 shadow-sm">
        {/* En-tête avec onglets compacts et info tooltips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3.5 border-b border-[#222224]">
          <div className="flex items-center gap-1.5 p-1 bg-[#16161A] rounded-lg border border-[#26262E]">
            <button
              type="button"
              onClick={() => setGroupActionTab('join')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                groupActionTab === 'join'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-300" />
              <span>Rejoindre une bibliothèque</span>
            </button>

            <button
              type="button"
              onClick={() => setGroupActionTab('create')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                groupActionTab === 'create'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-blue-300" />
              <span>Créer une bibliothèque</span>
              {!canManageGroups && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 ml-0.5">
                  <Lock className="w-2.5 h-2.5" /> Admin
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setGroupActionTab('both')}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                groupActionTab === 'both'
                  ? 'bg-[#2A2A34] text-white shadow-xs border border-[#3E3E4C]'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Afficher les deux actions côte à côte"
            >
              <span>Les deux</span>
            </button>
          </div>

          {/* Description transformée en tooltip interactif pour un gain de place maximal */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {groupActionTab === 'join' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] hidden sm:inline text-gray-400">Code à 6 caractères</span>
                <InfoTooltip 
                  label="Instructions pour rejoindre" 
                  content="Entrez le code à 6 caractères (ex: LOUAN7) pour accéder immédiatement à la bibliothèque partagée de chants et de setlists."
                />
              </div>
            )}
            {groupActionTab === 'create' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] hidden sm:inline text-gray-400">
                  {canManageGroups ? 'Nouvelle bibliothèque indépendante' : 'Accès réservé Administrateur'}
                </span>
                <InfoTooltip 
                  label="Instructions pour créer" 
                  content={
                    canManageGroups 
                      ? "Crée un nouvel espace avec sa propre bibliothèque dédiée de chants, dossiers et setlists, et son propre code d'invitation pour vos musiciens."
                      : "Seul l'Administrateur a le privilège de créer, supprimer et administrer les bibliothèques. Les Responsables ont tous les droits musicaux (chants, setlists) sur la bibliothèque actuelle."
                  }
                />
              </div>
            )}
            {groupActionTab === 'both' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] hidden sm:inline text-gray-400">Rejoindre ou créer un espace</span>
                <InfoTooltip 
                  label="Informations bibliothèques" 
                  content="Rejoignez une bibliothèque avec un code d'invitation ou créez une nouvelle bibliothèque dédiée pour vos musiciens."
                />
              </div>
            )}
          </div>
        </div>

        {/* Vue 1: Formulaire ultra-compact "Rejoindre une Bibliothèque" */}
        {groupActionTab === 'join' && (
          <form onSubmit={handleJoinGroup} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="sm:w-56">
              <input
                type="text"
                placeholder="Code (ex: LOUAN7)"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full bg-[#16161A] border border-[#2A2A32] rounded-lg px-3.5 py-1.5 text-center font-mono font-bold text-xs tracking-widest text-blue-400 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                maxLength={8}
                required
              />
            </div>
            <button
              type="submit"
              disabled={!joinCodeInput.trim()}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              Rejoindre la bibliothèque
            </button>

            {joinStatus === 'success' && (
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Bibliothèque rejointe !
              </div>
            )}
            {joinStatus === 'error' && (
              <div className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-semibold border border-rose-500/30">
                Code d'invitation introuvable.
              </div>
            )}
          </form>
        )}

        {/* Vue 2: Formulaire ultra-compact "Créer une Nouvelle Bibliothèque" */}
        {groupActionTab === 'create' && (
          canManageGroups ? (
            <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1 min-w-[180px]">
                <input
                  type="text"
                  placeholder="Nom de la bibliothèque (ex: Chorale Saint-Jean)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-[#16161A] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <input
                  type="text"
                  placeholder="Description (optionnel)"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-[#16161A] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                Créer la bibliothèque
              </button>

              {createStatus && (
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5 whitespace-nowrap">
                  <Check className="w-3.5 h-3.5" /> {createStatus}
                </div>
              )}
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-[#16161A] border border-[#25252D] text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Création de bibliothèque réservée à l'Administrateur</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span>Connectez-vous avec un compte Admin pour créer un nouvel espace</span>
                <InfoTooltip
                  label="Permissions créateur de bibliothèque"
                  content={
                    currentUser?.role === 'leader'
                      ? "En tant que Responsable, vous avez tous les droits musicaux (chants, setlists). La création de nouvelles bibliothèques est réservée à l'Administrateur."
                      : "Seul l'Administrateur peut créer, supprimer et administrer les bibliothèques."
                  }
                />
              </div>
            </div>
          )
        )}

        {/* Vue 3: Affichage côte à côte compact (sans les longs paragraphes, avec tooltips) */}
        {groupActionTab === 'both' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-[#222228]">
            {/* Rejoindre */}
            <div className="space-y-2.5 pr-0 md:pr-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  Rejoindre une bibliothèque existante
                </span>
                <InfoTooltip 
                  label="Aide Rejoindre" 
                  content="Entrez le code à 6 caractères pour synchroniser et consulter la bibliothèque."
                />
              </div>
              <form onSubmit={handleJoinGroup} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Code (ex: LOUAN7)"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-[#16161A] border border-[#2A2A32] rounded-lg px-3 py-1.5 text-center font-mono font-bold text-xs tracking-widest text-blue-400 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  maxLength={8}
                  required
                />
                <button
                  type="submit"
                  disabled={!joinCodeInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  Rejoindre
                </button>
              </form>
              {joinStatus === 'success' && (
                <div className="p-1.5 rounded bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 text-center">
                  Bibliothèque rejointe avec succès !
                </div>
              )}
              {joinStatus === 'error' && (
                <div className="p-1.5 rounded bg-rose-500/15 text-rose-300 text-xs font-semibold border border-rose-500/30 text-center">
                  Code d'invitation introuvable.
                </div>
              )}
            </div>

            {/* Créer */}
            <div className="space-y-2.5 pt-3 md:pt-0 md:pl-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  Créer une nouvelle bibliothèque
                </span>
                <InfoTooltip 
                  label="Aide Création" 
                  content={
                    canManageGroups 
                      ? "Crée un nouvel espace avec sa propre bibliothèque dédiée de chants et de setlists."
                      : "Création réservée à l'Administrateur."
                  }
                />
              </div>

              {canManageGroups ? (
                <form onSubmit={handleCreateGroup} className="space-y-2">
                  <div className="flex gap-2">
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
                      placeholder="Description (optionnel)"
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
                    <div className="p-1.5 rounded bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 text-center">
                      {createStatus}
                    </div>
                  )}
                </form>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#16161A] border border-[#25252D] text-[11px] text-gray-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Réservé à l'Administrateur</span>
                  </div>
                  <p className="text-gray-400 leading-tight">
                    Connectez-vous en Admin pour créer une bibliothèque.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cloud Firestore Demo Seeder Tool */}
      <div className="bg-[#111112] border border-[#222224] rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Synchronisation Firestore & Chants de Démonstration</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Injecte le répertoire d'exemple (6 chants ChordPro, dossiers et 2 setlists) dans Cloud Firestore.
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

    </div>
  );
};
