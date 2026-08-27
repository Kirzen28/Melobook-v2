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
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, loginDemoUser } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setIsAuthModalOpen(false);
      } else if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: displayName.trim()
          });
        }
        setIsAuthModalOpen(false);
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim());
        setSuccessMsg('Un e-mail de réinitialisation vous a été envoyé.');
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Une erreur est survenue';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Identifiants incorrects. Vérifiez votre e-mail et mot de passe.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Cet e-mail est déjà utilisé par un autre compte.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Le mot de passe doit contenir au moins 6 caractères.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111112] border border-[#222224] rounded-lg w-full max-w-md p-6 shadow-2xl relative text-[#E0E0E0]">
        
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#1C1C1E] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-md bg-[#1C1C1E] border border-[#333] flex items-center justify-center mx-auto mb-3 shadow-sm">
            <UserIcon className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-base font-bold text-white">
            {mode === 'signin' && 'Connexion à SongBook Pro'}
            {mode === 'signup' && 'Créer un Compte Musicien'}
            {mode === 'reset' && 'Mot de passe oublié'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'signin' && 'Accédez à vos répertoires et setlists synchronisés'}
            {mode === 'signup' && 'Rejoignez un groupe ou commencez à gérer vos chants'}
            {mode === 'reset' && 'Entrez votre e-mail pour recevoir le lien de réinitialisation'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#0A0A0B] p-1 rounded-md border border-[#222224] mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 rounded transition-colors ${
              mode === 'signin' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 rounded transition-colors ${
              mode === 'signup' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Inscription
          </button>
        </div>

        {/* Error / Success message alerts */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
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
                  placeholder="ex: David (Pianiste)"
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
                <label className="text-xs font-medium text-gray-300">
                  Mot de passe
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-[#333] rounded-md pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-98 disabled:opacity-50 mt-1"
          >
            {loading ? 'Chargement...' : (
              mode === 'signin' ? 'Se connecter' : (mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien')
            )}
          </button>
        </form>

        {/* Quick Demo Access Mode (Instant 1-Click for reviewers and musicians) */}
        <div className="mt-5 pt-4 border-t border-[#222224]">
          <div className="text-center mb-2.5">
            <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
              Accès Démonstration Rapide (Sans mot de passe)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => loginDemoUser('admin')}
              className="py-1.5 px-3 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-blue-400 font-semibold text-xs border border-[#333] flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Chef de Groupe (Admin)</span>
            </button>

            <button
              type="button"
              onClick={() => loginDemoUser('member')}
              className="py-1.5 px-3 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 font-semibold text-xs border border-[#333] flex items-center justify-center gap-1.5 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Musicien (Membre)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
