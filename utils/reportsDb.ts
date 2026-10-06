import { PedagogicalReport } from '../types';

const REPORTS_STORAGE_KEY = 'eps_pedagogical_reports_v1';

export const getPedagogicalReports = async (className?: string): Promise<PedagogicalReport[]> => {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    const list: PedagogicalReport[] = raw ? JSON.parse(raw) : [];
    if (className && className !== 'ALL') {
      return list.filter(r => r.className === className);
    }
    return list;
  } catch (e) {
    console.warn('Error loading pedagogical reports:', e);
    return [];
  }
};

export const getStudentReports = async (studentNumber: string): Promise<PedagogicalReport[]> => {
  try {
    const all = await getPedagogicalReports();
    return all.filter(r => r.studentNumber === studentNumber);
  } catch {
    return [];
  }
};

export const savePedagogicalReport = async (report: PedagogicalReport): Promise<void> => {
  if (!report || !report.id) return;

  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    let list: PedagogicalReport[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(r => r.id === report.id);
    if (idx >= 0) {
      list[idx] = { ...report, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...report, createdAt: report.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage save pedagogical report notice:', e);
  }

  window.dispatchEvent(new CustomEvent('reportsUpdated'));
  window.dispatchEvent(new CustomEvent('dbUpdated'));
};

export const deletePedagogicalReport = async (reportId: string): Promise<void> => {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (raw) {
      let list: PedagogicalReport[] = JSON.parse(raw);
      list = list.filter(r => r.id !== reportId);
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('LocalStorage delete pedagogical report notice:', e);
  }

  window.dispatchEvent(new CustomEvent('reportsUpdated'));
  window.dispatchEvent(new CustomEvent('dbUpdated'));
};
