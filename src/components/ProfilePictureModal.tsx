import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  RotateCcw, 
  Check, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  ZoomIn, 
  Image as ImageIcon,
  User as UserIcon,
  SwitchCamera
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfilePictureModal: React.FC<ProfilePictureModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    currentUser, 
    uploadProfilePicture, 
    removeProfilePicture, 
    showNotification 
  } = useApp();

  // 'choice' | 'camera' | 'preview'
  const [mode, setMode] = useState<'choice' | 'camera' | 'preview'>('choice');
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputFallbackRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode('choice');
      setSelectedImageSrc(null);
      setIsUploading(false);
      setCameraError(null);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    }
  }, [isOpen, stopCamera]);

  // Check available cameras
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {});
    }
  }, []);

  // Start device camera
  const startCamera = async (facing: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    stopCamera();
    setMode('camera');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("La caméra en direct n'est pas supportée sur ce navigateur. Vous pouvez utiliser le sélecteur natif.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 720 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Play video failed:', e));
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      let msg = "Impossible d'accéder à la caméra.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Autorisation d'accès à la caméra refusée. Veuillez vérifier les permissions de votre navigateur.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "Aucune caméra détectée sur votre appareil.";
      }
      setCameraError(msg);
    }
  };

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture frame from live video
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Create a square capture centered on video
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startX = ((video.videoWidth || size) - size) / 2;
    const startY = ((video.videoHeight || size) - size) / 2;

    // Flip horizontal if front camera for mirror feel
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, size, size, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    stopCamera();
    setSelectedImageSrc(dataUrl);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setMode('preview');
  };

  // Process chosen file from file picker or camera fallback
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      stopCamera();
      setSelectedImageSrc(result);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
      setMode('preview');
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be picked again if desired
    e.target.value = '';
  };

  // Render finalized cropped avatar blob
  const generateCroppedBlob = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!selectedImageSrc) {
        return reject(new Error('Aucune image sélectionnée'));
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetSize = 512; // 512x512 crisp avatar
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Erreur canvas'));

        ctx.fillStyle = '#0E0E10';
        ctx.fillRect(0, 0, targetSize, targetSize);

        // Calculate aspect fill
        const aspect = img.width / img.height;
        let drawWidth = targetSize;
        let drawHeight = targetSize;

        if (aspect > 1) {
          drawWidth = targetSize * aspect;
        } else {
          drawHeight = targetSize / aspect;
        }

        // Apply zoom and user pan
        drawWidth *= zoomLevel;
        drawHeight *= zoomLevel;

        const posX = (targetSize - drawWidth) / 2 + panPosition.x;
        const posY = (targetSize - drawHeight) / 2 + panPosition.y;

        ctx.drawImage(img, posX, posY, drawWidth, drawHeight);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Impossible de générer le fichier'));
        }, 'image/jpeg', 0.88);
      };
      img.onerror = () => reject(new Error('Erreur de chargement image'));
      img.src = selectedImageSrc;
    });
  };

  // Upload to Firebase Storage
  const handleSaveProfilePicture = async () => {
    if (!selectedImageSrc) return;
    setIsUploading(true);

    try {
      const croppedBlob = await generateCroppedBlob();
      await uploadProfilePicture(croppedBlob);
      onClose();
    } catch (err: any) {
      console.error('Erreur sauvegarde photo de profil:', err);
      showNotification('Erreur lors du téléversement de la photo', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove existing photo
  const handleRemovePhoto = async () => {
    if (!window.confirm('Voulez-vous réinitialiser votre photo de profil ?')) return;
    setIsUploading(true);
    try {
      await removeProfilePicture();
      onClose();
    } catch (e) {
      showNotification('Erreur lors de la suppression', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Mouse / Touch drag to pan image
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - panPosition.x,
        y: e.touches[0].clientY - panPosition.y
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    setPanPosition({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y
    });
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Photo de profil"
    >
      <div 
        className="w-full max-w-md bg-[#121215] border border-[#26262E] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#222228] bg-[#16161B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Photo de profil
              </h3>
              <p className="text-[11px] text-gray-400">
                Stockée en toute sécurité sur Firebase Storage
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#202026] hover:bg-[#2C2C34] text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputFallbackRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Body content based on Mode */}
        <div className="p-5 flex-1 flex flex-col items-center justify-center">

          {/* MODE 1: CHOICE (INITIAL) */}
          {mode === 'choice' && (
            <div className="w-full space-y-5 text-center">
              {/* Current Avatar View */}
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 shadow-xl">
                  <div className="w-full h-full rounded-full bg-[#18181D] overflow-hidden flex items-center justify-center border-2 border-[#121215]">
                    {currentUser?.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt={currentUser.displayName || 'Profil'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-3xl font-bold text-blue-300">
                        {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : <UserIcon className="w-10 h-10 text-gray-400" />}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center mt-1">
                  <p className="font-semibold text-sm text-white">{currentUser?.displayName || 'Musicien'}</p>
                  <p className="text-xs text-gray-400">{currentUser?.email || 'Compte utilisateur'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Take Photo with Camera */}
                <button
                  type="button"
                  onClick={() => startCamera('user')}
                  className="p-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-md hover:shadow-blue-900/30 cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-white" />
                  <span>Prendre une photo</span>
                </button>

                {/* Pick from Files / Gallery */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-xl bg-[#1E1E26] hover:bg-[#282834] text-gray-200 hover:text-white font-semibold text-xs border border-[#30303D] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-blue-400" />
                  <span>Choisir un fichier</span>
                </button>
              </div>

              {/* Native mobile camera shortcut */}
              <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#202028]">
                <button
                  type="button"
                  onClick={() => cameraInputFallbackRef.current?.click()}
                  className="text-[11px] text-gray-400 hover:text-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Appareil photo natif (mobile)</span>
                </button>

                {currentUser?.photoURL && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUploading}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer la photo actuelle</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MODE 2: LIVE CAMERA VIEWFINDER */}
          {mode === 'camera' && (
            <div className="w-full flex flex-col items-center space-y-4">
              {cameraError ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center space-y-3 w-full">
                  <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
                  <p>{cameraError}</p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => cameraInputFallbackRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Utiliser l'appareil photo du système
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('choice')}
                      className="px-3 py-1.5 rounded-lg bg-[#202026] hover:bg-[#2C2C34] text-gray-300 text-xs transition-colors cursor-pointer"
                    >
                      Retour
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Camera Viewport with circular avatar overlay */}
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                    />
                    {/* Crosshair guide */}
                    <div className="absolute inset-0 pointer-events-none rounded-full border border-white/20 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-blue-400/80 rounded-full" />
                    </div>
                  </div>

                  {/* Camera Controls */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setMode('choice');
                      }}
                      className="p-3 rounded-full bg-[#1C1C24] hover:bg-[#282832] text-gray-300 border border-[#333] transition-colors cursor-pointer"
                      title="Annuler"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>

                    {/* Shutter Button */}
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="w-16 h-16 rounded-full bg-white hover:bg-gray-200 border-4 border-blue-500 shadow-lg flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                      title="Prendre la photo"
                    >
                      <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </button>

                    {/* Switch Front / Back Camera */}
                    {hasMultipleCameras && (
                      <button
                        type="button"
                        onClick={handleToggleFacingMode}
                        className="p-3 rounded-full bg-[#1C1C24] hover:bg-[#282832] text-gray-300 border border-[#333] transition-colors cursor-pointer"
                        title="Changer de caméra (avant/arrière)"
                      >
                        <SwitchCamera className="w-5 h-5 text-blue-400" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* MODE 3: PREVIEW & ADJUST CROP */}
          {mode === 'preview' && selectedImageSrc && (
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-300">
                  Aperçu de votre photo de profil
                </p>
                <p className="text-[11px] text-gray-500">
                  Faites glisser pour recentrer et utilisez le zoom
                </p>
              </div>

              {/* Interactive Crop Frame */}
              <div 
                className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 border-emerald-500 shadow-2xl bg-[#0E0E12] cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={selectedImageSrc}
                  alt="Aperçu"
                  className="absolute pointer-events-none transition-transform"
                  style={{
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  draggable={false}
                />
              </div>

              {/* Zoom Slider */}
              <div className="w-full max-w-xs space-y-1.5 px-2">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                    Zoom :
                  </span>
                  <span className="font-mono text-blue-300 font-bold">{Math.round(zoomLevel * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.05}
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#25252C] rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="w-full flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setSelectedImageSrc(null);
                    setMode('choice');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#1E1E26] hover:bg-[#282834] text-gray-300 font-semibold text-xs border border-[#333] transition-colors cursor-pointer"
                >
                  Changer
                </button>

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleSaveProfilePicture}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-900/30 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Téléversement vers Firebase...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Enregistrer la photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
