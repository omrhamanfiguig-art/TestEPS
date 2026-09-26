import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  collection, 
  Firestore,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';
import type { StudentIdentity, PhysicalTests, StudentResult, ArchiveRecord } from '../types';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  saveStudentList, 
  getStudentList, 
  getAllClasses, 
  savePhysicalTests, 
  getPhysicalTests,
  saveVmaResults,
  getVmaResults,
  wipeAllLocalData
} from './db';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId if configured
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Auth with anonymous fallback
export const auth = getAuth(app);
signInAnonymously(auth).catch((err) => {
  // Silent catch: in some environments anonymous auth may be disabled or offline
});

/**
 * Remove all properties with undefined values deeply from an object/array.
 * Firestore throws an exception when setting documents containing `undefined`.
 */
export const sanitizeForFirestore = <T>(obj: T): T => {
  if (obj === undefined || obj === null) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
};

/**
 * Safely encode class names into valid Firestore document IDs.
 * Classes often have names like "1APIC/1" or "2AC/3" where slashes would break doc paths.
 */
export const toClassDocId = (className: string): string => {
  const clean = (className || '').trim().replace(/\//g, '_slash_');
  return encodeURIComponent(clean);
};

export const fromClassDocId = (docId: string): string => {
  return decodeURIComponent(docId).replace(/_slash_/g, '/');
};

export interface CloudClassData {
  className: string;
  studentCount: number;
  students: StudentIdentity[];
  physicalTests?: PhysicalTests[];
  vmaResults?: StudentResult[];
  ownerEmail?: string;
  ownerUid?: string;
  updatedAt: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

/**
 * Save / Update a class student roster in Firestore so it's accessible to all teachers
 */
export const saveClassToCloud = async (
  className: string, 
  students: StudentIdentity[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!className || !className.trim()) {
      return { success: false, error: 'اسم القسم غير صالح.' };
    }

    const docId = toClassDocId(className);
    const docRef = doc(db, 'classes', docId);

    const user = auth.currentUser;
    const authorEmail = user?.email || null;
    const authorUid = user?.uid || null;
    const authorName = user?.displayName || user?.email?.split('@')[0] || 'أستاذ التربية البدنية';

    const rawStudents = (students || []).map(s => {
      const item: Record<string, any> = {
        numeroEleve: String(s.numeroEleve || '').trim(),
        nomEleve: String(s.nomEleve || '').trim(),
        sexe: s.sexe || 'M'
      };
      if (s.photoUrl) {
        item.photoUrl = s.photoUrl;
      }
      return item;
    });

    const data = sanitizeForFirestore({
      className: className.trim(),
      studentCount: rawStudents.length,
      students: rawStudents,
      ownerEmail: authorEmail,
      ownerUid: authorUid,
      updatedAt: new Date().toISOString(),
      updatedBy: authorName,
      updatedByEmail: authorEmail
    });

    await setDoc(docRef, data, { merge: true });
    return { success: true };
  } catch (err: any) {
    // Check if offline/unavailable
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('unavailable')) {
      console.info('Firestore is operating in offline mode. Changes will sync when network is restored.');
      return { success: true }; // Queued in offline cache
    }
    console.error('Error saving class to cloud:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء الحفظ في قاعدة البيانات السحابية.' };
  }
};

/**
 * Save physical test results for a class in Firestore
 */
