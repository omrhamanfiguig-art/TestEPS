// utils/db.ts

import type { StudentIdentity, StudentResult, EnduranceResult, PhysicalTests } from '../types';
import { isForbiddenStudentName } from './excelHelper';
import { 
  saveClassToCloud, 
  savePhysicalTestsToCloud, 
  saveVmaResultsToCloud, 
  deleteClassFromCloud 
} from './firebase';

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
export const saveStudentList = async (
  className: string, 
  students: StudentIdentity[], 
  options?: { skipCloudSync?: boolean }
) => {
    const db = await initDB();
    const cleanStudents = (students || []).filter(s => s && s.nomEleve && !isForbiddenStudentName(s.nomEleve) && !isForbiddenStudentName(s.numeroEleve));
    const tx = db.transaction(STUDENTS_STORE, 'readwrite');
    const store = tx.objectStore(STUDENTS_STORE);
    store.put({ className, students: cleanStudents });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Automatically sync to cloud database so all teachers have access
    if (!options?.skipCloudSync && cleanStudents.length > 0) {
      saveClassToCloud(className, cleanStudents).catch(err => {
        console.warn('Background cloud sync notice:', err);
      });
    }
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
export const saveVmaResults = (
  className: string, 
  results: StudentResult[], 
  options?: { skipCloudSync?: boolean }
) => {
    const res = saveData(VMA_STORE, className, results);
    if (!options?.skipCloudSync) {
      saveVmaResultsToCloud(className, results || []).catch(() => {});
    }
    return res;
};
export const getVmaResults = async (className: string): Promise<StudentResult[]> => {
    const raw = await getData<StudentResult>(VMA_STORE, className);
    return (raw || []).filter(v => v && (!v.nomEleve || !isForbiddenStudentName(v.nomEleve)) && (!v.numeroEleve || !isForbiddenStudentName(v.numeroEleve)));
};
export const clearVmaResults = async (className: string) => {
    await saveData(VMA_STORE, className, []);
    saveVmaResultsToCloud(className, []).catch(() => {});
};

// Endurance Results functions
export const saveEnduranceResults = (className: string, results: EnduranceResult[]) => saveData(ENDURANCE_STORE, className, results);
export const getEnduranceResults = (className: string): Promise<EnduranceResult[]> => getData(ENDURANCE_STORE, className);

// Physical Tests functions
export const savePhysicalTests = (
  className: string, 
  results: PhysicalTests[], 
  options?: { skipCloudSync?: boolean }
) => {
    const res = saveData(PHYSICAL_TESTS_STORE, className, results);
    if (!options?.skipCloudSync) {
      savePhysicalTestsToCloud(className, results || []).catch(() => {});
    }
    return res;
};
export const getPhysicalTests = async (className: string): Promise<PhysicalTests[]> => {
    const raw = await getData<PhysicalTests>(PHYSICAL_TESTS_STORE, className);
    return (raw || []).filter(p => p && (!p.nomEleve || !isForbiddenStudentName(p.nomEleve)) && (!p.numeroEleve || !isForbiddenStudentName(p.numeroEleve)));
};
export const clearPhysicalTests = async (className: string) => {
    await saveData(PHYSICAL_TESTS_STORE, className, []);
    savePhysicalTestsToCloud(className, []).catch(() => {});
};

/**
 * Wipe all data from all local IndexedDB stores
 */
export const wipeAllLocalData = async (): Promise<void> => {
  const db = await initDB();
  const stores = [STUDENTS_STORE, PHYSICAL_TESTS_STORE, VMA_STORE, ENDURANCE_STORE];
  const tx = db.transaction(stores, 'readwrite');
  stores.forEach(storeName => {
    tx.objectStore(storeName).clear();
  });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

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

export const deleteClass = async (className: string, options?: { skipCloudSync?: boolean }): Promise<void> => {
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

    await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });

    if (!options?.skipCloudSync) {
        deleteClassFromCloud(className).catch(() => {});
    }
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
        date: (physIdx >= 0 && physicalList[physIdx].date) ? physicalList[physIdx].date : new Date().toISOString(),
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
            id: vmaIdx >= 0 ? vmaList[vmaIdx].id : Date.now(),
            vitesseMoyenne: vmaIdx >= 0 ? vmaList[vmaIdx].vitesseMoyenne : vmaVal,
            date: (vmaIdx >= 0 && vmaList[vmaIdx].date) ? vmaList[vmaIdx].date : new Date().toISOString(),
            ...(vmaIdx >= 0 ? vmaList[vmaIdx] : {}),
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

/**
 * Normalizes Arabic text for flexible search (ignoring hamza variants, taa marbuta, diacritics)
 */
export const normalizeArabicText = (text?: string): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel/diacritics
    .trim();
};

