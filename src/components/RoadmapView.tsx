import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { NAV_SPRING } from '../utils/motionPresets';
import {
  Plus,
  Search,
  Bug,
  Lightbulb,
  Heart,
  MessageSquare,
  Pencil,
  Clock,
  CheckCircle2,
  Sparkles,
  LogIn,
  ShieldAlert,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { RoadmapCategory, RoadmapItem, RoadmapStatus } from '../types';
import {
  ROADMAP_COLUMNS,
  canChangeRoadmapStatus,
  canEditRoadmapItem,
  formatRoadmapDate,
  isMainAppAdmin
} from '../utils/roadmapUtils';
import {
  subscribeRoadmapItems,
  subscribeUserRoadmapLikes,
  toggleRoadmapLike,
  updateRoadmapItemStatus
} from '../services/roadmapService';
import { useApp } from '../context/AppContext';
import { sendEmailVerification } from '../firebase';
import { RoadmapFormModal } from './RoadmapFormModal';
import { RoadmapDetailModal } from './RoadmapDetailModal';

const COLUMN_ICONS: Record<RoadmapStatus, React.FC<{ className?: string }>> = {
  idea_bug: Sparkles,
  in_progress: Clock,
  live: CheckCircle2
};

export const RoadmapView: React.FC = () => {
  const { currentUser, firebaseUser, isGuest, exitGuestMode, showNotification } = useApp();

  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | RoadmapCategory>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'likes'>('recent');
  const [mobileColumn, setMobileColumn] = useState<RoadmapStatus>('idea_bug');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [pendingLikeId, setPendingLikeId] = useState<string | null>(null);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const uid = firebaseUser?.uid || currentUser?.uid || null;
  const email = currentUser?.email || firebaseUser?.email || null;
  const canChangeStatus = canChangeRoadmapStatus(email, isGuest);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    const unsubItems = subscribeRoadmapItems(
      (list) => {
        setItems(list);
        setLoading(false);
      },
      (err) => {
        setLoadError('Impossible de charger la Roadmap pour le moment.');
        setLoading(false);
        console.error(err);
      }
    );
    return () => unsubItems();
  }, []);

  useEffect(() => {
    if (isGuest || !uid) {
      setLikedIds(new Set());
      return;
    }
    const unsubLikes = subscribeUserRoadmapLikes(uid, (liked) => {
      setLikedIds(liked);
    });
    return () => unsubLikes();
  }, [isGuest, uid]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.authorName.toLowerCase().includes(q)
      );
    });

    if (sortBy === 'likes') {
      return [...list].sort((a, b) => b.likesCount - a.likesCount);
    }
    return list;
  }, [items, categoryFilter, searchQuery, sortBy]);

  const itemsByColumn = useMemo(() => {
    const grouped: Record<RoadmapStatus, RoadmapItem[]> = {
      idea_bug: [],
      in_progress: [],
      live: []
    };
    for (const item of filteredItems) {
      grouped[item.status].push(item);
    }
    return grouped;
  }, [filteredItems]);

  const selectedItem = useMemo(
    () => (selectedItemId ? items.find((i) => i.id === selectedItemId) || null : null),
    [items, selectedItemId]
  );

  const handleLikeClick = async (e: React.MouseEvent, item: RoadmapItem) => {
    e.stopPropagation();
    if (isGuest || !uid) {
      showNotification('Connectez-vous pour aimer une proposition', 'info');
      return;
    }
    if (pendingLikeId === item.id) return;
    setPendingLikeId(item.id);
    try {
      await toggleRoadmapLike(item, uid, likedIds.has(item.id));
    } catch {
      showNotification('Impossible de mettre à jour le like', 'error');
    } finally {
      setPendingLikeId(null);
    }
  };

  const handleStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
    item: RoadmapItem
  ) => {
    e.stopPropagation();
    const nextStatus = e.target.value as RoadmapStatus;
    if (!canChangeStatus || nextStatus === item.status || pendingStatusId === item.id) return;
    setPendingStatusId(item.id);
    try {
      await updateRoadmapItemStatus(item.id, nextStatus);
      showNotification('Statut mis à jour', 'success');
    } catch {
      showNotification('Impossible de modifier le statut', 'error');
    } finally {
      setPendingStatusId(null);
    }
  };



  const openCreateModal = () => {
    if (isGuest || !uid) {
      showNotification('Connectez-vous pour publier une idée ou un bug', 'info');
      return;
    }
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const openEditModal = (item: RoadmapItem) => {
    setSelectedItemId(null);
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const renderCard = (item: RoadmapItem) => {
    const liked = likedIds.has(item.id);
    const isAuthor = canEditRoadmapItem(item, uid, isGuest);

    return (
      <article
        key={item.id}
        onClick={() => setSelectedItemId(item.id)}
        className="bg-slate-50 dark:bg-[#141417] border border-slate-200 dark:border-[#222224] hover:border-slate-400 dark:hover:border-[#34343C] hover:-translate-y-0.5 hover:shadow-md rounded-xl p-4 space-y-3 transition-all duration-150 cursor-pointer"
      >
        {/* Top unboxed metadata line */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-gray-400 min-w-0 truncate">
            {item.category === 'bug' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                <Bug className="w-3.5 h-3.5" />
                <span>Bug</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Idée</span>
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span className="truncate">{item.authorName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[11px] text-gray-500 shrink-0">
              {formatRoadmapDate(item.createdAt)}
            </span>
          </div>

          {isAuthor && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(item);
              }}
              className="p-1.5 rounded-lg text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#1E1E24] transition-colors shrink-0 cursor-pointer"
              title="Modifier ma publication"
              aria-label="Modifier ma publication"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Title & excerpt */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
            {item.title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed line-clamp-3 whitespace-pre-line">
            {item.description}
          </p>
        </div>

        {/* Compact image thumbnails strip */}
        {item.images.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {item.images.slice(0, 3).map((src, idx) => (
              <div
                key={idx}
                className="aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-[#222224] bg-[#F4F6F9] dark:bg-[#0A0A0B]"
              >
                <img
                  src={src}
                  alt={`${item.title} — aperçu ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer: likes, comments, admin status selector */}
        <div className="pt-2 border-t border-slate-200 dark:border-[#1E1E22] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => handleLikeClick(e, item)}
              disabled={pendingLikeId === item.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                liked
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-50 dark:bg-[#18181D] border-slate-300 dark:border-[#26262E] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-[#363642]'
              }`}
              aria-label={`Aimer (${item.likesCount})`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
              <span className="font-mono tabular-nums">{item.likesCount}</span>
            </button>

            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-gray-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{item.commentsCount}</span>
            </span>

            {item.images.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">{item.images.length}</span>
              </span>
            )}
          </div>

          {canChangeStatus && (
            <select
              aria-label={`Statut de ${item.title}`}
              value={item.status}
              disabled={pendingStatusId === item.id}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleStatusChange(e, item)}
              className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#18181E] border border-slate-300 dark:border-[#2C2C36] text-[11px] font-medium text-slate-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {ROADMAP_COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Roadmap &amp; Signalement de Bugs
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400">
            Proposez des fonctionnalités, signalez des anomalies et suivez les mises en ligne.
          </p>
        </div>

        <div className="shrink-0">
          {isGuest || !uid ? (
            <button
              type="button"
              onClick={exitGuestMode}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Se connecter pour participer</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Proposer une idée / bug</span>
            </button>
          )}
        </div>
      </div>

      {/* Guest read-only banner */}
      {isGuest && (
        <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 dark:text-gray-300">
          <span>
            Mode visiteur actif : vous consultez la Roadmap en lecture seule.
          </span>
          <button
            type="button"
            onClick={exitGuestMode}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold cursor-pointer"
          >
            Se connecter
          </button>
        </div>
      )}



      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, texte ou auteur..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category segmented filter */}
          <div className="inline-flex items-center gap-1 p-1 bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === 'all'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {categoryFilter === 'all' && (
                <motion.div
                  layoutId="roadmap-category-pill"
                  transition={NAV_SPRING}
                  className="absolute inset-0 bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-lg"
                />
              )}
              <span className="relative z-10">Tout</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('idea')}
              className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === 'idea'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {categoryFilter === 'idea' && (
                <motion.div
                  layoutId="roadmap-category-pill"
                  transition={NAV_SPRING}
                  className="absolute inset-0 bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-lg"
                />
              )}
              <Lightbulb className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Idées</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('bug')}
              className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === 'bug'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {categoryFilter === 'bug' && (
                <motion.div
                  layoutId="roadmap-category-pill"
                  transition={NAV_SPRING}
                  className="absolute inset-0 bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-lg"
                />
              )}
              <Bug className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Bugs</span>
            </button>
          </div>

          {/* Sort segmented control */}
          <div className="inline-flex items-center gap-1 p-1 bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl">
            <button
              type="button"
              onClick={() => setSortBy('recent')}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                sortBy === 'recent'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sortBy === 'recent' && (
                <motion.div
                  layoutId="roadmap-sort-pill"
                  transition={NAV_SPRING}
                  className="absolute inset-0 bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-lg"
                />
              )}
              <span className="relative z-10">Récents</span>
            </button>
            <button
              type="button"
              onClick={() => setSortBy('likes')}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                sortBy === 'likes'
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sortBy === 'likes' && (
                <motion.div
                  layoutId="roadmap-sort-pill"
                  transition={NAV_SPRING}
                  className="absolute inset-0 bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-lg"
                />
              )}
              <span className="relative z-10">Populaires</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile column switcher (< lg) */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl lg:hidden">
        {ROADMAP_COLUMNS.map((col) => {
          const count = itemsByColumn[col.id].length;
          const isActive = mobileColumn === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setMobileColumn(col.id)}
              className={`relative py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="roadmap-mobile-col-pill"
                  transition={NAV_SPRING}
                  className="absolute inset-0 bg-[#EDF1F5] dark:bg-[#1C1C1E] border border-slate-300 dark:border-[#333] rounded-lg"
                />
              )}
              <span className="relative z-10 truncate">{col.label}</span>
              <span className="relative z-10 font-mono tabular-nums text-[11px] text-gray-500">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {loadError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/25 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300">
          {loadError}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {ROADMAP_COLUMNS.map((col) => (
            <div
              key={col.id}
              className="bg-white dark:bg-[#111112] border border-slate-200 dark:border-[#222224] rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1E1E22]">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{col.label}</span>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
              </div>
              <div className="h-28 rounded-xl bg-slate-50 dark:bg-[#16161A] animate-pulse" />
              <div className="h-28 rounded-xl bg-slate-50 dark:bg-[#16161A] animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        /* 3-Column Kanban Board */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {ROADMAP_COLUMNS.map((col) => {
            const columnItems = itemsByColumn[col.id];
            const ColIcon = COLUMN_ICONS[col.id];
            const visibleOnMobile = mobileColumn === col.id;

            return (
              <section
                key={col.id}
                aria-label={col.label}
                className={`${
                  visibleOnMobile ? 'flex' : 'hidden lg:flex'
                } flex-col bg-[#101012] border border-[#222224] rounded-xl p-4 space-y-3 min-h-[260px]`}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-[#1E1E22]">
                  <div className="flex items-center gap-2">
                    <ColIcon
                      className={`w-4 h-4 ${
                        col.id === 'live'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : col.id === 'in_progress'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    />
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{col.label}</h2>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-gray-400">
                    {columnItems.length}
                  </span>
                </div>

                {columnItems.length === 0 ? (
                  <div className="py-10 px-4 text-center space-y-3">
                    <p className="text-xs text-gray-500">{col.emptyText}</p>
                    {col.id === 'idea_bug' && !isGuest && uid && (
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDF1F5] dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-[#252529] border border-slate-300 dark:border-[#2C2C34] text-xs font-medium text-slate-800 dark:text-gray-200 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Proposer</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">{columnItems.map(renderCard)}</div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <RoadmapFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
      />

      {/* Detail + Comments Modal */}
      <RoadmapDetailModal
        item={selectedItem}
        isLiked={selectedItem ? likedIds.has(selectedItem.id) : false}
        onClose={() => setSelectedItemId(null)}
        onEdit={openEditModal}
      />
    </div>
  );
};
