import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Check, 
  RefreshCw, 
  WifiOff, 
  AlertCircle, 
  Database, 
  Cloud, 
  X,
  HardDrive,
  Download,
  FolderDown
} from 'lucide-react';

export const SyncStatusBadge: React.FC = () => {
  const { 
    syncStatus, 
    lastSyncedAt, 
    syncNow, 
    isOffline, 
    songs, 
    setlists,
    offlineStats,
    cacheAllSongsOffline,
    isInstallable,
    promptInstall
  } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Jamais';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 15) return "À l'instant";
    if (diffSec < 60) return `Il y a ${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `Aujourd'hui à ${hours}:${minutes}`;
  };

  // Status configuration
  const config = {
    synced: {
      label: 'Synchronisé',
      shortLabel: 'Sync',
      colorBadge: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:border-emerald-400/60',
      dotColor: 'bg-emerald-400',
      icon: Check,
      spin: false,
      title: 'Données synchronisées avec le cloud',
      description: 'Vos chants, listes et réglages sont enregistrés et synchronisés avec Firestore.'
    },
    syncing: {
      label: 'Synchronisation...',
      shortLabel: 'Sync...',
      colorBadge: 'bg-blue-950/50 border-blue-500/50 text-blue-300',
      dotColor: 'bg-blue-400 animate-ping',
      icon: RefreshCw,
      spin: true,
      title: 'Synchronisation en cours',
      description: 'Envoi et réception des dernières données avec le serveur...'
    },
    offline: {
      label: 'Hors-ligne',
      shortLabel: 'Hors-ligne',
      colorBadge: 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:border-amber-400/60',
      dotColor: 'bg-amber-400',
      icon: WifiOff,
      spin: false,
      title: 'Mode hors-ligne actif',
      description: 'Connexion réseau indisponible. Vos modifications sont sauvegardées dans le cache local et seront synchronisées dès le retour en ligne.'
    },
    error: {
      label: 'Erreur sync',
      shortLabel: 'Erreur',
      colorBadge: 'bg-rose-950/50 border-rose-500/50 text-rose-300 hover:border-rose-400/60',
      dotColor: 'bg-rose-500',
      icon: AlertCircle,
      spin: false,
      title: 'Erreur de synchronisation',
      description: 'Une erreur est survenue lors de la synchronisation. Vérifiez votre connexion ou réessayez.'
    }
  }[syncStatus] || {
    label: 'Synchronisé',
    shortLabel: 'Sync',
    colorBadge: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400',
    dotColor: 'bg-emerald-400',
    icon: Check,
    spin: false,
    title: 'Données synchronisées',
    description: 'Vos données sont à jour.'
  };

  const IconComponent = config.icon;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Visual Trigger Button in Navbar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-md text-xs font-medium border transition-all cursor-pointer select-none active:scale-95 ${config.colorBadge}`}
        title={`Statut: ${config.label}. Cliquez pour plus de détails.`}
        aria-label={`État de la synchronisation: ${config.label}`}
      >
        {/* Status icon with optional spinning */}
        <IconComponent className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin' : ''}`} />

        {/* Text Label - Full on desktop, hidden or short on mobile */}
        <span className="hidden sm:inline">{config.label}</span>

        {/* Pulse Dot */}
        <span className="relative flex h-2 w-2">
          {syncStatus === 'syncing' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`}></span>
        </span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#121214] border border-[#2A2A2E] rounded-xl shadow-2xl p-4 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#222226]">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              <h4 className="font-bold text-white text-sm tracking-tight">Synchronisation</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#1E1E22] transition-colors"
              title="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status Details Banner */}
          <div className="mt-3 p-2.5 rounded-lg bg-[#18181B] border border-[#2A2A2E] flex items-start gap-2.5">
            <div className="mt-0.5 p-1 rounded bg-[#222226]">
              <IconComponent className={`w-4 h-4 ${config.spin ? 'animate-spin text-blue-400' : ''}`} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{config.title}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{config.description}</p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded bg-[#18181B] border border-[#26262A] flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-[10px]">IndexedDB & SW</p>
                <p className="font-bold text-gray-200">{offlineStats.songCount || songs.length} chants en cache</p>
              </div>
            </div>
            <div className="p-2 rounded bg-[#18181B] border border-[#26262A] flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-gray-400 text-[10px]">Setlists</p>
                <p className="font-bold text-gray-200">{offlineStats.setlistCount || setlists.length} stockées</p>
              </div>
            </div>
          </div>

          <div className="mt-2.5 px-2 py-1.5 rounded bg-[#18181B]/70 border border-[#26262A] text-[10px] text-gray-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span>Chants et setlists stockés en local dans IndexedDB pour répétitions hors-ligne</span>
          </div>

          {/* Bouton d'action de mise en cache complète */}
          <div className="mt-2.5">
            <button
              type="button"
              disabled={isCaching}
              onClick={async () => {
                setIsCaching(true);
                await cacheAllSongsOffline();
                setIsCaching(false);
              }}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[#18181B] hover:bg-[#222226] border border-[#333338] text-gray-200 hover:text-white font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderDown className={`w-3.5 h-3.5 text-emerald-400 ${isCaching ? 'animate-bounce' : ''}`} />
              <span>{isCaching ? 'Mise en cache IndexedDB...' : 'Mettre tout le répertoire en cache local'}</span>
            </button>
          </div>

          {/* Last sync time */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 px-1">
            <span>Dernière synchronisation</span>
            <span className="font-medium text-gray-300">{formatLastSync(lastSyncedAt)}</span>
          </div>

          {/* Bouton d'installation si disponible */}
          {isInstallable && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => {
                  promptInstall();
                  setIsOpen(false);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installer l'application PWA</span>
              </button>
            </div>
          )}

          {/* Manual Trigger Button */}
          <div className="mt-3 pt-2.5 border-t border-[#222226]">
            <button
              type="button"
              disabled={syncStatus === 'syncing' || isOffline}
              onClick={async () => {
                await syncNow();
              }}
              className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-semibold text-xs transition-all ${
                isOffline
                  ? 'bg-[#18181B] border border-[#2A2A2E] text-gray-500 cursor-not-allowed'
                  : syncStatus === 'syncing'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30 cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-98 cursor-pointer'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>
                {isOffline
                  ? 'Synchronisation indisponible hors-ligne'
                  : syncStatus === 'syncing'
                    ? 'Synchronisation en cours...'
                    : 'Synchroniser maintenant'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
