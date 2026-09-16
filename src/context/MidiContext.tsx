import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  MidiAction, 
  MidiMapping, 
  MidiDevice, 
  MidiEventData, 
  DEFAULT_MIDI_MAPPINGS,
  MIDI_ACTION_LABELS
} from '../types/midi';
import { midiService } from '../services/midiService';

interface MidiContextType {
  isSupported: boolean;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  devices: MidiDevice[];
  selectedInputId: string;
  setSelectedInputId: (id: string) => void;
  mappings: MidiMapping[];
  updateMapping: (id: string, updates: Partial<MidiMapping>) => void;
  addMapping: (mapping: Omit<MidiMapping, 'id'>) => void;
  deleteMapping: (id: string) => void;
  resetMappings: () => void;
  applyPreset: (presetId: 'standard_pedal' | 'keyboard' | 'program_change') => void;
  learningMappingId: string | null;
  startLearning: (mappingId: string) => void;
  stopLearning: () => void;
  lastMidiEvent: MidiEventData | null;
  lastTriggeredAction: { action: MidiAction; label: string; timestamp: number } | null;
  isMidiModalOpen: boolean;
  setIsMidiModalOpen: (open: boolean) => void;
  registerActionHandler: (action: MidiAction, handler: () => void) => () => void;
  refreshDevices: () => Promise<void>;
  hasConnectedDevices: boolean;
}

const MidiContext = createContext<MidiContextType | undefined>(undefined);

