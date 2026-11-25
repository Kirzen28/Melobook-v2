import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { MidiProvider } from './context/MidiContext';
import { Navbar } from './components/Navbar';
import { SongList } from './components/SongList';
import { SongReader } from './components/SongReader';
import { SongEditor } from './components/SongEditor';
import { SetlistManager } from './components/SetlistManager';
import { GroupManager } from './components/GroupManager';
import { SettingsView } from './components/SettingsView';
import { Tuner } from './components/Tuner';
import { AuthModal } from './components/AuthModal';
import { SnackbarNotification } from './components/SnackbarNotification';
import { MiniPianoPopup } from './components/MiniPianoPopup';
import { MetronomePopup } from './components/MetronomePopup';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PresentationDisplay } from './components/PresentationDisplay';
import { PresentationManager } from './components/PresentationManager';

import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MelobookLogo } from './components/MelobookLogo';
import { UpdateBanner } from './components/UpdateBanner';
import { RoadmapView } from './components/RoadmapView';

const viewVariants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.996,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.996,
    transition: {
      duration: 0.16,
      ease: [0.36, 0, 0.66, -0.04],
    },
  },
};

const AppContent: React.FC = () => {
  const {
    activeTab,
    isGuest,
    isRegieOnly,
    canAccessRepertoire,
    canAccessSetlistsView,
    canAccessStage,
    canAccessProjection,
    canAccessTools,
    canAccessGroupsView,
    canManageSongs,
    canAccessSettings
  } = useApp();

  const renderMainView = () => {
    if (activeTab === 'roadmap') return <RoadmapView />;
    if (!isGuest && isRegieOnly) {
      return <PresentationManager />;
    }
    if (activeTab === 'repertoire' && canAccessRepertoire) return <SongList />;
    if (activeTab === 'setlists' && canAccessSetlistsView) return <SetlistManager />;
    if (activeTab === 'stage' && canAccessStage) return <SongReader />;
    if (activeTab === 'presentation' && canAccessProjection) return <PresentationManager />;
    if (!isGuest && activeTab === 'editor' && canManageSongs) return <SongEditor />;
    if (!isGuest && activeTab === 'groups' && canAccessGroupsView) return <GroupManager />;
    if (!isGuest && activeTab === 'settings' && canAccessSettings) return <SettingsView />;
    if (canAccessRepertoire) return <SongList />;
    if (canAccessSetlistsView) return <SetlistManager />;
    return <PresentationManager />;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200">
      <div className="sticky top-0 z-40 no-print">
        <UpdateBanner />
        <Navbar />
      </div>

      <main className="flex-1 relative overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab === 'roadmap' ? 'roadmap' : (!isGuest && isRegieOnly ? 'presentation' : activeTab)}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full min-h-full"
          >
            {renderMainView()}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="no-print">
        <AuthModal />
        {canAccessTools && (
          <>
            <MiniPianoPopup />
            <MetronomePopup />
            <Tuner />
          </>
        )}
        <SnackbarNotification />
        <OfflineIndicator />
      </div>
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { currentUser, authLoading, needsLibraryOnboarding, isGuest } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#09090B] text-[#E0E0E0] flex flex-col items-center justify-center gap-4">
        <div className="p-3 rounded-2xl bg-[#141417] border border-[#222225] shadow-xl">
          <MelobookLogo className="w-11 h-11 animate-pulse" />
        </div>
        <div className="text-xs text-gray-400">Chargement de votre espace...</div>
      </div>
    );
  }

  if (!isGuest && (!currentUser || needsLibraryOnboarding)) {
    return (
      <>
        <div className="sticky top-0 z-40 no-print">
          <UpdateBanner />
        </div>
        <LoginPage />
      </>
    );
  }

  return <AppContent />;
};

export default function App() {
  const isPresentation = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('mode') === 'presentation' ||
    window.location.hash === '#presentation'
  );

  return (
    <ErrorBoundary>
      <AppProvider>
        <MidiProvider>
          {isPresentation ? <PresentationDisplay /> : <AppRoot />}
        </MidiProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
