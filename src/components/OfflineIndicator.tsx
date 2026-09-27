import React from 'react';
import { useApp } from '../context/AppContext';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, songs } = useApp();

  if (isOnline) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-950/90 border border-amber-500/50 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-amber-200 shadow-2xl animate-in slide-in-from-bottom-3 duration-200"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
      </span>
      <div className="flex items-center gap-1.5">
        <WifiOff className="w-3.5 h-3.5 text-amber-300" />
        <span>Mode Hors-ligne actif</span>
      </div>
      <span className="text-amber-500/60 font-mono text-[11px]">•</span>
      <div className="flex items-center gap-1 text-[11px] text-amber-300/90">
        <Database className="w-3 h-3 text-amber-400" />
        <span>{songs.length} chants en cache (IndexedDB)</span>
      </div>
    </div>
  );
};
