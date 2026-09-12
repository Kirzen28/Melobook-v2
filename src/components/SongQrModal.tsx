import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { QrCode, X, Copy, Check, Share2, Smartphone, Music, Users, ExternalLink } from 'lucide-react';
import { Song, Group } from '../types';

interface SongQrModalProps {
  song: Song;
  onClose: () => void;
  currentGroup?: Group | null;
  transposedKey?: string;
}

export const SongQrModal: React.FC<SongQrModalProps> = ({
  song,
  onClose,
  currentGroup,
  transposedKey
}) => {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams();
    params.set('songId', song.id);
    if (song.groupId) {
      params.set('groupId', song.groupId);
    }
    return `${base}?${params.toString()}`;
  }, [song.id, song.groupId]);

  useEffect(() => {
    if (!canvasRef.current || !shareUrl) return;

    QRCode.toCanvas(canvasRef.current, shareUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    }).catch((err) => {
      console.error('Erreur QR Code :', err);
    });
  }, [shareUrl]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Erreur copie presse-papier :', e);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: song.title,
          text: `Partition de ${song.title}`,
          url: shareUrl,
        });
      } catch {
        // Utilisateur a annulé
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 select-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#141416] border border-[#2E2E34] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between border-b border-[#25252A] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Partager via QR Code</h3>
              <p className="text-xs text-gray-400">Accès rapide pour les musiciens du groupe</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25252A] transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Détails du morceau */}
        <div className="bg-[#1C1C20] p-3 rounded-xl border border-[#2B2B32] space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-white truncate">{song.title}</h4>
              {song.artist && (
                <p className="text-xs text-gray-400 truncate">{song.artist}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-[#121214] text-blue-400 border border-blue-500/30 font-semibold flex items-center gap-1">
                <Music className="w-3 h-3" />
                {transposedKey || song.key || 'C'}
              </span>
            </div>
          </div>

          {currentGroup && (
            <div className="pt-1.5 border-t border-[#26262E] flex items-center gap-1.5 text-[11px] text-gray-400">
              <Users className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">Groupe : <strong className="text-gray-200">{currentGroup.name}</strong></span>
            </div>
          )}
        </div>

        {/* Cadre du QR Code */}
        <div className="flex flex-col items-center justify-center pt-1 pb-2">
          <div className="p-3 bg-white rounded-xl shadow-lg border-2 border-white/90">
            <canvas ref={canvasRef} className="block rounded" />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 text-center px-4">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Scannez avec l'appareil photo de votre smartphone ou tablette pour ouvrir le chant</span>
          </div>
        </div>

        {/* Lien direct & Boutons d'action */}
        <div className="space-y-2 pt-1 border-t border-[#25252A]">
          <div className="flex items-center gap-2 bg-[#0F0F10] border border-[#26262D] rounded-lg px-2.5 py-1.5">
            <input 
              type="text" 
              readOnly 
              value={shareUrl}
              className="bg-transparent text-[11px] text-gray-300 font-mono flex-1 outline-hidden select-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-[#222228] hover:bg-[#2A2A32] text-gray-200'
              }`}
              title="Copier le lien"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Partager</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-[#1C1C20] hover:bg-[#26262C] text-gray-200 border-[#333]'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Lien copié dans le presse-papier' : 'Copier le lien direct'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
