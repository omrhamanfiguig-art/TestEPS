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
import { getAuth, signInAnonymously } from 'firebase/auth';
import type { StudentIdentity, PhysicalTests, StudentResult } from '../types';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  saveStudentList, 
  getStudentList, 
  getAllClasses, 
  savePhysicalTests, 
  getPhysicalTests,
  saveVmaResults,
  getVmaResults
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
  console.warn('Firebase anonymous auth notice:', err?.message || err);
});

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
  updatedAt: string;
  updatedBy?: string;
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

    const data: CloudClassData = {
      className: className.trim(),
      studentCount: students.length,
      students: (students || []).map(s => ({
        numeroEleve: String(s.numeroEleve || '').trim(),
        nomEleve: String(s.nomEleve || '').trim(),
        sexe: s.sexe || 'M',
        photoUrl: s.photoUrl || undefined
      })),
      updatedAt: new Date().toISOString(),
      updatedBy: 'أستاذ التربية البدنية'
    };

    await setDoc(docRef, data, { merge: true });
    return { success: true };
  } catch (err: any) {
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

    await setDoc(docRef, {
      className: className.trim(),
      results: results || [],
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true };
  } catch (err: any) {
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

    await setDoc(docRef, {
      className: className.trim(),
      results: results || [],
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true };
  } catch (err: any) {
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
      ptSnap.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data && data.className && Array.isArray(data.results)) {
          await savePhysicalTests(data.className, data.results, { skipCloudSync: true });
        }
      });
    } catch (e) {
      console.warn('Physical tests cloud sync notice:', e);
    }

    // Try also to sync VMA results from cloud
    try {
      const vmaSnap = await getDocs(collection(db, 'vma_results'));
      vmaSnap.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data && data.className && Array.isArray(data.results)) {
          await saveVmaResults(data.className, data.results, { skipCloudSync: true });
        }
      });
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
          const data = change.doc.data() as CloudClassData;
          if (data && data.className && Array.isArray(data.students)) {
            await saveStudentList(data.className, data.students, { skipCloudSync: true });
            hasChanges = true;
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
