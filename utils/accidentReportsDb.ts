import { SchoolAccidentReport } from '../types';

const ACCIDENT_REPORTS_STORAGE_KEY = 'eps_school_accident_reports_v1';

export const getSchoolAccidentReports = async (className?: string): Promise<SchoolAccidentReport[]> => {
  try {
    const raw = localStorage.getItem(ACCIDENT_REPORTS_STORAGE_KEY);
    const list: SchoolAccidentReport[] = raw ? JSON.parse(raw) : [];
    if (className && className !== 'ALL') {
      return list.filter(r => r.className === className);
    }
    return list;
  } catch (e) {
    console.warn('Error loading school accident reports:', e);
    return [];
  }
};

export const getStudentAccidentReports = async (studentNumber: string): Promise<SchoolAccidentReport[]> => {
  try {
    const all = await getSchoolAccidentReports();
    return all.filter(r => r.studentNumber === studentNumber);
  } catch {
    return [];
  }
};

export const saveSchoolAccidentReport = async (report: SchoolAccidentReport): Promise<void> => {
  if (!report || !report.id) return;

  try {
    const raw = localStorage.getItem(ACCIDENT_REPORTS_STORAGE_KEY);
    let list: SchoolAccidentReport[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(r => r.id === report.id);
    if (idx >= 0) {
      list[idx] = { ...report, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ 
        ...report, 
        createdAt: report.createdAt || new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      });
    }
    localStorage.setItem(ACCIDENT_REPORTS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage save school accident report notice:', e);
  }

  window.dispatchEvent(new CustomEvent('accidentReportsUpdated'));
  window.dispatchEvent(new CustomEvent('reportsUpdated'));
  window.dispatchEvent(new CustomEvent('dbUpdated'));
};

export const deleteSchoolAccidentReport = async (reportId: string): Promise<void> => {
  try {
    const raw = localStorage.getItem(ACCIDENT_REPORTS_STORAGE_KEY);
    if (raw) {
      let list: SchoolAccidentReport[] = JSON.parse(raw);
      list = list.filter(r => r.id !== reportId);
      localStorage.setItem(ACCIDENT_REPORTS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('LocalStorage delete school accident report notice:', e);
  }

  window.dispatchEvent(new CustomEvent('accidentReportsUpdated'));
  window.dispatchEvent(new CustomEvent('reportsUpdated'));
  window.dispatchEvent(new CustomEvent('dbUpdated'));
};
