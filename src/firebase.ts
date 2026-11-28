import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  getFirestore, 
  setLogLevel,
  collection, 
  collectionGroup,
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
  arrayUnion,
  arrayRemove,
  getDocFromServer,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  uploadString, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Silence non-critical transport warnings, offline logs, and reconnect notices
try {
  setLogLevel('silent');
} catch {
  // Ignore in environments where setLogLevel is not supported
}

// Suppress transient offline connection warnings from triggering developer overlays
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason || '');
    const code = event.reason?.code;
    if (
      code === 'unavailable' ||
      msg.includes('Could not reach Cloud Firestore backend') ||
      msg.includes('operate in offline mode') ||
      msg.includes('[code=unavailable]')
    ) {
      event.preventDefault();
    }
  });
}

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with forced long-polling to bypass iframe/proxy streaming blocks
const targetDatabaseId = firebaseConfig.firestoreDatabaseId || undefined;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, targetDatabaseId);
} catch {
  try {
    firestoreInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: memoryLocalCache()
    }, targetDatabaseId);
  } catch {
    firestoreInstance = getFirestore(app, targetDatabaseId);
  }
}

export const db = firestoreInstance;

// Initialize Storage
export const storage = getStorage(app, firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
if (typeof window !== 'undefined') {
  testConnection();
}

export {
  storageRef,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
  arrayUnion,
  arrayRemove,
  getDocFromServer,
  writeBatch,
  deleteField
};

export type { FirebaseUser };
