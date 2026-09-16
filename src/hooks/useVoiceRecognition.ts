import { useState, useEffect, useRef, useCallback } from 'react';

// Interfaces pour l'API Web Speech
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      length: number;
      item(index: number): {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
    [index: number]: {
      length: number;
      item(index: number): {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onaudiostart: ((ev: Event) => void) | null;
  onaudioend: ((ev: Event) => void) | null;
  onspeechstart: ((ev: Event) => void) | null;
  onspeechend: ((ev: Event) => void) | null;
}

interface UseVoiceRecognitionOptions {
  language?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onCommand?: (finalTranscript: string) => void;
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const { language = 'fr-FR', onResult, onError, onCommand } = options;

  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isHandsFree, setIsHandsFree] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('voice_hands_free_mode') === 'true';
  });
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string>(language);
  const [isSoundDetected, setIsSoundDetected] = useState<boolean>(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);
  const isHandsFreeRef = useRef<boolean>(isHandsFree);
  const restartTimerRef = useRef<number | null>(null);

  // Maintient la ref à jour avec le mode mains libres
  useEffect(() => {
    isHandsFreeRef.current = isHandsFree;
    try {
      localStorage.setItem('voice_hands_free_mode', isHandsFree ? 'true' : 'false');
    } catch {
      // Ignorer si localStorage est inaccessible
    }
  }, [isHandsFree]);

  // Vérifier le support de l'API Web Speech au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const createRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = activeLanguage;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMessage(null);
    };

    recognition.onspeechstart = () => {
      setIsSoundDetected(true);
    };

    recognition.onspeechend = () => {
      setIsSoundDetected(false);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let currentInterim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0]?.transcript || '';

        if (result.isFinal) {
          currentFinal += text;
        } else {
          currentInterim += text;
        }
      }

      const trimmedInterim = currentInterim.trim();
      const trimmedFinal = currentFinal.trim();

      if (trimmedInterim) {
        setInterimTranscript(trimmedInterim);
        onResult?.(trimmedInterim, false);
      }

      if (trimmedFinal) {
        setFinalTranscript(trimmedFinal);
        setInterimTranscript('');
        onResult?.(trimmedFinal, true);
        onCommand?.(trimmedFinal);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      // Les erreurs "no-speech" ou "aborted" sont courantes lors de silences normaux
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      let userMsg = "Erreur de reconnaissance vocale.";
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        userMsg = "Accès au microphone refusé. Veuillez autoriser l'accès au micro dans votre navigateur.";
      } else if (event.error === 'network') {
        userMsg = "Problème réseau lors de la reconnaissance vocale.";
      }

      setErrorMessage(userMsg);
      onError?.(userMsg);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsSoundDetected(false);

      // Si le mode mains libres est activé et que l'utilisateur n'a pas appuyé sur "Stop",
      // on relance automatiquement l'écoute après un bref délai pour garantir la continuité
      if (isHandsFreeRef.current && !isManuallyStoppedRef.current) {
        if (restartTimerRef.current) {
          window.clearTimeout(restartTimerRef.current);
        }
        restartTimerRef.current = window.setTimeout(() => {
          try {
            if (recognitionRef.current && !isManuallyStoppedRef.current) {
              recognitionRef.current.start();
            }
          } catch {
            // Ignorer si déjà démarré
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [activeLanguage, onCommand, onError, onResult]);

  // Démarrer l'écoute
  const startListening = useCallback((enableHandsFree = false) => {
    setErrorMessage(null);
    isManuallyStoppedRef.current = false;

    if (enableHandsFree) {
      setIsHandsFree(true);
      isHandsFreeRef.current = true;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignorer
        }
      }

      const instance = createRecognition();
      if (!instance) {
        setErrorMessage("La reconnaissance vocale Web Speech n'est pas disponible sur ce navigateur.");
        return;
      }

      recognitionRef.current = instance;
      instance.start();
      setIsListening(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible de démarrer l'écoute vocale";
      setErrorMessage(msg);
      setIsListening(false);
    }
  }, [createRecognition]);

  // Arrêter l'écoute
  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignorer
      }
    }
    setIsListening(false);
    setIsSoundDetected(false);
    setInterimTranscript('');
  }, []);

  // Basculer le mode mains libres
  const toggleHandsFree = useCallback(() => {
    setIsHandsFree(prev => {
      const next = !prev;
      isHandsFreeRef.current = next;
      if (next && !isListening) {
        startListening(true);
      }
      return next;
    });
  }, [isListening, startListening]);

  // Changer de langue (ex: fr-FR, en-US, es-ES)
  const changeLanguage = useCallback((newLang: string) => {
    setActiveLanguage(newLang);
    if (isListening) {
      stopListening();
      window.setTimeout(() => {
        startListening(isHandsFree);
      }, 200);
    }
  }, [isHandsFree, isListening, startListening, stopListening]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      isManuallyStoppedRef.current = true;
      if (restartTimerRef.current) {
        window.clearTimeout(restartTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignorer
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    isHandsFree,
    isSoundDetected,
    interimTranscript,
    finalTranscript,
    errorMessage,
    activeLanguage,
    startListening,
    stopListening,
    toggleHandsFree,
    changeLanguage,
    setInterimTranscript
  };
}
