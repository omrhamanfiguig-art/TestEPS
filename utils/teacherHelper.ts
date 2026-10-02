// utils/teacherHelper.ts
import { fetchTeacherProfilesFromCloud, saveTeacherProfileToCloud } from './firebase';

export interface TeacherProfile {
  id: string;
  name: string;
  assignedClasses: string[];
  timetable?: Record<string, Record<string, string>>;
}

export const DEFAULT_TEACHERS: TeacherProfile[] = [
  {
    id: 'teacher_1',
    name: 'أحمد السعيدي',
    assignedClasses: [],
    timetable: {}
  },
  {
    id: 'teacher_2',
    name: 'فاطمة الزهراء',
    assignedClasses: [],
    timetable: {}
  },
  {
    id: 'teacher_3',
    name: 'يوسف العراقي',
    assignedClasses: [],
    timetable: {}
  }
];

export const EDUCATIONAL_LEVELS = [
  { key: 'all', label: 'جميع المستويات', shortLabel: 'الكل' },
  { key: '1apic', label: 'الأولى إعدادي (1APIC)', shortLabel: '1APIC' },
  { key: '2apic', label: 'الثانية إعدادي (2APIC)', shortLabel: '2APIC' },
  { key: '3apic', label: 'الثالثة إعدادي (3APIC)', shortLabel: '3APIC' },
  { key: 'tc', label: 'الجدع المشترك (TC)', shortLabel: 'TC' },
  { key: '1bac', label: 'الأولى باكالوريا (1BAC)', shortLabel: '1BAC' },
  { key: '2bac', label: 'الثانية باكالوريا (2BAC)', shortLabel: '2BAC' },
  { key: 'other', label: 'مستويات أخرى', shortLabel: 'أخرى' },
] as const;

export type LevelKey = typeof EDUCATIONAL_LEVELS[number]['key'];

const TEACHERS_STORAGE_KEY = 'eps_teachers_profiles';
const CLASS_LEVELS_STORAGE_KEY = 'eps_class_levels_map';

/**
 * Get all teacher profiles from localStorage (with cloud fallback)
 */
export const getTeacherProfiles = (): TeacherProfile[] => {
  try {
    const raw = localStorage.getItem(TEACHERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading teacher profiles:', e);
  }
  return DEFAULT_TEACHERS;
};

/**
 * Save teacher profiles locally and sync to cloud
 */
export const saveTeacherProfiles = (profiles: TeacherProfile[]): void => {
  try {
    localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(profiles));
    window.dispatchEvent(new CustomEvent('teachersUpdated', { detail: profiles }));
    window.dispatchEvent(new CustomEvent('dbUpdated'));
    
    // Cloud sync for each profile
    profiles.forEach(p => {
      saveTeacherProfileToCloud(p.id, {
        name: p.name,
        assignedClasses: p.assignedClasses,
        timetable: p.timetable
      }).catch(err => console.warn('Cloud teacher save notice:', err));
    });
  } catch (e) {
    console.warn('Error saving teacher profiles:', e);
  }
};

/**
 * Fetch profiles from Cloud Firestore and merge into local cache
 */
