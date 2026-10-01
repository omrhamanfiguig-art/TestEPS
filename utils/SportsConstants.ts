import { useState, useEffect } from 'react';

export interface SportType {
    id: string;
    labelAr: string;
    labelFr: string;
    icon: string;
    isCustom?: boolean;
}

const DEFAULT_SPORTS: SportType[] = [
    { id: 'football', labelAr: 'كرة القدم', labelFr: 'Football', icon: '⚽' },
    { id: 'basketball', labelAr: 'كرة السلة', labelFr: 'Basketball', icon: '🏀' },
    { id: 'handball', labelAr: 'كرة اليد', labelFr: 'Handball', icon: '🤾' },
    { id: 'volleyball', labelAr: 'كرة الطائرة', labelFr: 'Volleyball', icon: '🏐' },
    { id: 'athletics', labelAr: 'ألعاب القوى', labelFr: 'Athlétisme', icon: '🏆' },
    { id: 'long-jump', labelAr: 'القفز الطولي', labelFr: 'Saut en Longueur', icon: '👟' },
    { id: 'gymnastics', labelAr: 'الجمباز', labelFr: 'Gymnastique', icon: '🤸' },
    { id: 'shot-put', labelAr: 'دفع الجلة', labelFr: 'Lancer du Poids', icon: '☄️' },
    { id: 'sprint', labelAr: 'الجري السريع', labelFr: 'Sprint', icon: '🏃' },
    { id: 'endurance', labelAr: 'جري الجلد', labelFr: 'Endurance', icon: '⏳' },
];

const STORAGE_KEY = 'eps_sports_list_v1';

export const getSportsList = (): SportType[] => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading sports list', e);
    }
    return DEFAULT_SPORTS;
};

export const saveSportsList = (list: SportType[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('sportsUpdated'));
};

export const useSportsList = () => {
    const [sports, setSports] = useState<SportType[]>(getSportsList());

    useEffect(() => {
        const handleUpdate = () => setSports(getSportsList());
        window.addEventListener('sportsUpdated', handleUpdate);
        return () => window.removeEventListener('sportsUpdated', handleUpdate);
    }, []);

    const addSport = (labelAr: string, labelFr: string, icon: string) => {
        const newSport: SportType = {
            id: `custom_${Date.now()}`,
            labelAr,
            labelFr,
            icon,
            isCustom: true
        };
        const newList = [...sports, newSport];
        saveSportsList(newList);
    };

    const editSport = (id: string, labelAr: string, labelFr: string, icon: string) => {
        const newList = sports.map(s => s.id === id ? { ...s, labelAr, labelFr, icon } : s);
        saveSportsList(newList);
    };

    const deleteSport = (id: string) => {
        const newList = sports.filter(s => s.id !== id);
        saveSportsList(newList);
    };

    const resetSports = () => {
        saveSportsList(DEFAULT_SPORTS);
    };

    return { sports, addSport, editSport, deleteSport, resetSports };
};
