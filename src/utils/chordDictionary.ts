import { CHROMATIC_SHARP, CHROMATIC_FLAT, LATIN_NOTES, transposeNote } from './chordUtils';

export interface GuitarVoicing {
  frets: number[]; // 6 strings from low E (string 6) to high E (string 1), -1 = mute (X), 0 = open (O), 1..24 = fret
  fingers?: (string | number)[]; // '1', '2', '3', '4', 'T' or ''
  barres?: { fret: number; fromString: number; toString: number }[]; // strings are 1..6 (1 = high E, 6 = low E)
  baseFret: number; // 1 for open position, or starting fret
  positionName?: string; // e.g. "Position ouverte", "Barré 3e frette", etc.
}

export interface PianoVoicing {
  // Semi-tones relative to C3 (0..23, 2 octaves C3 to B4)
  keys: number[]; // e.g. [0, 4, 7] for C major
  rootKey: number; // 0 for C
  bassKey?: number; // for slash chord e.g. E for C/E
  notes: string[]; // ['C', 'E', 'G']
  inversion: number; // 0 = Fundamental, 1 = 1st, 2 = 2nd, 3 = 3rd
  inversionName: string; // "Fondamentale", "1er renversement", etc.
}

export interface ChordData {
  raw: string; // e.g. "D/F#", "Em7", "Gsus4"
  root: string; // e.g. "D", "E", "G"
  quality: string; // e.g. "", "m7", "sus4"
  bass?: string; // e.g. "F#"
  formattedName: string; // e.g. "D/F#"
  latinName: string; // e.g. "Ré/Fa#"
  formula: string; // e.g. "1 - 3 - 5" or "1 - b3 - 5 - b7"
  formulaDescription: string; // "Fondamentale, Tierce Majeure, Quinte Juste"
  notes: string[]; // ['D', 'F#', 'A']
  guitarVoicings: GuitarVoicing[];
  pianoVoicings: PianoVoicing[];
}

// Chord quality formulas (intervals in semitones from root)
export const CHORD_QUALITIES: Record<string, {
  name: string;
  intervals: number[];
  formula: string;
  description: string;
  aliases: string[];
}> = {
  '': {
    name: 'Majeur',
    intervals: [0, 4, 7],
    formula: '1 - 3 - 5',
    description: 'Fondamentale, Tierce majeure, Quinte juste',
    aliases: ['maj', 'M']
  },
  'm': {
    name: 'Mineur',
    intervals: [0, 3, 7],
    formula: '1 - b3 - 5',
    description: 'Fondamentale, Tierce mineure, Quinte juste',
    aliases: ['min', '-']
  },
  '7': {
    name: '7e dominante',
    intervals: [0, 4, 7, 10],
    formula: '1 - 3 - 5 - b7',
    description: 'Fondamentale, Tierce majeure, Quinte, 7e mineure',
    aliases: ['dom7']
  },
  'maj7': {
    name: '7e majeure',
    intervals: [0, 4, 7, 11],
    formula: '1 - 3 - 5 - 7',
    description: 'Fondamentale, Tierce majeure, Quinte, 7e majeure',
    aliases: ['M7', 'Maj7', 'Δ']
  },
  'm7': {
    name: 'Mineur 7e',
    intervals: [0, 3, 7, 10],
    formula: '1 - b3 - 5 - b7',
    description: 'Fondamentale, Tierce mineure, Quinte, 7e mineure',
    aliases: ['min7', '-7']
  },
  'sus4': {
    name: 'Suspendu 4',
    intervals: [0, 5, 7],
    formula: '1 - 4 - 5',
    description: 'Fondamentale, Quarte juste, Quinte juste',
    aliases: ['sus']
  },
  'sus2': {
    name: 'Suspendu 2',
    intervals: [0, 2, 7],
    formula: '1 - 2 - 5',
    description: 'Fondamentale, Seconde majeure, Quinte juste',
    aliases: []
  },
  '7sus4': {
    name: '7e suspendue 4',
    intervals: [0, 5, 7, 10],
    formula: '1 - 4 - 5 - b7',
    description: 'Fondamentale, Quarte, Quinte, 7e mineure',
    aliases: ['7sus']
  },
  'add9': {
    name: 'Add 9',
    intervals: [0, 4, 7, 14 % 12],
    formula: '1 - 3 - 5 - 9',
    description: 'Fondamentale, Tierce majeure, Quinte, Neuvième',
    aliases: ['(add9)', '2']
  },
  'madd9': {
    name: 'Mineur add 9',
    intervals: [0, 3, 7, 14 % 12],
    formula: '1 - b3 - 5 - 9',
    description: 'Fondamentale, Tierce mineure, Quinte, Neuvième',
    aliases: ['m(add9)']
  },
  '6': {
    name: '6e majeure',
    intervals: [0, 4, 7, 9],
    formula: '1 - 3 - 5 - 6',
    description: 'Fondamentale, Tierce majeure, Quinte, Sixte majeure',
    aliases: ['maj6']
  },
  'm6': {
    name: 'Mineur 6e',
    intervals: [0, 3, 7, 9],
    formula: '1 - b3 - 5 - 6',
    description: 'Fondamentale, Tierce mineure, Quinte, Sixte majeure',
    aliases: ['min6']
  },
  'dim': {
    name: 'Diminué',
    intervals: [0, 3, 6],
    formula: '1 - b3 - b5',
    description: 'Fondamentale, Tierce mineure, Quinte diminuée',
    aliases: ['°']
  },
  'dim7': {
    name: '7e diminuée',
    intervals: [0, 3, 6, 9],
    formula: '1 - b3 - b5 - bb7',
    description: 'Fondamentale, Tierce mineure, Quinte dim, 7e diminuée',
    aliases: ['°7']
  },
  'm7b5': {
    name: 'Demi-diminué',
    intervals: [0, 3, 6, 10],
    formula: '1 - b3 - b5 - b7',
    description: 'Fondamentale, Tierce mineure, Quinte dim, 7e mineure',
    aliases: ['ø', 'ø7']
  },
  'aug': {
    name: 'Augmenté',
    intervals: [0, 4, 8],
    formula: '1 - 3 - #5',
    description: 'Fondamentale, Tierce majeure, Quinte augmentée',
    aliases: ['+']
  },
  '9': {
    name: '9e dominante',
    intervals: [0, 4, 7, 10, 2],
    formula: '1 - 3 - 5 - b7 - 9',
    description: 'Fondamentale, Tierce majeure, 7e mineure, Neuvième',
    aliases: ['dom9']
  },
  'maj9': {
    name: '9e majeure',
    intervals: [0, 4, 7, 11, 2],
    formula: '1 - 3 - 5 - 7 - 9',
    description: 'Fondamentale, Tierce majeure, 7e majeure, Neuvième',
    aliases: ['Maj9', 'M9']
  },
  'm9': {
    name: 'Mineur 9e',
    intervals: [0, 3, 7, 10, 2],
    formula: '1 - b3 - 5 - b7 - 9',
    description: 'Fondamentale, Tierce mineure, 7e mineure, Neuvième',
    aliases: ['min9']
  },
  '5': {
    name: 'Power Chord',
    intervals: [0, 7],
    formula: '1 - 5',
    description: 'Fondamentale, Quinte juste',
    aliases: ['power']
  }
};