/**
 * Adds a new student to a class list
 */
export const addStudentToClass = async (
  className: string,
  newStudent: StudentIdentity
): Promise<{ success: boolean; error?: string }> => {
  try {
    const students = await getStudentList(className);
    const cleanNum = String(newStudent.numeroEleve || '').trim();
    const cleanName = String(newStudent.nomEleve || '').trim();

    if (!cleanName) {
      return { success: false, error: 'اسم التلميذ مطلوب.' };
    }
    if (!cleanNum) {
      return { success: false, error: 'رقم التلميذ مطلوب.' };
    }

    const exists = students.some(s => String(s.numeroEleve).toLowerCase() === cleanNum.toLowerCase());
    if (exists) {
      return { success: false, error: `الرقم ${cleanNum} مسجل مسبقاً لتلميذ آخر في هذا القسم.` };
    }

    const updated = [...students, { ...newStudent, numeroEleve: cleanNum, nomEleve: cleanName }];
    await saveStudentList(className, updated);
    window.dispatchEvent(new CustomEvent('dbUpdated'));
    return { success: true };
  } catch (err: any) {
    console.error('Error adding student:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء إضافة التلميذ.' };
  }
};

/**
 * Updates an existing student in a class list and syncs tests/vma
 */
export const updateStudentInClass = async (
  className: string,
  oldNumeroEleve: string,
  updatedStudent: StudentIdentity
): Promise<{ success: boolean; error?: string }> => {
  try {
    const students = await getStudentList(className);
    const oldNumClean = String(oldNumeroEleve).trim();
    const newNumClean = String(updatedStudent.numeroEleve || '').trim();
    const newNameClean = String(updatedStudent.nomEleve || '').trim();

    if (!newNameClean) {
      return { success: false, error: 'اسم التلميذ مطلوب.' };
    }
    if (!newNumClean) {
      return { success: false, error: 'رقم التلميذ مطلوب.' };
    }

    // Check if new number conflicts with another student
    if (oldNumClean.toLowerCase() !== newNumClean.toLowerCase()) {
      const conflict = students.some(
        s => String(s.numeroEleve).toLowerCase() === newNumClean.toLowerCase()
      );
      if (conflict) {
        return { success: false, error: `الرقم ${newNumClean} مسجل مسبقاً لتلميذ آخر في هذا القسم.` };
      }
    }

    const index = students.findIndex(s => String(s.numeroEleve).toLowerCase() === oldNumClean.toLowerCase());
    if (index === -1) {
      return { success: false, error: 'لم يتم العثور على التلميذ في اللائحة.' };
    }

    students[index] = {
      ...students[index],
      ...updatedStudent,
      numeroEleve: newNumClean,
      nomEleve: newNameClean
    };
    await saveStudentList(className, students);

    // Sync in physical tests store if exists
    const physicalList = await getPhysicalTests(className);
    let physModified = false;
    const updatedPhysList = physicalList.map(p => {
      if (String(p.numeroEleve).toLowerCase() === oldNumClean.toLowerCase()) {
        physModified = true;
        return {
          ...p,
          numeroEleve: newNumClean,
          nomEleve: newNameClean,
          sexe: updatedStudent.sexe
        };
      }
      return p;
    });
    if (physModified) {
      await savePhysicalTests(className, updatedPhysList);
    }

    // Sync in VMA store if exists
    const vmaList = await getVmaResults(className);
    let vmaModified = false;
    const updatedVmaList = vmaList.map(v => {
      if (String(v.numeroEleve).toLowerCase() === oldNumClean.toLowerCase()) {
        vmaModified = true;
        return {
          ...v,
          numeroEleve: newNumClean,
          nomEleve: newNameClean,
          sexe: updatedStudent.sexe
        };
      }
      return v;
    });
    if (vmaModified) {
      await saveVmaResults(className, updatedVmaList);
    }

    window.dispatchEvent(new CustomEvent('dbUpdated'));
    return { success: true };
  } catch (err: any) {
    console.error('Error updating student:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء تعديل التلميذ.' };
  }
};

/**
 * Deletes a student from a class and clears their tests data
 */
