import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  db,
  OperationType,
  handleFirestoreError
} from '../firebase';
import { RoadmapCategory, RoadmapComment, RoadmapItem, RoadmapStatus } from '../types';
import { sanitizeRoadmapComment, sanitizeRoadmapInput } from '../utils/roadmapUtils';

const generateRoadmapId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const subscribeRoadmapItems = (
  onUpdate: (items: RoadmapItem[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const path = 'roadmap_items';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: RoadmapItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: String(data.title || ''),
          description: String(data.description || ''),
          category: data.category === 'bug' ? 'bug' : 'idea',
          status:
            data.status === 'in_progress' || data.status === 'live'
              ? data.status
              : 'idea_bug',
          images: Array.isArray(data.images) ? data.images : [],
          authorId: String(data.authorId || ''),
          authorName: String(data.authorName || 'Utilisateur'),
          authorPhotoURL: data.authorPhotoURL || null,
          likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
          commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : 0,
          lastCommentId: data.lastCommentId || null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      });
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
};

export const subscribeUserRoadmapLikes = (
  userId: string,
  onUpdate: (likedItemIds: Set<string>) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const q = query(collectionGroup(db, 'likes'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const liked = new Set<string>();
      snapshot.docs.forEach((d) => {
        const parentItemId = d.ref.parent.parent?.id;
        if (parentItemId && d.ref.parent.parent?.parent?.id === 'roadmap_items') {
          liked.add(parentItemId);
        }
      });
      onUpdate(liked);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'roadmap_items/*/likes');
      } catch (wrapped) {
        if (onError) onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
};

export const subscribeRoadmapComments = (
  itemId: string,
  onUpdate: (comments: RoadmapComment[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const path = `roadmap_items/${itemId}/comments`;
  const q = query(collection(db, 'roadmap_items', itemId, 'comments'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: RoadmapComment[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          itemId: String(data.itemId || itemId),
          text: String(data.text || ''),
          authorId: String(data.authorId || ''),
          authorName: String(data.authorName || 'Utilisateur'),
          authorPhotoURL: data.authorPhotoURL || null,
          createdAt: data.createdAt
        };
      });
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
};

export const createRoadmapItem = async (params: {
  title: string;
  description: string;
  category: RoadmapCategory;
  images: string[];
  author: { uid: string; displayName: string; photoURL?: string | null };
}): Promise<string> => {
  const clean = sanitizeRoadmapInput(params);
  const id = generateRoadmapId('rm');
  const path = `roadmap_items/${id}`;
  try {
    await setDoc(doc(db, 'roadmap_items', id), {
      id,
      title: clean.title,
      description: clean.description,
      category: clean.category,
      status: 'idea_bug',
      images: clean.images,
      authorId: params.author.uid,
      authorName: (params.author.displayName || 'Utilisateur').trim().slice(0, 120),
      authorPhotoURL: params.author.photoURL || null,
      likesCount: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateRoadmapItemContent = async (
  itemId: string,
  params: {
    title: string;
    description: string;
    category: RoadmapCategory;
    images: string[];
  }
): Promise<void> => {
  const clean = sanitizeRoadmapInput(params);
  const path = `roadmap_items/${itemId}`;
  try {
    await updateDoc(doc(db, 'roadmap_items', itemId), {
      title: clean.title,
      description: clean.description,
      category: clean.category,
      images: clean.images,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateRoadmapItemStatus = async (
  itemId: string,
  status: RoadmapStatus
): Promise<void> => {
  const path = `roadmap_items/${itemId}`;
  try {
    await updateDoc(doc(db, 'roadmap_items', itemId), {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteRoadmapItem = async (itemId: string): Promise<void> => {
  const path = `roadmap_items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'roadmap_items', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const toggleRoadmapLike = async (
  item: Pick<RoadmapItem, 'id' | 'likesCount'>,
  userId: string,
  currentlyLiked: boolean
): Promise<void> => {
  const path = `roadmap_items/${item.id}/likes/${userId}`;
  try {
    const batch = writeBatch(db);
    const itemRef = doc(db, 'roadmap_items', item.id);
    const likeRef = doc(db, 'roadmap_items', item.id, 'likes', userId);
    const nextCount = currentlyLiked ? Math.max(0, item.likesCount - 1) : item.likesCount + 1;

    if (currentlyLiked) {
      batch.delete(likeRef);
    } else {
      batch.set(likeRef, {
        userId,
        createdAt: serverTimestamp()
      });
    }

    batch.update(itemRef, {
      likesCount: nextCount,
      updatedAt: serverTimestamp()
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const addRoadmapComment = async (
  item: Pick<RoadmapItem, 'id' | 'commentsCount'>,
  text: string,
  author: { uid: string; displayName: string; photoURL?: string | null }
): Promise<string> => {
  const cleanText = sanitizeRoadmapComment(text);
  const commentId = generateRoadmapId('cmt');
  const path = `roadmap_items/${item.id}/comments/${commentId}`;
  try {
    const batch = writeBatch(db);
    const itemRef = doc(db, 'roadmap_items', item.id);
    const commentRef = doc(db, 'roadmap_items', item.id, 'comments', commentId);

    batch.set(commentRef, {
      id: commentId,
      itemId: item.id,
      text: cleanText,
      authorId: author.uid,
      authorName: (author.displayName || 'Utilisateur').trim().slice(0, 120),
      authorPhotoURL: author.photoURL || null,
      createdAt: serverTimestamp()
    });

    batch.update(itemRef, {
      commentsCount: item.commentsCount + 1,
      lastCommentId: commentId,
      updatedAt: serverTimestamp()
    });

    await batch.commit();
    return commentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deleteRoadmapComment = async (
  item: Pick<RoadmapItem, 'id' | 'commentsCount'>,
  commentId: string
): Promise<void> => {
  const path = `roadmap_items/${item.id}/comments/${commentId}`;
  try {
    const batch = writeBatch(db);
    const itemRef = doc(db, 'roadmap_items', item.id);
    const commentRef = doc(db, 'roadmap_items', item.id, 'comments', commentId);

    batch.delete(commentRef);
    batch.update(itemRef, {
      commentsCount: Math.max(0, item.commentsCount - 1),
      lastCommentId: commentId,
      updatedAt: serverTimestamp()
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
