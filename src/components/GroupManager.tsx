import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Users, 
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
  ChevronDown
} from 'lucide-react';
import { UserRole } from '../types';

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

export const GroupManager: React.FC = () => {
  const { 
    currentUser, 
    currentGroup, 
    groups, 
    switchGroup, 
    createGroup, 
    updateGroup,
    deleteGroup,
    joinGroup, 
    seedDemoDataToFirestore,
    loginDemoUser,
    allUsers,
    updateUserRole,
    setAdminByEmail,
    setIsAuthModalOpen,
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

  // Group editing state (réservé Administrateur)
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [isSavingGroupEdit, setIsSavingGroupEdit] = useState(false);

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

  // Tooltip explicatif des rôles (pour libérer de la place)
  const [showRolesTooltip, setShowRolesTooltip] = useState(false);
  const rolesTooltipRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rolesTooltipRef.current && !rolesTooltipRef.current.contains(e.target as Node)) {
        setShowRolesTooltip(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRolesTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    setCreateStatus(`Le groupe « ${name} » a été créé avec succès avec sa propre bibliothèque.`);
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
          <span>Gestion des Groupes & Membres</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Chaque groupe possède sa propre bibliothèque indépendante de chants et de setlists, accessible à tous ses membres
        </p>
      </div>

      {/* Mes Groupes Selector (si plus d'un groupe ou pour visualiser ses espaces) */}
      <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white">Vos Répertoires & Groupes ({groups.length})</h3>
          </div>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            Cliquez pour changer de répertoire actif
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {groups.map((g, index) => {
            const isActive = currentGroup?.id === g.id;
            const groupKey = g.id ? `group-${g.id}-${index}` : `group-${index}`;
            return (
              <button
                key={groupKey}
                type="button"
                onClick={() => switchGroup(g.id)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive 
                    ? 'bg-blue-600/15 border-blue-500/50 shadow-xs' 
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
                    <span className="shrink-0 text-[10px] text-gray-400 group-hover:text-blue-400 font-mono">
                      {g.inviteCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                  <span>{g.members?.length || 1} membre{(g.members?.length || 1) > 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-1.5">
                    {canManageGroups && g.id !== 'default-group' && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Supprimer définitivement le groupe « ${g.name} » ?`)) {
                            deleteGroup(g.id);
                          }
                        }}
                        className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Supprimer ce groupe (réservé Administrateur)"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    )}
                    <span className="text-[10px] text-blue-400 font-medium">
                      {isActive ? 'Bibliothèque en cours' : 'Activer →'}
                    </span>
                  </div>
                </div>
              </button>
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
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 hover:text-white border border-[#333] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Modifier le nom et la description (réservé Administrateur)"
                  >
                    <Pencil className="w-3 h-3 text-blue-400" />
                    <span>Gérer le groupe</span>
                  </button>
                )}
                {!canManageGroups && (
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3 text-gray-500" />
                    <span>Gestion réservée Admin</span>
                  </span>
                )}
              </div>

              {isEditingGroup ? (
                <form onSubmit={handleSaveGroupEdit} className="mt-3 space-y-2.5 max-w-lg">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">Nom du groupe :</label>
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
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSavingGroupEdit || !editGroupName.trim()}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingGroupEdit ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingGroup(false)}
                      className="px-3 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 text-xs transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
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
                      Répertoire et setlists synchronisés pour ce groupe.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Invite Code Box */}
            <div className="bg-[#0A0A0B] border border-[#222224] rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-semibold text-gray-400">Code d'invitation à partager :</span>
                <div className="text-xl font-bold font-mono tracking-widest text-blue-400">
                  {currentGroup.inviteCode || 'LOUAN7'}
                </div>
                <span className="text-[10px] text-gray-500 block">Les membres l'entrent pour rejoindre ce répertoire</span>
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
                    <ShieldCheck className="w-4 h-4" /> Administrateur 👑 (Accès total à tous les réglages & gestion des groupes)
                  </span>
                ) : currentUser.role === 'leader' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600/15 text-emerald-400 font-semibold border border-emerald-500/30">
                    <Award className="w-4 h-4" /> Responsable ⚡ (Gestion complète des chants & setlists - Hors groupes & réglages)
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
              {/* Test role toggle button */}
              <div className="flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-md border border-[#222224]">
                <span className="text-[10px] text-gray-500 px-1 font-medium">Tester :</span>
                <button
                  type="button"
                  onClick={() => loginDemoUser('admin')}
                  className={`px-2 py-0.5 rounded font-medium text-[10px] transition-colors cursor-pointer ${
                    currentUser?.role === 'admin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Tester l'application en mode Administrateur"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => loginDemoUser('leader')}
                  className={`px-2 py-0.5 rounded font-medium text-[10px] transition-colors cursor-pointer ${
                    currentUser?.role === 'leader' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Tester l'application en mode Responsable"
                >
                  Responsable
                </button>
                <button
                  type="button"
                  onClick={() => loginDemoUser('member')}
                  className={`px-2 py-0.5 rounded font-medium text-[10px] transition-colors cursor-pointer ${
                    currentUser?.role === 'member' ? 'bg-[#333] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Tester l'application en mode Membre"
                >
                  Membre
                </button>
              </div>

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
              <p className="text-xs text-gray-400">Administrateur (Tous réglages & Groupes), Responsable (Chants & Setlists) et Membre</p>
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
              <select
                value={promoteRole}
                onChange={(e) => setPromoteRole(e.target.value as UserRole)}
                className="bg-[#1C1C1E] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="leader">Responsable ⚡</option>
                <option value="admin">Administrateur 👑</option>
                <option value="member">Membre 🎵</option>
              </select>
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

        {/* Tooltip compact des 4 niveaux d'accès et permissions */}
        <div 
          ref={rolesTooltipRef}
          className="relative mb-4"
          onMouseEnter={() => setShowRolesTooltip(true)}
          onMouseLeave={() => setShowRolesTooltip(false)}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRolesTooltip(prev => !prev)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141416] hover:bg-[#1C1C20] text-gray-300 hover:text-white border border-[#26262E] hover:border-[#383844] text-xs font-medium transition-all shadow-xs cursor-pointer group"
              aria-expanded={showRolesTooltip}
              title="Afficher les détails des permissions pour chaque rôle"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 shrink-0" />
              <span>Guide des 4 rôles & permissions</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 font-semibold border border-blue-500/25">
                Tooltip info
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-transform duration-200 ${showRolesTooltip ? 'rotate-180 text-blue-400' : ''}`} />
            </button>

            <span className="text-[11px] text-gray-500 hidden sm:inline">
              Survolez ou cliquez pour consulter les droits détaillés
            </span>
          </div>

          {/* Floating Tooltip Box */}
          {showRolesTooltip && (
            <div className="absolute left-0 top-full mt-2 w-full max-w-2xl bg-[#141416]/98 backdrop-blur-md border border-[#2E2E38] rounded-xl p-3.5 shadow-2xl z-40 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#24242C]">
                <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Détail des 4 niveaux d'accès</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRolesTooltip(false)}
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#222228] transition-colors cursor-pointer"
                  title="Fermer le tooltip"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Niveau 1: Non connecté */}
                <div className="p-2.5 rounded-lg bg-[#18181C] border border-[#272730] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-gray-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      Visiteur (Invité)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#222228] text-gray-400 font-medium">
                      Lecture seule
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Consultation libre du répertoire, transposition, mode scène, métronome et export PDF.
                  </p>
                </div>

                {/* Niveau 2: Membre */}
                <div className="p-2.5 rounded-lg bg-[#18181C] border border-[#272730] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-emerald-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Membre (Musicien)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                      Synchronisé
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Compte connecté. Synchronisation directe des setlists du groupe et répétitions en direct.
                  </p>
                </div>

                {/* Niveau 3: Responsable */}
                <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-emerald-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      Responsable ⚡
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                      Musique & Chants
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-normal">
                    <strong>Mêmes droits que l'Admin</strong> sur la musique : chants, setlists et cultes. Sans gestion de groupes ni réglages.
                  </p>
                </div>

                {/* Niveau 4: Administrateur */}
                <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-blue-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      Administrateur 👑
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30">
                      Accès Total
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-normal">
                    <strong>Contrôle total</strong> : accès à tous les réglages, création/suppression de groupes et attribution des rôles.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

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
            <div className="divide-y divide-[#222228] border border-[#222228] rounded-lg overflow-hidden bg-[#141416]">
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
                      {/* Badge de rôle */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isAdmin 
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' 
                          : isLeader
                          ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-[#1C1C1E] text-gray-400 border-[#333]'
                      }`}>
                        {isAdmin ? 'Administrateur 👑' : isLeader ? 'Responsable ⚡' : 'Membre 🎵'}
                      </span>

                      {/* Sélecteur de rôle (réservé exclusivement à l'Admin) */}
                      {canManageGroups && (
                        <select
                          value={u.role || 'member'}
                          onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                          className="bg-[#1C1C20] border border-[#333] hover:border-blue-500/40 rounded px-2 py-1 text-[11px] text-gray-200 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="admin">Administrateur 👑</option>
                          <option value="leader">Responsable ⚡</option>
                          <option value="member">Membre 🎵</option>
                        </select>
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

      {/* Section Regroupée et Compacte : Rejoindre ou Créer un Groupe */}
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
              <span>Rejoindre un groupe</span>
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
              <span>Créer un groupe</span>
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
                  content="Entrez le code à 6 caractères (ex: LOUAN7) fourni par le responsable de votre groupe pour accéder immédiatement au répertoire partagé de chants et de setlists."
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
                      ? "Crée un nouvel espace indépendant avec sa propre bibliothèque dédiée de chants, dossiers et setlists, et son propre code d'invitation pour vos musiciens."
                      : "Seul l'Administrateur a le privilège de créer, supprimer et administrer les groupes indépendants. Les Responsables ont tous les droits musicaux (chants, setlists) sur le groupe actuel."
                  }
                />
              </div>
            )}
            {groupActionTab === 'both' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] hidden sm:inline text-gray-400">Rejoindre ou créer un espace</span>
                <InfoTooltip 
                  label="Informations groupes" 
                  content="Rejoignez un groupe avec un code d'invitation ou créez une nouvelle bibliothèque dédiée pour vos musiciens."
                />
              </div>
            )}
          </div>
        </div>

        {/* Vue 1: Formulaire ultra-compact "Rejoindre un Groupe" */}
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
              Rejoindre le groupe
            </button>

            {joinStatus === 'success' && (
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Groupe rejoint !
              </div>
            )}
            {joinStatus === 'error' && (
              <div className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-semibold border border-rose-500/30">
                Code d'invitation introuvable.
              </div>
            )}
          </form>
        )}

        {/* Vue 2: Formulaire ultra-compact "Créer un Nouveau Groupe" */}
        {groupActionTab === 'create' && (
          canManageGroups ? (
            <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="flex-1 min-w-[180px]">
                <input
                  type="text"
                  placeholder="Nom du groupe (ex: Chorale Saint-Jean)"
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
                Créer le groupe
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
                <span>Création de groupe réservée à l'Administrateur</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span>Connectez-vous avec un compte Admin pour créer un nouvel espace</span>
                <InfoTooltip
                  label="Permissions créateur de groupe"
                  content={
                    currentUser?.role === 'leader'
                      ? "En tant que Responsable, vous avez tous les droits musicaux (chants, setlists). La création de nouveaux groupes indépendants est réservée à l'Administrateur."
                      : "Seul l'Administrateur peut créer, supprimer et administrer les groupes indépendants."
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
                  Rejoindre un groupe existant
                </span>
                <InfoTooltip 
                  label="Aide Rejoindre" 
                  content="Entrez le code à 6 caractères fourni par votre chef de groupe pour synchroniser le répertoire."
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
                  Groupe rejoint avec succès !
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
                  Créer un nouveau groupe
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
                      placeholder="Nom du groupe"
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
                    Créer le groupe
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
                    Connectez-vous en Admin pour créer un groupe.
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

    </div>
  );
};