export const savePhysicalTestsToCloud = async (
  className: string,
  results: PhysicalTests[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!className || !className.trim()) return { success: false };
    const docId = toClassDocId(className);
    const docRef = doc(db, 'physical_tests', docId);

    const user = auth.currentUser;
    const authorEmail = user?.email || null;

    const payload = sanitizeForFirestore({
      className: className.trim(),
      results: results || [],
      ownerEmail: authorEmail,
      updatedAt: new Date().toISOString()
    });

    await setDoc(docRef, payload, { merge: true });

    // Also update class master document with physical tests & measurements
    const classDocRef = doc(db, 'classes', docId);
    await setDoc(classDocRef, {
      className: className.trim(),
      physicalTests: sanitizeForFirestore(results || []),
      ownerEmail: authorEmail,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('unavailable')) {
      return { success: true };
    }
    console.error('Error saving physical tests to cloud:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Save VMA test results for a class in Firestore
 */
export const saveVmaResultsToCloud = async (
  className: string,
  results: StudentResult[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!className || !className.trim()) return { success: false };
    const docId = toClassDocId(className);
    const docRef = doc(db, 'vma_results', docId);

    const user = auth.currentUser;
    const authorEmail = user?.email || null;

    const payload = sanitizeForFirestore({
      className: className.trim(),
      results: results || [],
      ownerEmail: authorEmail,
      updatedAt: new Date().toISOString()
    });

    await setDoc(docRef, payload, { merge: true });

    // Also update class master document with VMA results
    const classDocRef = doc(db, 'classes', docId);
    await setDoc(classDocRef, {
      className: className.trim(),
      vmaResults: sanitizeForFirestore(results || []),
      ownerEmail: authorEmail,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    return { success: true };
  } catch (err: any) {
    if (err?.code === 'unavailable' || err?.message?.includes('offline') || err?.message?.includes('unavailable')) {
      return { success: true };
    }
    console.error('Error saving VMA results to cloud:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Fetch a specific class from Firestore
 */
export const fetchClassFromCloud = async (className: string): Promise<CloudClassData | null> => {
  try {
    const docId = toClassDocId(className);
    const docRef = doc(db, 'classes', docId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return snapshot.data() as CloudClassData;
    }
    return null;
  } catch (err) {
    console.error('Error fetching class from cloud:', err);
    return null;
  }
};

/**
 * Fetch all classes and their student rosters from Firestore
 */
export const fetchAllClassesFromCloud = async (): Promise<CloudClassData[]> => {
  try {
    const colRef = collection(db, 'classes');
    const snapshot = await getDocs(colRef);
    const classes: CloudClassData[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as CloudClassData;
      if (data && data.className) {
        classes.push(data);
      }
    });

    return classes;
  } catch (err) {
    console.error('Error fetching all classes from cloud:', err);
    return [];
  }
};

/**
 * Pull all classes from Firestore and save them into local IndexedDB
 */
export const syncCloudToLocalDB = async (): Promise<{ success: boolean; classCount: number; studentCount: number; error?: string }> => {
  try {
    const cloudClasses = await fetchAllClassesFromCloud();
    if (cloudClasses.length === 0) {
      return { success: true, classCount: 0, studentCount: 0 };
    }

    let totalStudents = 0;
    for (const c of cloudClasses) {
      if (c.className && Array.isArray(c.students)) {
        await saveStudentList(c.className, c.students, { skipCloudSync: true });
        totalStudents += c.students.length;
      }
    }

    // Try also to sync physical tests from cloud
    try {
      const ptSnap = await getDocs(collection(db, 'physical_tests'));
      for (const docSnap of ptSnap.docs) {
        const data = docSnap.data();
        if (data && data.className && Array.isArray(data.results)) {
          await savePhysicalTests(data.className, data.results, { skipCloudSync: true });
        }
      }
    } catch (e) {
      console.warn('Physical tests cloud sync notice:', e);
    }

    // Try also to sync VMA results from cloud
    try {
      const vmaSnap = await getDocs(collection(db, 'vma_results'));
      for (const docSnap of vmaSnap.docs) {
        const data = docSnap.data();
        if (data && data.className && Array.isArray(data.results)) {
          await saveVmaResults(data.className, data.results, { skipCloudSync: true });
        }
      }
    } catch (e) {
      console.warn('VMA cloud sync notice:', e);
    }

    window.dispatchEvent(new CustomEvent('dbUpdated'));
    return { success: true, classCount: cloudClasses.length, studentCount: totalStudents };
  } catch (err: any) {
    console.error('Error syncing cloud to local DB:', err);
    return { success: false, classCount: 0, studentCount: 0, error: err.message };
  }
};

/**
 * Push all local classes and students to Firestore so all teachers have access
 */
export const syncLocalToCloudDB = async (): Promise<{ success: boolean; classCount: number; studentCount: number; error?: string }> => {
  try {
    const localClasses = await getAllClasses();
    if (localClasses.length === 0) {
      return { success: true, classCount: 0, studentCount: 0 };
    }

    let totalStudents = 0;
    for (const cls of localClasses) {
      const students = await getStudentList(cls.className);
      if (students.length > 0) {
        await saveClassToCloud(cls.className, students);
        totalStudents += students.length;
      }

      // Also push physical tests and VMA if present
      const physicalTests = await getPhysicalTests(cls.className);
      if (physicalTests.length > 0) {
        await savePhysicalTestsToCloud(cls.className, physicalTests);
      }

      const vmaResults = await getVmaResults(cls.className);
      if (vmaResults.length > 0) {
        await saveVmaResultsToCloud(cls.className, vmaResults);
      }
    }

    return { success: true, classCount: localClasses.length, studentCount: totalStudents };
  } catch (err: any) {
    console.error('Error syncing local to cloud DB:', err);
    return { success: false, classCount: 0, studentCount: 0, error: err.message };
  }
};

/**
 * Bidirectional sync: Pulls cloud updates and pushes local un-synced classes
 */
export const syncAllData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Pull cloud data first
    const pullResult = await syncCloudToLocalDB();
    
    // 2. Push any local classes that might not be in cloud yet
    const pushResult = await syncLocalToCloudDB();

    window.dispatchEvent(new CustomEvent('dbUpdated'));
    return {
      success: true,
      message: `تمت المزامنة السحابية بنجاح (${pushResult.classCount} أقسام، ${pushResult.studentCount} تلميذاً)`
    };
  } catch (err: any) {
    console.error('Bidirectional sync error:', err);
    return { success: false, message: err.message || 'فشلت المزامنة مع قاعدة البيانات السحابية.' };
  }
};

/**
 * Delete a class from Firestore
 */
export const deleteClassFromCloud = async (className: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const docId = toClassDocId(className);
    await deleteDoc(doc(db, 'classes', docId));
    await deleteDoc(doc(db, 'physical_tests', docId)).catch(() => {});
    await deleteDoc(doc(db, 'vma_results', docId)).catch(() => {});
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting class from cloud:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Listen for real-time changes to the classes collection in Firestore
 */
export const listenToCloudClasses = (onClassUpdate?: () => void): Unsubscribe => {
  try {
    const colRef = collection(db, 'classes');
    return onSnapshot(colRef, async (snapshot) => {
      let hasChanges = false;
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data() as any;
          if (data && data.className) {
            if (Array.isArray(data.students)) {
              await saveStudentList(data.className, data.students, { skipCloudSync: true });
              hasChanges = true;
            }
            if (Array.isArray(data.physicalTests)) {
              await savePhysicalTests(data.className, data.physicalTests, { skipCloudSync: true });
              hasChanges = true;
            }
            if (Array.isArray(data.vmaResults)) {
              await saveVmaResults(data.className, data.vmaResults, { skipCloudSync: true });
              hasChanges = true;
            }
          }
        }
      }
      if (hasChanges) {
        window.dispatchEvent(new CustomEvent('dbUpdated'));
        if (onClassUpdate) onClassUpdate();
      }
    }, (error) => {
      console.warn('Real-time class sync listener notice:', error);
    });
  } catch (err) {
    console.warn('Failed to attach real-time listener:', err);
    return () => {};
  }
};

/**
 * Wipe all data from cloud Firestore collections (classes, physical_tests, vma_results)
 */
export const wipeAllCloudData = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const classSnaps = await getDocs(collection(db, 'classes'));
    for (const d of classSnaps.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }

    const physSnaps = await getDocs(collection(db, 'physical_tests'));
    for (const d of physSnaps.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }

    const vmaSnaps = await getDocs(collection(db, 'vma_results'));
    for (const d of vmaSnaps.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error wiping all cloud data:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Wipe all data both locally and optionally in the cloud
 */
export const wipeAllData = async (options: { wipeCloud: boolean } = { wipeCloud: true }): Promise<{ success: boolean; error?: string }> => {
  try {
    await wipeAllLocalData();
    if (options.wipeCloud) {
      await wipeAllCloudData();
    }
    window.dispatchEvent(new CustomEvent('dbUpdated'));
    return { success: true };
  } catch (err: any) {
    console.error('Error in wipeAllData:', err);
    return { success: false, error: err.message };
  }
};

const ARCHIVES_CACHE_KEY = 'eps_archives_cache_v1';

export const getCachedArchives = (): ArchiveRecord[] => {
  try {
    const raw = localStorage.getItem(ARCHIVES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Save current snapshot of all classes, student rosters, physical tests, and VMA into Firestore Archive
 */
export const saveArchiveToCloud = async (
  title: string, 
  description?: string, 
  customAuthor?: string
): Promise<{ success: boolean; archive?: ArchiveRecord; error?: string }> => {
  try {
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) {
      return { success: false, error: 'يرجى إدخال اسم أو عنوان للأرشيف (مثلاً: الموسم الدراسي 2024-2025).' };
    }

    const localClasses = await getAllClasses();
    if (localClasses.length === 0) {
      return { success: false, error: 'لا توجد أي بيانات أو أقسام حالياً لحفظها في الأرشيف.' };
    }

    const classesData: { className: string; students: StudentIdentity[] }[] = [];
    const physicalData: { className: string; results: PhysicalTests[] }[] = [];
    const vmaData: { className: string; results: StudentResult[] }[] = [];
    let totalStudents = 0;

    for (const cls of localClasses) {
      const students = await getStudentList(cls.className);
      classesData.push({ className: cls.className, students });
      totalStudents += students.length;

      const phys = await getPhysicalTests(cls.className);
      if (phys.length > 0) {
        physicalData.push({ className: cls.className, results: phys });
      }

      const vma = await getVmaResults(cls.className);
      if (vma.length > 0) {
        vmaData.push({ className: cls.className, results: vma });
      }
    }

    const archiveId = 'archive_' + Date.now();
    const rawArchive: ArchiveRecord = {
      id: archiveId,
      title: cleanTitle,
      description: description ? description.trim() : undefined,
      createdAt: new Date().toISOString(),
      createdBy: customAuthor || 'أستاذ التربية البدنية',
      classCount: classesData.length,
      studentCount: totalStudents,
      data: {
        classes: classesData,
        physicalTests: physicalData,
        vmaResults: vmaData
      }
    };

    const sanitized = sanitizeForFirestore(rawArchive);

    // Save to Firestore
    try {
      const docRef = doc(db, 'archives', archiveId);
      await setDoc(docRef, sanitized);
    } catch (cloudErr) {
      console.warn('Saving archive to cloud warning:', cloudErr);
    }

    // Save to local cache
    try {
      const existing = getCachedArchives();
      const updated = [rawArchive, ...existing.filter(a => a.id !== archiveId)];
      localStorage.setItem(ARCHIVES_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Cache archive notice:', e);
    }

    return { success: true, archive: rawArchive };
  } catch (err: any) {
    console.error('Error saving archive:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء حفظ الأرشيف.' };
  }
};

/**
 * Fetch all archives from Firestore (and cache fallback)
 */
export const fetchArchivesFromCloud = async (): Promise<ArchiveRecord[]> => {
  try {
    const colRef = collection(db, 'archives');
    const snapshot = await getDocs(colRef);
    const list: ArchiveRecord[] = [];

    snapshot.forEach(docSnap => {
      const d = docSnap.data() as ArchiveRecord;
      if (d && d.id && d.title) {
        list.push(d);
      }
    });

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (list.length > 0) {
      try {
        localStorage.setItem(ARCHIVES_CACHE_KEY, JSON.stringify(list));
      } catch (e) {
        console.warn('Cache notice:', e);
      }
      return list;
    }

    return getCachedArchives();
  } catch (err) {
    console.warn('Could not fetch archives from cloud, using cache:', err);
    return getCachedArchives();
  }
};

/**
 * Delete an archive from Firestore and local cache
 */
export const deleteArchiveFromCloud = async (archiveId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await deleteDoc(doc(db, 'archives', archiveId)).catch(() => {});
    
    try {
      const existing = getCachedArchives();
      const updated = existing.filter(a => a.id !== archiveId);
      localStorage.setItem(ARCHIVES_CACHE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Cache delete notice:', e);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting archive:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Restore an archive back into active local and cloud database
 */
export const restoreArchive = async (
  archive: ArchiveRecord, 
  mode: 'merge' | 'replace' = 'replace'
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    if (!archive || !archive.data || !Array.isArray(archive.data.classes)) {
      return { success: false, error: 'بيانات الأرشيف غير صالحة أو تالفة.' };
    }

    if (mode === 'replace') {
      await wipeAllData({ wipeCloud: true });
    }

    let restoredClasses = 0;
    let restoredStudents = 0;

    for (const c of archive.data.classes) {
      if (c.className && Array.isArray(c.students)) {
        await saveStudentList(c.className, c.students);
        restoredClasses++;
        restoredStudents += c.students.length;
      }
    }

    if (Array.isArray(archive.data.physicalTests)) {
      for (const p of archive.data.physicalTests) {
        if (p.className && Array.isArray(p.results)) {
          await savePhysicalTests(p.className, p.results);
        }
      }
    }

    if (Array.isArray(archive.data.vmaResults)) {
      for (const v of archive.data.vmaResults) {
        if (v.className && Array.isArray(v.results)) {
          await saveVmaResults(v.className, v.results);
        }
      }
    }

    window.dispatchEvent(new CustomEvent('dbUpdated'));
    return {
      success: true,
      message: `تم استرجاع الأرشيف «${archive.title}» بنجاح (${restoredClasses} أقسام، ${restoredStudents} تلميذاً)`
    };
  } catch (err: any) {
    console.error('Error restoring archive:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء استرجاع الأرشيف.' };
  }
};

/**
 * Download archive object as a standalone .json backup file
 */
export const exportArchiveAsFile = (archive: ArchiveRecord) => {
  try {
    const jsonStr = JSON.stringify(archive, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanName = (archive.title || 'Archive').replace(/[\/\\?%*:|"<>]/g, '_');
    const dateStr = archive.createdAt ? archive.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `EPS_Archive_${cleanName}_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error exporting archive file:', err);
  }
};

/**
 * Translate Firebase Auth error codes to user-friendly Arabic messages
 */
export const getAuthErrorMessage = (error: any): string => {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب. يرجى التواصل مع الإدارة.';
    case 'auth/user-not-found':
      return 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.';
    case 'auth/wrong-password':
      return 'كلمة المرور غير صحيحة.';
    case 'auth/invalid-credential':
      return 'بيانات الدخول غير صحيحة، يرجى التحقق من البريد وكلمة المرور.';
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بالبريد غير مفعل في هذا المشروع.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة جداً، يرجى استخدام 6 أحرف أو أرقام على الأقل.';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة تسجيل الدخول قبل اكتمالها.';
    case 'auth/popup-blocked':
      return 'تم حظر النافذة المنبثقة من قِبل المتصفح، يرجى السماح بالنوافذ المنبثقة.';
    case 'auth/network-request-failed':
      return 'فشل الاتصال، يرجى التحقق من اتصالك بالإنترنت.';
    default:
      return error?.message || 'حدث خطأ أثناء تسجيل الدخول.';
  }
};

/**
 * Register a new teacher account with email and password
 */
export const registerWithEmail = async (
  email: string, 
  password: string, 
  displayName?: string
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const cleanEmail = email.trim();
    if (!cleanEmail) return { success: false, error: 'يرجى إدخال البريد الإلكتروني.' };
    if (!password || password.length < 6) return { success: false, error: 'كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام.' };

    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = credential.user;

    if (displayName && displayName.trim()) {
      await updateProfile(user, { displayName: displayName.trim() }).catch(() => {});
    }

    // Save/update user doc in Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName || user.email?.split('@')[0],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }), { merge: true });
    } catch (e) {
      console.warn('Could not save user profile to firestore:', e);
    }

    // Automatically sync cloud database for this user
    syncCloudToLocalDB().catch(() => {});

    return { success: true, user };
  } catch (err: any) {
    console.error('Registration error:', err);
    return { success: false, error: getAuthErrorMessage(err) };
  }
};

/**
 * Sign in existing teacher with email and password
 */
export const signInWithEmail = async (
  email: string, 
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const cleanEmail = email.trim();
    if (!cleanEmail) return { success: false, error: 'يرجى إدخال البريد الإلكتروني.' };
    if (!password) return { success: false, error: 'يرجى إدخال كلمة المرور.' };

    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = credential.user;

    // Update lastLogin in Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        lastLogin: new Date().toISOString()
      }), { merge: true });
    } catch (e) {
      console.warn('Could not update user login in firestore:', e);
    }

    // Pull all cloud classes into local IndexedDB
    await syncCloudToLocalDB();
    window.dispatchEvent(new CustomEvent('dbUpdated'));

    return { success: true, user };
  } catch (err: any) {
    console.error('Sign in error:', err);
    return { success: false, error: getAuthErrorMessage(err) };
  }
};

/**
 * Sign in using Google Account popup
 */
export const signInWithGoogle = async (): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;

    try {
      await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
      }), { merge: true });
    } catch (e) {
      console.warn('Could not save google user in firestore:', e);
    }

    await syncCloudToLocalDB();
    window.dispatchEvent(new CustomEvent('dbUpdated'));

    return { success: true, user };
  } catch (err: any) {
    console.error('Google sign in error:', err);
    return { success: false, error: getAuthErrorMessage(err) };
  }
};

/**
 * Sign out current teacher account
 */
export const signOutTeacher = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await signOut(auth);
    // Continue with anonymous auth fallback
    signInAnonymously(auth).catch(() => {});
    return { success: true };
  } catch (err: any) {
    console.error('Sign out error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Listen to Auth state changes
 */
export const subscribeToAuthChanges = (callback: (user: User | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};


