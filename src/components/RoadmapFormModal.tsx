import React, { useEffect, useRef, useState } from 'react';
import { X, Bug, Lightbulb, ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { RoadmapCategory, RoadmapItem } from '../types';
import {
  ROADMAP_DESCRIPTION_MAX,
  ROADMAP_MAX_IMAGES,
  ROADMAP_TITLE_MAX,
  compressRoadmapImage
} from '../utils/roadmapUtils';
import { createRoadmapItem, updateRoadmapItemContent } from '../services/roadmapService';
import { useApp } from '../context/AppContext';

interface RoadmapFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: RoadmapItem | null;
}

export const RoadmapFormModal: React.FC<RoadmapFormModalProps> = ({
  isOpen,
  onClose,
  editingItem
}) => {
  const { currentUser, firebaseUser, showNotification } = useApp();

  const [category, setCategory] = useState<RoadmapCategory>('idea');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setCategory(editingItem.category);
      setTitle(editingItem.title);
      setDescription(editingItem.description);
      setImages(Array.isArray(editingItem.images) ? [...editingItem.images] : []);
    } else {
      setCategory('idea');
      setTitle('');
      setDescription('');
      setImages([]);
    }
    setErrorMsg('');
    setIsCompressing(false);
    setIsSubmitting(false);
  }, [isOpen, editingItem]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = ROADMAP_MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      setErrorMsg(`Maximum ${ROADMAP_MAX_IMAGES} images par publication.`);
      return;
    }

    setErrorMsg('');
    setIsCompressing(true);
    try {
      const selected = Array.from(files).slice(0, remainingSlots);
      const compressed: string[] = [];
      for (const file of selected) {
        const dataUrl = await compressRoadmapImage(file);
        compressed.push(dataUrl);
      }
      setImages((prev) => [...prev, ...compressed].slice(0, ROADMAP_MAX_IMAGES));
    } catch (err: any) {
      setErrorMsg(err?.message || "Impossible d'ajouter une image.");
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const uid = firebaseUser?.uid || currentUser?.uid;
    if (!uid) {
      setErrorMsg('Vous devez être connecté pour publier.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Veuillez saisir un titre.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Veuillez décrire votre idée ou le bug rencontré.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateRoadmapItemContent(editingItem.id, {
          title,
          description,
          category,
          images
        });
        showNotification('Publication mise à jour', 'success');
      } else {
        await createRoadmapItem({
          title,
          description,
          category,
          images,
          author: {
            uid,
            displayName: currentUser?.displayName || firebaseUser?.displayName || 'Musicien',
            photoURL: currentUser?.photoURL || null
          }
        });
        showNotification('Publication ajoutée à la Roadmap', 'success');
      }
      onClose();
    } catch (err: any) {
      let msg = "Erreur lors de l'enregistrement.";
      try {
        const parsed = JSON.parse(err?.message || '');
        if (parsed?.error) msg = parsed.error;
      } catch {
        if (err?.message) msg = err.message;
      }
      setErrorMsg(msg);
      showNotification("Impossible d'enregistrer la publication", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => !isSubmitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="roadmap-form-title"
    >
      <div
        className="w-full max-w-xl bg-[#111112] border border-[#222224] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#222224] flex items-center justify-between">
          <h2 id="roadmap-form-title" className="text-base font-semibold text-white">
            {editingItem ? 'Modifier la publication' : 'Proposer une idée ou signaler un bug'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C1C1E] transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Category segmented control */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Catégorie
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0A0A0B] border border-[#222224] rounded-xl">
              <button
                type="button"
                onClick={() => setCategory('idea')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  category === 'idea'
                    ? 'bg-[#1C1C1E] text-blue-400 border border-[#333]'
                    : 'text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Idée / Fonctionnalité</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory('bug')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  category === 'bug'
                    ? 'bg-[#1C1C1E] text-amber-400 border border-[#333]'
                    : 'text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Bug / Anomalie</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="roadmap-title-input" className="text-xs font-medium text-gray-400">
                Titre
              </label>
              <span className="text-[11px] font-mono tabular-nums text-gray-500">
                {title.length}/{ROADMAP_TITLE_MAX}
              </span>
            </div>
            <input
              id="roadmap-title-input"
              type="text"
              value={title}
              maxLength={ROADMAP_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                category === 'bug'
                  ? 'Ex : Décalage des accords lors du défilement auto'
                  : 'Ex : Mode sombre pour la vue PDF exportée'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0B] border border-[#222224] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="roadmap-desc-input" className="text-xs font-medium text-gray-400">
                Description
              </label>
              <span className="text-[11px] font-mono tabular-nums text-gray-500">
                {description.length}/{ROADMAP_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="roadmap-desc-input"
              value={description}
              maxLength={ROADMAP_DESCRIPTION_MAX}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={
                category === 'bug'
                  ? 'Décrivez comment reproduire le problème, sur quel appareil et ce qui était attendu...'
                  : 'Expliquez votre besoin et comment cette amélioration aiderait votre équipe...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0B] border border-[#222224] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-y min-h-[100px]"
              required
            />
          </div>

          {/* Images (up to 3) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-400">
                Captures / Images (optionnel)
              </span>
              <span className="text-[11px] font-mono tabular-nums text-gray-500">
                {images.length}/{ROADMAP_MAX_IMAGES}
              </span>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                {images.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-lg overflow-hidden border border-[#222224] bg-[#0A0A0B] group"
                  >
                    <img
                      src={src}
                      alt={`Aperçu ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/75 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                      aria-label={`Supprimer l'image ${idx + 1}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < ROADMAP_MAX_IMAGES && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-[#33333A] bg-[#0A0A0B] hover:border-blue-500/60 hover:bg-[#141417] text-xs font-medium text-gray-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isCompressing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Optimisation de l'image...</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4 text-blue-400" />
                      <span>
                        Ajouter jusqu'à {ROADMAP_MAX_IMAGES - images.length} image
                        {ROADMAP_MAX_IMAGES - images.length > 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-500/30 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#222224]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-300 hover:text-white bg-[#1C1C1E] hover:bg-[#262629] border border-[#2C2C32] transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingItem ? 'Enregistrer' : 'Publier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