// Known custom open and popular guitar chord shapes
// Strings: [E, A, D, G, B, e]
const KNOWN_GUITAR_SHAPES: Record<string, GuitarVoicing[]> = {
  // C family
  'C': [
    { frets: [-1, 3, 2, 0, 1, 0], fingers: ['', '3', '2', '', '1', ''], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [-1, 3, 5, 5, 5, 3], fingers: ['', '1', '2', '3', '4', '1'], barres: [{ fret: 3, fromString: 5, toString: 1 }], baseFret: 3, positionName: 'Barré 3e frette' },
    { frets: [8, 10, 10, 9, 8, 8], fingers: ['1', '3', '4', '2', '1', '1'], barres: [{ fret: 8, fromString: 6, toString: 1 }], baseFret: 8, positionName: 'Barré 8e frette' }
  ],
  'Cm': [
    { frets: [-1, 3, 5, 5, 4, 3], fingers: ['', '1', '3', '4', '2', '1'], barres: [{ fret: 3, fromString: 5, toString: 1 }], baseFret: 3, positionName: 'Barré 3e frette' },
    { frets: [8, 10, 10, 8, 8, 8], fingers: ['1', '3', '4', '1', '1', '1'], barres: [{ fret: 8, fromString: 6, toString: 1 }], baseFret: 8, positionName: 'Barré 8e frette' }
  ],
  'C7': [
    { frets: [-1, 3, 2, 3, 1, 0], fingers: ['', '3', '2', '4', '1', ''], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [-1, 3, 5, 3, 5, 3], fingers: ['', '1', '3', '1', '4', '1'], barres: [{ fret: 3, fromString: 5, toString: 1 }], baseFret: 3, positionName: 'Barré 3e frette' }
  ],
  'Cmaj7': [
    { frets: [-1, 3, 2, 0, 0, 0], fingers: ['', '3', '2', '', '', ''], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [-1, 3, 5, 4, 5, 3], fingers: ['', '1', '3', '2', '4', '1'], barres: [{ fret: 3, fromString: 5, toString: 1 }], baseFret: 3, positionName: 'Barré 3e frette' }
  ],
  'Cm7': [
    { frets: [-1, 3, 5, 3, 4, 3], fingers: ['', '1', '3', '1', '2', '1'], barres: [{ fret: 3, fromString: 5, toString: 1 }], baseFret: 3, positionName: 'Barré 3e frette' }
  ],
  'Csus4': [
    { frets: [-1, 3, 3, 0, 1, 1], fingers: ['', '3', '4', '', '1', '2'], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Csus2': [
    { frets: [-1, 3, 0, 0, 1, 0], fingers: ['', '3', '', '', '1', ''], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Cadd9': [
    { frets: [-1, 3, 2, 0, 3, 0], fingers: ['', '2', '1', '', '3', ''], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [-1, 3, 2, 0, 3, 3], fingers: ['', '2', '1', '', '3', '4'], baseFret: 1, positionName: 'Voicing acoustique' }
  ],
  'C/E': [
    { frets: [0, 3, 2, 0, 1, 0], fingers: ['', '3', '2', '', '1', ''], baseFret: 1, positionName: 'Basse Mi ouvert' }
  ],
  'C/G': [
    { frets: [3, 3, 2, 0, 1, 0], fingers: ['3', '4', '2', '', '1', ''], baseFret: 1, positionName: 'Basse Sol 6e corde' }
  ],

  // D family
  'D': [
    { frets: [-1, -1, 0, 2, 3, 2], fingers: ['', '', '', '1', '3', '2'], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [-1, 5, 7, 7, 7, 5], fingers: ['', '1', '2', '3', '4', '1'], barres: [{ fret: 5, fromString: 5, toString: 1 }], baseFret: 5, positionName: 'Barré 5e frette' },
    { frets: [10, 12, 12, 11, 10, 10], fingers: ['1', '3', '4', '2', '1', '1'], barres: [{ fret: 10, fromString: 6, toString: 1 }], baseFret: 10, positionName: 'Barré 10e frette' }
  ],
  'Dm': [
    { frets: [-1, -1, 0, 2, 3, 1], fingers: ['', '', '', '2', '3', '1'], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [-1, 5, 7, 7, 6, 5], fingers: ['', '1', '3', '4', '2', '1'], barres: [{ fret: 5, fromString: 5, toString: 1 }], baseFret: 5, positionName: 'Barré 5e frette' }
  ],
  'D7': [
    { frets: [-1, -1, 0, 2, 1, 2], fingers: ['', '', '', '2', '1', '3'], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Dmaj7': [
    { frets: [-1, -1, 0, 2, 2, 2], fingers: ['', '', '', '1', '1', '1'], barres: [{ fret: 2, fromString: 3, toString: 1 }], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Dm7': [
    { frets: [-1, -1, 0, 2, 1, 1], fingers: ['', '', '', '2', '1', '1'], barres: [{ fret: 1, fromString: 2, toString: 1 }], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Dsus4': [
    { frets: [-1, -1, 0, 2, 3, 3], fingers: ['', '', '', '1', '2', '3'], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Dsus2': [
    { frets: [-1, -1, 0, 2, 3, 0], fingers: ['', '', '', '1', '2', ''], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'D/F#': [
    { frets: [2, 0, 0, 2, 3, 2], fingers: ['T', '', '', '1', '3', '2'], baseFret: 1, positionName: 'Pouce sur Fa# 2e frette' },
    { frets: [2, -1, 0, 2, 3, 2], fingers: ['1', '', '', '2', '4', '3'], baseFret: 1, positionName: 'Avec index en basse' },
    { frets: [2, 0, 0, 2, 3, -1], fingers: ['1', '', '', '2', '3', ''], baseFret: 1, positionName: 'Voicing ouvert' }
  ],
  'D/A': [
    { frets: [-1, 0, 0, 2, 3, 2], fingers: ['', '', '', '1', '3', '2'], baseFret: 1, positionName: 'Basse La ouvert' }
  ],

  // E family
  'E': [
    { frets: [0, 2, 2, 1, 0, 0], fingers: ['', '2', '3', '1', '', ''], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [-1, 7, 9, 9, 9, 7], fingers: ['', '1', '2', '3', '4', '1'], barres: [{ fret: 7, fromString: 5, toString: 1 }], baseFret: 7, positionName: 'Barré 7e frette' }
  ],
  'Em': [
    { frets: [0, 2, 2, 0, 0, 0], fingers: ['', '2', '3', '', '', ''], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [-1, 7, 9, 9, 8, 7], fingers: ['', '1', '3', '4', '2', '1'], barres: [{ fret: 7, fromString: 5, toString: 1 }], baseFret: 7, positionName: 'Barré 7e frette' }
  ],
  'E7': [
    { frets: [0, 2, 0, 1, 0, 0], fingers: ['', '2', '', '1', '', ''], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [0, 2, 2, 1, 3, 0], fingers: ['', '2', '3', '1', '4', ''], baseFret: 1, positionName: '7e aiguë' }
  ],
  'Emaj7': [
    { frets: [0, 2, 1, 1, 0, 0], fingers: ['', '3', '1', '2', '', ''], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Em7': [
    { frets: [0, 2, 2, 0, 3, 0], fingers: ['', '1', '2', '', '3', ''], baseFret: 1, positionName: 'Position ouverte standard' },
    { frets: [0, 2, 0, 0, 0, 0], fingers: ['', '2', '', '', '', ''], baseFret: 1, positionName: 'Position ouverte légère' },
    { frets: [0, 2, 2, 0, 3, 3], fingers: ['', '1', '2', '', '3', '4'], baseFret: 1, positionName: 'Voicing moderne' }
  ],
  'Esus4': [
    { frets: [0, 2, 2, 2, 0, 0], fingers: ['', '2', '3', '4', '', ''], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Em/D': [
    { frets: [-1, -1, 0, 0, 0, 0], fingers: ['', '', '', '', '', ''], baseFret: 1, positionName: 'Basse Ré ouvert' }
  ],
  'Em/G': [
    { frets: [3, 2, 2, 0, 0, 0], fingers: ['3', '1', '2', '', '', ''], baseFret: 1, positionName: 'Basse Sol' }
  ],

  // F family
  'F': [
    { frets: [1, 3, 3, 2, 1, 1], fingers: ['1', '3', '4', '2', '1', '1'], barres: [{ fret: 1, fromString: 6, toString: 1 }], baseFret: 1, positionName: 'Barré 1re frette' },
    { frets: [-1, -1, 3, 2, 1, 1], fingers: ['', '', '3', '2', '1', '1'], barres: [{ fret: 1, fromString: 2, toString: 1 }], baseFret: 1, positionName: 'Petit barré 4 cordes' },
    { frets: [-1, 3, 3, 2, 1, 0], fingers: ['', '3', '4', '2', '1', ''], baseFret: 1, positionName: 'Fmaj7/C ouvert' }
  ],
  'Fm': [
    { frets: [1, 3, 3, 1, 1, 1], fingers: ['1', '3', '4', '1', '1', '1'], barres: [{ fret: 1, fromString: 6, toString: 1 }], baseFret: 1, positionName: 'Barré 1re frette' }
  ],
  'F7': [
    { frets: [1, 3, 1, 2, 1, 1], fingers: ['1', '3', '1', '2', '1', '1'], barres: [{ fret: 1, fromString: 6, toString: 1 }], baseFret: 1, positionName: 'Barré 1re frette' }
  ],
  'Fmaj7': [
    { frets: [-1, -1, 3, 2, 1, 0], fingers: ['', '', '3', '2', '1', ''], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [1, 3, 2, 2, 1, 1], fingers: ['1', '4', '2', '3', '1', '1'], barres: [{ fret: 1, fromString: 6, toString: 1 }], baseFret: 1, positionName: 'Barré 1re frette' }
  ],
  'F#': [
    { frets: [2, 4, 4, 3, 2, 2], fingers: ['1', '3', '4', '2', '1', '1'], barres: [{ fret: 2, fromString: 6, toString: 1 }], baseFret: 2, positionName: 'Barré 2e frette' }
  ],
  'F#m': [
    { frets: [2, 4, 4, 2, 2, 2], fingers: ['1', '3', '4', '1', '1', '1'], barres: [{ fret: 2, fromString: 6, toString: 1 }], baseFret: 2, positionName: 'Barré 2e frette' }
  ],
  'F#7': [
    { frets: [2, 4, 2, 3, 2, 2], fingers: ['1', '3', '1', '2', '1', '1'], barres: [{ fret: 2, fromString: 6, toString: 1 }], baseFret: 2, positionName: 'Barré 2e frette' }
  ],
  'F#m7': [
    { frets: [2, 4, 2, 2, 2, 2], fingers: ['1', '3', '1', '1', '1', '1'], barres: [{ fret: 2, fromString: 6, toString: 1 }], baseFret: 2, positionName: 'Barré 2e frette' }
  ],

  // G family
  'G': [
    { frets: [3, 2, 0, 0, 3, 3], fingers: ['2', '1', '', '', '3', '4'], baseFret: 1, positionName: 'Position ouverte rock' },
    { frets: [3, 2, 0, 0, 0, 3], fingers: ['3', '2', '', '', '', '4'], baseFret: 1, positionName: 'Position ouverte folk' },
    { frets: [3, 5, 5, 4, 3, 3], fingers: ['1', '3', '4', '2', '1', '1'], barres: [{ fret: 3, fromString: 6, toString: 1 }], baseFret: 3, positionName: 'Barré 3e frette' }
  ],
  'Gm': [
    { frets: [3, 5, 5, 3, 3, 3], fingers: ['1', '3', '4', '1', '1', '1'], barres: [{ fret: 3, fromString: 6, toString: 1 }], baseFret: 3, positionName: 'Barré 3e frette' }
  ],
  'G7': [
    { frets: [3, 2, 0, 0, 0, 1], fingers: ['3', '2', '', '', '', '1'], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [3, 5, 3, 4, 3, 3], fingers: ['1', '3', '1', '2', '1', '1'], barres: [{ fret: 3, fromString: 6, toString: 1 }], baseFret: 3, positionName: 'Barré 3e frette' }
  ],
  'Gmaj7': [
    { frets: [3, 2, 0, 0, 0, 2], fingers: ['2', '1', '', '', '', '3'], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Gm7': [
    { frets: [3, 5, 3, 3, 3, 3], fingers: ['1', '3', '1', '1', '1', '1'], barres: [{ fret: 3, fromString: 6, toString: 1 }], baseFret: 3, positionName: 'Barré 3e frette' }
  ],
  'Gsus4': [
    { frets: [3, 3, 0, 0, 3, 3], fingers: ['2', '3', '', '', '4', '4'], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Gsus2': [
    { frets: [3, 0, 0, 0, 3, 3], fingers: ['1', '', '', '', '3', '4'], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'G/B': [
    { frets: [-1, 2, 0, 0, 3, 3], fingers: ['', '1', '', '', '3', '4'], baseFret: 1, positionName: 'Basse Si 5e corde' },
    { frets: [-1, 2, 0, 0, 0, 3], fingers: ['', '1', '', '', '', '2'], baseFret: 1, positionName: 'Position folk' }
  ],

  // A family
  'A': [
    { frets: [-1, 0, 2, 2, 2, 0], fingers: ['', '', '1', '2', '3', ''], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [5, 7, 7, 6, 5, 5], fingers: ['1', '3', '4', '2', '1', '1'], barres: [{ fret: 5, fromString: 6, toString: 1 }], baseFret: 5, positionName: 'Barré 5e frette' }
  ],
  'Am': [
    { frets: [-1, 0, 2, 2, 1, 0], fingers: ['', '', '2', '3', '1', ''], baseFret: 1, positionName: 'Position ouverte' },
    { frets: [5, 7, 7, 5, 5, 5], fingers: ['1', '3', '4', '1', '1', '1'], barres: [{ fret: 5, fromString: 6, toString: 1 }], baseFret: 5, positionName: 'Barré 5e frette' }
  ],
  'A7': [
    { frets: [-1, 0, 2, 0, 2, 0], fingers: ['', '', '1', '', '2', ''], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Amaj7': [
    { frets: [-1, 0, 2, 1, 2, 0], fingers: ['', '', '2', '1', '3', ''], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Am7': [
    { frets: [-1, 0, 2, 0, 1, 0], fingers: ['', '', '2', '', '1', ''], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Asus4': [
    { frets: [-1, 0, 2, 2, 3, 0], fingers: ['', '', '1', '2', '3', ''], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Asus2': [
    { frets: [-1, 0, 2, 2, 0, 0], fingers: ['', '', '1', '2', '', ''], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Am/G': [
    { frets: [3, 0, 2, 2, 1, 0], fingers: ['3', '', '2', '4', '1', ''], baseFret: 1, positionName: 'Basse Sol 6e corde' }
  ],
  'A/C#': [
    { frets: [-1, 4, 2, 2, 2, 0], fingers: ['', '4', '1', '2', '3', ''], baseFret: 1, positionName: 'Basse Do# 5e corde' }
  ],

  // B & Bb family
  'B': [
    { frets: [-1, 2, 4, 4, 4, 2], fingers: ['', '1', '2', '3', '4', '1'], barres: [{ fret: 2, fromString: 5, toString: 1 }], baseFret: 2, positionName: 'Barré 2e frette' },
    { frets: [7, 9, 9, 8, 7, 7], fingers: ['1', '3', '4', '2', '1', '1'], barres: [{ fret: 7, fromString: 6, toString: 1 }], baseFret: 7, positionName: 'Barré 7e frette' }
  ],
  'Bm': [
    { frets: [-1, 2, 4, 4, 3, 2], fingers: ['', '1', '3', '4', '2', '1'], barres: [{ fret: 2, fromString: 5, toString: 1 }], baseFret: 2, positionName: 'Barré 2e frette' },
    { frets: [7, 9, 9, 7, 7, 7], fingers: ['1', '3', '4', '1', '1', '1'], barres: [{ fret: 7, fromString: 6, toString: 1 }], baseFret: 7, positionName: 'Barré 7e frette' }
  ],
  'B7': [
    { frets: [-1, 2, 1, 2, 0, 2], fingers: ['', '2', '1', '3', '', '4'], baseFret: 1, positionName: 'Position ouverte' }
  ],
  'Bm7': [
    { frets: [-1, 2, 4, 2, 3, 2], fingers: ['', '1', '3', '1', '2', '1'], barres: [{ fret: 2, fromString: 5, toString: 1 }], baseFret: 2, positionName: 'Barré 2e frette' }
  ],
  'Bsus4': [
    { frets: [-1, 2, 4, 4, 5, 2], fingers: ['', '1', '2', '3', '4', '1'], barres: [{ fret: 2, fromString: 5, toString: 1 }], baseFret: 2, positionName: 'Barré 2e frette' }
  ],
  'Bb': [
    { frets: [-1, 1, 3, 3, 3, 1], fingers: ['', '1', '2', '3', '4', '1'], barres: [{ fret: 1, fromString: 5, toString: 1 }], baseFret: 1, positionName: 'Barré 1re frette' },
    { frets: [6, 8, 8, 7, 6, 6], fingers: ['1', '3', '4', '2', '1', '1'], barres: [{ fret: 6, fromString: 6, toString: 1 }], baseFret: 6, positionName: 'Barré 6e frette' }
  ],
  'Bbm': [
    { frets: [-1, 1, 3, 3, 2, 1], fingers: ['', '1', '3', '4', '2', '1'], barres: [{ fret: 1, fromString: 5, toString: 1 }], baseFret: 1, positionName: 'Barré 1re frette' }
  ],
  'Bb7': [
    { frets: [-1, 1, 3, 1, 3, 1], fingers: ['', '1', '3', '1', '4', '1'], barres: [{ fret: 1, fromString: 5, toString: 1 }], baseFret: 1, positionName: 'Barré 1re frette' }
  ],
  'Eb': [
    { frets: [-1, 6, 8, 8, 8, 6], fingers: ['', '1', '2', '3', '4', '1'], barres: [{ fret: 6, fromString: 5, toString: 1 }], baseFret: 6, positionName: 'Barré 6e frette' },
    { frets: [-1, -1, 1, 3, 4, 3], fingers: ['', '', '1', '2', '4', '3'], baseFret: 1, positionName: 'Position ouverte D-shape' }
  ],
  'Ab': [
    { frets: [4, 6, 6, 5, 4, 4], fingers: ['1', '3', '4', '2', '1', '1'], barres: [{ fret: 4, fromString: 6, toString: 1 }], baseFret: 4, positionName: 'Barré 4e frette' }
  ],
  'Db': [
    { frets: [-1, 4, 6, 6, 6, 4], fingers: ['', '1', '2', '3', '4', '1'], barres: [{ fret: 4, fromString: 5, toString: 1 }], baseFret: 4, positionName: 'Barré 4e frette' }
  ]
};

// Algorithmic CAGED Barre generator for guitar if not in known library
function generateGuitarCAGEDVoicings(rootNote: string, quality: string): GuitarVoicing[] {
  const voicings: GuitarVoicing[] = [];
  const rootIndex = CHROMATIC_SHARP.indexOf(rootNote) !== -1 
    ? CHROMATIC_SHARP.indexOf(rootNote) 
    : CHROMATIC_FLAT.indexOf(rootNote);

  if (rootIndex === -1) return voicings;

  const isMinor = quality.startsWith('m') && !quality.startsWith('maj');
  const is7th = quality.includes('7') && !quality.includes('maj');
  const isMaj7 = quality.includes('maj7') || quality.includes('M7');
  const isSus4 = quality.includes('sus4') || quality.includes('sus');
  const isSus2 = quality.includes('sus2');

  // E-Shape Barre (Root on 6th string, open root is E = index 4)
  // Shift = (rootIndex - 4 + 12) % 12
  const eFret = (rootIndex - 4 + 12) % 12;
  if (eFret >= 0 && eFret <= 12) {
    if (isMinor) {
      voicings.push({
        frets: [eFret, eFret + 2, eFret + 2, eFret, eFret, eFret],
        barres: eFret > 0 ? [{ fret: eFret, fromString: 6, toString: 1 }] : undefined,
        baseFret: Math.max(1, eFret),
        positionName: eFret === 0 ? 'Position ouverte' : `Barré ${eFret}e frette corde 6`
      });
    } else if (isMaj7) {
      voicings.push({
        frets: [eFret, -1, eFret + 1, eFret + 1, eFret - 1 >= 0 ? eFret - 1 : eFret + 11, -1],
        baseFret: Math.max(1, eFret),
        positionName: `Position ${eFret}e frette`
      });
    } else if (is7th) {
      voicings.push({
        frets: [eFret, eFret + 2, eFret, eFret + 1, eFret, eFret],
        barres: eFret > 0 ? [{ fret: eFret, fromString: 6, toString: 1 }] : undefined,
        baseFret: Math.max(1, eFret),
        positionName: eFret === 0 ? 'Position ouverte' : `Barré 7e ${eFret}e frette`
      });
    } else if (isSus4) {
      voicings.push({
        frets: [eFret, eFret + 2, eFret + 2, eFret + 2, eFret, eFret],
        barres: eFret > 0 ? [{ fret: eFret, fromString: 6, toString: 1 }] : undefined,
        baseFret: Math.max(1, eFret),
        positionName: `Barré sus4 ${eFret}e frette`
      });
    } else {
      voicings.push({
        frets: [eFret, eFret + 2, eFret + 2, eFret + 1, eFret, eFret],
        barres: eFret > 0 ? [{ fret: eFret, fromString: 6, toString: 1 }] : undefined,
        baseFret: Math.max(1, eFret),
        positionName: eFret === 0 ? 'Position ouverte' : `Barré ${eFret}e frette corde 6`
      });
    }
  }

  // A-Shape Barre (Root on 5th string, open root is A = index 9)
  const aFret = (rootIndex - 9 + 12) % 12;
  if (aFret >= 0 && aFret <= 12) {
    if (isMinor) {
      voicings.push({
        frets: [-1, aFret, aFret + 2, aFret + 2, aFret + 1, aFret],
        barres: aFret > 0 ? [{ fret: aFret, fromString: 5, toString: 1 }] : undefined,
        baseFret: Math.max(1, aFret),
        positionName: aFret === 0 ? 'Position ouverte' : `Barré ${aFret}e frette corde 5`
      });
    } else if (is7th) {
      voicings.push({
        frets: [-1, aFret, aFret + 2, aFret, aFret + 2, aFret],
        barres: aFret > 0 ? [{ fret: aFret, fromString: 5, toString: 1 }] : undefined,
        baseFret: Math.max(1, aFret),
        positionName: aFret === 0 ? 'Position ouverte 7e' : `Barré 7e ${aFret}e frette`
      });
    } else if (isSus4) {
      voicings.push({
        frets: [-1, aFret, aFret + 2, aFret + 2, aFret + 3, aFret],
        baseFret: Math.max(1, aFret),
        positionName: `Position sus4 ${aFret}e frette`
      });
    } else if (isSus2) {
      voicings.push({
        frets: [-1, aFret, aFret + 2, aFret + 2, aFret, aFret],
        baseFret: Math.max(1, aFret),
        positionName: `Position sus2 ${aFret}e frette`
      });
    } else {
      voicings.push({
        frets: [-1, aFret, aFret + 2, aFret + 2, aFret + 2, aFret],
        barres: aFret > 0 ? [{ fret: aFret, fromString: 5, toString: 1 }] : undefined,
        baseFret: Math.max(1, aFret),
        positionName: aFret === 0 ? 'Position ouverte' : `Barré ${aFret}e frette corde 5`
      });
    }
  }

  return voicings;
}

// Convert note name to MIDI/pitch class offset (0 = C, 1 = C#/Db, ... 11 = B)
export function getNotePitchClass(note: string): number {
  if (!note) return 0;
  const clean = note.trim();
  let idx = CHROMATIC_SHARP.indexOf(clean);
  if (idx === -1) idx = CHROMATIC_FLAT.indexOf(clean);
  if (idx === -1) {
    // Check Latin
    for (const [eng, lat] of Object.entries(LATIN_NOTES)) {
      if (lat.toLowerCase() === clean.toLowerCase()) {
        return getNotePitchClass(eng);
      }
    }
  }
  return idx !== -1 ? idx : 0;
}

// Parse any chord string (e.g. "D/F#", "Em7", "C#sus4", "G", "DoM7")
export function parseChordSymbol(rawChord: string): {
  root: string;
  quality: string;
  bass?: string;
  normalizedSymbol: string;
} {
  if (!rawChord || !rawChord.trim()) {
    return { root: 'C', quality: '', normalizedSymbol: 'C' };
  }

  let text = rawChord.trim();

  // Check if Latin note at start (Do, Ré, Mi, Fa, Sol, La, Si)
  for (const [eng, lat] of Object.entries(LATIN_NOTES)) {
    if (text.toLowerCase().startsWith(lat.toLowerCase())) {
      const remainder = text.slice(lat.length);
      text = eng + remainder;
      break;
    }
  }

  let bass: string | undefined;
  if (text.includes('/')) {
    const parts = text.split('/');
    text = parts[0];
    let rawBass = parts[1].trim();
    for (const [eng, lat] of Object.entries(LATIN_NOTES)) {
      if (rawBass.toLowerCase() === lat.toLowerCase()) {
        rawBass = eng;
        break;
      }
    }
    bass = rawBass;
  }

  const match = text.match(/^([A-G][#b]?)(.*)$/);
  if (!match) {
    return { root: 'C', quality: '', normalizedSymbol: 'C' };
  }

  const root = match[1];
  let rawQuality = match[2] || '';

  // Normalize quality aliases
  let matchedQualityKey = '';
  for (const [qKey, qInfo] of Object.entries(CHORD_QUALITIES)) {
    if (qKey === rawQuality || qInfo.aliases.includes(rawQuality)) {
      matchedQualityKey = qKey;
      break;
    }
  }
  if (!matchedQualityKey && rawQuality) {
    // If lowercase m matches
    if (rawQuality.startsWith('m') && !rawQuality.startsWith('maj')) {
      matchedQualityKey = 'm';
    } else {
      matchedQualityKey = rawQuality;
    }
  }

  const normalizedSymbol = bass ? `${root}${matchedQualityKey}/${bass}` : `${root}${matchedQualityKey}`;

  return {
    root,
    quality: matchedQualityKey,
    bass,
    normalizedSymbol
  };
}

// Get complete chord data (Guitar voicings, Piano voicings, intervals, formulas, audio notes)
export function getChordData(chordStr: string): ChordData {
  const { root, quality, bass, normalizedSymbol } = parseChordSymbol(chordStr);
  const qData = CHORD_QUALITIES[quality] || {
    name: quality || 'Majeur',
    intervals: [0, 4, 7],
    formula: '1 - 3 - 5',
    description: 'Fondamentale, Tierce, Quinte',
    aliases: []
  };

  const rootPitch = getNotePitchClass(root);
  const preferFlats = root.includes('b') || root === 'F' || root === 'Bb' || root === 'Eb' || root === 'Ab' || root === 'Db';
  const scale = preferFlats ? CHROMATIC_FLAT : CHROMATIC_SHARP;

  // Calculate distinct notes of the chord
  const chordNotes = qData.intervals.map(interval => {
    const noteIdx = (rootPitch + interval) % 12;
    return scale[noteIdx];
  });

  // If slash chord with bass note, include bass note in notes if not present
  if (bass && !chordNotes.includes(bass)) {
    chordNotes.unshift(bass);
  }

  // Guitar Voicings
  let guitarVoicings: GuitarVoicing[] = [];
  const lookupKey = bass ? `${root}${quality}/${bass}` : `${root}${quality}`;
  const directKey = `${root}${quality}`;

  if (KNOWN_GUITAR_SHAPES[lookupKey]) {
    guitarVoicings = [...KNOWN_GUITAR_SHAPES[lookupKey]];
  } else if (KNOWN_GUITAR_SHAPES[directKey]) {
    guitarVoicings = [...KNOWN_GUITAR_SHAPES[directKey]];
  }

  // If no or few voicings found, generate CAGED barre voicings
  if (guitarVoicings.length === 0) {
    const generated = generateGuitarCAGEDVoicings(root, quality);
    if (generated.length > 0) {
      guitarVoicings.push(...generated);
    }
  }

  // Fallback default voicing if still empty
  if (guitarVoicings.length === 0) {
    guitarVoicings.push({
      frets: [rootPitch % 12, (rootPitch + 7) % 12, (rootPitch + 12) % 12, -1, -1, -1],
      baseFret: Math.max(1, rootPitch),
      positionName: 'Accord de puissance'
    });
  }

  // Piano Voicings (Keyboard 24 keys: C3 = 0, C#3 = 1 ... C4 = 12 ... B4 = 23)
  const pianoVoicings: PianoVoicing[] = [];

  // Base fundamental octave placement
  // Put root in octave 1 (0..11) or octave 2 depending on root
  let baseOctaveOffset = rootPitch < 5 ? 12 : 0; // C, D, Eb, E go to C4 octave (12..), F, G, A, B stay in C3 octave (5..)
  if (rootPitch >= 9) baseOctaveOffset = 0;

  const baseKeys = qData.intervals.map(interval => (rootPitch + baseOctaveOffset + interval) % 24);
  const bassPitch = bass ? getNotePitchClass(bass) : rootPitch;
  const bassKey = bassPitch; // lower octave for left hand bass

  // Inversion 0: Fundamental
  pianoVoicings.push({
    keys: Array.from(new Set(bass ? [bassKey, ...baseKeys] : baseKeys)).sort((a, b) => a - b),
    rootKey: (rootPitch + baseOctaveOffset) % 24,
    bassKey: bass ? bassKey : undefined,
    notes: chordNotes,
    inversion: 0,
    inversionName: 'Position fondamentale'
  });

  // Inversion 1: 1st Inversion
  if (qData.intervals.length >= 3) {
    const inv1Keys = [...baseKeys];
    inv1Keys[0] = (inv1Keys[0] + 12) % 24;
    pianoVoicings.push({
      keys: Array.from(new Set(bass ? [bassKey, ...inv1Keys] : inv1Keys)).sort((a, b) => a - b),
      rootKey: (rootPitch + baseOctaveOffset) % 24,
      bassKey: bass ? bassKey : undefined,
      notes: chordNotes,
      inversion: 1,
      inversionName: '1er renversement'
    });
  }

  // Inversion 2: 2nd Inversion
  if (qData.intervals.length >= 3) {
    const inv2Keys = [...baseKeys];
    inv2Keys[0] = (inv2Keys[0] + 12) % 24;
    inv2Keys[1] = (inv2Keys[1] + 12) % 24;
    pianoVoicings.push({
      keys: Array.from(new Set(bass ? [bassKey, ...inv2Keys] : inv2Keys)).sort((a, b) => a - b),
      rootKey: (rootPitch + baseOctaveOffset) % 24,
      bassKey: bass ? bassKey : undefined,
      notes: chordNotes,
      inversion: 2,
      inversionName: '2e renversement'
    });
  }

  // Latin translation
  const latinRoot = LATIN_NOTES[root] || root;
  const latinBass = bass ? (LATIN_NOTES[bass] || bass) : '';
  const latinName = latinBass ? `${latinRoot}${quality}/${latinBass}` : `${latinRoot}${quality}`;

  return {
    raw: chordStr,
    root,
    quality,
    bass,
    formattedName: normalizedSymbol,
    latinName,
    formula: qData.formula,
    formulaDescription: qData.description,
    notes: chordNotes,
    guitarVoicings,
    pianoVoicings
  };
}

// Web Audio API Polyphonic Chord Synthesizer
class ChordSynth {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play Guitar Strum with optional piano/keyboard style transposeOffset
  playGuitar(voicing: GuitarVoicing, rootPitch: number, transposeOffset: number = 0) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Standard guitar open string MIDI numbers: E2(40), A2(45), D3(50), G3(55), B3(59), E4(64)
    const openMidis = [40, 45, 50, 55, 59, 64];

    voicing.frets.forEach((fret, stringIdx) => {
      if (fret < 0) return; // muted string
      const midi = openMidis[stringIdx] + fret + transposeOffset;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);

      // Strum delay: strings are plucked sequentially downwards (e.g. 25ms between strings)
      const stringDelay = stringIdx * 0.028;
      const startTime = now + stringDelay;

      // Dual oscillator for rich guitar string tone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 1.002, startTime); // subtle chorus detune

      // Low pass filter with acoustic pluck decay
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(5000, freq * 6), startTime);
      filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), startTime + 1.2);

      // Exponential decay envelope
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + 2.3);
      osc2.stop(startTime + 2.3);
    });
  }

  // Play Piano Chord with optional piano/keyboard style transposeOffset
  playPiano(keys: number[], rootKey: number, transposeOffset: number = 0) {
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // MIDI base: key 0 = C3 (48)
    const baseMidi = 48;

    keys.forEach((keyOffset, idx) => {
      const midi = baseMidi + keyOffset + transposeOffset;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const noteDelay = idx * 0.015; // very slight humanized chord roll
      const startTime = now + noteDelay;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2, startTime); // octave overtone for piano brilliance

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(6000, freq * 5), startTime);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.2, startTime + 1.5);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.5);

      osc1.connect(filter);
      osc2.connect(gain);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + 2.6);
      osc2.stop(startTime + 2.6);
    });
  }
}

export const chordSynth = new ChordSynth();
