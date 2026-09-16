export type MidiAction = 
  | 'next_song'
  | 'prev_song'
  | 'toggle_autoscroll'
  | 'speed_up_autoscroll'
  | 'speed_down_autoscroll'
  | 'scroll_down'
  | 'scroll_up';

export type MidiMessageType = 'cc' | 'note' | 'pc';

export interface MidiMapping {
  id: string;
  action: MidiAction;
  label: string;
  type: MidiMessageType;
  number: number; // CC number (0-127), Note number (0-127), or PC number (0-127)
  channel: number; // 0 for any, or 1-16
  name: string; // User-friendly description, e.g. "Pédale droite (CC 64)"
  enabled: boolean;
}

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state: 'connected' | 'disconnected';
  connection: string;
}

export interface MidiSettings {
  enabled: boolean;
  selectedInputId: string; // 'all' or specific input device id
  mappings: MidiMapping[];
}

export interface MidiEventData {
  type: MidiMessageType;
  number: number;
  value: number;
  channel: number; // 1-16
  raw: number[];
  deviceName: string;
  timestamp: number;
}

export const MIDI_ACTION_LABELS: Record<MidiAction, { label: string; description: string; category: 'navigation' | 'autoscroll' }> = {
  next_song: {
    label: 'Chant suivant',
    description: 'Passe au morceau suivant dans la setlist',
    category: 'navigation'
  },
  prev_song: {
    label: 'Chant précédent',
    description: 'Revient au morceau précédent dans la setlist',
    category: 'navigation'
  },
  toggle_autoscroll: {
    label: 'Démarrer / Pause défilement',
    description: 'Bascule la lecture ou la pause du défilement automatique',
    category: 'autoscroll'
  },
  speed_up_autoscroll: {
    label: 'Accélérer le défilement (+1)',
    description: 'Augmente la vitesse de défilement',
    category: 'autoscroll'
  },
  speed_down_autoscroll: {
    label: 'Ralentir le défilement (-1)',
    description: 'Diminue la vitesse de défilement',
    category: 'autoscroll'
  },
  scroll_down: {
    label: 'Défiler vers le bas (Page Down)',
    description: 'Fait défiler la page d\'un demi-écran vers le bas',
    category: 'autoscroll'
  },
  scroll_up: {
    label: 'Défiler vers le haut (Page Up)',
    description: 'Fait défiler la page d\'un demi-écran vers le haut',
    category: 'autoscroll'
  }
};

export const DEFAULT_MIDI_MAPPINGS: MidiMapping[] = [
  {
    id: 'default-next-song',
    action: 'next_song',
    label: 'Chant suivant',
    type: 'cc',
    number: 64, // Standard Sustain / Damper pedal
    channel: 0, // Any channel
    name: 'Pédale Sustain / Droite (CC 64)',
    enabled: true
  },
  {
    id: 'default-prev-song',
    action: 'prev_song',
    label: 'Chant précédent',
    type: 'cc',
    number: 66, // Standard Sostenuto / Left pedal
    channel: 0,
    name: 'Pédale Sostenuto / Gauche (CC 66)',
    enabled: true
  },
  {
    id: 'default-toggle-autoscroll',
    action: 'toggle_autoscroll',
    label: 'Démarrer / Pause défilement',
    type: 'cc',
    number: 67, // Soft pedal / Center switch
    channel: 0,
    name: 'Pédale Soft / Centre (CC 67)',
    enabled: true
  },
  {
    id: 'default-scroll-down',
    action: 'scroll_down',
    label: 'Défiler vers le bas',
    type: 'cc',
    number: 65,
    channel: 0,
    name: 'Pédale CC 65',
    enabled: true
  },
  {
    id: 'default-scroll-up',
    action: 'scroll_up',
    label: 'Défiler vers le haut',
    type: 'cc',
    number: 68,
    channel: 0,
    name: 'Pédale CC 68',
    enabled: true
  }
];