export const MidiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSupported = midiService.checkSupport();
  const initialSettings = midiService.getSettings();

  const [isEnabled, setIsEnabledState] = useState<boolean>(initialSettings.enabled);
  const [selectedInputId, setSelectedInputIdState] = useState<string>(initialSettings.selectedInputId);
  const [mappings, setMappings] = useState<MidiMapping[]>(initialSettings.mappings);
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [learningMappingId, setLearningMappingId] = useState<string | null>(null);
  const [lastMidiEvent, setLastMidiEvent] = useState<MidiEventData | null>(null);
  const [lastTriggeredAction, setLastTriggeredAction] = useState<{ action: MidiAction; label: string; timestamp: number } | null>(null);
  const [isMidiModalOpen, setIsMidiModalOpen] = useState(false);

  // Initialize Web MIDI on mount
  useEffect(() => {
    if (!isSupported) return;

    midiService.init().then(() => {
      setDevices(midiService.getDevices());
    });

    const unsubscribeDevices = midiService.onDeviceChange((updatedDevices) => {
      setDevices(updatedDevices);
    });

    const unsubscribeMessages = midiService.onMidiMessage((event) => {
      setLastMidiEvent(event);
    });

    const unsubscribeActions = midiService.onActionTrigger((action, label) => {
      setLastTriggeredAction({ action, label, timestamp: Date.now() });
    });

    return () => {
      unsubscribeDevices();
      unsubscribeMessages();
      unsubscribeActions();
    };
  }, [isSupported]);

  const refreshDevices = useCallback(async () => {
    await midiService.init();
    setDevices(midiService.getDevices());
  }, []);

  const setIsEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    midiService.updateSettings({ enabled });
  }, []);

  const setSelectedInputId = useCallback((id: string) => {
    setSelectedInputIdState(id);
    midiService.updateSettings({ selectedInputId: id });
  }, []);

  const updateMapping = useCallback((id: string, updates: Partial<MidiMapping>) => {
    midiService.updateMapping(id, updates);
    setMappings(midiService.getSettings().mappings);
  }, []);

  const addMapping = useCallback((newMapping: Omit<MidiMapping, 'id'>) => {
    midiService.addMapping(newMapping);
    setMappings(midiService.getSettings().mappings);
  }, []);

  const deleteMapping = useCallback((id: string) => {
    midiService.deleteMapping(id);
    setMappings(midiService.getSettings().mappings);
  }, []);

  const resetMappings = useCallback(() => {
    midiService.resetMappings();
    setMappings(midiService.getSettings().mappings);
  }, []);

  const applyPreset = useCallback((presetId: 'standard_pedal' | 'keyboard' | 'program_change') => {
    let presetMappings: MidiMapping[] = [];

    if (presetId === 'standard_pedal') {
      presetMappings = [
        {
          id: `preset-next-${Date.now()}`,
          action: 'next_song',
          label: 'Chant suivant',
          type: 'cc',
          number: 64, // Sustain pedal
          channel: 0,
          name: 'Pédale Sustain / Droite (CC 64)',
          enabled: true
        },
        {
          id: `preset-prev-${Date.now()}`,
          action: 'prev_song',
          label: 'Chant précédent',
          type: 'cc',
          number: 66, // Sostenuto pedal
          channel: 0,
          name: 'Pédale Sostenuto / Gauche (CC 66)',
          enabled: true
        },
        {
          id: `preset-auto-${Date.now()}`,
          action: 'toggle_autoscroll',
          label: 'Démarrer / Pause défilement',
          type: 'cc',
          number: 67, // Soft pedal
          channel: 0,
          name: 'Pédale Soft / Centre (CC 67)',
          enabled: true
        },
        {
          id: `preset-scrolldown-${Date.now()}`,
          action: 'scroll_down',
          label: 'Défiler vers le bas',
          type: 'cc',
          number: 65,
          channel: 0,
          name: 'Pédale CC 65',
          enabled: true
        },
        {
          id: `preset-scrollup-${Date.now()}`,
          action: 'scroll_up',
          label: 'Défiler vers le haut',
          type: 'cc',
          number: 68,
          channel: 0,
          name: 'Pédale CC 68',
          enabled: true
        }
      ];
    } else if (presetId === 'keyboard') {
      presetMappings = [
        {
          id: `preset-key-next-${Date.now()}`,
          action: 'next_song',
          label: 'Chant suivant',
          type: 'note',
          number: 62, // D4
          channel: 0,
          name: 'Touche Ré 4 (Note 62)',
          enabled: true
        },
        {
          id: `preset-key-prev-${Date.now()}`,
          action: 'prev_song',
          label: 'Chant précédent',
          type: 'note',
          number: 59, // B3
          channel: 0,
          name: 'Touche Si 3 (Note 59)',
          enabled: true
        },
        {
          id: `preset-key-auto-${Date.now()}`,
          action: 'toggle_autoscroll',
          label: 'Démarrer / Pause défilement',
          type: 'note',
          number: 60, // C4 (Middle C)
          channel: 0,
          name: 'Touche Do 4 (Note 60)',
          enabled: true
        },
        {
          id: `preset-key-faster-${Date.now()}`,
          action: 'speed_up_autoscroll',
          label: 'Accélérer défilement',
          type: 'note',
          number: 64, // E4
          channel: 0,
          name: 'Touche Mi 4 (Note 64)',
          enabled: true
        },
        {
          id: `preset-key-slower-${Date.now()}`,
          action: 'speed_down_autoscroll',
          label: 'Ralentir défilement',
          type: 'note',
          number: 57, // A3
          channel: 0,
          name: 'Touche La 3 (Note 57)',
          enabled: true
        }
      ];
    } else if (presetId === 'program_change') {
      presetMappings = [
        {
          id: `preset-pc-next-${Date.now()}`,
          action: 'next_song',
          label: 'Chant suivant',
          type: 'pc',
          number: 1,
          channel: 0,
          name: 'Patch PC 1',
          enabled: true
        },
        {
          id: `preset-pc-prev-${Date.now()}`,
          action: 'prev_song',
          label: 'Chant précédent',
          type: 'pc',
          number: 2,
          channel: 0,
          name: 'Patch PC 2',
          enabled: true
        },
        {
          id: `preset-pc-auto-${Date.now()}`,
          action: 'toggle_autoscroll',
          label: 'Démarrer / Pause défilement',
          type: 'pc',
          number: 3,
          channel: 0,
          name: 'Patch PC 3',
          enabled: true
        }
      ];
    }

    midiService.updateSettings({ mappings: presetMappings });
    setMappings(presetMappings);
  }, []);

  const startLearning = useCallback((mappingId: string) => {
    setLearningMappingId(mappingId);
    midiService.startLearning((data) => {
      // Find mapping and update it with the learned signal
      const typeLabel = data.type === 'cc' ? 'CC' : data.type === 'note' ? 'Note' : 'PC';
      const channelLabel = data.channel > 0 ? ` Canal ${data.channel}` : '';
      updateMapping(mappingId, {
        type: data.type,
        number: data.number,
        channel: data.channel,
        name: `Signal détecté (${typeLabel} #${data.number}${channelLabel})`
      });
      setLearningMappingId(null);
      midiService.stopLearning();
    });
  }, [updateMapping]);

  const stopLearning = useCallback(() => {
    setLearningMappingId(null);
    midiService.stopLearning();
  }, []);

  const registerActionHandler = useCallback((action: MidiAction, handler: () => void) => {
    return midiService.onAction(action, handler);
  }, []);

  const hasConnectedDevices = devices.some(d => d.state === 'connected');

  return (
    <MidiContext.Provider value={{
      isSupported,
      isEnabled,
      setIsEnabled,
      devices,
      selectedInputId,
      setSelectedInputId,
      mappings,
      updateMapping,
      addMapping,
      deleteMapping,
      resetMappings,
      applyPreset,
      learningMappingId,
      startLearning,
      stopLearning,
      lastMidiEvent,
      lastTriggeredAction,
      isMidiModalOpen,
      setIsMidiModalOpen,
      registerActionHandler,
      refreshDevices,
      hasConnectedDevices
    }}>
      {children}
    </MidiContext.Provider>
  );
};

export const useMidi = () => {
  const context = useContext(MidiContext);
  if (!context) {
    throw new Error('useMidi must be used within a MidiProvider');
  }
  return context;
};
