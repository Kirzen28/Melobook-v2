import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MelobookLogo } from './MelobookLogo';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from '../firebase';
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Library,
  Plus,
  LogOut,
  Database,
  Check,
  QrCode
} from 'lucide-react';
import { GuestQrScannerModal } from './GuestQrScannerModal';
import { ShareTargetFromQr } from '../utils/guestCodeParser';

type LibraryChoiceMode = 'create' | 'join';

export const LoginPage: React.FC = () => {
  const {
    firebaseUser,
    needsLibraryOnboarding,
    setNeedsLibraryOnboarding,
    setSignupInProgress,
    completeSignupCreateLibrary,
    completeSignupJoinLibrary,
    enterGuestMode,
    handleSignOut
  } = useApp();

  const initialInviteCode = (() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.replace(/^#/, '')) : null;
    return (
      params.get('inviteCode') ||
      params.get('joinCode') ||
      params.get('invite') ||
      params.get('code') ||
      hashParams?.get('inviteCode') ||
      hashParams?.get('joinCode') ||
      hashParams?.get('invite') ||
      hashParams?.get('code') ||
      ''
    ).trim().toUpperCase();
  })();

  const [tab, setTab] = useState<'signin' | 'signup'>(initialInviteCode ? 'signup' : 'signin');
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [isGuestEntry, setIsGuestEntry] = useState(false);
  const [qrScannerMode, setQrScannerMode] = useState<'guest' | 'member' | null>(null);
  const [guestCodeInput, setGuestCodeInput] = useState(initialInviteCode);

  // Account fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Library choice fields (signup & onboarding)
  const [libraryChoice, setLibraryChoice] = useState<LibraryChoiceMode>(initialInviteCode ? 'join' : 'create');
  const [libraryName, setLibraryName] = useState('');
  const [libraryDescription, setLibraryDescription] = useState('');
  const [libraryIdentifier, setLibraryIdentifier] = useState(initialInviteCode);

  // Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Real-time password strength checks (used during signup)
  const passwordChecks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };
  const passwordCorePassedCount = [
    passwordChecks.minLength,
    passwordChecks.hasUpper,
    passwordChecks.hasLower,
    passwordChecks.hasNumber
  ].filter(Boolean).length;
  const isPasswordStrongEnough = passwordCorePassedCount === 4;
  const passwordStrength = (() => {
    if (!password) {
      return { level: 0, label: '', color: 'bg-[#262630]', textColor: 'text-gray-400', feedback: '' };
    }
    if (password.length < 6 || passwordCorePassedCount <= 1) {
      return {
        level: 1,
        label: 'Faible',
        color: 'bg-rose-500',
        textColor: 'text-rose-400',
        feedback: 'Mot de passe trop faible : utilisez au moins 8 caractères, une majuscule, une minuscule et un chiffre.'
      };
    }
    if (passwordCorePassedCount <= 3) {
      return {
        level: 2,
        label: 'Moyen',
        color: 'bg-amber-500',
        textColor: 'text-amber-400',
        feedback: 'Presque bon : complétez tous les critères ci-dessous.'
      };
    }
    if (passwordChecks.hasSpecial || password.length >= 12) {
      return {
        level: 4,
        label: 'Très fort',
        color: 'bg-emerald-500',
        textColor: 'text-emerald-400',
        feedback: 'Mot de passe très sécurisé.'
      };
    }
    return {
      level: 3,
      label: 'Valide',
      color: 'bg-blue-500',
      textColor: 'text-blue-400',
      feedback: 'Mot de passe valide (ajoutez un caractère spécial pour le renforcer).'
    };
  })();

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Veuillez renseigner votre adresse e-mail.');
      return;
    }

    if (isResetPassword) {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setSuccessMsg("Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé. Vérifiez votre boîte de réception (et vos spams).");
      } catch (err: any) {
        const code = err?.code || '';
        if (code === 'auth/invalid-email') {
          setErrorMsg('Adresse e-mail invalide.');
        } else if (code === 'auth/user-not-found') {
          setErrorMsg('Aucun compte trouvé avec cette adresse e-mail.');
        } else if (code === 'auth/too-many-requests') {
          setErrorMsg('Trop de tentatives. Veuillez réessayer dans quelques minutes.');
        } else if (code === 'auth/operation-not-allowed') {
          setErrorMsg("La réinitialisation par e-mail n'est pas activée dans Firebase Console.");
        } else {
          setErrorMsg(err?.message || "Impossible d'envoyer l'e-mail de réinitialisation.");
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Veuillez renseigner votre mot de passe.');
      return;
    }

    if (tab === 'signup') {
      if (!lastName.trim() || !firstName.trim()) {
        setErrorMsg('Veuillez renseigner votre nom et votre prénom.');
        return;
      }
      if (!isPasswordStrongEnough) {
        setErrorMsg('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.');
        return;
      }
      if (libraryChoice === 'create' && !libraryName.trim()) {
        setErrorMsg('Veuillez donner un nom à votre nouvelle bibliothèque.');
        return;
      }
      if (libraryChoice === 'join' && !libraryIdentifier.trim()) {
        setErrorMsg("Veuillez saisir l'identifiant de la bibliothèque à rejoindre.");
        return;
      }
    }

    setLoading(true);

    try {
      if (tab === 'signup') {
        const finalName = `${lastName.trim()} ${firstName.trim()}`.trim() || cleanEmail.split('@')[0];
        setSignupInProgress(true);
        try {
          const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          await updateProfile(userCred.user, { displayName: finalName });

          if (libraryChoice === 'create') {
            await completeSignupCreateLibrary(libraryName.trim(), libraryDescription.trim(), finalName);
          } else {
            await completeSignupJoinLibrary(libraryIdentifier.trim(), finalName);
          }
        } catch (signupErr) {
          if (auth.currentUser) {
            setNeedsLibraryOnboarding(true);
          }
          throw signupErr;
        } finally {
          setSignupInProgress(false);
        }
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setErrorMsg('Cet e-mail est déjà utilisé. Connectez-vous avec votre compte existant.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg('Adresse e-mail invalide.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
        setErrorMsg('Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg("La connexion par e-mail/mot de passe n'est pas encore activée dans Firebase Console (Authentication → Sign-in method → E-mail/Mot de passe).");
      } else {
        setErrorMsg(err?.message || 'Erreur lors de la connexion.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (libraryChoice === 'create' && !libraryName.trim()) {
      setErrorMsg('Veuillez saisir le nom de votre bibliothèque.');
      return;
    }
    if (libraryChoice === 'join' && !libraryIdentifier.trim()) {
      setErrorMsg("Veuillez saisir l'identifiant de la bibliothèque à rejoindre.");
      return;
    }

    setLoading(true);
    try {
      if (libraryChoice === 'create') {
        await completeSignupCreateLibrary(libraryName.trim(), libraryDescription.trim());
      } else {
        await completeSignupJoinLibrary(libraryIdentifier.trim());
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Impossible de configurer la bibliothèque.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const code = guestCodeInput.trim();
    if (!code) {
      setErrorMsg("Veuillez saisir le code d'une bibliothèque.");
      return;
    }

    setLoading(true);
    try {
      await enterGuestMode(code);
    } catch (err: any) {
      setErrorMsg(err?.message || "Code invalide ou accès visiteur désactivé pour cette bibliothèque.");
    } finally {
      setLoading(false);
    }
  };

  const handleScannedGuestTarget = async (target: ShareTargetFromQr) => {
    setQrScannerMode(null);
    setIsGuestEntry(true);
    setIsResetPassword(false);
    setGuestCodeInput(target.code);
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await enterGuestMode(target.code, {
        ...(target.setlistId ? { setlistId: target.setlistId } : {}),
        ...(target.songId ? { songId: target.songId } : {}),
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Code invalide ou accès visiteur désactivé pour cette bibliothèque.");
    } finally {
      setLoading(false);
    }
  };

  const handleScannedMemberInviteCode = (scannedCode: string) => {
    setQrScannerMode(null);
    setIsGuestEntry(false);
    setIsResetPassword(false);
    setTab('signup');
    setLibraryChoice('join');
    setLibraryIdentifier(scannedCode);
    setErrorMsg('');
    setSuccessMsg(`Code bibliothèque « ${scannedCode} » détecté. Complétez votre compte pour rejoindre la bibliothèque.`);
  };

  const renderLibraryChoiceFields = () => (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-white">
          Votre bibliothèque
        </label>
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <Database className="w-3 h-3 text-blue-400" />
          Base de données dédiée
        </span>
      </div>

      {/* Choice Cards */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setLibraryChoice('create');
            setErrorMsg('');
          }}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            libraryChoice === 'create'
              ? 'bg-blue-600/15 border-blue-500 text-white shadow-xs ring-1 ring-blue-500/30'
              : 'bg-[#16161A] border-[#262630] text-gray-400 hover:text-white hover:border-[#363644]'
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold text-xs mb-0.5">
            <Plus className={`w-3.5 h-3.5 shrink-0 ${libraryChoice === 'create' ? 'text-blue-400' : 'text-gray-500'}`} />
            <span>Créer</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-tight">
            Nouvelle bibliothèque & base isolée
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setLibraryChoice('join');
            setErrorMsg('');
          }}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            libraryChoice === 'join'
              ? 'bg-blue-600/15 border-blue-500 text-white shadow-xs ring-1 ring-blue-500/30'
              : 'bg-[#16161A] border-[#262630] text-gray-400 hover:text-white hover:border-[#363644]'
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold text-xs mb-0.5">
            <KeyRound className={`w-3.5 h-3.5 shrink-0 ${libraryChoice === 'join' ? 'text-blue-400' : 'text-gray-500'}`} />
            <span>Rejoindre</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-tight">
            Via l'identifiant d'une bibliothèque
          </p>
        </button>
      </div>

      {libraryChoice === 'create' ? (
        <div className="space-y-2.5 p-3 rounded-xl bg-[#0D0D10] border border-[#222228]">
          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Nom de la bibliothèque
            </label>
            <div className="relative">
              <Library className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ex: Équipe Louange Paris"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              Description (facultative)
            </label>
            <input
              type="text"
              placeholder="Répertoire du groupe, setlists..."
              value={libraryDescription}
              onChange={(e) => setLibraryDescription(e.target.value)}
              className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Un identifiant unique sera généré pour votre bibliothèque afin d'inviter vos musiciens.
          </p>
        </div>
      ) : (
        <div className="space-y-2 p-3 rounded-xl bg-[#0D0D10] border border-[#222228]">
          <label className="block text-[11px] font-medium text-gray-300">
            Identifiant de la bibliothèque
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ex: K7M4P9"
                value={libraryIdentifier}
                onChange={(e) => setLibraryIdentifier(e.target.value.toUpperCase())}
                className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs font-mono font-bold tracking-wider text-blue-300 placeholder-gray-500 focus:outline-none transition-colors"
                required
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setQrScannerMode('member');
              }}
              className="px-2.5 py-2 rounded-lg bg-[#18181E] hover:bg-[#22222C] border border-[#2E2E3A] text-cyan-300 hover:text-cyan-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              title="Scanner le QR code d'invitation d'une bibliothèque"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scanner</span>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Saisissez l'identifiant ou scannez le QR code partagé par le responsable de la bibliothèque pour accéder directement à sa base de données.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#09090B] text-[#E0E0E0] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-blue-600/30 selection:text-blue-200">
      {/* Subtle Ambient Background Glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] rounded-full pointer-events-none blur-[120px] opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(0,229,255,0.4) 0%, rgba(124,77,255,0.2) 50%, transparent 70%)'
        }}
      />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#141417] border border-[#222225] shadow-xl shadow-cyan-950/20 mb-3">
            <MelobookLogo className="w-11 h-11" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Melobook</h1>
          <p className="text-xs text-gray-400 mt-1">
            Partitions, setlists & répertoires par bibliothèque
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#121214] border border-[#222225] rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
          {firebaseUser && needsLibraryOnboarding ? (
            /* ÉTAPE DE CONFIGURATION BIBLIOTHÈQUE (si pas encore de bibliothèque) */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1E1E22]">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-white truncate">
                    Bienvenue, {firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Musicien'}
                  </h2>
                  <p className="text-[11px] text-gray-400 truncate">
                    {firebaseUser.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    handleSignOut();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1A1A20] hover:bg-[#24242C] text-gray-300 hover:text-white border border-[#2C2C36] text-[11px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Changer</span>
                </button>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Choisissez si vous souhaitez créer votre propre bibliothèque ou rejoindre une bibliothèque existante avec son identifiant :
              </p>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="leading-relaxed">{errorMsg}</div>
                </div>
              )}

              <form onSubmit={handleCompleteOnboarding} className="space-y-4">
                {renderLibraryChoiceFields()}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-900/30 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {libraryChoice === 'create'
                          ? 'Créer la bibliothèque et entrer'
                          : 'Rejoindre la bibliothèque'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : isGuestEntry ? (
            /* ÉCRAN ACCÈS INVITÉ (LECTURE SEULE) */
            <>
              <div className="mb-5 flex items-center justify-between pb-3 border-b border-[#1E1E22]">
                <div>
                  <h2 className="text-sm font-semibold text-white">Consulter sans compte</h2>
                  <p className="text-xs text-gray-400">Accès visiteur en lecture seule (chants & setlists)</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsGuestEntry(false);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  Retour
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="leading-relaxed">{errorMsg}</div>
                </div>
              )}

              <form onSubmit={handleGuestSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Code de la bibliothèque
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Ex: K7M4P9"
                        value={guestCodeInput}
                        onChange={(e) => setGuestCodeInput(e.target.value.toUpperCase())}
                        className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-blue-500 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono font-bold tracking-wider text-blue-300 placeholder-gray-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setQrScannerMode('guest');
                      }}
                      className="px-3 py-2 rounded-xl bg-[#18181E] hover:bg-[#22222C] border border-[#2E2E3A] text-cyan-300 hover:text-cyan-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                      title="Scanner le QR code d'une bibliothèque avec la caméra"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Scanner</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                    Saisissez le code unique de la bibliothèque ou scannez son QR code pour consulter les chants et les setlists en lecture seule.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-900/30 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Accéder en lecture seule</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* ÉCRAN CONNEXION / CRÉATION DE COMPTE */
            <>
              {!isResetPassword && (
                <div className="flex bg-[#0A0A0C] p-1 rounded-xl border border-[#1E1E22] mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('signin');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      tab === 'signin'
                        ? 'bg-[#1E1E22] text-white shadow-sm border border-[#2F2F35]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Connexion
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('signup');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      tab === 'signup'
                        ? 'bg-[#1E1E22] text-white shadow-sm border border-[#2F2F35]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Créer un compte
                  </button>
                </div>
              )}

              {isResetPassword && (
                <div className="mb-5 flex items-center justify-between pb-3 border-b border-[#1E1E22]">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Réinitialiser le mot de passe</h2>
                    <p className="text-xs text-gray-400">Recevez un lien de récupération par e-mail</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassword(false);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    Retour
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="leading-relaxed">{errorMsg}</div>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div className="leading-relaxed">{successMsg}</div>
                </div>
              )}

              <form onSubmit={handleEmailPasswordSubmit} className="space-y-3.5">
                {tab === 'signup' && !isResetPassword && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        NOM
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          autoComplete="family-name"
                          placeholder="Dupont"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-blue-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Prénom
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          autoComplete="given-name"
                          placeholder="Alex"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-blue-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="nom@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-blue-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                {!isResetPassword && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-300">
                        Mot de passe
                      </label>
                      {tab === 'signin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsResetPassword(true);
                            setErrorMsg('');
                            setSuccessMsg('');
                          }}
                          className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
                        >
                          Mot de passe oublié ?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#18181B] border border-[#2E2E33] focus:border-blue-500 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                        required
                        minLength={tab === 'signup' ? 8 : 6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {tab === 'signup' && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-[#0D0D10] border border-[#222228] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 grid grid-cols-4 gap-1">
                            {[1, 2, 3, 4].map((step) => (
                              <span
                                key={step}
                                className={`h-1 rounded-full transition-colors ${
                                  passwordStrength.level >= step ? passwordStrength.color : 'bg-[#262630]'
                                }`}
                              />
                            ))}
                          </div>
                          {password && (
                            <span className={`text-[10px] font-semibold ${passwordStrength.textColor}`}>
                              {passwordStrength.label}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                          {[
                            { ok: passwordChecks.minLength, label: '8 caractères min.' },
                            { ok: passwordChecks.hasUpper, label: '1 majuscule (A-Z)' },
                            { ok: passwordChecks.hasLower, label: '1 minuscule (a-z)' },
                            { ok: passwordChecks.hasNumber, label: '1 chiffre (0-9)' }
                          ].map((rule) => (
                            <div
                              key={rule.label}
                              className={`flex items-center gap-1 transition-colors ${
                                rule.ok ? 'text-emerald-400' : 'text-gray-400'
                              }`}
                            >
                              <Check className={`w-3 h-3 shrink-0 ${rule.ok ? 'opacity-100' : 'opacity-30'}`} />
                              <span>{rule.label}</span>
                            </div>
                          ))}
                        </div>

                        {password && (
                          <p className={`text-[10px] leading-snug ${passwordStrength.textColor}`}>
                            {passwordStrength.feedback}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'signup' && !isResetPassword && renderLibraryChoiceFields()}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-900/30 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {isResetPassword
                          ? 'Envoyer le lien'
                          : tab === 'signin'
                          ? 'Se connecter'
                          : libraryChoice === 'create'
                          ? 'Créer mon compte et ma bibliothèque'
                          : 'Créer mon compte et rejoindre'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {!isResetPassword && (
                <div className="mt-4 pt-4 border-t border-[#1E1E22] space-y-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setTab(tab === 'signin' ? 'signup' : 'signin');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {tab === 'signin' ? (
                      <>
                        Pas encore de compte ?{' '}
                        <span className="text-blue-400 hover:text-blue-300 font-semibold">Créer un compte</span>
                      </>
                    ) : (
                      <>
                        Déjà un compte ?{' '}
                        <span className="text-blue-400 hover:text-blue-300 font-semibold">Se connecter</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsGuestEntry(true);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#16161B] hover:bg-[#1E1E26] border border-[#2A2A35] text-xs font-medium text-gray-200 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Consulter sans compte (lecture seule)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setSuccessMsg('');
                        setQrScannerMode('guest');
                      }}
                      className="py-2 px-3 rounded-xl bg-[#16161B] hover:bg-[#1E1E26] border border-cyan-500/30 text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Scanner le QR code d'une bibliothèque"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scanner QR</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <GuestQrScannerModal
        isOpen={qrScannerMode !== null}
        onClose={() => setQrScannerMode(null)}
        onScanCode={qrScannerMode === 'member' ? handleScannedMemberInviteCode : (code) => handleScannedGuestTarget({ code })}
        onScanTarget={qrScannerMode === 'member' ? (t) => handleScannedMemberInviteCode(t.code) : handleScannedGuestTarget}
        mode={qrScannerMode === 'member' ? 'member' : 'guest'}
      />
    </div>
  );
};
