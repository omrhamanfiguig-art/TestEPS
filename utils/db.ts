// utils/db.ts

import type { StudentIdentity, StudentResult, EnduranceResult, PhysicalTests } from '../types';
import { isForbiddenStudentName } from './excelHelper';

const DB_NAME = 'epsAppDB';
const DB_VERSION = 2; // Incremented version for new store
const VMA_STORE = 'vmaResults';
const ENDURANCE_STORE = 'enduranceResults';
const STUDENTS_STORE = 'studentLists';
const PHYSICAL_TESTS_STORE = 'physicalTestsResults';

let dbPromise: Promise<IDBDatabase> | null = null;

// Function to initialize the database
const initDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      
      if (!dbInstance.objectStoreNames.contains(VMA_STORE)) {
        const vmaStore = dbInstance.createObjectStore(VMA_STORE, { keyPath: 'id', autoIncrement: true });
        vmaStore.createIndex('className', 'className', { unique: false });
      }

      if (!dbInstance.objectStoreNames.contains(ENDURANCE_STORE)) {
        const enduranceStore = dbInstance.createObjectStore(ENDURANCE_STORE, { keyPath: 'id', autoIncrement: true });
        enduranceStore.createIndex('className', 'className', { unique: false });
      }

      if (!dbInstance.objectStoreNames.contains(STUDENTS_STORE)) {
        dbInstance.createObjectStore(STUDENTS_STORE, { keyPath: 'className' });
      }
      
      if (!dbInstance.objectStoreNames.contains(PHYSICAL_TESTS_STORE)) {
        const physicalTestsStore = dbInstance.createObjectStore(PHYSICAL_TESTS_STORE, { keyPath: 'id', autoIncrement: true });
        physicalTestsStore.createIndex('className', 'className', { unique: false });
      }
    };
  });
  return dbPromise;
};

const saveData = async <T>(storeName: string, className: string, data: T[]) => {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    const index = store.index('className');
    const cursorRequest = index.openCursor(IDBKeyRange.only(className));
    
    // Promise to handle deletion completion
    const deletionPromise = new Promise<void>((resolve) => {
        let first = true;
        cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            } else {
                resolve();
            }
        };
        cursorRequest.onerror = () => {
            console.error('Error clearing old data');
            resolve(); // Resolve anyway to not block adding
        };
    });

    await deletionPromise;

    // Add new data
    data.forEach(item => {
        // Omitting 'id' for auto-increment stores
        const { id, ...itemWithoutId } = item as any;
        store.add({ ...itemWithoutId, className });
    });

    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getData = async <T>(storeName: string, className: string): Promise<T[]> => {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index('className');
    const request = index.getAll(IDBKeyRange.only(className));
    
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
    });
};

// Student List functions
export const saveStudentList = async (className: string, students: StudentIdentity[]) => {
    const db = await initDB();
    const cleanStudents = (students || []).filter(s => s && s.nomEleve && !isForbiddenStudentName(s.nomEleve) && !isForbiddenStudentName(s.numeroEleve));
    const tx = db.transaction(STUDENTS_STORE, 'readwrite');
    const store = tx.objectStore(STUDENTS_STORE);
    const request = store.put({ className, students: cleanStudents });

    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
};

export const getStudentList = async (className: string): Promise<StudentIdentity[]> => {
    const db = await initDB();
    const tx = db.transaction(STUDENTS_STORE, 'readonly');
    const store = tx.objectStore(STUDENTS_STORE);
    const request = store.get(className);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const rawStudents: StudentIdentity[] = request.result?.students || [];
          const cleanStudents = rawStudents.filter(s => s && s.nomEleve && !isForbiddenStudentName(s.nomEleve) && !isForbiddenStudentName(s.numeroEleve));
          if (rawStudents.length !== cleanStudents.length) {
            saveStudentList(className, cleanStudents).catch(() => {});
          }
          resolve(cleanStudents);
        };
        request.onerror = () => {
          console.error(request.error);
          reject(request.error);
        };
    });
};

