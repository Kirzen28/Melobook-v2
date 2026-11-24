import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, X, Download, Copy, Check, KeyRound } from 'lucide-react';

interface GuestQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  libraryName: string;
  guestEnabled?: boolean;
}

export const GuestQrCodeModal: React.FC<GuestQrCodeModalProps> = ({
  isOpen,
  onClose,
  code,
  libraryName,
  guestEnabled = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' && code
      ? `${window.location.origin}/?inviteCode=${encodeURIComponent(code)}`
      : code;

  useEffect(() => {
    if (!isOpen || !shareUrl) return;
    let cancelled = false;
    QRCode.toDataURL(shareUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#09090B', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, shareUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !code) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  const safeFileSlug = (libraryName || 'bibliotheque')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#121215] border border-[#282832] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3.5 border-b border-[#22222A] flex items-center justify-between gap-2 bg-[#16161B]">
          <div className="flex items-center gap-2 min-w-0">
            <QrCode className="w-4 h-4 shrink-0 text-blue-400" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                QR Code de la bibliothèque
              </h3>
              <p className="text-[11px] text-gray-400 truncate">{libraryName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#22222A] transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center text-center space-y-4">
          <div className="p-3 rounded-2xl bg-white shadow-lg">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${libraryName}`}
                className="w-56 h-56 block"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-gray-500">
                Génération...
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B0B0E] border border-[#2A2A35]">
            <KeyRound className="w-3.5 h-3.5 shrink-0 text-blue-400" />
            <span className="text-[11px] text-gray-400">
              Code bibliothèque :
            </span>
            <span className="font-mono font-bold text-xs tracking-wider select-all text-blue-300">
              {code}
            </span>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            {guestEnabled
              ? `Scannez ce QR code pour consulter « ${libraryName} » directement en lecture seule (sans compte), ou créez un compte pour rejoindre l'équipe.`
              : `Scannez ce QR code pour créer un compte et rejoindre « ${libraryName} ». Activez l'accès visiteur si vous souhaitez aussi autoriser la consultation sans compte.`}
          </p>

          <div className="w-full grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className="py-2 px-3 rounded-xl bg-[#1C1C22] hover:bg-[#26262F] text-gray-200 border border-[#32323D] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {isLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isLinkCopied ? 'Lien copié' : 'Copier le lien'}</span>
            </button>

            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`qr-bibliotheque-${safeFileSlug || 'melobook'}.png`}
                className="py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border-blue-500/30"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
