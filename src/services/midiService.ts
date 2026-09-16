import { 
  MidiAction, 
  MidiMapping, 
  MidiSettings, 
  MidiDevice, 
  MidiEventData, 
  DEFAULT_MIDI_MAPPINGS 
} from '../types/midi';

const STORAGE_KEY = 'melobook_midi_settings_v1';

export class MidiService {
  private midiAccess: any = null;
  private isInitialized = false;
  private isSupported = typeof window !== 'undefined' && 'requestMIDIAccess' in navigator;
  private settings: MidiSettings = {
    enabled: true,
    selectedInputId: 'all',
    mappings: DEFAULT_MIDI_MAPPINGS
  };

  private actionListeners: Map<MidiAction, Set<() => void>> = new Map();
  private deviceListeners: Set<(devices: MidiDevice[]) => void> = new Set();
  private messageListeners: Set<(event: MidiEventData) => void> = new Set();
  private actionTriggerListeners: Set<(action: MidiAction, label: string) => void> = new Set();
  private learnCallback: ((data: { type: 'cc' | 'note' | 'pc'; number: number; channel: number }) => void) | null = null;

  // Debounce map to prevent rapid double-triggers from noisy footswitches
  private lastTriggerTime: Map<string, number> = new Map();

  constructor() {
    this.loadSettings();
  }

  public checkSupport(): boolean {
    return this.isSupported;
  }

  public getSettings(): MidiSettings {
    return { ...this.settings, mappings: [...this.settings.mappings] };
  }

  public updateSettings(partial: Partial<MidiSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
  }

  public updateMapping(id: string, updates: Partial<MidiMapping>): void {
    this.settings.mappings = this.settings.mappings.map(m => 
      m.id === id ? { ...m, ...updates } : m
    );
    this.saveSettings();
  }

  public addMapping(newMapping: Omit<MidiMapping, 'id'>): void {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.settings.mappings.push({ ...newMapping, id });
    this.saveSettings();
  }

  public deleteMapping(id: string): void {
    this.settings.mappings = this.settings.mappings.filter(m => m.id !== id);
    this.saveSettings();
  }

