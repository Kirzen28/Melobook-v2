import React, { useState } from 'react';
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
  QrCode,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';

export const GroupManager: React.FC = () => {
  const { 
    currentUser, 
    currentGroup, 
    groups, 
    switchGroup, 
    createGroup, 
    joinGroup, 
    seedDemoDataToFirestore,
    loginDemoUser 
  } = useApp();

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinStatus, setJoinStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isCopied, setIsCopied] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // Copy invite code or link
  const handleCopyInviteCode = () => {
    if (!currentGroup?.inviteCode) return;
    navigator.clipboard.writeText(currentGroup.inviteCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await createGroup(newGroupName.trim(), newGroupDesc.trim());
    setNewGroupName('');
    setNewGroupDesc('');
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
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
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
          Partagez votre répertoire, invitez des musiciens et gérez les permissions d'administration
        </p>
      </div>

      {/* Current Active Group Card with Invite Code */}
      {currentGroup && (
        <div className="bg-[#111112] border border-[#222224] rounded-lg p-5 sm:p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#1C1C1E] text-blue-400 border border-[#333]">
                  Groupe Actif
                </span>
                <span className="text-xs text-gray-400">ID: {currentGroup.id}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                {currentGroup.name}
              </h2>
              {currentGroup.description && (
                <p className="text-xs text-gray-300 mt-1">
                  {currentGroup.description}
                </p>
              )}
            </div>

            {/* Invite Code Box */}
            <div className="bg-[#0A0A0B] border border-[#222224] rounded-md p-4 flex flex-col sm:flex-row items-center gap-3">
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-semibold text-gray-400">Code d'invitation :</span>
                <div className="text-xl font-bold font-mono tracking-widest text-blue-400">
                  {currentGroup.inviteCode || 'LOUAN7'}
                </div>
              </div>

              <button
                onClick={handleCopyInviteCode}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap"
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

          {/* Role switcher simulation bar */}
          <div className="mt-5 pt-4 border-t border-[#222224] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">Votre rôle actuel :</span>
              {currentUser?.role === 'admin' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1C1C1E] text-blue-400 font-semibold border border-[#333]">
                  <ShieldCheck className="w-3.5 h-3.5" /> Administrateur (Création & Édition)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1C1C1E] text-gray-300 font-semibold border border-[#333]">
                  <UserCheck className="w-3.5 h-3.5" /> Membre (Lecture & Mode Scène)
                </span>
              )}
            </div>

            {/* Test role toggle button */}
            <div className="flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-md border border-[#222224]">
              <span className="text-[10px] text-gray-500 px-1.5 font-medium">Tester :</span>
              <button
                onClick={() => loginDemoUser('admin')}
                className={`px-2.5 py-1 rounded font-medium text-[11px] transition-colors ${
                  currentUser?.role === 'admin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Mode Admin
              </button>
              <button
                onClick={() => loginDemoUser('member')}
                className={`px-2.5 py-1 rounded font-medium text-[11px] transition-colors ${
                  currentUser?.role === 'member' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Mode Membre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Section: Join Group & Create Group */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Join Group with Code */}
        <div className="bg-[#111112] border border-[#222224] rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Rejoindre un Groupe Existant</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Entrez le code à 6 caractères fourni par le chef de votre groupe pour accéder immédiatement au répertoire partagé.
          </p>

          <form onSubmit={handleJoinGroup} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Ex: LOUAN7"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3.5 py-2 text-center font-mono font-bold text-sm tracking-widest text-blue-400 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                maxLength={8}
                required
              />
            </div>

            {joinStatus === 'success' && (
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold text-center border border-emerald-500/30">
                Groupe rejoint avec succès !
              </div>
            )}
            {joinStatus === 'error' && (
              <div className="p-2 rounded-md bg-rose-500/10 text-rose-400 text-xs font-semibold text-center border border-rose-500/30">
                Code d'invitation introuvable.
              </div>
            )}

            <button
              type="submit"
              disabled={!joinCodeInput.trim()}
              className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-98 disabled:opacity-50"
            >
              Rejoindre le groupe
            </button>
          </form>
        </div>

        {/* Create New Group */}
        <div className="bg-[#111112] border border-[#222224] rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Créer un Nouveau Groupe</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Créez un nouvel espace pour une chorale, un groupe de louange ou un groupe de musique.
          </p>

          <form onSubmit={handleCreateGroup} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Nom du groupe (ex: Chorale Saint-Jean)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Description / Informations (optionnel)"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-md px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={!newGroupName.trim()}
              className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-98 disabled:opacity-50"
            >
              Créer le groupe
            </button>
          </form>
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
