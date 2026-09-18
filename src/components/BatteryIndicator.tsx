import React, { useState, useEffect } from 'react';
import { 
  Battery, 
  BatteryCharging, 
  BatteryFull, 
  BatteryMedium, 
  BatteryLow, 
  BatteryWarning, 
  Zap, 
  AlertTriangle,
  Info
} from 'lucide-react';

interface BatteryState {
  level: number; // 0 to 100
  charging: boolean;
  supported: boolean;
  loading: boolean;
}

export const BatteryIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [batteryState, setBatteryState] = useState<BatteryState>({
    level: 100,
    charging: false,
    supported: false,
    loading: true,
  });
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let batteryManager: any = null;

    const updateBatteryInfo = (bm: any) => {
      const levelPercent = Math.round((bm.level ?? 1) * 100);
      setBatteryState({
        level: levelPercent,
        charging: Boolean(bm.charging),
        supported: true,
        loading: false,
      });
    };

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((bm: any) => {
          batteryManager = bm;
          updateBatteryInfo(bm);

          bm.addEventListener('levelchange', () => updateBatteryInfo(bm));
          bm.addEventListener('chargingchange', () => updateBatteryInfo(bm));
        })
        .catch(() => {
          setBatteryState({
            level: 85,
            charging: false,
            supported: false,
            loading: false,
          });
        });
    } else {
      // Fallback pour les navigateurs n'exposant pas l'API getBattery (Safari / iOS)
      setBatteryState({
        level: 85,
        charging: false,
        supported: false,
        loading: false,
      });
    }

    return () => {
      if (batteryManager) {
        try {
          batteryManager.removeEventListener('levelchange', () => updateBatteryInfo(batteryManager));
          batteryManager.removeEventListener('chargingchange', () => updateBatteryInfo(batteryManager));
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const { level, charging, supported } = batteryState;
  const isCritical = level <= 15 && !charging;
  const isLow = level <= 25 && !charging;

  // Sélection de l'icône selon le niveau et la charge
  const getBatteryIcon = () => {
    if (charging) {
      return <BatteryCharging className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />;
    }
    if (level <= 15) {
      return <BatteryWarning className="w-3.5 h-3.5 text-rose-500 animate-pulse shrink-0" />;
    }
    if (level <= 30) {
      return <BatteryLow className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (level <= 70) {
      return <BatteryMedium className="w-3.5 h-3.5 text-gray-300 shrink-0" />;
    }
    return <BatteryFull className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  };

  // Style du badge selon le niveau
  const getBadgeStyle = () => {
    if (charging) {
      return 'bg-cyan-950/70 border-cyan-500/50 text-cyan-200 shadow-cyan-950/50';
    }
    if (isCritical) {
      return 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-rose-950/80 animate-pulse ring-1 ring-rose-500/50';
    }
    if (isLow) {
      return 'bg-amber-950/60 border-amber-500/60 text-amber-200 shadow-amber-950/50';
    }
    return 'bg-[#18181C]/90 hover:bg-[#222228] border-[#333]/80 text-gray-200';
  };

  return (
    <div className={`relative inline-block select-none shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setShowTooltip(prev => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full border text-[11px] font-mono font-medium shadow-xs backdrop-blur-md transition-all active:scale-95 cursor-pointer shrink-0 ${getBadgeStyle()}`}
        title={`Batterie appareil : ${level}% ${charging ? '• En charge' : ''}`}
        aria-label={`Niveau de batterie : ${level}%`}
      >
        {getBatteryIcon()}
        <span className="font-semibold leading-none">{level}%</span>
      </button>

      {/* Popover / Tooltip détaillé au survol ou au clic */}
      {showTooltip && (
        <div 
          className="absolute right-0 top-full mt-2 z-50 w-64 p-3 bg-[#16161A] border border-[#2E2E38] rounded-xl shadow-2xl text-white text-xs space-y-2 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#262630] pb-1.5">
            <span className="font-semibold text-gray-200 flex items-center gap-1.5">
              {getBatteryIcon()}
              <span>Batterie Scène</span>
            </span>
            <span className="font-mono font-bold text-cyan-400">{level}%</span>
          </div>

          <div className="space-y-1 text-gray-300 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Alimentation :</span>
              <span className="font-medium text-white flex items-center gap-1">
                {charging ? (
                  <>
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <span>En charge</span>
                  </>
                ) : (
                  <span>Sur batterie</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Capteur :</span>
              <span className="text-gray-300 font-mono">
                {supported ? 'Détection automatique' : 'Indicateur indicatif'}
              </span>
            </div>
          </div>

          {/* Alerte concert en cas de batterie faible */}
          {isLow && (
            <div className="pt-1.5 border-t border-[#262630] flex items-start gap-1.5 text-amber-300 text-[11px] leading-tight bg-amber-950/30 p-1.5 rounded-lg border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>Batterie faible ! Branchez l'appareil pour éviter toute coupure en plein concert.</span>
            </div>
          )}

          {!supported && (
            <div className="pt-1 border-t border-[#262630] flex items-start gap-1 text-[10px] text-gray-400 leading-tight">
              <Info className="w-3 h-3 text-gray-500 shrink-0 mt-0.5" />
              <span>Sur iOS et Safari, la batterie matérielle n'est pas exposée par le système.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