  public resetMappings(): void {
    this.settings.mappings = JSON.parse(JSON.stringify(DEFAULT_MIDI_MAPPINGS));
    this.saveSettings();
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.mappings)) {
          this.settings = {
            enabled: parsed.enabled ?? true,
            selectedInputId: parsed.selectedInputId || 'all',
            mappings: parsed.mappings
          };
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load MIDI settings from localStorage:', e);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save MIDI settings to localStorage:', e);
    }
  }

  public async init(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    if (this.isInitialized && this.midiAccess) {
      return true;
    }

    try {
      // @ts-ignore - Web MIDI API
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.isInitialized = true;

      // Listen for connected / disconnected MIDI devices
      this.midiAccess.onstatechange = () => {
        this.notifyDevicesChanged();
        this.attachInputListeners();
      };

      this.attachInputListeners();
      this.notifyDevicesChanged();
      return true;
    } catch (err) {
      console.warn('Web MIDI Access request failed or denied:', err);
      return false;
    }
  }

  public getDevices(): MidiDevice[] {
    if (!this.midiAccess) return [];
    const devices: MidiDevice[] = [];
    const inputs = this.midiAccess.inputs.values();
    for (const input of inputs) {
      devices.push({
        id: input.id,
        name: input.name || `Périphérique MIDI (${input.id})`,
        manufacturer: input.manufacturer || 'Inconnu',
        state: input.state === 'connected' ? 'connected' : 'disconnected',
        connection: input.connection
      });
    }
    return devices;
  }

  private notifyDevicesChanged(): void {
    const devices = this.getDevices();
    for (const listener of this.deviceListeners) {
      listener(devices);
    }
  }

  private attachInputListeners(): void {
    if (!this.midiAccess) return;

    const inputs = this.midiAccess.inputs.values();
    for (const input of inputs) {
      input.onmidimessage = (event: any) => this.handleMidiMessage(event, input.name || input.id);
    }
  }

  private handleMidiMessage(event: any, deviceName: string): void {
    if (!event.data || event.data.length === 0) return;

    const raw = Array.from(event.data) as number[];
    const statusByte = raw[0];
    const messageType = statusByte & 0xF0;
    const channel = (statusByte & 0x0F) + 1; // 1-16

    let type: 'cc' | 'note' | 'pc' | null = null;
    let number = 0;
    let value = 0;

    if (messageType === 0xB0) {
      // Control Change
      type = 'cc';
      number = raw[1];
      value = raw[2];
    } else if (messageType === 0x90) {
      // Note On
      type = 'note';
      number = raw[1];
      value = raw[2];
      // Note On with velocity 0 is treated as Note Off
      if (value === 0) return;
    } else if (messageType === 0xC0) {
      // Program Change
      type = 'pc';
      number = raw[1];
      value = raw[1];
    }

    if (!type) return;

    const eventData: MidiEventData = {
      type,
      number,
      value,
      channel,
      raw,
      deviceName,
      timestamp: Date.now()
    };

    // Notify live message listeners (e.g. MIDI Monitor / Activity LED)
    for (const listener of this.messageListeners) {
      listener(eventData);
    }

    // If currently in MIDI Learn mode
    if (this.learnCallback) {
      // For CC, only capture if value > 0 (press, not release)
      if (type !== 'cc' || value > 0) {
        this.learnCallback({ type, number, channel });
      }
      return;
    }

    // If MIDI is disabled globally, do not trigger actions
    if (!this.settings.enabled) return;

    // Check device filter
    if (this.settings.selectedInputId !== 'all') {
      const inputs = this.midiAccess?.inputs;
      if (inputs && event.target?.id && event.target.id !== this.settings.selectedInputId) {
        return;
      }
    }

    // Only process on "press" / non-zero value for CC and Note
    if (type === 'cc' && value === 0) return;

    // Debounce to prevent mechanical footswitch bounce (180ms threshold)
    const debounceKey = `${type}-${number}-${channel}`;
    const now = Date.now();
    const lastTime = this.lastTriggerTime.get(debounceKey) || 0;
    if (now - lastTime < 180) {
      return;
    }
    this.lastTriggerTime.set(debounceKey, now);

    // Find matching mappings
    for (const mapping of this.settings.mappings) {
      if (!mapping.enabled) continue;
      if (mapping.type !== type) continue;
      if (mapping.number !== number) continue;
      if (mapping.channel !== 0 && mapping.channel !== channel) continue;

      // Trigger action!
      this.triggerAction(mapping.action, mapping.label);
    }
  }

  public triggerAction(action: MidiAction, label?: string): void {
    const listeners = this.actionListeners.get(action);
    if (listeners && listeners.size > 0) {
      for (const listener of listeners) {
        listener();
      }
    }

    // Notify action trigger listeners (for toast/feedback)
    const displayLabel = label || action;
    for (const listener of this.actionTriggerListeners) {
      listener(action, displayLabel);
    }
  }

  public onAction(action: MidiAction, callback: () => void): () => void {
    if (!this.actionListeners.has(action)) {
      this.actionListeners.set(action, new Set());
    }
    this.actionListeners.get(action)!.add(callback);

    return () => {
      this.actionListeners.get(action)?.delete(callback);
    };
  }

  public onDeviceChange(callback: (devices: MidiDevice[]) => void): () => void {
    this.deviceListeners.add(callback);
    if (this.midiAccess) {
      callback(this.getDevices());
    }
    return () => {
      this.deviceListeners.delete(callback);
    };
  }

  public onMidiMessage(callback: (event: MidiEventData) => void): () => void {
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  public onActionTrigger(callback: (action: MidiAction, label: string) => void): () => void {
    this.actionTriggerListeners.add(callback);
    return () => {
      this.actionTriggerListeners.delete(callback);
    };
  }

  public startLearning(callback: (data: { type: 'cc' | 'note' | 'pc'; number: number; channel: number }) => void): void {
    this.learnCallback = callback;
  }

  public stopLearning(): void {
    this.learnCallback = null;
  }
}

export const midiService = new MidiService();
