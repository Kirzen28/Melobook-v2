import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
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
  const { isAuthModalOpen, setIsAuthModalOpen, loginDemoUser, loginLocalUser } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showLocalFallback, setShowLocalFallback] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setShowLocalFallback(false);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.warn('Google sign-in attempt:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User voluntarily closed the window
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setErrorMsg('La fenêtre de connexion a été bloquée par le navigateur. Veuillez autoriser les fenêtres pop-up.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg("La méthode Google n'est pas encore autorisée sur ce projet Firebase. Utilisez l'accès direct ci-dessous.");
        setShowLocalFallback(true);
      } else {
        setErrorMsg(err.message || 'Erreur lors de la connexion Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setShowLocalFallback(false);
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
      console.warn('Auth attempt error:', err);
      let msg = err.message || 'Une erreur est survenue';
      if (err.code === 'auth/operation-not-allowed') {
        msg = "La connexion par e-mail/mot de passe n'est pas activée sur ce projet Firebase. Utilisez « Continuer avec Google » ou continuez directement ci-dessous.";
        setShowLocalFallback(true);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
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
      <div className="bg-[#111112] border border-[#222224] rounded-xl w-full max-w-md p-6 shadow-2xl relative text-[#E0E0E0]">
        
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#1C1C1E] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-md bg-[#1C1C1E] border border-[#333] flex items-center justify-center mx-auto mb-3 shadow-sm">
            <UserIcon className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-base font-bold text-white">
            {mode === 'signin' && 'Connexion à Melobook'}
            {mode === 'signup' && 'Créer un Compte Musicien'}
            {mode === 'reset' && 'Mot de passe oublié'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'signin' && 'Accédez à vos répertoires et setlists synchronisés'}
            {mode === 'signup' && 'Rejoignez une bibliothèque ou commencez à gérer vos chants'}
            {mode === 'reset' && 'Entrez votre e-mail pour recevoir le lien de réinitialisation'}
          </p>
        </div>

        {/* 1-Click Google Sign-In Button */}
        {mode !== 'reset' && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-gray-100 text-gray-900 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            <div className="flex items-center my-3.5">
              <div className="flex-1 border-t border-[#26262A]"></div>
              <span className="px-3 text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                ou par e-mail
              </span>
              <div className="flex-1 border-t border-[#26262A]"></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-[#0A0A0B] p-1 rounded-md border border-[#222224] mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); setShowLocalFallback(false); }}
            className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
              mode === 'signin' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); setShowLocalFallback(false); }}
            className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
              mode === 'signup' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Inscription
          </button>
        </div>

        {/* Error / Success message alerts */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
            {showLocalFallback && (
              <button
                type="button"
                onClick={() => loginLocalUser(email || 'musicien@songbook.pro', displayName || undefined, (email?.toLowerCase().trim() === 'kriveravelasquez@rivera-marketing.com') ? 'admin' : 'member')}
                className="w-full mt-1.5 py-1.5 px-2.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Continuer avec cet e-mail (Session locale)</span>
              </button>
            )}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
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
                    onClick={() => { setMode('reset'); setErrorMsg(''); setSuccessMsg(''); setShowLocalFallback(false); }}
                    className="text-[11px] text-blue-400 hover:underline cursor-pointer"
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
            className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all active:scale-98 disabled:opacity-50 mt-1 cursor-pointer"
          >
            {loading ? 'Chargement...' : (
              mode === 'signin' ? 'Se connecter' : (mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien')
            )}
          </button>
        </form>

        {/* Accès Découverte sans mot de passe (Invité ou Musicien Membre uniquement) */}
        <div className="mt-5 pt-4 border-t border-[#222224]">
          <div className="text-center mb-2.5">
            <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
              Accès sans mot de passe
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              className="py-1.5 px-3 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 font-semibold text-xs border border-[#333] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Mode Invité</span>
            </button>

            <button
              type="button"
              onClick={() => loginDemoUser('member')}
              className="py-1.5 px-3 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-300 font-semibold text-xs border border-[#333] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Compte Musicien</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