export const deleteStudentFromClass = async (
  className: string,
  numeroEleve: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const students = await getStudentList(className);
    const targetNum = String(numeroEleve).trim().toLowerCase();
    const filtered = students.filter(s => String(s.numeroEleve).trim().toLowerCase() !== targetNum);

    await saveStudentList(className, filtered);

    // Clean physical tests
    const physicalList = await getPhysicalTests(className);
    const filteredPhys = physicalList.filter(p => String(p.numeroEleve).trim().toLowerCase() !== targetNum);
    if (filteredPhys.length !== physicalList.length) {
      await savePhysicalTests(className, filteredPhys);
    }

    // Clean VMA
    const vmaList = await getVmaResults(className);
    const filteredVma = vmaList.filter(v => String(v.numeroEleve).trim().toLowerCase() !== targetNum);
    if (filteredVma.length !== vmaList.length) {
      await saveVmaResults(className, filteredVma);
    }

    window.dispatchEvent(new CustomEvent('dbUpdated'));
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting student:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء حذف التلميذ.' };
  }
};

/**
 * Updates a student's photo in a class list
 */
export const updateStudentPhoto = async (
  className: string,
  numeroEleve: string,
  photoUrl?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const students = await getStudentList(className);
    const targetNum = String(numeroEleve).trim().toLowerCase();
    const index = students.findIndex(s => String(s.numeroEleve).trim().toLowerCase() === targetNum);

    if (index === -1) {
      return { success: false, error: 'لم يتم العثور على التلميذ في اللائحة.' };
    }

    students[index] = {
      ...students[index],
      photoUrl: photoUrl || undefined
    };

    await saveStudentList(className, students);
    window.dispatchEvent(new CustomEvent('dbUpdated'));
    return { success: true };
  } catch (err: any) {
    console.error('Error updating student photo:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء حفظ صورة التلميذ.' };
  }
};

export interface GlobalStudentSearchResult {
  student: StudentIdentity;
  className: string;
  orderIndex: number;
  isPhysicalDone: boolean;
  isVmaDone: boolean;
  isMeasurementsDone: boolean;
  vmaVal?: number;
  imcVal?: number;
}

/**
 * Searches students by name or Massar number across all registered classes
 */
export const searchStudentsGlobal = async (query: string): Promise<GlobalStudentSearchResult[]> => {
  const q = normalizeArabicText(query);
  if (!q) return [];

  const db = await initDB();
  const tx = db.transaction([STUDENTS_STORE, PHYSICAL_TESTS_STORE, VMA_STORE], 'readonly');

  const studentsReq = tx.objectStore(STUDENTS_STORE).getAll();
  const physicalReq = tx.objectStore(PHYSICAL_TESTS_STORE).getAll();
  const vmaReq = tx.objectStore(VMA_STORE).getAll();

  return new Promise((resolve) => {
    tx.oncomplete = () => {
      const allClassStudents = (studentsReq.result || []) as { className: string; students: StudentIdentity[] }[];
      const allPhysical = (physicalReq.result || []) as (PhysicalTests & { className: string })[];
      const allVma = (vmaReq.result || []) as (StudentResult & { className: string })[];

      const results: GlobalStudentSearchResult[] = [];

      for (const classItem of allClassStudents) {
        const cls = classItem.className;
        const students = classItem.students || [];

        students.forEach((s, idx) => {
          const normName = normalizeArabicText(s.nomEleve);
          const normNum = String(s.numeroEleve || '').toLowerCase();
          const normOrder = String(idx + 1);

          if (normName.includes(q) || normNum.includes(q) || normOrder === q) {
            // Find corresponding physical & VMA
            const p = allPhysical.find(item => item.className === cls && String(item.numeroEleve) === String(s.numeroEleve));
            const v = allVma.find(item => item.className === cls && String(item.numeroEleve) === String(s.numeroEleve));

            const isPhysicalDone = !!(
              p && (
                p.vitesse30m !== undefined ||
                p.sautHorizontal !== undefined ||
                p.sautVertical !== undefined ||
                p.lancerMedball !== undefined ||
                p.souplesseAssis !== undefined ||
                p.souplesseDebout !== undefined ||
                p.equilibreStatique !== undefined
              )
            );

            const vmaVal = v?.vma || p?.vma;
            const isVmaDone = !!(vmaVal && vmaVal > 0);

            const isMeasurementsDone = !!(
              p && (p.taille !== undefined || p.poids !== undefined || p.frequenceCardiaque !== undefined)
            );

            let imcVal: number | undefined = undefined;
            if (p?.taille && p?.poids && p.taille > 50 && p.poids > 10) {
              const hm = p.taille / 100;
              imcVal = parseFloat((p.poids / (hm * hm)).toFixed(1));
            }

            results.push({
              student: s,
              className: cls,
              orderIndex: idx + 1,
              isPhysicalDone,
              isVmaDone,
              isMeasurementsDone,
              vmaVal,
              imcVal
            });
          }
        });
      }

      resolve(results);
    };

    tx.onerror = () => {
      resolve([]);
    };
  });
};
