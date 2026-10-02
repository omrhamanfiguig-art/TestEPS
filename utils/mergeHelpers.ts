import type { StudentIdentity, StudentResult, PhysicalTests } from '../types';

/**
 * Merges two arrays of physical test results by student number (`numeroEleve`).
 * Non-empty fields in `newList` overlay onto `existingList`, preserving fields from both.
 */
export const mergePhysicalTests = (
  existingList: PhysicalTests[],
  newList: PhysicalTests[]
): PhysicalTests[] => {
  const map = new Map<string, PhysicalTests>();

  (existingList || []).forEach(item => {
    if (item && item.numeroEleve) {
      map.set(String(item.numeroEleve).trim(), { ...item });
    }
  });

  (newList || []).forEach(item => {
    if (item && item.numeroEleve) {
      const key = String(item.numeroEleve).trim();
      const existing = map.get(key);
      if (existing) {
        const merged: any = { ...existing };
        Object.keys(item).forEach(k => {
          const val = (item as any)[k];
          if (val !== undefined && val !== null && val !== '') {
            merged[k] = val;
          }
        });
        map.set(key, merged);
      } else {
        map.set(key, { ...item });
      }
    }
  });

  return Array.from(map.values());
};

/**
 * Merges two arrays of VMA test results by student number (`numeroEleve`).
 */
export const mergeStudentResults = (
  existingList: StudentResult[],
  newList: StudentResult[]
): StudentResult[] => {
  const map = new Map<string, StudentResult>();

  (existingList || []).forEach(item => {
    if (item && item.numeroEleve) {
      map.set(String(item.numeroEleve).trim(), { ...item });
    }
  });

  (newList || []).forEach(item => {
    if (item && item.numeroEleve) {
      const key = String(item.numeroEleve).trim();
      const existing = map.get(key);
      if (existing) {
        const merged: any = { ...existing };
        Object.keys(item).forEach(k => {
          const val = (item as any)[k];
          if (val !== undefined && val !== null && val !== '') {
            merged[k] = val;
          }
        });
        map.set(key, merged);
      } else {
        map.set(key, { ...item });
      }
    }
  });

  return Array.from(map.values());
};

/**
 * Merges two student rosters by student number (`numeroEleve`).
 */
export const mergeStudentLists = (
  existingList: StudentIdentity[],
  newList: StudentIdentity[]
): StudentIdentity[] => {
  const map = new Map<string, StudentIdentity>();

  (existingList || []).forEach(s => {
    if (s && s.numeroEleve) {
      map.set(String(s.numeroEleve).trim(), { ...s });
    }
  });

  (newList || []).forEach(s => {
    if (s && s.numeroEleve) {
      const key = String(s.numeroEleve).trim();
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          nomEleve: s.nomEleve || existing.nomEleve,
          sexe: s.sexe || existing.sexe,
          photoUrl: s.photoUrl || existing.photoUrl,
          orderIndex: s.orderIndex || existing.orderIndex
        });
      } else {
        map.set(key, { ...s });
      }
    }
  });

  return Array.from(map.values());
};