export const syncTeachersFromCloud = async (): Promise<TeacherProfile[]> => {
  try {
    const cloudProfiles = await fetchTeacherProfilesFromCloud();
    if (cloudProfiles && cloudProfiles.length > 0) {
      const current = getTeacherProfiles();
      const merged = current.map(localT => {
        const found = cloudProfiles.find((cp: any) => cp.id === localT.id);
        if (found) {
          return {
            ...localT,
            name: found.name || localT.name,
            assignedClasses: found.assignedClasses || localT.assignedClasses,
            timetable: found.timetable || localT.timetable
          };
        }
        return localT;
      });
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Teacher cloud sync failed:', err);
  }
  return getTeacherProfiles();
};

/**
 * Get assigned teacher name for a specific class
 */
export const getTeacherForClass = (className: string): string => {
  if (!className) return '';
  const profiles = getTeacherProfiles();
  const found = profiles.find(t => t.assignedClasses && t.assignedClasses.includes(className));
  return found ? found.name : '';
};

/**
 * Get assigned teacher ID for a specific class
 */
export const getTeacherIdForClass = (className: string): string => {
  if (!className) return '';
  const profiles = getTeacherProfiles();
  const found = profiles.find(t => t.assignedClasses && t.assignedClasses.includes(className));
  return found ? found.id : '';
};

/**
 * Assign a teacher to a class (removes from previous teacher if any)
 */
export const assignTeacherToClass = (className: string, teacherIdOrName: string): void => {
  if (!className) return;
  const profiles = getTeacherProfiles();
  
  const updated = profiles.map(t => {
    const classesWithoutCurrent = (t.assignedClasses || []).filter(c => c !== className);
    // Match either by ID or Name
    if (t.id === teacherIdOrName || t.name === teacherIdOrName) {
      return {
        ...t,
        assignedClasses: [...classesWithoutCurrent, className]
      };
    }
    return {
      ...t,
      assignedClasses: classesWithoutCurrent
    };
  });

  saveTeacherProfiles(updated);
};

/**
 * Add a new teacher profile
 */
export const addTeacherProfile = (name: string): TeacherProfile => {
  const cleanName = name.trim();
  const profiles = getTeacherProfiles();
  const newTeacher: TeacherProfile = {
    id: `teacher_${Date.now()}`,
    name: cleanName,
    assignedClasses: [],
    timetable: {}
  };
  const updated = [...profiles, newTeacher];
  saveTeacherProfiles(updated);
  return newTeacher;
};

/**
 * Delete a teacher profile
 */
export const deleteTeacherProfile = (id: string): void => {
  const profiles = getTeacherProfiles();
  const updated = profiles.filter(t => t.id !== id);
  saveTeacherProfiles(updated);
};

/**
 * Rename a teacher profile
 */
export const renameTeacherProfile = (id: string, newName: string): void => {
  const cleanName = newName.trim();
  if (!cleanName) return;
  const profiles = getTeacherProfiles();
  const updated = profiles.map(t => t.id === id ? { ...t, name: cleanName } : t);
  saveTeacherProfiles(updated);
};

/**
 * Intelligently detect the educational level from a Moroccan class name
 * e.g.:
 *  "TARL-1APIC-1" -> "1apic"
 *  "2APIC-3" -> "2apic"
 *  "3AC-1" / "3APIC-2" -> "3apic"
 *  "TCS-1" / "TCL-2" / "TC-1" -> "tc"
 *  "1BAC-SE-1" -> "1bac"
 *  "2BAC-PC" -> "2bac"
 */
export const detectLevelFromClassName = (className: string): { key: LevelKey; label: string; shortLabel: string } => {
  if (!className) return EDUCATIONAL_LEVELS[7]; // other
  const clean = className.toUpperCase().replace(/\s+/g, '');

  // 1. Check user manual override in local storage
  try {
    const rawMap = localStorage.getItem(CLASS_LEVELS_STORAGE_KEY);
    if (rawMap) {
      const map = JSON.parse(rawMap);
      if (map[className]) {
        const found = EDUCATIONAL_LEVELS.find(l => l.key === map[className]);
        if (found) return found;
      }
    }
  } catch (e) {}

  // 2. Automated detection rules
  if (clean.includes('1APIC') || clean.includes('1AC') || clean.includes('1-APIC') || clean.includes('1/1') || clean.includes('1/2') || clean.includes('1/3') || clean.includes('1/4') || clean.includes('1/5') || clean.includes('1ERE') || clean.includes('أولى')) {
    return EDUCATIONAL_LEVELS[1]; // 1apic
  }
  if (clean.includes('2APIC') || clean.includes('2AC') || clean.includes('2-APIC') || clean.includes('2/1') || clean.includes('2/2') || clean.includes('2/3') || clean.includes('2/4') || clean.includes('2/5') || clean.includes('2EME') || clean.includes('ثانية')) {
    return EDUCATIONAL_LEVELS[2]; // 2apic
  }
  if (clean.includes('3APIC') || clean.includes('3AC') || clean.includes('3-APIC') || clean.includes('3/1') || clean.includes('3/2') || clean.includes('3/3') || clean.includes('3/4') || clean.includes('3/5') || clean.includes('3EME') || clean.includes('ثالثة')) {
    return EDUCATIONAL_LEVELS[3]; // 3apic
  }
  if (clean.includes('TCS') || clean.includes('TCL') || clean.includes('TCC') || clean.includes('TC-') || clean.includes('TC1') || clean.includes('TC2') || clean.includes('TC3') || clean.includes('TRONC') || clean.includes('مشترك') || clean.includes('جدع')) {
    return EDUCATIONAL_LEVELS[4]; // tc
  }
  if (clean.includes('1BAC') || clean.includes('1-BAC') || clean.includes('1BACSE') || clean.includes('1BACSM') || clean.includes('1BACLET') || clean.includes('1B')) {
    return EDUCATIONAL_LEVELS[5]; // 1bac
  }
  if (clean.includes('2BAC') || clean.includes('2-BAC') || clean.includes('2BACPC') || clean.includes('2BACSVT') || clean.includes('2BACSM') || clean.includes('2BACLET') || clean.includes('2B')) {
    return EDUCATIONAL_LEVELS[6]; // 2bac
  }

  return EDUCATIONAL_LEVELS[7]; // other
};

/**
 * Save manual override for class level
 */
export const saveClassLevel = (className: string, levelKey: LevelKey): void => {
  try {
    const rawMap = localStorage.getItem(CLASS_LEVELS_STORAGE_KEY);
    const map = rawMap ? JSON.parse(rawMap) : {};
    map[className] = levelKey;
    localStorage.setItem(CLASS_LEVELS_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('dbUpdated'));
  } catch (e) {
    console.warn('Error saving class level override:', e);
  }
};
