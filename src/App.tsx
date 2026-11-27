import React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { VIEW_VARIANTS } from './utils/motionPresets';
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
import { PlanningManager } from './components/PlanningManager';

const viewVariants = VIEW_VARIANTS;

const AppContent: React.FC = () => {
  const {
    activeTab,
    isGuest,
    isRegieOnly,
    canAccessRepertoire,
    canAccessSetlistsView,
    canAccessPlanning,
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
      return activeTab === 'planning' ? <PlanningManager /> : <PresentationManager />;
    }
    if (activeTab === 'repertoire' && canAccessRepertoire) return <SongList />;
    if (activeTab === 'setlists' && canAccessSetlistsView) return <SetlistManager />;
    if (activeTab === 'planning' && canAccessPlanning) return <PlanningManager />;
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
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0A0A0B] text-slate-900 dark:text-[#E0E0E0] flex flex-col font-sans selection:bg-blue-600/20 dark:selection:bg-blue-600/30 selection:text-blue-900 dark:selection:text-blue-200 transition-colors duration-150">
      <div className="sticky top-0 z-40 no-print">
        <UpdateBanner />
        <Navbar />
      </div>

      <main className="flex-1 relative overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab === 'roadmap' ? 'roadmap' : (!isGuest && isRegieOnly ? (activeTab === 'planning' ? 'planning' : 'presentation') : activeTab)}
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
      <div className="min-h-screen w-full bg-[#F4F6F9] dark:bg-[#09090B] text-slate-900 dark:text-[#E0E0E0] flex flex-col items-center justify-center gap-4 transition-colors">
        <div className="p-3 rounded-2xl bg-white dark:bg-[#141417] border border-slate-200 dark:border-[#222225] shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <MelobookLogo className="w-11 h-11 animate-pulse" />
        </div>
        <div className="text-xs text-slate-600 dark:text-gray-400">Chargement de votre espace...</div>
      </div>
    );
  }

  if (!isGuest && (!currentUser || needsLibraryOnboarding)) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        <div className="sticky top-0 z-40 no-print">
          <UpdateBanner />
        </div>
        <LoginPage />
      </motion.div>
    );
  }

  return <AppContent />;
};

const MotionAppShell: React.FC<{ isPresentation: boolean }> = ({ isPresentation }) => {
  const { stageSettings } = useApp();
  return (
    <MotionConfig reducedMotion={stageSettings.reduceMotion ? 'always' : 'user'}>
      {isPresentation ? <PresentationDisplay /> : <AppRoot />}
    </MotionConfig>
  );
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
          <MotionAppShell isPresentation={isPresentation} />
        </MidiProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
