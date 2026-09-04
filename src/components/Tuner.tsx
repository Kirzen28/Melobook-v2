import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Gauge, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Check, 
  ChevronDown,
  Sparkles,
  Music
} from 'lucide-react';

export interface TunerString {
  id: string;
  stringNumber: number;
  noteName: string;
  frenchName: string;
  octave: number;
  frequency: number;
}

export interface TunerInstrument {
  id: string;
  name: string;
  strings: TunerString[];
}

export const TUNER_INSTRUMENTS: TunerInstrument[] = [
  {
    id: 'guitar',
    name: 'Guitare',
    strings: [
      { id: 'g6', stringNumber: 6, noteName: 'E', frenchName: 'Mi', octave: 2, frequency: 82.41 },
      { id: 'g5', stringNumber: 5, noteName: 'A', frenchName: 'La', octave: 2, frequency: 110.00 },
      { id: 'g4', stringNumber: 4, noteName: 'D', frenchName: 'Ré', octave: 3, frequency: 146.83 },
      { id: 'g3', stringNumber: 3, noteName: 'G', frenchName: 'Sol', octave: 3, frequency: 196.00 },
      { id: 'g2', stringNumber: 2, noteName: 'B', frenchName: 'Si', octave: 3, frequency: 246.94 },
      { id: 'g1', stringNumber: 1, noteName: 'E', frenchName: 'Mi', octave: 4, frequency: 329.63 }
    ]
  },
  {
    id: 'ukulele',
    name: 'Ukulélé',
    strings: [
      { id: 'u4', stringNumber: 4, noteName: 'G', frenchName: 'Sol', octave: 4, frequency: 392.00 },
      { id: 'u3', stringNumber: 3, noteName: 'C', frenchName: 'Do', octave: 4, frequency: 261.63 },
      { id: 'u2', stringNumber: 2, noteName: 'E', frenchName: 'Mi', octave: 4, frequency: 329.63 },
      { id: 'u1', stringNumber: 1, noteName: 'A', frenchName: 'La', octave: 4, frequency: 440.00 }
    ]
  },
  {
    id: 'bass-4',
    name: 'Basse 4 cordes',
    strings: [
      { id: 'b4-4', stringNumber: 4, noteName: 'E', frenchName: 'Mi', octave: 1, frequency: 41.20 },
      { id: 'b4-3', stringNumber: 3, noteName: 'A', frenchName: 'La', octave: 1, frequency: 55.00 },
      { id: 'b4-2', stringNumber: 2, noteName: 'D', frenchName: 'Ré', octave: 2, frequency: 73.42 },
      { id: 'b4-1', stringNumber: 1, noteName: 'G', frenchName: 'Sol', octave: 2, frequency: 98.00 }
    ]
  },
  {
    id: 'bass-5',
    name: 'Basse 5 cordes',
    strings: [
      { id: 'b5-5', stringNumber: 5, noteName: 'B', frenchName: 'Si', octave: 0, frequency: 30.87 },
      { id: 'b5-4', stringNumber: 4, noteName: 'E', frenchName: 'Mi', octave: 1, frequency: 41.20 },
      { id: 'b5-3', stringNumber: 3, noteName: 'A', frenchName: 'La', octave: 1, frequency: 55.00 },
      { id: 'b5-2', stringNumber: 2, noteName: 'D', frenchName: 'Ré', octave: 2, frequency: 73.42 },
      { id: 'b5-1', stringNumber: 1, noteName: 'G', frenchName: 'Sol', octave: 2, frequency: 98.00 }
    ]
  },
  {
    id: 'bass-6',
    name: 'Basse 6 cordes',
    strings: [
      { id: 'b6-6', stringNumber: 6, noteName: 'B', frenchName: 'Si', octave: 0, frequency: 30.87 },
      { id: 'b6-5', stringNumber: 5, noteName: 'E', frenchName: 'Mi', octave: 1, frequency: 41.20 },
      { id: 'b6-4', stringNumber: 4, noteName: 'A', frenchName: 'La', octave: 1, frequency: 55.00 },
      { id: 'b6-3', stringNumber: 3, noteName: 'D', frenchName: 'Ré', octave: 2, frequency: 73.42 },
      { id: 'b6-2', stringNumber: 2, noteName: 'G', frenchName: 'Sol', octave: 2, frequency: 98.00 },
      { id: 'b6-1', stringNumber: 1, noteName: 'C', frenchName: 'Do', octave: 3, frequency: 130.81 }
    ]
  },
  {
    id: 'violin',
    name: 'Violon',
    strings: [
      { id: 'vn4', stringNumber: 4, noteName: 'G', frenchName: 'Sol', octave: 3, frequency: 196.00 },
      { id: 'vn3', stringNumber: 3, noteName: 'D', frenchName: 'Ré', octave: 4, frequency: 293.66 },
      { id: 'vn2', stringNumber: 2, noteName: 'A', frenchName: 'La', octave: 4, frequency: 440.00 },
      { id: 'vn1', stringNumber: 1, noteName: 'E', frenchName: 'Mi', octave: 5, frequency: 659.25 }
    ]
  },
  {
    id: 'cello',
    name: 'Violoncelle',
    strings: [
      { id: 'vc4', stringNumber: 4, noteName: 'C', frenchName: 'Do', octave: 2, frequency: 65.41 },
      { id: 'vc3', stringNumber: 3, noteName: 'G', frenchName: 'Sol', octave: 2, frequency: 98.00 },
      { id: 'vc2', stringNumber: 2, noteName: 'D', frenchName: 'Ré', octave: 3, frequency: 146.83 },
      { id: 'vc1', stringNumber: 1, noteName: 'A', frenchName: 'La', octave: 3, frequency: 220.00 }
    ]
  },
  {
    id: 'viola',
    name: 'Alto',
    strings: [
      { id: 'va4', stringNumber: 4, noteName: 'C', frenchName: 'Do', octave: 3, frequency: 130.81 },
      { id: 'va3', stringNumber: 3, noteName: 'G', frenchName: 'Sol', octave: 3, frequency: 196.00 },
      { id: 'va2', stringNumber: 2, noteName: 'D', frenchName: 'Ré', octave: 4, frequency: 293.66 },
      { id: 'va1', stringNumber: 1, noteName: 'A', frenchName: 'La', octave: 4, frequency: 440.00 }
    ]
  },
  {
    id: 'mandolin',
    name: 'Mandoline',
    strings: [
      { id: 'md4', stringNumber: 4, noteName: 'G', frenchName: 'Sol', octave: 3, frequency: 196.00 },
      { id: 'md3', stringNumber: 3, noteName: 'D', frenchName: 'Ré', octave: 4, frequency: 293.66 },
      { id: 'md2', stringNumber: 2, noteName: 'A', frenchName: 'La', octave: 4, frequency: 440.00 },
      { id: 'md1', stringNumber: 1, noteName: 'E', frenchName: 'Mi', octave: 5, frequency: 659.25 }
    ]
  },
  {
    id: 'charango',
    name: 'Charango',
    strings: [
      { id: 'ch5', stringNumber: 5, noteName: 'G', frenchName: 'Sol', octave: 4, frequency: 392.00 },
      { id: 'ch4', stringNumber: 4, noteName: 'C', frenchName: 'Do', octave: 5, frequency: 523.25 },
      { id: 'ch3', stringNumber: 3, noteName: 'E', frenchName: 'Mi', octave: 5, frequency: 659.25 },
      { id: 'ch2', stringNumber: 2, noteName: 'A', frenchName: 'La', octave: 4, frequency: 440.00 },
      { id: 'ch1', stringNumber: 1, noteName: 'E', frenchName: 'Mi', octave: 5, frequency: 659.25 }
    ]
  },
  {
    id: 'banjo-4',
    name: 'Banjo 4 cordes',
    strings: [
      { id: 'bj4-4', stringNumber: 4, noteName: 'C', frenchName: 'Do', octave: 3, frequency: 130.81 },
      { id: 'bj4-3', stringNumber: 3, noteName: 'G', frenchName: 'Sol', octave: 3, frequency: 196.00 },
      { id: 'bj4-2', stringNumber: 2, noteName: 'D', frenchName: 'Ré', octave: 4, frequency: 293.66 },
      { id: 'bj4-1', stringNumber: 1, noteName: 'A', frenchName: 'La', octave: 4, frequency: 440.00 }
    ]
  },
  {
    id: 'banjo-5',
    name: 'Banjo 5 cordes',
    strings: [
      { id: 'bj5-5', stringNumber: 5, noteName: 'G', frenchName: 'Sol', octave: 4, frequency: 392.00 },
      { id: 'bj5-4', stringNumber: 4, noteName: 'D', frenchName: 'Ré', octave: 3, frequency: 146.83 },
      { id: 'bj5-3', stringNumber: 3, noteName: 'G', frenchName: 'Sol', octave: 3, frequency: 196.00 },
      { id: 'bj5-2', stringNumber: 2, noteName: 'B', frenchName: 'Si', octave: 3, frequency: 246.94 },
      { id: 'bj5-1', stringNumber: 1, noteName: 'D', frenchName: 'Ré', octave: 4, frequency: 293.66 }
    ]
  }
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FRENCH_NOTE_NAMES = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let sumOfSquares = 0;
  for (let i = 0; i < SIZE; i++) {
    sumOfSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumOfSquares / SIZE);
  if (rms < 0.012) return -1;

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmed = buffer.slice(r1, r2);
  const c = new Array(trimmed.length).fill(0);
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmed.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;

  const x1 = c[T0 - 1] || 0;
  const x2 = c[T0];
  const x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

export const Tuner: React.FC = () => {
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>('guitar');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [detectedFrequency, setDetectedFrequency] = useState<number | null>(null);
  const [selectedStringId, setSelectedStringId] = useState<string | null>(null);
  const [playingStringId, setPlayingStringId] = useState<string | null>(null);
  const [a4Reference, setA4Reference] = useState<number>(440);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const currentInstrument = useMemo(() => {
    return TUNER_INSTRUMENTS.find(i => i.id === selectedInstrumentId) || TUNER_INSTRUMENTS[0];
  }, [selectedInstrumentId]);

  const activeTargetString = useMemo(() => {
    if (selectedStringId) {
      return currentInstrument.strings.find(s => s.id === selectedStringId) || null;
    }
    return null;
  }, [selectedStringId, currentInstrument]);

  const tuningAnalysis = useMemo(() => {
    if (!detectedFrequency || detectedFrequency < 20 || detectedFrequency > 1500) {
      return null;
    }

    const semitonesFromA4 = 12 * Math.log2(detectedFrequency / a4Reference);
    const midi = Math.round(semitonesFromA4) + 69;
    const noteIndex = (midi % 12 + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    const noteName = NOTE_NAMES[noteIndex];
    const frenchName = FRENCH_NOTE_NAMES[noteIndex];

    const standardTargetFreq = a4Reference * Math.pow(2, (midi - 69) / 12);
    const chromaticCents = Math.round(1200 * Math.log2(detectedFrequency / standardTargetFreq));

    let matchedString: TunerString | null = activeTargetString;
    if (!matchedString) {
      let minDiff = Infinity;
      for (const s of currentInstrument.strings) {
        const diff = Math.abs(detectedFrequency - s.frequency);
        if (diff < minDiff) {
          minDiff = diff;
          matchedString = s;
        }
      }
    }

    let stringCents = chromaticCents;
    let targetFreq = standardTargetFreq;

    if (matchedString) {
      targetFreq = matchedString.frequency;
      stringCents = Math.round(1200 * Math.log2(detectedFrequency / targetFreq));
    }

    const clampedCents = Math.max(-50, Math.min(50, stringCents));
    const isInTune = Math.abs(stringCents) <= 3;
    const isFlat = stringCents < -3;
    const isSharp = stringCents > 3;

    return {
      noteName,
      frenchName,
      octave,
      targetFreq,
      frequency: detectedFrequency,
      cents: clampedCents,
      rawCents: stringCents,
      isInTune,
      isFlat,
      isSharp,
      matchedString
    };
  }, [detectedFrequency, a4Reference, activeTargetString, currentInstrument]);

  const stopListening = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsListening(false);
    setDetectedFrequency(null);
  };

  const startListening = async () => {
    try {
      setMicError(null);
      stopReferenceTone();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false
        } 
      });

      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = audioContextRef.current || new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      setIsListening(true);

      const buffer = new Float32Array(analyser.fftSize);

      const updatePitch = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buffer);
        const pitch = autoCorrelate(buffer, audioCtx.sampleRate);
        if (pitch !== -1 && pitch >= 25 && pitch <= 1400) {
          setDetectedFrequency(prev => {
            if (!prev) return pitch;
            return prev * 0.4 + pitch * 0.6;
          });
        }
        animFrameRef.current = requestAnimationFrame(updatePitch);
      };

      updatePitch();
    } catch (err: any) {
      setMicError('Accès au microphone refusé ou non disponible sur cet appareil.');
      setIsListening(false);
    }
  };

  const stopReferenceTone = () => {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {
        // Ignored
      }
      oscRef.current = null;
    }
    if (gainRef.current) {
      try {
        gainRef.current.disconnect();
      } catch (e) {
        // Ignored
      }
      gainRef.current = null;
    }
    setPlayingStringId(null);
  };

  const playReferenceTone = (str: TunerString) => {
    if (playingStringId === str.id) {
      stopReferenceTone();
      return;
    }

    stopReferenceTone();

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = audioContextRef.current || new AudioCtx();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    audioContextRef.current = audioCtx;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(str.frequency, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    oscRef.current = osc;
    gainRef.current = gain;
    setPlayingStringId(str.id);
  };

  useEffect(() => {
    return () => {
      stopListening();
      stopReferenceTone();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    setSelectedStringId(null);
    stopReferenceTone();
  }, [selectedInstrumentId]);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Gauge className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Accordeur
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Accordez votre instrument en temps réel au micro ou à l'oreille
          </p>
        </div>

        {/* Instrument Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 font-medium whitespace-nowrap">
            Instrument :
          </label>
          <div className="relative flex-1 sm:w-56">
            <select
              value={selectedInstrumentId}
              onChange={(e) => setSelectedInstrumentId(e.target.value)}
              className="w-full appearance-none bg-[#141416] border border-[#2A2A2E] hover:border-blue-500/40 text-white text-xs font-semibold rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
            >
              {TUNER_INSTRUMENTS.map((inst) => (
                <option key={inst.id} value={inst.id} className="bg-[#111112]">
                  {inst.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {micError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {micError}
        </div>
      )}

      {/* Main Tuner Card */}
      <div className="bg-[#111113] border border-[#222225] rounded-2xl p-4 sm:p-8 mb-6 shadow-xl relative overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1E1E22]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Arrêter le micro</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Activer le micro</span>
                </>
              )}
            </button>

            {selectedStringId && (
              <button
                type="button"
                onClick={() => setSelectedStringId(null)}
                className="px-2.5 py-2 rounded-lg bg-[#1A1A1E] hover:bg-[#25252A] text-gray-300 hover:text-white border border-[#2E2E34] text-xs font-medium transition-colors"
                title="Détection automatique de corde"
              >
                Auto
              </button>
            )}
          </div>

          {/* Diapason A4 */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#161618] px-2.5 py-1.5 rounded-lg border border-[#252528]">
            <span className="font-medium text-gray-300">A4 = {a4Reference} Hz</span>
          </div>
        </div>

        {/* Central Display */}
        <div className="flex flex-col items-center justify-center py-4 sm:py-6">
          
          {/* Detected Note and Name */}
          <div className="text-center min-h-[120px] flex flex-col items-center justify-center">
            {tuningAnalysis ? (
              <>
                <div className="flex items-baseline justify-center gap-2">
                  <span className={`text-6xl sm:text-7xl font-extrabold tracking-tight font-mono transition-colors ${
                    tuningAnalysis.isInTune
                      ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : tuningAnalysis.isFlat
                      ? 'text-cyan-400'
                      : 'text-amber-400'
                  }`}>
                    {tuningAnalysis.noteName}
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-gray-400 font-mono">
                    {tuningAnalysis.octave}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm sm:text-base font-semibold text-gray-300">
                    {tuningAnalysis.frenchName}
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs sm:text-sm font-mono text-gray-400">
                    {tuningAnalysis.frequency.toFixed(1)} Hz
                  </span>
                </div>
              </>
            ) : isListening ? (
              <div className="flex flex-col items-center justify-center text-gray-500 py-6">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-blue-500/40 animate-spin mb-3"></div>
                <p className="text-xs sm:text-sm font-medium text-gray-400">
                  Jouez une corde pour débuter l'accordage...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500 py-6">
                <Music className="w-10 h-10 text-gray-600 mb-2 stroke-[1.5]" />
                <p className="text-xs sm:text-sm font-medium text-gray-400">
                  Activez le micro ou écoutez les notes de référence ci-dessous
                </p>
              </div>
            )}
          </div>

          {/* Precision Needle / Gauge Meter */}
          <div className="w-full max-w-md mt-6">
            
            {/* Cent scale labels */}
            <div className="flex justify-between text-[10px] font-mono text-gray-500 px-1 mb-1.5">
              <span>-50</span>
              <span>-25</span>
              <span className="text-gray-300 font-bold">0</span>
              <span>+25</span>
              <span>+50</span>
            </div>

            {/* Gauge bar track */}
            <div className="relative h-4 bg-[#18181B] rounded-full border border-[#2A2A2E] overflow-hidden">
              {/* Center in-tune target zone */}
              <div className="absolute top-0 bottom-0 left-[48%] right-[48%] bg-emerald-500/20 border-x border-emerald-500/40 z-0"></div>

              {/* Gauge pointer indicator */}
              {tuningAnalysis && (
                <div 
                  className={`absolute top-0 bottom-0 w-2.5 rounded-full -ml-1 transition-all duration-75 z-10 ${
                    tuningAnalysis.isInTune
                      ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                      : tuningAnalysis.isFlat
                      ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
                      : 'bg-amber-400 shadow-[0_0_10px_#fbbf24]'
                  }`}
                  style={{
                    left: `${((tuningAnalysis.cents + 50) / 100) * 100}%`
                  }}
                ></div>
              )}
            </div>

            {/* Status text badge */}
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {tuningAnalysis ? (
                  tuningAnalysis.isInTune ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Parfaitement accordé</span>
                    </span>
                  ) : tuningAnalysis.isFlat ? (
                    <span className="text-cyan-400 font-semibold">
                      Trop bas : tendez la corde
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold">
                      Trop haut : détendez la corde
                    </span>
                  )
                ) : (
                  <span className="text-gray-500">
                    {isListening ? 'Écoute active...' : 'Microphone en attente'}
                  </span>
                )}
              </div>

              {tuningAnalysis && (
                <span className="font-mono text-xs font-bold text-gray-300">
                  {tuningAnalysis.rawCents > 0 ? `+${tuningAnalysis.rawCents}` : tuningAnalysis.rawCents} cents
                </span>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Strings Matrix Card */}
      <div className="bg-[#111113] border border-[#222225] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-white">
              Cordes de {currentInstrument.name}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Cliquez sur une corde pour cibler l'accordage ou écouter sa note
            </p>
          </div>

          {playingStringId && (
            <button
              type="button"
              onClick={stopReferenceTone}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-semibold hover:bg-rose-600/30 transition-colors"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Arrêter le son</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5">
          {currentInstrument.strings.map((str) => {
            const isSelected = selectedStringId === str.id;
            const isPlaying = playingStringId === str.id;
            const isMatched = tuningAnalysis?.matchedString?.id === str.id;

            return (
              <div
                key={str.id}
                onClick={() => {
                  if (selectedStringId === str.id) {
                    setSelectedStringId(null);
                  } else {
                    setSelectedStringId(str.id);
                  }
                }}
                className={`relative p-2.5 sm:p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500/30'
                    : isMatched
                    ? 'bg-[#18181C] border-blue-500/40 text-gray-200'
                    : 'bg-[#141416] border-[#222225] hover:border-[#333] text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-gray-400">
                    Corde {str.stringNumber}
                  </span>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playReferenceTone(str);
                    }}
                    className={`p-1 rounded-md transition-colors ${
                      isPlaying
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : 'bg-[#1F1F23] hover:bg-blue-600 text-gray-300 hover:text-white'
                    }`}
                    title="Écouter la note de référence"
                  >
                    {isPlaying ? (
                      <VolumeX className="w-3 h-3" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold font-mono text-white">
                    {str.noteName}{str.octave}
                  </span>
                  <span className="text-xs text-blue-400 font-semibold">
                    {str.frenchName}
                  </span>
                </div>

                <div className="mt-1 text-[11px] font-mono text-gray-500">
                  {str.frequency.toFixed(1)} Hz
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
