import React, { useState } from 'react';
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
  Gauge
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
    handleSignOut
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: any) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

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

          {/* Center Navigation Tabs (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-lg border border-[#222224]">
            <button
              onClick={() => setActiveTab('repertoire')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'repertoire'
                  ? 'bg-[#1C1C1E] text-white border border-[#333]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
              }`}
            >
              <Music2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Bibliothèque</span>
            </button>

            <button
              onClick={() => setActiveTab('setlists')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'setlists'
                  ? 'bg-[#1C1C1E] text-white border border-[#333]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5 text-blue-400" />
              <span>Setlists</span>
            </button>

            <button
              onClick={() => setActiveTab('stage')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'stage'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5 text-white" />
              <span>Vue Scène</span>
            </button>

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'editor'
                    ? 'bg-[#1C1C1E] text-white border border-[#333]'
                    : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5 text-blue-400" />
                <span>Éditeur</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('tuner')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'tuner'
                  ? 'bg-[#1C1C1E] text-white border border-[#333]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
              }`}
            >
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span>Accordeur</span>
            </button>
          </nav>

          {/* Right Action Tools (Desktop & Tablet) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* PWA Install Button (Desktop) */}
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

            {/* Online / Offline Status Badge (Desktop only) */}
            <div 
              className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                isOffline 
                  ? 'bg-[#1C1C1E] border-amber-500/30 text-amber-300' 
                  : 'bg-[#1C1C1E] border-[#333] text-gray-400'
              }`}
              title={isOffline ? "Mode hors-ligne actif (cache local)" : "Connecté au Cloud Firestore"}
            >
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hors-ligne</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-blue-400" />
                  <span>En ligne</span>
                </>
              )}
            </div>

            {/* User Account / Auth Menu (Visible on Desktop & Mobile to the left of hamburger) */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                  if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-[#1C1C1E] hover:bg-[#2A2A2D] border border-[#333] hover:border-blue-500/50 flex items-center justify-center text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
                title={currentUser?.displayName ? currentUser.displayName : "Mon compte"}
              >
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'M'}
              </button>

              {isUserMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-[#111112] border border-[#222224] rounded-lg shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3.5 py-2 border-b border-[#222224]">
                    <p className="font-semibold text-white truncate">{currentUser?.displayName || 'Musicien'}</p>
                    <p className="text-[11px] text-gray-400 truncate">{currentUser?.email || 'Non connecté'}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1C1C1E] text-blue-400 border border-[#333]">
                      Rôle: {currentUser?.role === 'admin' ? 'Administrateur' : 'Membre'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleNavClick('groups')}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-gray-300 hover:bg-[#1C1C1E] hover:text-white transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Groupe</span>
                  </button>

                  <button
                    onClick={() => handleNavClick('settings')}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-gray-300 hover:bg-[#1C1C1E] hover:text-white transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    <span>Réglages</span>
                  </button>

                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-gray-300 hover:bg-[#1C1C1E] hover:text-white transition-colors border-t border-[#222224]"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>{currentUser ? 'Changer de compte' : 'Se connecter'}</span>
                  </button>

                  {currentUser && (
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 text-rose-400 hover:bg-rose-500/10 transition-colors border-t border-[#222224]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Déconnexion</span>
                    </button>
                  )}
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
