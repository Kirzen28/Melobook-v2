import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { 
  Music2, 
  ListMusic, 
  PlayCircle, 
  FileEdit, 
  Users, 
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
    syncNow
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

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
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Logo & Desktop Group Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div 
              onClick={() => handleNavClick('repertoire')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm group-hover:bg-blue-500 transition-colors">
                M
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                    MELOBOOK
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-[#1C1C1E] border border-[#333] text-blue-400">
                    PRO
                  </span>
                </div>
                <p className="hidden xs:block text-[10px] sm:text-[11px] text-gray-400 truncate max-w-[140px] sm:max-w-[200px]">
                  {currentGroup?.name || 'Groupe Louange'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation principale */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-lg border border-[#222224] relative">
            <button
              onClick={() => setActiveTab('repertoire')}
              className={`relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
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
              <span>Bibliothèque</span>
            </button>

            <button
              onClick={() => setActiveTab('setlists')}
              className={`relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
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
              onClick={() => setActiveTab('stage')}
              className={`relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'stage'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {activeTab === 'stage' && (
                <motion.span
                  layoutId="active-nav-indicator"
                  className="absolute inset-0 bg-blue-600 rounded-md -z-10 shadow-sm shadow-blue-900/30"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <PlayCircle className="w-3.5 h-3.5 text-white" />
              <span>Vue Scène</span>
            </button>

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('editor')}
                className={`relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'editor'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {activeTab === 'editor' && (
                  <motion.span
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 bg-[#1C1C1E] rounded-md border border-[#333] -z-10 shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <FileEdit className="w-3.5 h-3.5 text-blue-400" />
                <span>Éditeur</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('tuner')}
              className={`relative z-10 flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'tuner'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {activeTab === 'tuner' && (
                <motion.span
                  layoutId="active-nav-indicator"
                  className="absolute inset-0 bg-[#1C1C1E] rounded-md border border-[#333] -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span>Accordeur</span>
            </button>
          </nav>

          {/* Outils d'action */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
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

            {/* Bouton profil avec indicateur de synchronisation intégré */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                  if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
                className="relative w-8 h-8 rounded-full bg-[#1C1C1E] hover:bg-[#2A2A2D] border border-[#333] hover:border-blue-500/50 flex items-center justify-center text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer select-none"
                title={currentUser?.displayName ? `${currentUser.displayName} - ${syncConfig.label}` : `Mon compte - ${syncConfig.label}`}
                aria-label="Profil et état de synchronisation"
              >
                <span>{currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'M'}</span>

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
                    <p className="font-semibold text-white truncate">{currentUser?.displayName || 'Musicien'}</p>
                    <p className="text-[11px] text-gray-400 truncate">{currentUser?.email || 'Non connecté'}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1C1C1E] text-blue-400 border border-[#333]">
                      Rôle: {currentUser?.role === 'admin' ? 'Administrateur' : 'Membre'}
                    </span>
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
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Groupe</span>
                    </button>

                    <button
                      onClick={() => {
                        handleNavClick('settings');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-gray-300 hover:bg-[#1C1C1E] hover:text-white transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-purple-400" />
                      <span>Réglages</span>
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

            {/* Mobile Hamburger Dropdown Menu */}
            <div className="relative md:hidden">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                  if (isUserMenuOpen) setIsUserMenuOpen(false);
                }}
                className="p-2 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] transition-colors flex items-center justify-center cursor-pointer"
                aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu de navigation"}
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4 text-blue-400" />
                ) : (
                  <Menu className="w-4 h-4 text-gray-200" />
                )}
              </button>

              {isMobileMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-52 bg-[#111112] border border-[#222224] rounded-lg shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <button
                    onClick={() => handleNavClick('repertoire')}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                      activeTab === 'repertoire'
                        ? 'bg-[#1C1C1E] text-blue-400 font-semibold'
                        : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Music2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Bibliothèque</span>
                    </div>
                    {activeTab === 'repertoire' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    )}
                  </button>

                  <button
                    onClick={() => handleNavClick('setlists')}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                      activeTab === 'setlists'
                        ? 'bg-[#1C1C1E] text-blue-400 font-semibold'
                        : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ListMusic className="w-3.5 h-3.5 text-blue-400" />
                      <span>Listes</span>
                    </div>
                    {activeTab === 'setlists' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    )}
                  </button>

                  <button
                    onClick={() => handleNavClick('stage')}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                      activeTab === 'stage'
                        ? 'bg-blue-600/20 text-blue-400 font-semibold'
                        : 'text-blue-400 hover:bg-[#1C1C1E] hover:text-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Vue Scène</span>
                    </div>
                    {activeTab === 'stage' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    )}
                  </button>

                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => handleNavClick('editor')}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                        activeTab === 'editor'
                          ? 'bg-[#1C1C1E] text-blue-400 font-semibold'
                          : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileEdit className="w-3.5 h-3.5 text-blue-400" />
                        <span>Éditeur</span>
                      </div>
                      {activeTab === 'editor' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleNavClick('tuner')}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                      activeTab === 'tuner'
                        ? 'bg-[#1C1C1E] text-blue-400 font-semibold'
                        : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" />
                      <span>Accordeur</span>
                    </div>
                    {activeTab === 'tuner' && (
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
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Groupes</span>
                    </div>
                    {activeTab === 'groups' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    )}
                  </button>



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
                    {activeTab === 'settings' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    )}
                  </button>

                  {isInstallable && (
                    <button
                      onClick={() => {
                        promptInstall();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-blue-400 hover:bg-[#1C1C1E] hover:text-blue-300 transition-colors border-t border-[#222224]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Installer</span>
                    </button>
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
