import React, { useEffect, useState } from 'react';
import {
  X,
  Heart,
  MessageSquare,
  Pencil,
  Trash2,
  Bug,
  Lightbulb,
  Send,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2
} from 'lucide-react';
import { RoadmapComment, RoadmapItem, RoadmapStatus } from '../types';
import {
  ROADMAP_COLUMNS,
  ROADMAP_COMMENT_MAX,
  canChangeRoadmapStatus,
  canEditRoadmapItem,
  formatRoadmapDate,
  isMainAppAdmin
} from '../utils/roadmapUtils';
import {
  addRoadmapComment,
  deleteRoadmapComment,
  deleteRoadmapItem,
  subscribeRoadmapComments,
  toggleRoadmapLike,
  updateRoadmapItemStatus
} from '../services/roadmapService';
import { useApp } from '../context/AppContext';
import { UserAvatar } from '../utils/avatarPresets';

interface RoadmapDetailModalProps {
  item: RoadmapItem | null;
  isLiked: boolean;
  onClose: () => void;
  onEdit: (item: RoadmapItem) => void;
}

export const RoadmapDetailModal: React.FC<RoadmapDetailModalProps> = ({
  item,
  isLiked,
  onClose,
  onEdit
}) => {
  const { currentUser, firebaseUser, isGuest, exitGuestMode, showNotification } = useApp();

  const [comments, setComments] = useState<RoadmapComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const uid = firebaseUser?.uid || currentUser?.uid || null;
  const email = currentUser?.email || firebaseUser?.email || null;
  const canEdit = item ? canEditRoadmapItem(item, uid, isGuest) : false;
  const canChangeStatus = canChangeRoadmapStatus(email, isGuest);
  const isAdmin = !isGuest && isMainAppAdmin(email);
  const canDeletePost = Boolean(item && !isGuest && (item.authorId === uid || isAdmin));

  useEffect(() => {
    if (!item) {
      setComments([]);
      return;
    }
    setConfirmDeletePost(false);
    setLightboxIndex(null);
    setLoadingComments(true);

    const unsubscribe = subscribeRoadmapComments(
      item.id,
      (list) => {
        setComments(list);
        setLoadingComments(false);
      },
      () => {
        setLoadingComments(false);
      }
    );
    return () => unsubscribe();
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIndex !== null) {
          setLightboxIndex(null);
        } else {
          onClose();
        }
      } else if (lightboxIndex !== null && item.images.length > 1) {
        if (e.key === 'ArrowRight') {
          setLightboxIndex((prev) => (prev === null ? 0 : (prev + 1) % item.images.length));
        } else if (e.key === 'ArrowLeft') {
          setLightboxIndex((prev) =>
            prev === null ? 0 : (prev - 1 + item.images.length) % item.images.length
          );
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, lightboxIndex, onClose]);

  if (!item) return null;

  const currentStatusMeta =
    ROADMAP_COLUMNS.find((c) => c.id === item.status) || ROADMAP_COLUMNS[0];

  const handleToggleLike = async () => {
    if (isGuest || !uid) {
      showNotification('Connectez-vous pour voter sur cette publication', 'info');
      return;
    }
    if (isTogglingLike) return;
    setIsTogglingLike(true);
    try {
      await toggleRoadmapLike(item, uid, isLiked);
    } catch {
      showNotification('Impossible de mettre à jour le vote', 'error');
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleStatusChange = async (nextStatus: RoadmapStatus) => {
    if (!canChangeStatus || nextStatus === item.status || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await updateRoadmapItemStatus(item.id, nextStatus);
      showNotification('Statut mis à jour', 'success');
    } catch {
      showNotification(
        firebaseUser?.emailVerified === false
          ? "Vérifiez votre e-mail d'administrateur pour modifier les statuts"
          : 'Impossible de modifier le statut',
        'error'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeletePost = async () => {
    if (!canDeletePost || isDeletingPost) return;
    setIsDeletingPost(true);
    try {
      await deleteRoadmapItem(item.id);
      showNotification('Publication supprimée', 'info');
      onClose();
    } catch {
      showNotification('Impossible de supprimer la publication', 'error');
      setIsDeletingPost(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest || !uid) {
      showNotification('Connectez-vous pour commenter', 'info');
      return;
    }
    const clean = commentText.trim();
    if (!clean || isSendingComment) return;

    setIsSendingComment(true);
    try {
      await addRoadmapComment(item, clean, {
        uid,
        displayName: currentUser?.displayName || firebaseUser?.displayName || 'Musicien',
        photoURL: currentUser?.photoURL || null
      });
      setCommentText('');
    } catch {
      showNotification("Impossible d'envoyer le commentaire", 'error');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (isGuest || !uid) return;
    try {
      await deleteRoadmapComment(item, commentId);
    } catch {
      showNotification('Impossible de supprimer le commentaire', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="roadmap-detail-title"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#222224] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-gray-400 min-w-0 truncate">
            {item.category === 'bug' ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                <Bug className="w-3.5 h-3.5" />
                <span>Bug</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Idée</span>
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span className="text-slate-700 dark:text-gray-300 font-medium">{currentStatusMeta.label}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-gray-500">
              {formatRoadmapDate(item.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-800 dark:text-gray-200 hover:text-slate-900 dark:hover:text-white bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#26262A] border border-slate-300 dark:border-[#2C2C32] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Modifier</span>
              </button>
            )}

            {canDeletePost && !confirmDeletePost && (
              <button
                type="button"
                onClick={() => setConfirmDeletePost(true)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-gray-400 hover:text-rose-800 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Supprimer"
                aria-label="Supprimer la publication"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#1C1C1E] transition-colors cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline delete confirmation */}
        {confirmDeletePost && (
          <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-500/30 flex items-center justify-between gap-3 text-xs">
            <span className="text-rose-700 dark:text-rose-300">Supprimer définitivement cette publication ?</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDeletePost(false)}
                className="px-2.5 py-1 rounded-md bg-[#EDF1F5] dark:bg-[#1C1C1E] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={handleDeletePost}
                className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
              >
                {isDeletingPost ? 'Suppression...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Author + Admin Status control */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                photoURL={item.authorPhotoURL}
                displayName={item.authorName}
                sizeClass="w-8 h-8 text-xs"
                iconClass="w-4 h-4"
                fallbackClassName="bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.authorName}</p>
                <p className="text-[11px] text-gray-500">Auteur</p>
              </div>
            </div>

            {canChangeStatus && (
              <div className="flex items-center gap-2">
                <label htmlFor="detail-status-select" className="text-xs text-slate-600 dark:text-gray-400">
                  Statut :
                </label>
                <select
                  id="detail-status-select"
                  value={item.status}
                  disabled={isUpdatingStatus}
                  onChange={(e) => handleStatusChange(e.target.value as RoadmapStatus)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#18181C] border border-slate-300 dark:border-[#2E2E36] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {ROADMAP_COLUMNS.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2.5">
            <h3 id="roadmap-detail-title" className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {item.title}
            </h3>
            <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {item.description}
            </p>
          </div>

          {/* Images gallery */}
          {item.images.length > 0 && (
            <div
              className={`grid gap-2.5 ${
                item.images.length === 1
                  ? 'grid-cols-1'
                  : item.images.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2 sm:grid-cols-3'
              }`}
            >
              {item.images.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-[#222224] bg-[#F4F6F9] dark:bg-[#0A0A0B] cursor-zoom-in"
                >
                  <img
                    src={src}
                    alt={`${item.title} — image ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <span className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/65 text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Like + stats bar */}
          <div className="pt-2 pb-1 border-y border-slate-200 dark:border-[#222224] flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={isTogglingLike}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                isLiked
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-50 dark:bg-[#18181C] border-slate-300 dark:border-[#2A2A30] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-[#3A3A44]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="font-mono tabular-nums">{item.likesCount}</span>
              <span>{isLiked ? 'Aimé' : "J'aime"}</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-gray-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{comments.length || item.commentsCount}</span>
              <span>commentaire{(comments.length || item.commentsCount) > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Comments list */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-gray-300">Commentaires</h4>

            {loadingComments ? (
              <div className="py-4 flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Chargement des commentaires...</span>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">
                Aucun commentaire pour le moment. Soyez le premier à réagir.
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((cmt) => {
                  const canDeleteCmt = !isGuest && (cmt.authorId === uid || isAdmin);
                  return (
                    <div
                      key={cmt.id}
                      className="flex items-start gap-2.5 pb-3 border-b border-slate-200 dark:border-[#1E1E22] last:border-b-0 last:pb-0"
                    >
                      <UserAvatar
                        photoURL={cmt.authorPhotoURL}
                        displayName={cmt.authorName}
                        sizeClass="w-7 h-7 text-[11px]"
                        iconClass="w-3.5 h-3.5"
                        fallbackClassName="bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] text-slate-900 dark:text-white"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {cmt.authorName}
                            </span>
                            <span aria-hidden="true" className="text-slate-500 dark:text-gray-600">
                              ·
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-gray-500 shrink-0">
                              {formatRoadmapDate(cmt.createdAt)}
                            </span>
                          </div>
                          {canDeleteCmt && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(cmt.id)}
                              className="p-1 rounded text-gray-500 hover:text-rose-800 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              aria-label="Supprimer le commentaire"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {cmt.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Comment composer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-[#222224] bg-[#F4F6F9] dark:bg-[#0D0D0F]">
          {isGuest || !uid ? (
            <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-gray-400">
              <span>Connectez-vous pour laisser un commentaire.</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  exitGuestMode();
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shrink-0 cursor-pointer"
              >
                Se connecter
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                maxLength={ROADMAP_COMMENT_MAX}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#141417] border border-slate-200 dark:border-[#242429] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSendingComment}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-45 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {isSendingComment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Envoyer</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && item.images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-60 bg-black/92 flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxIndex(null);
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white cursor-pointer"
            aria-label="Fermer l'image"
          >
            <X className="w-5 h-5" />
          </button>

          {item.images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex - 1 + item.images.length) % item.images.length);
              }}
              className="absolute left-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white cursor-pointer"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <img
            src={item.images[lightboxIndex]}
            alt={`${item.title} — agrandissement ${lightboxIndex + 1}`}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl"
          />

          {item.images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex + 1) % item.images.length);
              }}
              className="absolute right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white cursor-pointer"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
