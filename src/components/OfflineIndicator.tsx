import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { WifiOff, Database } from 'lucide-react';
import { STAGE_EASE } from '../utils/motionPresets';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, songs } = useApp();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.18, ease: STAGE_EASE }}
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/90 border border-amber-500/50 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-amber-700 dark:text-amber-200 shadow-2xl"
          role="status"
          aria-live="polite"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
            <span>Mode Hors-ligne actif</span>
          </div>
          <span className="text-amber-500/60 font-mono text-[11px]">•</span>
          <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300/90">
            <Database className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>{songs.length} chants en cache (IndexedDB)</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
