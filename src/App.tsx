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
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200">
      <Navbar />

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
            {activeTab === 'repertoire' && <SongList />}
            {activeTab === 'setlists' && <SetlistManager />}
            {activeTab === 'stage' && <SongReader />}
            {activeTab === 'editor' && <SongEditor />}
            {activeTab === 'tuner' && <Tuner />}
            {activeTab === 'groups' && <GroupManager />}
            {activeTab === 'settings' && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AuthModal />
      <SnackbarNotification />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MidiProvider>
        <AppContent />
      </MidiProvider>
    </AppProvider>
  );
}
