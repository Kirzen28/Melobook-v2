import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { 
  Music2, 
  ListMusic, 
  Users, 
  Library,
  Download, 
  WifiOff, 
  Wifi, 
  User as UserIcon, 
  ChevronDown, 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  Plus, 
  Menu, 
  X, 
  Sliders,
  Check,
  Gauge,
  RefreshCw,
  AlertCircle,
  Cloud
} from 'lucide-react';
import { MelobookLogo } from './MelobookLogo';
import { MetronomeIcon } from './MetronomeIcon';
import { metronomeAudio } from '../utils/metronomeAudio';

export const Navbar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    currentUser, 
    currentGroup, 
    groups, 
    switchGroup, 
    isOffline, 
    isInstallable, 
    promptInstall, 
    setIsAuthModalOpen, 
    handleSignOut,
    syncStatus,
    lastSyncedAt,
    syncNow,
    isPianoOpen,
    setIsPianoOpen,
    isMetronomeOpen,
    setIsMetronomeOpen,
    isTunerOpen,
    setIsTunerOpen
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return metronomeAudio.subscribeState(s => {
      setIsMetronomeActive(s.isPlaying);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isUserMenuOpen || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen, isMobileMenuOpen]);

  const handleNavClick = (tab: any) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Jamais';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 15) return "À l'instant";
    if (diffSec < 60) return `Il y a ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `Aujourd'hui à ${hours}:${minutes}`;
  };

  const syncConfig = {
    synced: {
      label: 'Synchronisé',
      colorBadge: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300',
      dotColor: 'bg-emerald-400',
      icon: Check,
      spin: false,
      title: 'Données synchronisées'
    },
    syncing: {
      label: 'Synchronisation...',
      colorBadge: 'bg-blue-950/60 border-blue-500/40 text-blue-300',
      dotColor: 'bg-blue-400',
      icon: RefreshCw,
      spin: true,
      title: 'Synchronisation en cours'
    },
    offline: {
      label: 'Hors-ligne',
      colorBadge: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
      dotColor: 'bg-amber-400',
      icon: WifiOff,
      spin: false,
      title: 'Mode hors-ligne actif'
    },
    error: {
      label: 'Erreur',
      colorBadge: 'bg-rose-950/60 border-rose-500/40 text-rose-300',
      dotColor: 'bg-rose-500',
      icon: AlertCircle,
      spin: false,
      title: 'Erreur de synchronisation'
    }
  }[syncStatus] || {
    label: 'Synchronisé',
    colorBadge: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300',
    dotColor: 'bg-emerald-400',
    icon: Check,
    spin: false,
    title: 'Données synchronisées'
  };

  const SyncIconComponent = syncConfig.icon;

  return (
    <header className="sticky top-0 z-40 bg-[#111112]/95 backdrop-blur-md border-b border-[#222224] text-[#E0E0E0] select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="relative flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Logo */}
          <div className="flex items-center shrink-0 z-10">
            <button 
              type="button"
              onClick={() => handleNavClick('repertoire')}
              className="flex items-center gap-2 cursor-pointer group p-1 rounded-lg hover:bg-[#1A1A1C] transition-colors focus:outline-none shrink-0"
              title="Répertoire"
              aria-label="Accueil Répertoire"
            >
              <MelobookLogo className="w-8 h-8 sm:w-11 sm:h-11 transition-transform group-hover:scale-105" />
            </button>
          </div>

          {/* Navigation principale : parfaitement centrée sur mobile, tablette et laptop */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto z-10">
            {/* Version mobile (< md) */}
            <div className="flex md:hidden items-center gap-0.5 bg-[#0A0A0B] p-0.5 rounded-lg border border-[#222224] shadow-xs">
              <button
                type="button"
                onClick={() => handleNavClick('repertoire')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'repertoire'
                    ? 'bg-[#1C1C1E] text-white border border-[#333] shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Music2 className={`w-3 h-3 ${activeTab === 'repertoire' ? 'text-blue-400' : 'text-gray-400'}`} />
                <span>Chants</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('setlists')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'setlists'
                    ? 'bg-[#1C1C1E] text-white border border-[#333] shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ListMusic className={`w-3 h-3 ${activeTab === 'setlists' ? 'text-blue-400' : 'text-gray-400'}`} />
                <span>Listes</span>
              </button>
            </div>

            {/* Version Tablette / Laptop / Desktop (>= md) */}
            <nav className="hidden md:flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-lg border border-[#222224] relative shadow-xs">
              <button
                onClick={() => setActiveTab('repertoire')}
                className={`relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'repertoire'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {activeTab === 'repertoire' && (
                  <motion.span
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 bg-[#1C1C1E] rounded-md border border-[#333] -z-10 shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <Music2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Chants</span>
              </button>

              <button
                onClick={() => setActiveTab('setlists')}
                className={`relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'setlists'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {activeTab === 'setlists' && (
                  <motion.span
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 bg-[#1C1C1E] rounded-md border border-[#333] -z-10 shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <ListMusic className="w-3.5 h-3.5 text-blue-400" />
                <span>Setlists</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTunerOpen(prev => !prev)}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isTunerOpen
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-xs'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1D]'
                }`}
                title="Accordeur acoustique et diapason en pop up"
              >
                <Gauge className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Accordeur</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPianoOpen(prev => !prev)}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isPianoOpen
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-xs'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1D]'
                }`}
                title="Mini piano popup pour repérer des notes et tonalités"
              >
                <span className="text-xs">🎹</span>
                <span>Piano</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMetronomeOpen(prev => !prev)}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isMetronomeOpen
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-xs'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1D]'
                }`}
                title="Métronome interactif avec tap tempo et signatures de mesure"
              >
                <MetronomeIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Métronome</span>
                {isMetronomeActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </nav>
          </div>

          {/* Outils d'action */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 z-10">
            
            {/* Bouton d'installation PWA */}
            {isInstallable && (
              <button
                onClick={promptInstall}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-transform active:scale-95"
                title="Installer la PWA sur votre appareil"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installer</span>
              </button>
            )}

            {/* Bouton profil avec indicateur de synchronisation intégré - masqué sur mobile, visible dès md */}
            <div className="hidden md:block relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                  if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
                className="relative w-8 h-8 rounded-full bg-[#1C1C1E] hover:bg-[#2A2A2D] border border-[#333] hover:border-blue-500/50 flex items-center justify-center text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer select-none"
                title={currentUser?.displayName ? `${currentUser.displayName} (${currentUser.role === 'admin' ? 'Administrateur' : currentUser.role === 'leader' ? 'Responsable' : 'Membre'})` : "Non connecté (Mode invité)"}
                aria-label="Profil et état de synchronisation"
              >
                {currentUser?.displayName ? (
                  <span>{currentUser.displayName.charAt(0).toUpperCase()}</span>
                ) : (
                  <UserIcon className="w-4 h-4 text-gray-400" />
                )}

                {/* Pastille indiquant la synchronisation directement sur le bouton profil */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 pointer-events-none">
                  {syncStatus === 'syncing' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 border-2 border-[#111112] ${syncConfig.dotColor}`}></span>
                </span>
              </button>

              {isUserMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-[#111112] border border-[#222224] rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-[#222224]"
                >
                  {/* Informations profil */}
                  <div className="px-3.5 py-2.5">
                    {currentUser ? (
                      <>
                        <p className="font-semibold text-white truncate">{currentUser.displayName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{currentUser.email}</p>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          currentUser.role === 'admin'
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                            : currentUser.role === 'leader'
                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-[#1C1C1E] text-gray-400 border-[#333]'
                        }`}>
                          Rôle : {currentUser.role === 'admin' ? 'Administrateur 👑' : currentUser.role === 'leader' ? 'Responsable ⚡' : 'Membre 🎵'}
                        </span>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-white truncate">Non connecté</p>
                        <p className="text-[11px] text-gray-400 truncate">Mode invité (lecture seule)</p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAuthModalOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="mt-2 w-full py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <UserIcon className="w-3.5 h-3.5" />
                          <span>Se connecter</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Bouton et état de synchronisation dans le menu profil */}
                  <div className="p-2.5 bg-[#141417]">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-gray-300 font-medium text-[11px]">
                        <Cloud className="w-3.5 h-3.5 text-blue-400" />
                        <span>Synchronisation</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${syncConfig.colorBadge}`}>
                        <SyncIconComponent className={`w-3 h-3 ${syncConfig.spin ? 'animate-spin' : ''}`} />
                        <span>{syncConfig.label}</span>
                      </span>
                    </div>

                    <div className="text-[10px] text-gray-400 flex items-center justify-between mb-2.5 px-0.5">
                      <span>Dernière mise à jour :</span>
                      <span className="text-gray-200 font-medium">{formatLastSync(lastSyncedAt)}</span>
                    </div>

                    <button
                      type="button"
                      disabled={syncStatus === 'syncing' || isOffline}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await syncNow();
                      }}
                      className={`w-full py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all select-none ${
                        isOffline
                          ? 'bg-[#1C1C1E] border border-[#2D2D30] text-gray-500 cursor-not-allowed'
                          : syncStatus === 'syncing'
                            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30 cursor-wait'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm active:scale-98 cursor-pointer'
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                      <span>
                        {isOffline
                          ? 'Indisponible hors-ligne'
                          : syncStatus === 'syncing'
                            ? 'Synchronisation...'
                            : 'Synchroniser maintenant'}
                      </span>
                    </button>
                  </div>

                  {/* Liens de navigation */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleNavClick('groups');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-gray-300 hover:bg-[#1C1C1E] hover:text-white transition-colors cursor-pointer"
                    >
                      <Library className="w-3.5 h-3.5 text-blue-400" />
                      <span>Bibliothèques</span>
                    </button>

                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => {
                          handleNavClick('settings');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 flex items-center justify-between text-gray-300 hover:bg-[#1C1C1E] hover:text-white transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Sliders className="w-3.5 h-3.5 text-purple-400" />
                          <span>Réglages</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                          Admin
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsPianoOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-gray-300 hover:bg-[#1C1C1E] hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="text-sm">🎹</span>
                      <span>Mini Piano</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMetronomeOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-gray-300 hover:bg-[#1C1C1E] hover:text-white transition-colors cursor-pointer"
                    >
                      <MetronomeIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Métronome</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTunerOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-gray-300 hover:bg-[#1C1C1E] hover:text-white transition-colors cursor-pointer"
                    >
                      <Gauge className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Accordeur</span>
                    </button>
                  </div>

                  {/* Actions de compte */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsAuthModalOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-gray-300 hover:bg-[#1C1C1E] hover:text-white transition-colors cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>{currentUser ? 'Changer de compte' : 'Se connecter'}</span>
                    </button>

                    {currentUser && (
                      <button
                        onClick={() => {
                          handleSignOut();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Déconnexion</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Hamburger Dropdown Menu (accessible mobile et desktop) */}
            <div className="relative" ref={mobileMenuRef}>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                  if (isUserMenuOpen) setIsUserMenuOpen(false);
                }}
                className="relative p-2 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] transition-colors flex items-center justify-center cursor-pointer"
                aria-label={isMobileMenuOpen ? "Fermer le menu" : "Menu"}
                title="Menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4 text-blue-400" />
                ) : (
                  <Menu className="w-4 h-4 text-gray-200" />
                )}

                {/* Pastille discrète de synchronisation sur le bouton menu en mobile */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 pointer-events-none">
                  {syncStatus === 'syncing' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 border-2 border-[#111112] ${syncConfig.dotColor}`}></span>
                </span>
              </button>

              {isMobileMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-[#111112] border border-[#222224] rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-[#222224]"
                >
                  {/* En-tête profil compact */}
                  <div className="px-3 py-2 bg-[#141417] flex items-center justify-between gap-2.5">
                    {/* Infos utilisateur */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Avatar avec pastille de synchronisation */}
                      <div className="relative w-7 h-7 rounded-full bg-[#1C1C1E] border border-[#333] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                        {currentUser?.displayName ? (
                          <span>{currentUser.displayName.charAt(0).toUpperCase()}</span>
                        ) : (
                          <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2 pointer-events-none">
                          {syncStatus === 'syncing' && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          )}
                          <span className={`relative inline-flex rounded-full h-2 w-2 border border-[#141417] ${syncConfig.dotColor}`}></span>
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate text-xs leading-tight">
                          {currentUser ? currentUser.displayName : 'Non connecté'}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate leading-tight">
                          {currentUser ? (currentUser.email || (currentUser.role === 'admin' ? 'Administrateur' : currentUser.role === 'leader' ? 'Responsable' : 'Membre')) : 'Mode invité (lecture seule)'}
                        </p>
                      </div>
                    </div>

                    {/* Actions d'icônes compactes : Sync, Compte, Déconnexion */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={syncStatus === 'syncing' || isOffline}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await syncNow();
                        }}
                        className={`p-1.5 rounded-md border text-gray-300 hover:text-white transition-all cursor-pointer ${
                          syncStatus === 'syncing' 
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' 
                            : 'bg-[#1C1C1E] hover:bg-[#252529] border-[#333]'
                        }`}
                        title={isOffline ? "Hors-ligne" : syncStatus === 'syncing' ? "Synchronisation..." : `Synchroniser (${syncConfig.label})`}
                        aria-label="Synchroniser"
                      >
                        <SyncIconComponent className={`w-3.5 h-3.5 ${syncConfig.spin ? 'animate-spin text-blue-400' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAuthModalOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252529] text-gray-300 hover:text-white border border-[#333] transition-colors cursor-pointer"
                        title={currentUser ? 'Changer de compte' : 'Se connecter'}
                        aria-label={currentUser ? 'Changer de compte' : 'Se connecter'}
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                      </button>

                      {currentUser && (
                        <button
                          type="button"
                          onClick={() => {
                            handleSignOut();
                            setIsMobileMenuOpen(false);
                          }}
                          className="p-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                          title="Déconnexion"
                          aria-label="Déconnexion"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Navigation principale */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPianoOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                        isPianoOpen
                          ? 'bg-[#1C1C1E] text-blue-400 font-semibold'
                          : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm">🎹</span>
                        <span>Mini clavier</span>
                      </div>
                      {isPianoOpen && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMetronomeOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                        isMetronomeOpen
                          ? 'bg-[#1C1C1E] text-blue-400 font-semibold'
                          : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MetronomeIcon className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Métronome</span>
                        {isMetronomeActive && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 animate-pulse">
                            En cours
                          </span>
                        )}
                      </div>
                      {isMetronomeOpen && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsTunerOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                        isTunerOpen
                          ? 'bg-[#1C1C1E] text-blue-400 font-semibold'
                          : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Gauge className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Accordeur</span>
                      </div>
                      {isTunerOpen && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}
                    </button>

                    <button
                      onClick={() => handleNavClick('groups')}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                        activeTab === 'groups'
                          ? 'bg-[#1C1C1E] text-blue-400 font-semibold'
                          : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Library className="w-3.5 h-3.5 text-blue-400" />
                        <span>Bibliothèques</span>
                      </div>
                      {activeTab === 'groups' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}
                    </button>

                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => handleNavClick('settings')}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                          activeTab === 'settings'
                            ? 'bg-[#1C1C1E] text-purple-400 font-semibold'
                            : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Sliders className="w-3.5 h-3.5 text-purple-400" />
                          <span>Réglages</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                          Admin
                        </span>
                      </button>
                    )}
                  </div>

                  {isInstallable && (
                    <div className="py-1">
                      <button
                        onClick={() => {
                          promptInstall();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-blue-400 hover:bg-[#1C1C1E] hover:text-blue-300 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Installer</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
