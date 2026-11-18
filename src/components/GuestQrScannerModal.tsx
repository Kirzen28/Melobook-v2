import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  X,
  Camera,
  Upload,
  AlertCircle,
  RefreshCw,
  SwitchCamera,
  QrCode
} from 'lucide-react';
import { extractGuestCodeFromQr } from '../utils/guestCodeParser';

interface GuestQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanCode: (guestCode: string) => void;
}

export const GuestQrScannerModal: React.FC<GuestQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanCode
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastInvalidWarningRef = useRef<number>(0);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'error'>('starting');
  const [errorText, setErrorText] = useState<string>('');
  const [scanFeedback, setScanFeedback] = useState<string>('');

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDecodedText = useCallback(
    (rawText: string, source: 'camera' | 'image') => {
      const code = extractGuestCodeFromQr(rawText);
      if (code) {
        stopCamera();
        onScanCode(code);
        return true;
      }

      if (source === 'image') {
        setScanFeedback("Ce QR code ne contient pas de code d'accès invité Melobook valide.");
      } else {
        const now = Date.now();
        if (now - lastInvalidWarningRef.current > 2000) {
          lastInvalidWarningRef.current = now;
          setScanFeedback("QR code détecté, mais aucun code invité Melobook n'y figure.");
        }
      }
      return false;
    },
    [onScanCode, stopCamera]
  );

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanFeedback('');
      setErrorText('');
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      stopCamera();
      setCameraState('starting');
      setErrorText('');
      setScanFeedback('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('error');
        setErrorText("La caméra n'est pas disponible sur ce navigateur. Importez une image de QR code ci-dessous.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode === 'environment' ? { ideal: 'environment' } : 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        if (cancelled) return;
        setCameraState('active');

        let lastScanAt = 0;
        const tick = (ts: number) => {
          if (cancelled || !videoRef.current || !streamRef.current) return;

          if (ts - lastScanAt >= 90 && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            lastScanAt = ts;
            const v = videoRef.current;
            const width = v.videoWidth;
            const height = v.videoHeight;

            if (width > 0 && height > 0) {
              if (!canvasRef.current) {
                canvasRef.current = document.createElement('canvas');
              }
              const canvas = canvasRef.current;
              if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
              }
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(v, 0, 0, width, height);
                const imgData = ctx.getImageData(0, 0, width, height);
                const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: 'attemptBoth'
                });
                if (decoded?.data) {
                  const matched = handleDecodedText(decoded.data, 'camera');
                  if (matched) return;
                }
              }
            }
          }

          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (err: any) {
        if (cancelled) return;
        setCameraState('error');
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorText("Accès à la caméra refusé. Autorisez la caméra ou importez une image du QR code.");
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorText("Aucune caméra détectée sur cet appareil. Importez une image du QR code ci-dessous.");
        } else {
          setErrorText("Impossible de démarrer la caméra. Vous pouvez importer une image du QR code.");
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, facingMode, stopCamera, handleDecodedText]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setScanFeedback('');

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = canvasRef.current || document.createElement('canvas');
          canvasRef.current = canvas;
          const maxDim = 1600;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            setScanFeedback("Impossible de lire l'image sélectionnée.");
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (!decoded?.data) {
            setScanFeedback("Aucun QR code détecté dans cette image.");
            return;
          }
          handleDecodedText(decoded.data, 'image');
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setScanFeedback("Impossible de charger cette image.");
      };
      img.src = objectUrl;
    } catch {
      setScanFeedback("Erreur lors de la lecture de l'image.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner un QR code invité"
    >
      <div className="w-full max-w-md bg-[#121215] border border-[#282832] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3.5 bg-[#16161B] border-b border-[#24242E] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <QrCode className="w-4 h-4 text-cyan-400 shrink-0" />
            <h3 className="text-sm font-bold text-white truncate">
              Scanner un QR code invité
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {cameraState === 'active' && (
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                className="p-1.5 rounded-lg bg-[#1E1E26] hover:bg-[#2A2A35] text-gray-300 hover:text-white border border-[#30303C] transition-colors cursor-pointer"
                title="Changer de caméra"
                aria-label="Changer de caméra"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-[#1E1E26] hover:bg-[#2A2A35] text-gray-300 hover:text-white border border-[#30303C] transition-colors cursor-pointer"
              aria-label="Fermer le scanner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5">
          {/* Camera Preview Box */}
          <div className="relative aspect-square max-h-[300px] w-full mx-auto rounded-xl overflow-hidden bg-[#09090B] border border-[#262630] flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${cameraState === 'active' ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Viewfinder corners when active */}
            {cameraState === 'active' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 relative rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-cyan-400 rounded-tl-lg" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-cyan-400 rounded-tr-lg" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-cyan-400 rounded-bl-lg" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-cyan-400 rounded-br-lg" />
                </div>
              </div>
            )}

            {cameraState === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs p-4 text-center">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Démarrage de la caméra...</span>
              </div>
            )}

            {cameraState === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-center p-5">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Camera className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-300 leading-relaxed max-w-xs">
                  {errorText}
                </p>
              </div>
            )}
          </div>

          {scanFeedback && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{scanFeedback}</span>
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            Pointez la caméra vers le QR code d'accès invité partagé par le propriétaire de la bibliothèque.
          </p>

          {/* Upload QR image fallback */}
          <div className="pt-1 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 rounded-xl bg-[#1A1A22] hover:bg-[#24242E] text-gray-200 border border-[#2E2E3A] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Importer une image QR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="py-2 px-3.5 rounded-xl bg-[#18181D] hover:bg-[#22222A] text-gray-400 hover:text-white border border-[#282832] text-xs font-medium transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
