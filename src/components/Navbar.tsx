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
  Check
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

  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isMobileGroupDropdownOpen, setIsMobileGroupDropdownOpen] = useState(false);
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

            {/* Desktop Group Selector Dropdown */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] border border-[#333] text-xs text-gray-300 hover:text-white transition-colors"
                title="Changer de groupe"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-medium truncate max-w-[110px]">
                  {currentGroup?.name}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {isGroupDropdownOpen && (
                <div 
                  className="absolute left-0 mt-2 w-64 bg-[#111112] border border-[#222224] rounded-lg shadow-2xl py-1.5 z-50 text-xs"
                  onClick={() => setIsGroupDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500 border-b border-[#222224]">
                    Mes Groupes de Musique
                  </div>
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => switchGroup(g.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#1C1C1E] transition-colors ${
                        g.id === currentGroup?.id ? 'text-blue-400 font-semibold bg-[#1C1C1E]' : 'text-gray-300'
                      }`}
                    >
                      <span className="truncate">{g.name}</span>
                      {g.id === currentGroup?.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-[#222224] mt-1 pt-1">
                    <button
                      onClick={() => handleNavClick('groups')}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-blue-400 hover:bg-[#1C1C1E] hover:text-blue-300 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Rejoindre ou créer un groupe</span>
                    </button>
                  </div>
                </div>
              )}
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
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'groups'
                  ? 'bg-[#1C1C1E] text-white border border-[#333]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Groupe</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#1C1C1E] text-white border border-[#333]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
              }`}
              title="Réglages des polices et couleurs"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>Réglages</span>
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

            {/* User Account / Auth Menu (Desktop only) */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] border border-[#333] text-xs transition-colors"
                title="Mon compte"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#222224] flex items-center justify-center text-white font-bold text-xs border border-white/10">
                  {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'M'}
                </div>
                <div className="hidden lg:block text-left pr-1">
                  <div className="text-[11px] font-semibold text-[#E0E0E0] truncate max-w-[90px]">
                    {currentUser?.displayName || 'Musicien'}
                  </div>
                  <div className="text-[9px] text-gray-500 flex items-center gap-1">
                    {currentUser?.role === 'admin' ? (
                      <span className="text-blue-400 flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> Admin
                      </span>
                    ) : (
                      <span>Membre</span>
                    )}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {isUserMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-[#111112] border border-[#222224] rounded-lg shadow-2xl py-1.5 z-50 text-xs"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3.5 py-2 border-b border-[#222224]">
                    <p className="font-semibold text-white">{currentUser?.displayName || 'Musicien'}</p>
                    <p className="text-[11px] text-gray-400 truncate">{currentUser?.email || 'Non connecté'}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1C1C1E] text-blue-400 border border-[#333]">
                      Rôle: {currentUser?.role === 'admin' ? 'Administrateur' : 'Membre (Lecture)'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleNavClick('settings')}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-gray-300 hover:bg-[#1C1C1E] transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    <span>Réglages d'affichage & Polices</span>
                  </button>

                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-gray-300 hover:bg-[#1C1C1E] transition-colors"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Changer de compte / Se connecter</span>
                  </button>

                  {currentUser && (
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3.5 py-2 flex items-center gap-2 text-rose-400 hover:bg-rose-500/10 transition-colors border-t border-[#222224]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Déconnexion</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border border-[#333] transition-colors flex items-center justify-center"
              aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu de navigation"}
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4 text-blue-400" />
              ) : (
                <Menu className="w-4 h-4 text-gray-200" />
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Burger Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#222224] bg-[#0E0E10] px-4 py-4 shadow-2xl max-h-[calc(100vh-60px)] overflow-y-auto space-y-4 animate-in slide-in-from-top-2 duration-150">
          
          {/* 1. Mobile User Profile Section */}
          <div className="p-3 bg-[#151518] rounded-xl border border-[#262629] flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-white truncate">
                  {currentUser?.displayName || 'Musicien'}
                </div>
                <div className="text-[10px] text-gray-400 truncate flex items-center gap-1.5">
                  <span>{currentUser?.role === 'admin' ? 'Administrateur' : 'Membre'}</span>
                  <span>•</span>
                  <span>{currentUser?.email ? 'Connecté' : 'Invité'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setIsAuthModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="p-1.5 rounded-lg bg-[#222226] text-gray-300 hover:text-white border border-[#333]"
                title="Changer de compte / Connexion"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
              </button>
              {currentUser && (
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-rose-800/30"
                  title="Déconnexion"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Mobile Group Switcher Section */}
          <div className="bg-[#151518] rounded-xl border border-[#262629] overflow-hidden">
            <button
              onClick={() => setIsMobileGroupDropdownOpen(!isMobileGroupDropdownOpen)}
              className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-200 hover:bg-[#1A1A1E] transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Users className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="text-left truncate">
                  <div className="text-[10px] text-gray-400 font-normal">Groupe Actif</div>
                  <div className="truncate text-white font-bold">{currentGroup?.name || 'Sélectionner un groupe'}</div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isMobileGroupDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMobileGroupDropdownOpen && (
              <div className="border-t border-[#222224] bg-[#111113] p-1.5 space-y-1">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      switchGroup(g.id);
                      setIsMobileGroupDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                      g.id === currentGroup?.id
                        ? 'bg-blue-600/15 text-blue-400 font-bold border border-blue-500/20'
                        : 'text-gray-300 hover:bg-[#1A1A1E]'
                    }`}
                  >
                    <span className="truncate">{g.name}</span>
                    {g.id === currentGroup?.id && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  </button>
                ))}
                <button
                  onClick={() => handleNavClick('groups')}
                  className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-xs text-blue-400 hover:bg-[#1A1A1E] font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Rejoindre ou créer un groupe</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Navigation Links */}
          <nav className="flex flex-col gap-1.5 pt-1">
            <div className="px-1 text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-0.5">
              Navigation
            </div>

            <button
              onClick={() => handleNavClick('repertoire')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'repertoire'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
              }`}
            >
              <Music2 className="w-4 h-4 text-blue-400" />
              <span>Bibliothèque des Chants</span>
              {activeTab === 'repertoire' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-blue-500"></span>
              )}
            </button>

            <button
              onClick={() => handleNavClick('setlists')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'setlists'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4 text-blue-400" />
              <span>Setlists & Programmes</span>
              {activeTab === 'setlists' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-blue-500"></span>
              )}
            </button>

            <button
              onClick={() => handleNavClick('stage')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'stage'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-400 hover:bg-[#1C1C1E] hover:text-blue-300'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>Vue Scène / Live</span>
              {activeTab === 'stage' && (
                <span className="ml-auto text-[10px] font-bold uppercase bg-white/20 px-1.5 py-0.5 rounded">Actif</span>
              )}
            </button>

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => handleNavClick('editor')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'editor'
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
                }`}
              >
                <FileEdit className="w-4 h-4 text-blue-400" />
                <span>Éditeur ChordPro</span>
                {activeTab === 'editor' && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-blue-500"></span>
                )}
              </button>
            )}

            <button
              onClick={() => handleNavClick('groups')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'groups'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-blue-400" />
              <span>Gestion du Groupe & Membres</span>
              {activeTab === 'groups' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-blue-500"></span>
              )}
            </button>

            <button
              onClick={() => handleNavClick('settings')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'settings'
                  ? 'bg-purple-950/30 text-purple-300 border border-purple-800/40'
                  : 'text-gray-300 hover:bg-[#1C1C1E] hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Réglages d'Affichage & Polices</span>
              {activeTab === 'settings' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-purple-500"></span>
              )}
            </button>
          </nav>

          {/* 4. Connectivity status & Install Button */}
          <div className="pt-2 border-t border-[#222224] space-y-2">
            <div 
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border ${
                isOffline 
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-300' 
                  : 'bg-[#151518] border-[#262629] text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {isOffline ? (
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-green-400" />
                )}
                <span>Statut de connexion</span>
              </div>
              <span className="font-bold text-[11px]">
                {isOffline ? 'Hors-ligne (Local)' : 'En ligne (Firestore)'}
              </span>
            </div>

            {isInstallable && (
              <button
                onClick={() => {
                  promptInstall();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Installer l'application (PWA)</span>
              </button>
            )}
          </div>

        </div>
      )}
    </header>
  );
};
