import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { SongList } from './components/SongList';
import { SongReader } from './components/SongReader';
import { SongEditor } from './components/SongEditor';
import { SetlistManager } from './components/SetlistManager';
import { GroupManager } from './components/GroupManager';
import { SettingsView } from './components/SettingsView';
import { AuthModal } from './components/AuthModal';

const AppContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] flex flex-col font-sans selection:bg-blue-600/30 selection:text-blue-200">
      <Navbar />

      <main className="flex-1">
        {activeTab === 'repertoire' && <SongList />}
        {activeTab === 'setlists' && <SetlistManager />}
        {activeTab === 'stage' && <SongReader />}
        {activeTab === 'editor' && <SongEditor />}
        {activeTab === 'groups' && <GroupManager />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
