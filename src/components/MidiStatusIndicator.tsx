import React, { useState, useEffect } from 'react';
import { useMidi } from '../context/MidiContext';
import { Radio, Zap } from 'lucide-react';
import { MidiSettingsModal } from './MidiSettingsModal';

interface MidiStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export const MidiStatusIndicator: React.FC<MidiStatusIndicatorProps> = ({ 
  className = '',
  showLabel = false 
}) => {
  const { 
    isSupported, 
    isEnabled, 
    hasConnectedDevices, 
    devices, 
    lastTriggeredAction, 
    lastMidiEvent,
    isMidiModalOpen,
    setIsMidiModalOpen
  } = useMidi();

  const [isFlashing, setIsFlashing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Flash indicator when any MIDI message arrives
  useEffect(() => {
    if (!lastMidiEvent) return;
    setIsFlashing(true);
    const timer = setTimeout(() => setIsFlashing(false), 250);
    return () => clearTimeout(timer);
  }, [lastMidiEvent]);

  // Toast notification when an action triggers
  useEffect(() => {
    if (!lastTriggeredAction) return;
    setToastMessage(lastTriggeredAction.label);
    const timer = setTimeout(() => setToastMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [lastTriggeredAction]);

  const connectedCount = devices.filter(d => d.state === 'connected').length;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMidiModalOpen(true)}
        className={`relative flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer select-none ${
          isFlashing
            ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/40'
            : isEnabled && hasConnectedDevices
              ? 'bg-[#1C1C1E] hover:bg-[#2A2A2D] text-gray-200 border-[#333] hover:border-blue-500/40'
              : 'bg-[#18181A] hover:bg-[#222226] text-gray-400 border-[#2A2A2E]'
        } ${className}`}
        title={
          !isSupported 
            ? 'Web MIDI non supporté' 
            : hasConnectedDevices 
              ? `${connectedCount} périphérique(s) MIDI connecté(s) - Cliquer pour configurer` 
              : 'Aucun périphérique MIDI - Cliquer pour configurer vos pédales'
        }
      >
        <Radio className={`w-3.5 h-3.5 ${isFlashing ? 'text-white' : hasConnectedDevices && isEnabled ? 'text-blue-400' : 'text-gray-500'}`} />
        
        {/* Connected LED status dot */}
        <span className={`w-1.5 h-1.5 rounded-full ${
          !isEnabled
            ? 'bg-gray-600'
            : hasConnectedDevices 
              ? 'bg-emerald-400 shadow-[0_0_6px_#10B981]' 
              : 'bg-gray-500'
        }`} />

        {showLabel && (
          <span className="hidden sm:inline text-[11px] font-semibold">
            MIDI
          </span>
        )}
      </button>

      {/* Discreet Live Action Toast (Musician feedback on stage) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/90 text-white font-semibold text-xs shadow-2xl backdrop-blur-md border border-blue-400/40">
            <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>MIDI : {toastMessage}</span>
          </div>
        </div>
      )}

      {/* Embedded Modal Dialog */}
      <MidiSettingsModal
        isOpen={isMidiModalOpen}
        onClose={() => setIsMidiModalOpen(false)}
      />
    </>
  );
};
