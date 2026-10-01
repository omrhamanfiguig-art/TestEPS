import { TextbookSession } from '../types';
import { 
  saveTextbookSessionToCloud, 
  deleteTextbookSessionFromCloud, 
  fetchTextbookSessionsFromCloud 
} from './firebase';

const TEXTBOOK_STORAGE_KEY = 'eps_textbook_sessions_v1';

export const getTextbookSessions = async (): Promise<TextbookSession[]> => {
  try {
    // Try to fetch from cloud first
    const cloudSessions = await fetchTextbookSessionsFromCloud();
    if (cloudSessions && cloudSessions.length > 0) {
      localStorage.setItem(TEXTBOOK_STORAGE_KEY, JSON.stringify(cloudSessions));
      return cloudSessions;
    }
  } catch (err) {
    console.warn('Failed to fetch textbook sessions from cloud, loading from local cache:', err);
  }

  try {
    const raw = localStorage.getItem(TEXTBOOK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveTextbookSession = async (session: TextbookSession): Promise<void> => {
  if (!session || !session.id) return;

  try {
    const raw = localStorage.getItem(TEXTBOOK_STORAGE_KEY);
    let list: TextbookSession[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.unshift(session);
    }
    localStorage.setItem(TEXTBOOK_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage save textbook session notice:', e);
  }

  // Sync with Firestore Cloud in real-time
  saveTextbookSessionToCloud(session).catch(e => {
    console.warn('Cloud save textbook session notice:', e);
  });

  window.dispatchEvent(new CustomEvent('dbUpdated'));
};

export const deleteTextbookSession = async (sessionId: string): Promise<void> => {
  try {
    const raw = localStorage.getItem(TEXTBOOK_STORAGE_KEY);
    if (raw) {
      let list: TextbookSession[] = JSON.parse(raw);
      list = list.filter(s => s.id !== sessionId);
      localStorage.setItem(TEXTBOOK_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('LocalStorage delete textbook session notice:', e);
  }

  // Delete from Firestore Cloud in real-time
  deleteTextbookSessionFromCloud(sessionId).catch(e => {
    console.warn('Cloud delete textbook session notice:', e);
  });

  window.dispatchEvent(new CustomEvent('dbUpdated'));
};
