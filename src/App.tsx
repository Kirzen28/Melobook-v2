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
  const { activeTab, isGuest } = useApp();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200">
      <div className="sticky top-0 z-40 no-print">
        <UpdateBanner />
        <Navbar />
      </div>

      <main className="flex-1 relative overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full min-h-full"
          >
            {(activeTab === 'repertoire' || (isGuest && (activeTab === 'editor' || activeTab === 'groups' || activeTab === 'settings'))) && <SongList />}
            {activeTab === 'setlists' && <SetlistManager />}
            {activeTab === 'stage' && <SongReader />}
            {activeTab === 'presentation' && <PresentationManager />}
            {!isGuest && activeTab === 'editor' && <SongEditor />}
            {!isGuest && activeTab === 'groups' && <GroupManager />}
            {!isGuest && activeTab === 'settings' && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="no-print">
        <AuthModal />
        <MiniPianoPopup />
        <MetronomePopup />
        <Tuner />
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
