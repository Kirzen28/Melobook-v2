import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from '../firebase';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Library,
  Plus,
  KeyRound,
  LogOut
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    currentUser,
    setNeedsLibraryOnboarding,
    setSignupInProgress,
    completeSignupCreateLibrary,
    completeSignupJoinLibrary,
    handleSignOut
  } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [libraryChoice, setLibraryChoice] = useState<'create' | 'join'>('create');
  const [libraryName, setLibraryName] = useState('');
  const [libraryIdentifier, setLibraryIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Veuillez saisir votre adresse e-mail.');
      return;
    }

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setErrorMsg('Veuillez saisir votre nom complet.');
        return;
      }
      if (libraryChoice === 'create' && !libraryName.trim()) {
        setErrorMsg('Veuillez saisir le nom de votre nouvelle bibliothèque.');
        return;
      }
      if (libraryChoice === 'join' && !libraryIdentifier.trim()) {
        setErrorMsg("Veuillez saisir l'identifiant de la bibliothèque à rejoindre.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        setIsAuthModalOpen(false);
      } else if (mode === 'signup') {
        const finalName = displayName.trim();
        setSignupInProgress(true);
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          await updateProfile(userCredential.user, { displayName: finalName });
          if (libraryChoice === 'create') {
            await completeSignupCreateLibrary(libraryName.trim(), '', finalName);
          } else {
            await completeSignupJoinLibrary(libraryIdentifier.trim(), finalName);
          }
          setIsAuthModalOpen(false);
        } catch (signupErr) {
          if (auth.currentUser) {
            setIsAuthModalOpen(false);
            setNeedsLibraryOnboarding(true);
          }
          throw signupErr;
        } finally {
          setSignupInProgress(false);
        }
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, cleanEmail);
        setSuccessMsg('Un e-mail de réinitialisation vous a été envoyé.');
      }
    } catch (err: any) {
      let msg = err?.message || 'Une erreur est survenue';
      if (err?.code === 'auth/operation-not-allowed') {
        msg = "La connexion par e-mail/mot de passe n'est pas encore activée dans Firebase Console (Authentication → Sign-in method → E-mail/Mot de passe).";
      } else if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
        msg = 'Identifiants incorrects. Vérifiez votre e-mail et mot de passe.';
      } else if (err?.code === 'auth/email-already-in-use') {
        msg = 'Cet e-mail est déjà utilisé par un autre compte.';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Le mot de passe doit contenir au moins 6 caractères.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111112] border border-[#222224] rounded-xl w-full max-w-md p-6 shadow-2xl relative text-[#E0E0E0] max-h-[92vh] overflow-y-auto">
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#1C1C1E] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-md bg-[#1C1C1E] border border-[#333] flex items-center justify-center mx-auto mb-3 shadow-sm">
            <UserIcon className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-base font-bold text-white">
            {mode === 'signin' && 'Changer de compte'}
            {mode === 'signup' && 'Créer un Nouveau Compte'}
            {mode === 'reset' && 'Mot de passe oublié'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'signin' && 'Connectez-vous avec un autre compte Melobook'}
            {mode === 'signup' && 'Créez ou rejoignez une bibliothèque avec sa propre base de données'}
            {mode === 'reset' && 'Entrez votre e-mail pour recevoir le lien de réinitialisation'}
          </p>
        </div>

        <div className="flex bg-[#0A0A0B] p-1 rounded-md border border-[#222224] mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
              mode === 'signin' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
              mode === 'signup' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Inscription
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Nom complet / Prénom
              </label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ex: David - Pianiste"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="votre.nom@musique.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-300">Mot de passe</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-9 pr-9 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLibraryChoice('create')}
                  className={`p-2 rounded-lg border text-left text-xs cursor-pointer transition-colors ${
                    libraryChoice === 'create'
                      ? 'bg-blue-600/15 border-blue-500 text-white'
                      : 'bg-[#18181D] border-[#2C2C34] text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Plus className="w-3.5 h-3.5 text-blue-400" />
                    <span>Créer</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryChoice('join')}
                  className={`p-2 rounded-lg border text-left text-xs cursor-pointer transition-colors ${
                    libraryChoice === 'join'
                      ? 'bg-blue-600/15 border-blue-500 text-white'
                      : 'bg-[#18181D] border-[#2C2C34] text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                    <span>Rejoindre</span>
                  </div>
                </button>
              </div>

              {libraryChoice === 'create' ? (
                <div className="relative">
                  <Library className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Nom de la nouvelle bibliothèque"
                    value={libraryName}
                    onChange={(e) => setLibraryName(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              ) : (
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Identifiant de la bibliothèque"
                    value={libraryIdentifier}
                    onChange={(e) => setLibraryIdentifier(e.target.value.toUpperCase())}
                    className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-9 pr-3 py-1.5 text-xs font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-98 disabled:opacity-50 mt-1 cursor-pointer"
          >
            {loading ? 'Chargement...' : (
              mode === 'signin' ? 'Se connecter' : (mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien')
            )}
          </button>
        </form>

        {currentUser && (
          <div className="mt-4 pt-3 border-t border-[#222224]">
            <button
              type="button"
              onClick={() => {
                setIsAuthModalOpen(false);
                handleSignOut();
              }}
              className="w-full py-1.5 px-3 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter ({currentUser.email || currentUser.displayName})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