// VMA Results functions
export const saveVmaResults = (className: string, results: StudentResult[]) => saveData(VMA_STORE, className, results);
export const getVmaResults = async (className: string): Promise<StudentResult[]> => {
    const raw = await getData<StudentResult>(VMA_STORE, className);
    return (raw || []).filter(v => v && (!v.nomEleve || !isForbiddenStudentName(v.nomEleve)) && (!v.numeroEleve || !isForbiddenStudentName(v.numeroEleve)));
};
export const clearVmaResults = (className: string) => saveData(VMA_STORE, className, []);

// Endurance Results functions
export const saveEnduranceResults = (className: string, results: EnduranceResult[]) => saveData(ENDURANCE_STORE, className, results);
export const getEnduranceResults = (className: string): Promise<EnduranceResult[]> => getData(ENDURANCE_STORE, className);

// Physical Tests functions
export const savePhysicalTests = (className: string, results: PhysicalTests[]) => saveData(PHYSICAL_TESTS_STORE, className, results);
export const getPhysicalTests = async (className: string): Promise<PhysicalTests[]> => {
    const raw = await getData<PhysicalTests>(PHYSICAL_TESTS_STORE, className);
    return (raw || []).filter(p => p && (!p.nomEleve || !isForbiddenStudentName(p.nomEleve)) && (!p.numeroEleve || !isForbiddenStudentName(p.numeroEleve)));
};
export const clearPhysicalTests = (className: string) => saveData(PHYSICAL_TESTS_STORE, className, []);

// Utility to get all available classes and their stats
export interface ClassStats {
    className: string;
    studentCount: number;
    boysCount: number;
    girlsCount: number;
    testedCount: number;
    vmaCount: number;
    measurementsCount: number;
}

export const getAllClasses = async (): Promise<ClassStats[]> => {
    const db = await initDB();
    const tx = db.transaction([STUDENTS_STORE, PHYSICAL_TESTS_STORE, VMA_STORE], 'readonly');
    
    const studentsStore = tx.objectStore(STUDENTS_STORE);
    const studentsRequest = studentsStore.getAll();
    
    const physicalStore = tx.objectStore(PHYSICAL_TESTS_STORE);
    const physicalRequest = physicalStore.getAll();

    const vmaStore = tx.objectStore(VMA_STORE);
    const vmaRequest = vmaStore.getAll();

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => {
            const allStudents = studentsRequest.result as { className: string; students: StudentIdentity[] }[];
            const allPhysical = physicalRequest.result as (PhysicalTests & { className: string })[];
            const allVma = vmaRequest.result as (StudentResult & { className: string })[];

            const classMap = new Map<string, ClassStats>();

            // Base classes from students list
            allStudents.forEach(item => {
                const validStudents = (item.students || []).filter(s => s && s.nomEleve && !isForbiddenStudentName(s.nomEleve));
                const boys = validStudents.filter(s => s.sexe === 'M').length;
                const girls = validStudents.filter(s => s.sexe === 'F').length;
                classMap.set(item.className, {
                    className: item.className,
                    studentCount: validStudents.length,
                    boysCount: boys,
                    girlsCount: girls,
                    testedCount: 0,
                    vmaCount: 0,
                    measurementsCount: 0
                });
            });

            // Count tested students (Physical Tests & Anthropometrics)
            allPhysical.forEach(item => {
                const stats = classMap.get(item.className);
                if (stats) {
                    // Check if physical test is filled
                    const isPhysicalTested = (
                        item.vitesse30m !== undefined ||
                        item.sautHorizontal !== undefined ||
                        item.sautVertical !== undefined ||
                        item.lancerMedball !== undefined ||
                        item.souplesseAssis !== undefined ||
                        item.souplesseDebout !== undefined ||
                        item.equilibreStatique !== undefined
                    );
                    if (isPhysicalTested) stats.testedCount++;

                    // Check if measurement is filled
                    const isMeasured = (
                        item.taille !== undefined ||
                        item.poids !== undefined ||
                        item.frequenceCardiaque !== undefined
                    );
                    if (isMeasured) stats.measurementsCount++;

                    // If VMA was saved inside physical test
                    if (item.vma !== undefined && item.vma > 0) {
                        stats.vmaCount = Math.max(stats.vmaCount, stats.vmaCount + 1);
                    }
                }
            });

            // Count VMA students from VMA store
            allVma.forEach(item => {
                const stats = classMap.get(item.className);
                if (stats && item.vma) {
                    stats.vmaCount++;
                }
            });

            resolve(Array.from(classMap.values()));
        };
        tx.onerror = () => reject(tx.error);
    });
};

