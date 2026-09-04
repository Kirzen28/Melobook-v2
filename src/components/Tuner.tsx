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
  Music,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Radio,
  Lock,
  ArrowRight
} from 'lucide-react';

export interface TunerErrorInfo {
  type: 'not_allowed' | 'not_found' | 'not_readable' | 'security' | 'unsupported' | 'generic';
  title: string;
  description: string;
  steps: string[];
}

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
  const [detectedFrequency, setDetectedFrequency] = useState<number | null>(null);
  const [selectedStringId, setSelectedStringId] = useState<string | null>(null);
  const [playingStringId, setPlayingStringId] = useState<string | null>(null);
  const [a4Reference, setA4Reference] = useState<number>(440);

  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<TunerErrorInfo | null>(null);
  const [hasAttemptedMic, setHasAttemptedMic] = useState<boolean>(false);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

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

  useEffect(() => {
    let permStatus: PermissionStatus | null = null;
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          permStatus = status;
          setPermissionState(status.state as 'prompt' | 'granted' | 'denied');
          status.onchange = () => {
            setPermissionState(status.state as 'prompt' | 'granted' | 'denied');
            if (status.state === 'granted') {
              setErrorDetails(null);
            }
          };
        })
        .catch(() => {
          // Permissions query not supported on this browser
        });
    }
    return () => {
      if (permStatus) {
        permStatus.onchange = null;
      }
    };
  }, []);

  const startListening = async () => {
    try {
      setIsRequestingPermission(true);
      setErrorDetails(null);
      setHasAttemptedMic(true);
      stopReferenceTone();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('UNSUPPORTED_MEDIA_DEVICES');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false
          } 
        });
      } catch (constraintErr: any) {
        if (
          constraintErr.name === 'OverconstrainedError' ||
          constraintErr.name === 'ConstraintNotSatisfiedError'
        ) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw constraintErr;
        }
      }

      mediaStreamRef.current = stream;
      setPermissionState('granted');

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
      setIsRequestingPermission(false);

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
      setIsListening(false);
      setIsRequestingPermission(false);

      const errName = err?.name || '';
      const errMsg = String(err?.message || '');

      if (
        errName === 'NotAllowedError' || 
        errName === 'PermissionDeniedError' || 
        errMsg.toLowerCase().includes('permission denied') ||
        errMsg.toLowerCase().includes('not allowed')
      ) {
        setPermissionState('denied');
        setErrorDetails({
          type: 'not_allowed',
          title: "Accès au microphone bloqué par le navigateur",
          description: "Le navigateur ou le système a empêché Melobook d'accéder au microphone.",
          steps: [
            "Cliquez sur l'icône de réglages ou de cadenas située à gauche de votre barre d'adresse",
            "Dans les permissions accordées à ce site, modifiez l'option Microphone sur Autoriser",
            "Cliquez sur le bouton Réessayer ci-dessous pour relancer l'accordeur"
          ]
        });
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorDetails({
          type: 'not_found',
          title: "Aucun microphone détecté",
          description: "Aucun périphérique audio d'entrée n'a été trouvé sur cet appareil.",
          steps: [
            "Branchez un microphone externe ou vérifiez votre micro intégré",
            "Assurez-vous que le microphone est activé dans les réglages système de votre appareil",
            "Cliquez sur Réessayer une fois votre microphone connecté"
          ]
        });
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setErrorDetails({
          type: 'not_readable',
          title: "Microphone inaccessible ou déjà utilisé",
          description: "Le matériel audio ne peut pas démarrer car une autre application utilise déjà le micro.",
          steps: [
            "Fermez les applications utilisant le microphone comme les visioconférences ou enregistreurs audio",
            "Débranchez puis reconnectez votre micro si vous utilisez un périphérique externe",
            "Cliquez sur Réessayer"
          ]
        });
      } else if (errName === 'SecurityError' || errMsg.toLowerCase().includes('security')) {
        setErrorDetails({
          type: 'security',
          title: "Restriction de sécurité du conteneur",
          description: "L'accès au microphone est interdit dans ce cadre d'affichage ou requiert une connexion sécurisée.",
          steps: [
            "Ouvrez l'application dans un nouvel onglet complet à l'aide du bouton dédié ci-dessous",
            "Assurez-vous que votre adresse web utilise le protocole sécurisé HTTPS"
          ]
        });
      } else if (errMsg === 'UNSUPPORTED_MEDIA_DEVICES') {
        setPermissionState('unsupported');
        setErrorDetails({
          type: 'unsupported',
          title: "Navigateur non compatible avec la capture audio",
          description: "Votre navigateur ne prend pas en charge l'API standard requise pour la détection sonore.",
          steps: [
            "Utilisez un navigateur récent comme Chrome, Edge, Firefox ou Safari",
            "Vous pouvez accorder votre instrument à l'oreille grâce aux notes de référence ci-dessous"
          ]
        });
      } else {
        setErrorDetails({
          type: 'generic',
          title: "Impossible d'accéder au microphone",
          description: errMsg || "Une erreur inattendue est survenue lors de l'accès au microphone.",
          steps: [
            "Vérifiez les autorisations de votre navigateur pour ce site",
            "Cliquez sur le bouton Réessayer ci-dessous"
          ]
        });
      }
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
    <div className="max-w-xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
      {/* Compact Main Tuner Card */}
      <div 
        id="tuner-main-card"
        className={`relative rounded-2xl p-4 sm:p-5 shadow-xl transition-all duration-200 overflow-hidden bg-[#111114] border ${
          isListening 
            ? 'border-blue-500/50 shadow-blue-950/20' 
            : errorDetails 
            ? 'border-rose-500/40 shadow-rose-950/20' 
            : 'border-[#222228]'
        }`}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#1E1E24]">
          {/* Instrument Selector */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Gauge className="w-3.5 h-3.5" />
            </div>
            <div className="relative">
              <select
                value={selectedInstrumentId}
                onChange={(e) => setSelectedInstrumentId(e.target.value)}
                className="appearance-none bg-[#18181D] border border-[#2A2A32] hover:border-[#383844] text-white text-xs font-semibold rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
              >
                {TUNER_INSTRUMENTS.map((inst) => (
                  <option key={inst.id} value={inst.id} className="bg-[#141417]">
                    {inst.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {selectedStringId && (
              <button
                type="button"
                onClick={() => setSelectedStringId(null)}
                className="px-2 py-1 rounded-md bg-[#1C1C22] hover:bg-[#25252D] text-gray-300 hover:text-white border border-[#2E2E38] text-[11px] font-medium transition-colors cursor-pointer"
                title="Détection automatique"
              >
                Auto
              </button>
            )}
          </div>

          {/* Right actions: A4 tag and Mic toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block text-[11px] font-mono text-gray-400 bg-[#16161A] px-2 py-1 rounded border border-[#24242C]">
              440 Hz
            </span>

            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={isRequestingPermission}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : isRequestingPermission
                  ? 'bg-blue-700 text-blue-200 opacity-90 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Arrêter</span>
                </>
              ) : isRequestingPermission ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connexion...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Activer micro</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Central Display: Compact and Minimalist */}
        {errorDetails ? (
          <div className="py-2">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200">
              <div className="flex items-start gap-2.5 mb-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-white tracking-tight">
                    {errorDetails.title}
                  </h3>
                  <p className="text-[11px] text-rose-200/90 mt-0.5 leading-normal">
                    {errorDetails.description}
                  </p>
                </div>
              </div>

              {/* Steps (compact) */}
              <div className="bg-[#0E0E12]/80 rounded-lg p-2.5 border border-rose-500/15 mb-3">
                <ol className="space-y-1.5 text-[11px] text-gray-300">
                  {errorDetails.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 font-bold text-[10px] flex items-center justify-center shrink-0 border border-rose-500/30">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={startListening}
                  disabled={isRequestingPermission}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  <RefreshCw className={`w-3 h-3 ${isRequestingPermission ? 'animate-spin' : ''}`} />
                  <span>Réessayer</span>
                </button>

                {isInIframe && (
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C24] hover:bg-[#252530] text-white border border-[#30303E] text-xs font-medium transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3 text-blue-400" />
                    <span>Plein écran</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setErrorDetails(null)}
                  className="px-2.5 py-1.5 text-gray-400 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        ) : isListening ? (
          <div className="py-3 flex flex-col items-center justify-center">
            {/* Note and Octave display */}
            <div className="text-center min-h-[85px] flex flex-col items-center justify-center">
              {tuningAnalysis ? (
                <>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className={`text-5xl sm:text-6xl font-extrabold tracking-tight font-mono transition-colors ${
                      tuningAnalysis.isInTune
                        ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : tuningAnalysis.isFlat
                        ? 'text-cyan-400'
                        : 'text-amber-400'
                    }`}>
                      {tuningAnalysis.noteName}
                    </span>
                    <span className="text-2xl font-bold text-gray-400 font-mono">
                      {tuningAnalysis.octave}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-200">
                      {tuningAnalysis.frenchName}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="font-mono text-gray-400">
                      {tuningAnalysis.frequency.toFixed(1)} Hz
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-500 py-3">
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-blue-500/40 animate-spin mb-2" />
                  <p className="text-xs font-medium text-gray-300">
                    Jouez une note...
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Détection acoustique en temps réel
                  </p>
                </div>
              )}
            </div>

            {/* Precision Minimalist Gauge */}
            <div className="w-full max-w-sm mt-3">
              <div className="flex justify-between text-[10px] font-mono text-gray-500 px-1 mb-1">
                <span>-50</span>
                <span>-25</span>
                <span className="text-gray-300 font-bold">0</span>
                <span>+25</span>
                <span>+50</span>
              </div>

              {/* Gauge Track */}
              <div className="relative h-2.5 bg-[#18181E] rounded-full border border-[#272730] overflow-hidden">
                {/* Center target mark */}
                <div className="absolute top-0 bottom-0 left-[49%] right-[49%] bg-emerald-500/40 z-0" />

                {/* Gauge Indicator */}
                {tuningAnalysis && (
                  <div 
                    className={`absolute top-0 bottom-0 w-2 rounded-full -ml-1 transition-all duration-75 z-10 ${
                      tuningAnalysis.isInTune
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : tuningAnalysis.isFlat
                        ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                        : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                    }`}
                    style={{
                      left: `${((tuningAnalysis.cents + 50) / 100) * 100}%`
                    }}
                  />
                )}
              </div>

              {/* Tuning Status Badge */}
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <div>
                  {tuningAnalysis ? (
                    tuningAnalysis.isInTune ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <Check className="w-3 h-3" />
                        <span>Accordé</span>
                      </span>
                    ) : tuningAnalysis.isFlat ? (
                      <span className="text-cyan-400 font-semibold text-[11px] bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        Trop bas : tendez
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Trop haut : détendez
                      </span>
                    )
                  ) : (
                    <span className="text-gray-400 text-[11px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span>Écoute en cours</span>
                    </span>
                  )}
                </div>

                {tuningAnalysis && (
                  <span className="font-mono text-[11px] font-bold text-gray-300 bg-[#17171D] px-1.5 py-0.5 rounded border border-[#292934]">
                    {tuningAnalysis.rawCents > 0 ? `+${tuningAnalysis.rawCents}` : tuningAnalysis.rawCents} c
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Minimalist Idle State */
          <div className="py-5 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2.5">
              <Mic className="w-5 h-5" />
            </div>

            <p className="text-xs font-semibold text-gray-200">
              Prêt pour l'accordage
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 max-w-xs leading-normal">
              Activez le micro ou sélectionnez une corde ci-dessous pour jouer sa note
            </p>

            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={startListening}
                disabled={isRequestingPermission}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30 transition-all active:scale-95 cursor-pointer"
              >
                {isRequestingPermission ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Demande en cours...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Démarrer le micro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Compact Strings Row directly integrated into the card */}
        <div className="mt-3 pt-3 border-t border-[#1E1E24]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400">
              Cordes de {currentInstrument.name}
            </span>

            {playingStringId && (
              <button
                type="button"
                onClick={stopReferenceTone}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600/20 text-rose-400 border border-rose-500/30 text-[10px] font-semibold hover:bg-rose-600/30 transition-colors"
              >
                <VolumeX className="w-3 h-3" />
                <span>Arrêter le son</span>
              </button>
            )}
          </div>

          {/* Strings Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {currentInstrument.strings.map((str) => {
              const isSelected = selectedStringId === str.id;
              const isPlaying = playingStringId === str.id;
              const isMatched = tuningAnalysis?.matchedString?.id === str.id;

              return (
                <div
                  key={str.id}
                  onClick={() => {
                    setSelectedStringId(selectedStringId === str.id ? null : str.id);
                  }}
                  className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/30'
                      : isMatched
                      ? 'bg-[#18181E] border-blue-500/40 text-gray-200'
                      : 'bg-[#141417] border-[#222228] hover:border-[#32323C] text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                    <span>{str.stringNumber}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playReferenceTone(str);
                      }}
                      className={`p-0.5 rounded transition-colors ${
                        isPlaying
                          ? 'bg-emerald-600 text-white animate-pulse'
                          : 'hover:bg-blue-600 text-gray-400 hover:text-white'
                      }`}
                      title="Jouer la note"
                    >
                      {isPlaying ? (
                        <VolumeX className="w-3 h-3" />
                      ) : (
                        <Volume2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="font-mono font-bold text-sm text-white">
                    {str.noteName}{str.octave}
                  </div>
                  <div className="text-[10px] text-blue-400 font-medium leading-none mt-0.5">
                    {str.frenchName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
