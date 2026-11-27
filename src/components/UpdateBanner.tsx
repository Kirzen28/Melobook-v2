import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STAGE_EASE } from '../utils/motionPresets';

export const UpdateBanner: React.FC = () => {
  const {
    isUpdateAvailable,
    isUpdateDismissed,
    isApplyingUpdate,
    applyAppUpdate,
    dismissUpdateBanner,
  } = useApp();

  const isVisible = isUpdateAvailable && !isUpdateDismissed;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.18, ease: STAGE_EASE }}
          role="region"
          aria-label="Mise à jour de l'application disponible"
          className="no-print w-full bg-[#EDF1F5] dark:bg-[#10182B] border-b border-blue-500/40 text-blue-50 select-none"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 min-h-10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={applyAppUpdate}
              disabled={isApplyingUpdate}
              className="flex-1 min-w-0 py-1.5 flex items-center justify-start gap-2.5 text-left text-xs sm:text-[13px] font-medium text-blue-700 dark:text-blue-100 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-md"
              title="Cliquer pour vider le cache applicatif et charger la dernière version"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 ${
                  isApplyingUpdate ? 'animate-spin' : ''
                }`}
                aria-hidden="true"
              />
              <span className="truncate">
                {isApplyingUpdate
                  ? 'Actualisation du cache et rechargement...'
                  : 'Nouvelle mise à jour disponible — Cliquez ici pour rafraîchir le cache'}
              </span>
              {!isApplyingUpdate && (
                <span className="hidden sm:inline font-semibold text-blue-700 dark:text-blue-300 underline underline-offset-2 whitespace-nowrap shrink-0">
                  Actualiser
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={dismissUpdateBanner}
              disabled={isApplyingUpdate}
              aria-label="Fermer temporairement le bandeau de mise à jour"
              title="Fermer temporairement"
              className="p-2 -mr-1.5 rounded-lg text-blue-700 dark:text-blue-300/80 hover:text-slate-900 dark:hover:text-white hover:bg-blue-500/20 transition-colors cursor-pointer shrink-0 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