export const deleteClass = async (className: string): Promise<void> => {
    const db = await initDB();
    const stores = [STUDENTS_STORE, PHYSICAL_TESTS_STORE, VMA_STORE, ENDURANCE_STORE];
    const tx = db.transaction(stores, 'readwrite');

    // 1. Delete from studentLists (keyed by className)
    tx.objectStore(STUDENTS_STORE).delete(className);

    // 2. Helper to delete indexed stores
    const deleteFromStoreWithIndex = (storeName: string) => {
        const store = tx.objectStore(storeName);
        const index = store.index('className');
        const req = index.openCursor(IDBKeyRange.only(className));
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
    };

    deleteFromStoreWithIndex(PHYSICAL_TESTS_STORE);
    deleteFromStoreWithIndex(VMA_STORE);
    deleteFromStoreWithIndex(ENDURANCE_STORE);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export interface CompleteStudentData {
    student: StudentIdentity;
    physicalTest?: PhysicalTests;
    vmaResult?: StudentResult;
}

export const getCompleteStudentData = async (
    className: string,
    numeroEleve: string
): Promise<CompleteStudentData | null> => {
    const students = await getStudentList(className);
    const student = students.find(s => s.numeroEleve === numeroEleve);
    if (!student) return null;

    const physicalList = await getPhysicalTests(className);
    const physicalTest = physicalList.find(p => p.numeroEleve === numeroEleve);

    const vmaList = await getVmaResults(className);
    const vmaResult = vmaList.find(v => v.numeroEleve === numeroEleve);

    return { student, physicalTest, vmaResult };
};

export const saveCompleteStudentData = async (
    className: string,
    oldNumeroEleve: string,
    studentIdentity: StudentIdentity,
    physicalUpdates: Partial<PhysicalTests>,
    vmaVal?: number
): Promise<void> => {
    // 1. Update Student Identity in studentLists
    const students = await getStudentList(className);
    const studentIdx = students.findIndex(s => s.numeroEleve === oldNumeroEleve);
    if (studentIdx >= 0) {
        students[studentIdx] = { ...students[studentIdx], ...studentIdentity };
    } else {
        students.push(studentIdentity);
    }
    await saveStudentList(className, students);

    // 2. Update Physical Tests
    const physicalList = await getPhysicalTests(className);
    const physIdx = physicalList.findIndex(p => p.numeroEleve === oldNumeroEleve);
    const mergedPhysical: PhysicalTests = {
        ...(physIdx >= 0 ? physicalList[physIdx] : {}),
        ...physicalUpdates,
        className,
        numeroEleve: studentIdentity.numeroEleve,
        nomEleve: studentIdentity.nomEleve,
        sexe: studentIdentity.sexe,
        ...(vmaVal !== undefined && vmaVal > 0 ? { vma: vmaVal } : {})
    };

    if (physIdx >= 0) {
        physicalList[physIdx] = mergedPhysical;
    } else {
        physicalList.push(mergedPhysical);
    }
    await savePhysicalTests(className, physicalList);

    // 3. Update VMA store if vmaVal is provided
    if (vmaVal !== undefined && vmaVal > 0) {
        const vmaList = await getVmaResults(className);
        const vmaIdx = vmaList.findIndex(v => v.numeroEleve === oldNumeroEleve);
        const existingPalier = (vmaIdx >= 0 && vmaList[vmaIdx].palierAtteint) ? vmaList[vmaIdx].palierAtteint : Math.max(1, Math.round((vmaVal - 8) / 0.5) + 1);
        const updatedVma: StudentResult = {
            ...(vmaIdx >= 0 ? vmaList[vmaIdx] : { palierAtteint: existingPalier }),
            numeroEleve: studentIdentity.numeroEleve,
            nomEleve: studentIdentity.nomEleve,
            sexe: studentIdentity.sexe,
            vma: vmaVal,
            palierAtteint: existingPalier
        };
        if (vmaIdx >= 0) {
            vmaList[vmaIdx] = updatedVma;
        } else {
            vmaList.push(updatedVma);
        }
        await saveVmaResults(className, vmaList);
    }

    // 4. Dispatch update event
    window.dispatchEvent(new CustomEvent('dbUpdated'));
};
