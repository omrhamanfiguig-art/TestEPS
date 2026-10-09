import type { StudentIdentity, PhysicalTests, StudentResult, MassarActivityKey, MassarGradeRecord, MassarClassConfig } from '../types';
import { normalizeArabic, isForbiddenStudentName } from './excelHelper';
import { calculateScore, getCustomScale } from './ScoringConstants';

export interface MassarActivityMeta {
  key: MassarActivityKey;
  nameAr: string;
  shortAr: string;
  nameFr: string;
  icon: string;
  badgeColor: string;
  category: 'sports_collectifs' | 'gymnastique' | 'athletisme' | 'condition_physique' | 'global';
}

export const MASSAR_ACTIVITIES: MassarActivityMeta[] = [
  {
    key: 'sport_collectif',
    nameAr: 'الألعاب الجماعية (الرياضة المختارة)',
    shortAr: 'ألعاب جماعية',
    nameFr: 'Sports Collectifs (Général)',
    icon: '⚽',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    category: 'sports_collectifs'
  },
  {
    key: 'football',
    nameAr: 'كرة القدم (Football)',
    shortAr: 'كرة القدم',
    nameFr: 'Football',
    icon: '⚽',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    category: 'sports_collectifs'
  },
  {
    key: 'basketball',
    nameAr: 'كرة السلة (Basketball)',
    shortAr: 'كرة السلة',
    nameFr: 'Basketball',
    icon: '🏀',
    badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    category: 'sports_collectifs'
  },
  {
    key: 'handball',
    nameAr: 'كرة اليد (Handball)',
    shortAr: 'كرة اليد',
    nameFr: 'Handball',
    icon: '🤾',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    category: 'sports_collectifs'
  },
  {
    key: 'volleyball',
    nameAr: 'الكرة الطائرة (Volleyball)',
    shortAr: 'الكرة الطائرة',
    nameFr: 'Volleyball',
    icon: '🏐',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    category: 'sports_collectifs'
  },
  {
    key: 'rugby',
    nameAr: 'الريكبي (Rugby)',
    shortAr: 'الريكبي',
    nameFr: 'Rugby',
    icon: '🏉',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    category: 'sports_collectifs'
  },
  {
    key: 'gymnastique',
    nameAr: 'الجمباز الأرضي والجمباز العام',
    shortAr: 'جمباز أرضي',
    nameFr: 'Gymnastique au sol',
    icon: '🤸',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    category: 'gymnastique'
  },
  {
    key: 'vitesse_30m',
    nameAr: 'سباق السرعة 30 متر (30m Sprint)',
    shortAr: 'سرعة 30م',
    nameFr: 'Course de vitesse 30m',
    icon: '⚡',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    category: 'athletisme'
  },
  {
    key: 'vitesse_60m',
    nameAr: 'سباق السرعة 60 متر (60m Sprint)',
    shortAr: 'سرعة 60م',
    nameFr: 'Course de vitesse 60m',
    icon: '⚡',
    badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    category: 'athletisme'
  },
  {
    key: 'vitesse_80m',
    nameAr: 'سباق السرعة 80 متر (80m Sprint)',
    shortAr: 'سرعة 80م',
    nameFr: 'Course de vitesse 80m',
    icon: '⚡',
    badgeColor: 'bg-orange-200 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border-orange-300 dark:border-orange-700',
    category: 'athletisme'
  },
  {
    key: 'vitesse_100m',
    nameAr: 'سباق السرعة 100 متر (100m Sprint)',
    shortAr: 'سرعة 100م',
    nameFr: 'Course de vitesse 100m',
    icon: '⚡',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    category: 'athletisme'
  },
  {
    key: 'vitesse',
    nameAr: 'سباق السرعة العام (30م / 60م / 80م / 100م)',
    shortAr: 'سباق السرعة',
    nameFr: 'Course de vitesse',
    icon: '⚡',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    category: 'athletisme'
  },
  {
    key: 'endurance',
    nameAr: 'سباق التحمل والجري المكوكي (VMA Luc Léger)',
    shortAr: 'سباق التحمل / VMA',
    nameFr: 'Endurance / VMA (Luc Léger)',
    icon: '🏃',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    category: 'athletisme'
  },
  {
    key: 'saut_long',
    nameAr: 'الوثب الطولي (Saut en longueur)',
    shortAr: 'الوثب الطولي',
    nameFr: 'Saut en longueur',
    icon: '🦘',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    category: 'athletisme'
  },
  {
    key: 'lancer_poids',
    nameAr: 'دفع الجلة (Lancer de poids)',
    shortAr: 'دفع الجلة',
    nameFr: 'Lancer de poids',
    icon: '🏋️',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-950/60 dark:text-slate-300 border-slate-200 dark:border-slate-800',
    category: 'athletisme'
  },
  {
    key: 'lancer_medball',
    nameAr: 'رمي الكرة الطبية (Lancer de médecine-ball)',
    shortAr: 'رمي الكرة الطبية',
    nameFr: 'Lancer Médecine-ball',
    icon: '🏐',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    category: 'condition_physique'
  },
  {
    key: 'saut_vertical',
    nameAr: 'الوثب العمودي (Détente verticale)',
    shortAr: 'الوثب العمودي',
    nameFr: 'Détente verticale',
    icon: '🔝',
    badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    category: 'condition_physique'
  },
  {
    key: 'souplesse',
    nameAr: 'المرونة البدنية (Souplesse)',
    shortAr: 'المرونة البدنية',
    nameFr: 'Souplesse',
    icon: '🧘',
    badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    category: 'condition_physique'
  },
  {
    key: 'global_general',
    nameAr: 'المحضر الإجمالي العام (النقطة الإجمالية من 20)',
    shortAr: 'المحضر الإجمالي',
    nameFr: 'Bilan Global EPS',
    icon: '📊',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    category: 'global'
  }
];

export const getActivityMeta = (key: MassarActivityKey): MassarActivityMeta => {
  return MASSAR_ACTIVITIES.find(a => a.key === key) || MASSAR_ACTIVITIES[0];
};

/**
 * Applies rounding to a score
 */
export const roundScore = (val: number, rounding: MassarClassConfig['rounding']): number => {
  if (rounding === '0.25') {
    return Math.round(val * 4) / 4;
  }
  if (rounding === '0.5') {
    return Math.round(val * 2) / 2;
  }
  if (rounding === '1') {
    return Math.round(val);
  }
  return parseFloat(val.toFixed(2));
};

/**
 * Extracts student's grade for a given activity
 */
export const extractGradeForActivity = (
  activityKey: MassarActivityKey,
  test?: PhysicalTests,
  vmaResult?: StudentResult,
  rounding: MassarClassConfig['rounding'] = '0.25'
): number | null => {
  if (!test && !vmaResult) return null;

  let rawGrade: number | null = null;

  switch (activityKey) {
    case 'sport_collectif': {
      // General sport collectif: check any sportActivities first, or legacy sportCollectifScore
      const acts = test?.sportActivities;
      if (acts && Object.keys(acts).length > 0) {
        const firstSportKey = Object.keys(acts)[0];
        const sp = acts[firstSportKey];
        if (sp?.totalScore !== undefined) rawGrade = Number(sp.totalScore);
        else if (sp) {
          const sum = (Number(sp.techIndiv) || 0) + (Number(sp.collectif) || 0) + (Number(sp.comportement) || 0) + (Number(sp.cognitive) || 0);
          if (sum > 0) rawGrade = sum;
        }
      } else if (test?.sportCollectifScore !== undefined && test.sportCollectifScore !== null && !isNaN(test.sportCollectifScore)) {
        rawGrade = Number(test.sportCollectifScore);
      } else if (
        test?.sportColTechIndiv !== undefined || 
        test?.sportColCollectif !== undefined || 
        test?.sportColComportement !== undefined || 
        test?.sportColCognitive !== undefined
      ) {
        const sum = (Number(test.sportColTechIndiv) || 0) + 
                    (Number(test.sportColCollectif) || 0) + 
                    (Number(test.sportColComportement) || 0) + 
                    (Number(test.sportColCognitive) || 0);
        if (sum > 0) rawGrade = sum;
      }
      break;
    }

    case 'football': {
      const sp = test?.sportActivities?.['football'];
      if (sp?.totalScore !== undefined) {
        rawGrade = Number(sp.totalScore);
      } else if (sp) {
        const sum = (Number(sp.techIndiv) || 0) + (Number(sp.collectif) || 0) + (Number(sp.comportement) || 0) + (Number(sp.cognitive) || 0);
        if (sum > 0) rawGrade = sum;
      } else if (!test?.sportActivities && (test?.sportCollectifName?.toLowerCase().includes('قدم') || test?.sportCollectifName?.toLowerCase().includes('foot') || !test?.sportCollectifName)) {
        if (test?.sportCollectifScore !== undefined) rawGrade = Number(test.sportCollectifScore);
      }
      break;
    }

    case 'basketball': {
      const sp = test?.sportActivities?.['basketball'];
      if (sp?.totalScore !== undefined) {
        rawGrade = Number(sp.totalScore);
      } else if (sp) {
        const sum = (Number(sp.techIndiv) || 0) + (Number(sp.collectif) || 0) + (Number(sp.comportement) || 0) + (Number(sp.cognitive) || 0);
        if (sum > 0) rawGrade = sum;
      } else if (!test?.sportActivities && (test?.sportCollectifName?.toLowerCase().includes('سلة') || test?.sportCollectifName?.toLowerCase().includes('basket'))) {
        if (test?.sportCollectifScore !== undefined) rawGrade = Number(test.sportCollectifScore);
      }
      break;
    }

    case 'handball': {
      const sp = test?.sportActivities?.['handball'];
      if (sp?.totalScore !== undefined) {
        rawGrade = Number(sp.totalScore);
      } else if (sp) {
        const sum = (Number(sp.techIndiv) || 0) + (Number(sp.collectif) || 0) + (Number(sp.comportement) || 0) + (Number(sp.cognitive) || 0);
        if (sum > 0) rawGrade = sum;
      } else if (!test?.sportActivities && (test?.sportCollectifName?.toLowerCase().includes('يد') || test?.sportCollectifName?.toLowerCase().includes('hand'))) {
        if (test?.sportCollectifScore !== undefined) rawGrade = Number(test.sportCollectifScore);
      }
      break;
    }

    case 'volleyball': {
      const sp = test?.sportActivities?.['volleyball'];
      if (sp?.totalScore !== undefined) {
        rawGrade = Number(sp.totalScore);
      } else if (sp) {
        const sum = (Number(sp.techIndiv) || 0) + (Number(sp.collectif) || 0) + (Number(sp.comportement) || 0) + (Number(sp.cognitive) || 0);
        if (sum > 0) rawGrade = sum;
      } else if (!test?.sportActivities && (test?.sportCollectifName?.toLowerCase().includes('طائرة') || test?.sportCollectifName?.toLowerCase().includes('volley'))) {
        if (test?.sportCollectifScore !== undefined) rawGrade = Number(test.sportCollectifScore);
      }
      break;
    }

    case 'rugby': {
      const sp = test?.sportActivities?.['rugby'];
      if (sp?.totalScore !== undefined) {
        rawGrade = Number(sp.totalScore);
      } else if (sp) {
        const sum = (Number(sp.techIndiv) || 0) + (Number(sp.collectif) || 0) + (Number(sp.comportement) || 0) + (Number(sp.cognitive) || 0);
        if (sum > 0) rawGrade = sum;
      } else if (!test?.sportActivities && (test?.sportCollectifName?.toLowerCase().includes('ريكبي') || test?.sportCollectifName?.toLowerCase().includes('rugby'))) {
        if (test?.sportCollectifScore !== undefined) rawGrade = Number(test.sportCollectifScore);
      }
      break;
    }

    case 'gymnastique': {
      if (test?.gymScoreTotal !== undefined && test.gymScoreTotal !== null && !isNaN(test.gymScoreTotal)) {
        rawGrade = Number(test.gymScoreTotal);
      } else if (
        test?.gymNoteMotrice !== undefined || 
        test?.gymNoteComportement !== undefined || 
        test?.gymNoteCognitive !== undefined
      ) {
        const sum = (Number(test.gymNoteMotrice) || 0) + 
                    (Number(test.gymNoteComportement) || 0) + 
                    (Number(test.gymNoteCognitive) || 0);
        if (sum > 0) rawGrade = sum;
      }
      break;
    }

    case 'vitesse_30m': {
      if (test?.scoreVitesse30m !== undefined && test.scoreVitesse30m !== null && !isNaN(test.scoreVitesse30m)) {
        rawGrade = Number(test.scoreVitesse30m);
      } else if (test?.scoreVitesse !== undefined && test.scoreVitesse !== null && !isNaN(test.scoreVitesse)) {
        rawGrade = Number(test.scoreVitesse);
      } else if (test?.vitesse30m) {
        rawGrade = calculateScore(test.vitesse30m, getCustomScale('speed'), test.sexe || 'M', true);
      }
      break;
    }

    case 'vitesse_60m': {
      if (test?.scoreVitesse60m !== undefined && test.scoreVitesse60m !== null && !isNaN(test.scoreVitesse60m)) {
        rawGrade = Number(test.scoreVitesse60m);
      } else if ((test as any)?.vitesse60m) {
        rawGrade = calculateScore((test as any).vitesse60m, getCustomScale('speed-60'), test.sexe || 'M', true);
      }
      break;
    }

    case 'vitesse_80m': {
      if (test?.scoreVitesse80m !== undefined && test.scoreVitesse80m !== null && !isNaN(test.scoreVitesse80m)) {
        rawGrade = Number(test.scoreVitesse80m);
      } else if ((test as any)?.vitesse80m) {
        rawGrade = calculateScore((test as any).vitesse80m, getCustomScale('speed-80'), test.sexe || 'M', true);
      }
      break;
    }

    case 'vitesse_100m': {
      if (test?.scoreVitesse100m !== undefined && test.scoreVitesse100m !== null && !isNaN(test.scoreVitesse100m)) {
        rawGrade = Number(test.scoreVitesse100m);
      } else if ((test as any)?.vitesse100m) {
        rawGrade = calculateScore((test as any).vitesse100m, getCustomScale('speed-100'), test.sexe || 'M', true);
      }
      break;
    }

    case 'vitesse': {
      if (test?.scoreVitesse30m !== undefined && test.scoreVitesse30m !== null && !isNaN(test.scoreVitesse30m)) {
        rawGrade = Number(test.scoreVitesse30m);
      } else if (test?.scoreVitesse !== undefined && test.scoreVitesse !== null && !isNaN(test.scoreVitesse)) {
        rawGrade = Number(test.scoreVitesse);
      } else if (test?.vitesse30m) {
        rawGrade = calculateScore(test.vitesse30m, getCustomScale('speed'), test.sexe || 'M', true);
      } else if (test?.scoreVitesse60m !== undefined) {
        rawGrade = Number(test.scoreVitesse60m);
      } else if ((test as any)?.vitesse60m) {
        rawGrade = calculateScore((test as any).vitesse60m, getCustomScale('speed-60'), test.sexe || 'M', true);
      }
      break;
    }

    case 'endurance': {
      if (test?.scoreEndurance !== undefined && test.scoreEndurance !== null && !isNaN(test.scoreEndurance)) {
        rawGrade = Number(test.scoreEndurance);
      } else if (test?.enduranceTemps) {
        rawGrade = calculateScore(test.enduranceTemps, getCustomScale('endurance'), test.sexe || 'M', true);
      } else if (vmaResult?.vma !== undefined && !isNaN(vmaResult.vma)) {
        const vma = vmaResult.vma;
        const approxScore = Math.min(20, Math.max(6, (vma - 8) * 1.5 + 8));
        rawGrade = approxScore;
      }
      break;
    }

    case 'saut_long': {
      if (test?.scoreSautLong !== undefined && test.scoreSautLong !== null && !isNaN(test.scoreSautLong)) {
        rawGrade = Number(test.scoreSautLong);
      } else if (test?.sautLong) {
        rawGrade = calculateScore(test.sautLong, getCustomScale('long-jump'), test.sexe || 'M', false);
      }
      break;
    }

    case 'lancer_poids': {
      if (test?.scoreLancerPoids !== undefined && test.scoreLancerPoids !== null && !isNaN(test.scoreLancerPoids)) {
        rawGrade = Number(test.scoreLancerPoids);
      } else if (test?.lancerPoids) {
        rawGrade = calculateScore(test.lancerPoids, getCustomScale('shot-put'), test.sexe || 'M', false);
      }
      break;
    }

    case 'lancer_medball': {
      if (test?.scoreMedball !== undefined && test.scoreMedball !== null && !isNaN(test.scoreMedball)) {
        rawGrade = Number(test.scoreMedball);
      }
      break;
    }

    case 'saut_vertical': {
      if (test?.scoreSautVertical !== undefined && test.scoreSautVertical !== null && !isNaN(test.scoreSautVertical)) {
        rawGrade = Number(test.scoreSautVertical);
      }
      break;
    }

    case 'souplesse': {
      if (test?.scoreSouplesse !== undefined && test.scoreSouplesse !== null && !isNaN(test.scoreSouplesse)) {
        rawGrade = Number(test.scoreSouplesse);
      }
      break;
    }

    case 'global_general': {
      if (
        test?.noteMotrice !== undefined || 
        test?.noteComportement !== undefined || 
        test?.noteCognitive !== undefined
      ) {
        const sum = (Number(test.noteMotrice) || 0) + 
                    (Number(test.noteComportement) || 0) + 
                    (Number(test.noteCognitive) || 0);
        if (sum > 0) rawGrade = sum;
      }
      break;
    }
  }

  if (rawGrade === null || isNaN(rawGrade)) return null;

  const clamped = Math.min(20, Math.max(0, rawGrade));
  return roundScore(clamped, rounding);
};

/**
 * Calculates continuous assessment average: (CC1 + CC2 + CC3) / valid count
 */
export const calculateMassarAverage = (
  n1: number | null | undefined,
  n2: number | null | undefined,
  n3: number | null | undefined,
  rounding: MassarClassConfig['rounding'] = '0.25'
): number | null => {
  const validGrades: number[] = [];
  if (n1 !== null && n1 !== undefined && !isNaN(n1)) validGrades.push(n1);
  if (n2 !== null && n2 !== undefined && !isNaN(n2)) validGrades.push(n2);
  if (n3 !== null && n3 !== undefined && !isNaN(n3)) validGrades.push(n3);

  if (validGrades.length === 0) return null;

  const sum = validGrades.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / validGrades.length;
  return roundScore(avg, rounding);
};

/**
 * Generates an appropriate pedagogical appreciation / remark based on the average
 */
export const getMassarAppreciation = (avg: number | null, isDispense?: boolean, isAbsent?: boolean): string => {
  if (isDispense) return 'معفى طبياً';
  if (isAbsent) return 'غائب / غير ممسوك';
  if (avg === null || isNaN(avg)) return '';

  if (avg >= 17) return 'ممتاز، أداء رياضي متميز ومواظبة نموذجية';
  if (avg >= 15) return 'جيد جداً، تفوق بدني وتكتيكي ملحوظ';
  if (avg >= 13) return 'حسن، مشاركة إيجابية ومستوى تقني جيد';
  if (avg >= 11) return 'مستحسن، عمل جاد وإمكانات قابلة للتطور';
  if (avg >= 10) return 'متوسط، تحكم لا بأس به في المهارات الأساسية';
  if (avg >= 8) return 'دون المتوسط، يحتاج لمزيد من الجهد والمواظبة';
  return 'ضعيف، صعوبات بدنية وتقنية تستلزم الدعم';
};

/**
 * Retrieves Massar configuration for a class from localStorage
 */
export const getMassarConfig = (className: string): MassarClassConfig => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const defaultSchoolYear = `${currentYear}/${nextYear}`;

  const defaultConfig: MassarClassConfig = {
    className,
    activity1: 'sport_collectif',
    activity2: 'gymnastique',
    activity3: 'vitesse',
    activity1CustomLabel: '',
    activity2CustomLabel: '',
    activity3CustomLabel: '',
    semestre: '1',
    schoolYear: defaultSchoolYear,
    schoolName: localStorage.getItem('eps_school_name') || '',
    direction: localStorage.getItem('eps_direction_name') || '',
    academie: localStorage.getItem('eps_academie_name') || '',
    teacherName: localStorage.getItem('eps_teacher_name') || '',
    rounding: '0.25'
  };

  try {
    const raw = localStorage.getItem(`eps_massar_config_${className}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultConfig, ...parsed };
    }
  } catch (e) {
    console.error('Error loading Massar config', e);
  }

  return defaultConfig;
};

/**
 * Saves Massar configuration for a class
 */
export const saveMassarConfig = (className: string, config: MassarClassConfig) => {
  try {
    localStorage.setItem(`eps_massar_config_${className}`, JSON.stringify(config));
    if (config.schoolName) localStorage.setItem('eps_school_name', config.schoolName);
    if (config.direction) localStorage.setItem('eps_direction_name', config.direction);
    if (config.academie) localStorage.setItem('eps_academie_name', config.academie);
    if (config.teacherName) localStorage.setItem('eps_teacher_name', config.teacherName);
  } catch (e) {
    console.error('Error saving Massar config', e);
  }
};

/**
 * Retrieves saved Massar student grades for a class
 */
export const getMassarGrades = (className: string): MassarGradeRecord[] => {
  try {
    const raw = localStorage.getItem(`eps_massar_grades_${className}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading Massar grades', e);
  }
  return [];
};

/**
 * Saves Massar student grades for a class
 */
export const saveMassarGrades = (className: string, grades: MassarGradeRecord[]) => {
  try {
    localStorage.setItem(`eps_massar_grades_${className}`, JSON.stringify(grades));
  } catch (e) {
    console.error('Error saving Massar grades', e);
  }
};

/**
 * School Level representation for Moroccan EPS education
 */
export interface SchoolLevel {
  id: string;
  name: string;
  shortName: string;
  cycle: 'collège' | 'lycée' | 'autre';
  classes: string[];
  totalStudents: number;
}

/**
 * Intelligently detects the school level from a class name based on Moroccan naming conventions
 */
export const detectClassLevel = (className: string): { id: string; name: string; shortName: string; cycle: 'collège' | 'lycée' | 'autre' } => {
  const raw = String(className || '').trim();
  const norm = normalizeArabic(raw).toUpperCase().replace(/[\s\-_/.]/g, '');

  // 1ère Année Collège (1AC / 1APIC / 1ASC / الأولى إعدادي / 1/1)
  if (
    norm.includes('1AC') || norm.includes('1APIC') || norm.includes('1ASC') || 
    norm.includes('1EREAC') || norm.includes('الاولىاعدادي') || norm.includes('1اعدادي') ||
    norm.startsWith('1AC') || norm.startsWith('1APIC') ||
    (/^1[A-Z0-9]/.test(norm) && !norm.includes('BAC') && !norm.includes('باك'))
  ) {
    return { id: '1AC', name: 'الأولى إعدادي (1AC)', shortName: 'الأولى إعدادي', cycle: 'collège' };
  }

  // 2ème Année Collège (2AC / 2APIC / 2ASC / الثانية إعدادي / 2/1)
  if (
    norm.includes('2AC') || norm.includes('2APIC') || norm.includes('2ASC') || 
    norm.includes('2EMEAC') || norm.includes('الثانيهاعدادي') || norm.includes('2اعدادي') ||
    norm.startsWith('2AC') || norm.startsWith('2APIC') ||
    (/^2[A-Z0-9]/.test(norm) && !norm.includes('BAC') && !norm.includes('باك'))
  ) {
    return { id: '2AC', name: 'الثانية إعدادي (2AC)', shortName: 'الثانية إعدادي', cycle: 'collège' };
  }

  // 3ème Année Collège (3AC / 3APIC / 3ASC / الثالثة إعدادي / 3/1)
  if (
    norm.includes('3AC') || norm.includes('3APIC') || norm.includes('3ASC') || 
    norm.includes('3EMEAC') || norm.includes('الثالثهاعدادي') || norm.includes('3اعدادي') ||
    norm.startsWith('3AC') || norm.startsWith('3APIC') ||
    (/^3[A-Z0-9]/.test(norm) && !norm.includes('BAC') && !norm.includes('باك'))
  ) {
    return { id: '3AC', name: 'الثالثة إعدادي (3AC)', shortName: 'الثالثة إعدادي', cycle: 'collège' };
  }

  // Tronc Commun (TC / TCS / TCF / TCL / جذع مشترك)
  if (
    norm.includes('TC') || norm.includes('TRONC') || norm.includes('جذع') || norm.includes('مشترك')
  ) {
    return { id: 'TC', name: 'الجذع المشترك (Tronc Commun - TC)', shortName: 'TC', cycle: 'lycée' };
  }

  // 1ère Année Baccalauréat (1BAC / الأولى باك)
  if (
    norm.includes('1BAC') || norm.includes('1EREBAC') || norm.includes('اولىباك') || norm.includes('الاولىبكالوريا') || norm.includes('1باك')
  ) {
    return { id: '1BAC', name: 'السنة الأولى بكالوريا (1BAC)', shortName: '1BAC', cycle: 'lycée' };
  }

  // 2ème Année Baccalauréat (2BAC / الثانية باك)
  if (
    norm.includes('2BAC') || norm.includes('2EMEBAC') || norm.includes('ثانيهباك') || norm.includes('الثانيهبكالوريا') || norm.includes('2باك')
  ) {
    return { id: '2BAC', name: 'السنة الثانية بكالوريا (2BAC)', shortName: '2BAC', cycle: 'lycée' };
  }

  // Fallback: extract base prefix
  const match = raw.match(/^([A-Za-z\u0600-\u06FF]+)/);
  const prefix = match ? match[1].trim() : raw;
  return { id: prefix, name: `مستوى: ${prefix}`, shortName: prefix, cycle: 'autre' };
};

/**
 * Groups a list of classes into organized educational levels
 */
export const groupClassesByLevel = (classes: { className: string; studentCount?: number }[]): SchoolLevel[] => {
  const levelMap = new Map<string, SchoolLevel>();

  // Ensure standard Moroccan Middle School levels are always present
  const standardLevels: SchoolLevel[] = [
    {
      id: '1AC',
      name: 'الأولى إعدادي (1AC)',
      shortName: 'الأولى إعدادي',
      cycle: 'collège',
      classes: [],
      totalStudents: 0
    },
    {
      id: '2AC',
      name: 'الثانية إعدادي (2AC)',
      shortName: 'الثانية إعدادي',
      cycle: 'collège',
      classes: [],
      totalStudents: 0
    },
    {
      id: '3AC',
      name: 'الثالثة إعدادي (3AC)',
      shortName: 'الثالثة إعدادي',
      cycle: 'collège',
      classes: [],
      totalStudents: 0
    }
  ];

  standardLevels.forEach(lvl => {
    levelMap.set(lvl.id, { ...lvl });
  });

  classes.forEach(c => {
    const info = detectClassLevel(c.className);
    if (!levelMap.has(info.id)) {
      levelMap.set(info.id, {
        id: info.id,
        name: info.name,
        shortName: info.shortName,
        cycle: info.cycle,
        classes: [],
        totalStudents: 0
      });
    }
    const lvl = levelMap.get(info.id)!;
    if (!lvl.classes.includes(c.className)) {
      lvl.classes.push(c.className);
      lvl.totalStudents += (c.studentCount || 0);
    }
  });

  return Array.from(levelMap.values());
};

/**
 * Automatically builds or updates Massar grade records from the app's current test results
 * Supports cross-class matching across all classes of the same level
 */
export const autoPopulateMassarGrades = (
  students: (StudentIdentity & { className?: string })[],
  tests: PhysicalTests[],
  vmaList: StudentResult[],
  config: MassarClassConfig,
  existingGrades: MassarGradeRecord[] = [],
  extraLevelData?: {
    tests?: PhysicalTests[];
    vmaList?: StudentResult[];
  }
): MassarGradeRecord[] => {
  const existingMap = new Map<string, MassarGradeRecord>();
  existingGrades.forEach(g => {
    existingMap.set(g.numeroEleve, g);
  });

  return students.map(student => {
    const num = student.numeroEleve;
    const existing = existingMap.get(num);
    const normName = normalizeArabic(student.nomEleve || '').trim();
    const massarCode = (student.codeMassar || '').trim().toUpperCase();

    // Helper to check if a candidate test or VMA result belongs to this student
    const isMatchingStudent = (candidate: { numeroEleve?: string; nomEleve?: string; codeMassar?: string } | null | undefined): boolean => {
      if (!candidate) return false;
      // Direct student number match
      if (candidate.numeroEleve && candidate.numeroEleve === num) return true;
      // Massar code match
      if (massarCode) {
        if (candidate.numeroEleve && candidate.numeroEleve.trim().toUpperCase() === massarCode) return true;
        if (candidate.codeMassar && candidate.codeMassar.trim().toUpperCase() === massarCode) return true;
      }
      // Name comparison
      if (candidate.nomEleve && normName) {
        const cName = normalizeArabic(candidate.nomEleve).trim();
        if (cName === normName) return true;
        if (normName.length > 3 && (cName.includes(normName) || normName.includes(cName))) return true;

        // Word tokens match in any order (e.g. "أحمد العلمي" vs "العلمي أحمد")
        const sTokens = normName.split(/\s+/).filter(w => w.length > 1);
        const cTokens = cName.split(/\s+/).filter(w => w.length > 1);
        if (sTokens.length >= 2 && cTokens.length >= 2) {
          const matchCount = sTokens.filter(st => cTokens.some(ct => ct === st || ct.includes(st) || st.includes(ct))).length;
          if (matchCount >= Math.min(sTokens.length, cTokens.length)) return true;
        }
      }
      return false;
    };

    // 1. Find test in primary class tests
    let test = tests.find(isMatchingStudent);

    // 2. Find VMA in primary class VMA
    let vma = vmaList.find(isMatchingStudent);

    let matchedFromClass: string | undefined = undefined;

    // 3. Fallback search across extra level tests/vma (from all other classes of the same level)
    if (extraLevelData) {
      if (!test && extraLevelData.tests) {
        test = extraLevelData.tests.find(isMatchingStudent);
        if (test && test.className) {
          matchedFromClass = test.className;
        }
      }

      if (!vma && extraLevelData.vmaList) {
        vma = extraLevelData.vmaList.find(isMatchingStudent);
        if (vma && (vma as any).className && !matchedFromClass) {
          matchedFromClass = (vma as any).className;
        }
      }
    }

    const autoN1 = extractGradeForActivity(config.activity1, test, vma, config.rounding);
    const autoN2 = extractGradeForActivity(config.activity2, test, vma, config.rounding);
    const autoN3 = extractGradeForActivity(config.activity3, test, vma, config.rounding);

    // Keep manual overrides if student was already edited or exempted, otherwise use extracted grades
    const isDispense = existing?.isDispense ?? false;
    const isAbsent = existing?.isAbsent ?? false;

    const n1 = isDispense ? null : (autoN1 !== null ? autoN1 : (existing?.noteDevoir1 ?? null));
    const n2 = isDispense ? null : (autoN2 !== null ? autoN2 : (existing?.noteDevoir2 ?? null));
    const n3 = isDispense ? null : (autoN3 !== null ? autoN3 : (existing?.noteDevoir3 ?? null));

    const avg = calculateMassarAverage(n1, n2, n3, config.rounding);
    const defaultRemarque = getMassarAppreciation(avg, isDispense, isAbsent);

    const studentClass = student.className || existing?.className;

    return {
      numeroEleve: num,
      codeMassar: student.codeMassar || (num.startsWith('C') || num.startsWith('G') || num.startsWith('M') || num.startsWith('R') || num.startsWith('K') || num.startsWith('D') || num.startsWith('J') || num.startsWith('F') || num.startsWith('H') || num.startsWith('P') || num.startsWith('B') || num.startsWith('N') || num.startsWith('L') ? num : existing?.codeMassar || ''),
      nomEleve: student.nomEleve,
      sexe: student.sexe,
      dateNaissance: student.dateNaissance || existing?.dateNaissance,
      noteDevoir1: n1,
      noteDevoir2: n2,
      noteDevoir3: n3,
      isDispense,
      isAbsent,
      remarque: existing?.remarque || defaultRemarque,
      className: studentClass,
      matchedFromClass: matchedFromClass || existing?.matchedFromClass
    };
  });
};

/**
 * Result of parsing and filling an imported Massar Excel sheet
 */
export interface ImportedMassarResult {
  success: boolean;
  matchedCount: number;
  totalStudentsInFile: number;
  unmatchedNames: string[];
  matchedRecords: MassarGradeRecord[];
  rawWorkbook: any;
  sheetName: string;
  originalFileName: string;
  fileStudents?: StudentIdentity[];
  error?: string;
}

/**
 * Parses an empty Massar Excel file downloaded from massarservice.men.gov.ma,
 * matches students and injects the 3 grades directly into the sheet coordinates.
 * Supports cross-class matching using extraLevelRecords across all classes of the level.
 */
export const fillImportedMassarExcel = (
  fileData: ArrayBuffer,
  students: StudentIdentity[],
  records: MassarGradeRecord[],
  config: MassarClassConfig,
  fileName: string = 'Massar_Export.xlsx',
  extraLevelRecords?: MassarGradeRecord[]
): ImportedMassarResult => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error('مكتبة XLSX غير متوفرة في النظام.');
  }

  try {
    const workbook = XLSX.read(fileData, { type: 'array', cellStyles: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        matchedCount: 0,
        totalStudentsInFile: 0,
        unmatchedNames: [],
        matchedRecords: [],
        rawWorkbook: null,
        sheetName: '',
        originalFileName: fileName,
        error: 'الملف لا يحتوي على أي صفحات إكسيل.'
      };
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    if (!json || json.length === 0) {
      return {
        success: false,
        matchedCount: 0,
        totalStudentsInFile: 0,
        unmatchedNames: [],
        matchedRecords: [],
        rawWorkbook: null,
        sheetName,
        originalFileName: fileName,
        error: 'ورقة إكسيل مسار فارغة تماماً.'
      };
    }

    // Locate header row and student data columns
    let headerRowIdx = -1;
    let colOrder = -1;
    let colMassar = -1;
    let colName = -1;
    let colDob = -1;
    let colDevoir1 = -1;
    let colDevoir2 = -1;
    let colDevoir3 = -1;
    let colRemarque = -1;

    for (let r = 0; r < Math.min(json.length, 25); r++) {
      const row = json[r];
      if (!row) continue;

      let foundMassar = false;
      let foundName = false;

      for (let c = 0; c < row.length; c++) {
        const val = normalizeArabic(String(row[c] || ''));

        if (
          val.includes('رمز مسار') || 
          val.includes('رقم مسار') || 
          val.includes('كود مسار') || 
          val.includes('code massar') ||
          val.includes('massar') ||
          val.includes('matricule')
        ) {
          colMassar = c;
          foundMassar = true;
        } else if (
          val.includes('اسم التلميذ') || 
          val.includes('الاسم والنسب') || 
          val.includes('اسم و نسب') || 
          val.includes('الاسم الكامل') || 
          val.includes('nom et prenom') ||
          val.includes('nom prenom') ||
          val.includes('eleve')
        ) {
          colName = c;
          foundName = true;
        } else if (
          val.includes('الترتيب') || 
          val.includes('رقم ترتيبي') || 
          val.includes('الرقم') || 
          val === 'ر ت' || 
          val === 'ت' || 
          val === 'n°' || 
          val === 'no'
        ) {
          if (colOrder === -1) colOrder = c;
        } else if (val.includes('تاريخ الازدياد') || val.includes('تاريخ الميلاد') || val.includes('naissance')) {
          colDob = c;
        } else if (
          val.includes('الفرض الاول') || 
          val.includes('الفرض 1') || 
          val.includes('نقطة 1') || 
          val.includes('cc1') || 
          val.includes('controle 1') ||
          val.includes('devoir 1')
        ) {
          colDevoir1 = c;
        } else if (
          val.includes('الفرض الثاني') || 
          val.includes('الفرض 2') || 
          val.includes('نقطة 2') || 
          val.includes('cc2') || 
          val.includes('controle 2') ||
          val.includes('devoir 2')
        ) {
          colDevoir2 = c;
        } else if (
          val.includes('الفرض الثالث') || 
          val.includes('الفرض 3') || 
          val.includes('نقطة 3') || 
          val.includes('cc3') || 
          val.includes('controle 3') ||
          val.includes('devoir 3')
        ) {
          colDevoir3 = c;
        } else if (val.includes('ملاحظ') || val.includes('remarque') || val.includes('تقدير')) {
          colRemarque = c;
        }
      }

      if (foundMassar && foundName) {
        headerRowIdx = r;
        break;
      }
    }

    // Fallback: If headers were not detected by exact keywords
    if (headerRowIdx === -1) {
      // Find row with Massar code pattern (e.g. G134... or M12...)
      for (let r = 0; r < Math.min(json.length, 25); r++) {
        const row = json[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if (/^[A-Za-z][0-9]{8,10}$/.test(val)) {
            headerRowIdx = Math.max(0, r - 1);
            colMassar = c;
            // Name is usually the next column
            colName = c + 1;
            break;
          }
        }
        if (headerRowIdx !== -1) break;
      }
    }

    if (headerRowIdx === -1 || colName === -1) {
      return {
        success: false,
        matchedCount: 0,
        totalStudentsInFile: 0,
        unmatchedNames: [],
        matchedRecords: [],
        rawWorkbook: null,
        sheetName,
        originalFileName: fileName,
        error: 'تعذر تحديد أعمدة مسار (رمز مسار واسم التلميذ) في الملف المرفوع. يرجى التأكد من اختيار ملف إكسيل مصدر من مسار.'
      };
    }

    // If Devoir columns weren't explicitly found, deduce them:
    // In typical Massar EPS export:
    // After Name (or DOB if present), the next 3 columns are CC1, CC2, CC3!
    if (colDevoir1 === -1 || colDevoir2 === -1 || colDevoir3 === -1) {
      const startAfter = colDob !== -1 ? Math.max(colName, colDob) : colName;
      if (colDevoir1 === -1) colDevoir1 = startAfter + 1;
      if (colDevoir2 === -1) colDevoir2 = startAfter + 2;
      if (colDevoir3 === -1) colDevoir3 = startAfter + 3;
    }

    // Match each student row in the sheet
    const studentStartRow = headerRowIdx + 1;
    let matchedCount = 0;
    let totalStudentsInFile = 0;
    const unmatchedNames: string[] = [];
    const matchedRecords: MassarGradeRecord[] = [];
    const fileStudents: StudentIdentity[] = [];

    // Fast lookup dictionaries
    const recordByMassar = new Map<string, MassarGradeRecord>();
    const recordByName = new Map<string, MassarGradeRecord>();

    // Register primary records
    records.forEach(r => {
      if (r.codeMassar) {
        recordByMassar.set(r.codeMassar.toUpperCase().trim(), r);
      }
      if (r.numeroEleve) {
        recordByMassar.set(r.numeroEleve.toUpperCase().trim(), r);
      }
      recordByName.set(normalizeArabic(r.nomEleve), r);
    });

    // Also register extra level records if provided (cross-class fallback)
    if (extraLevelRecords && extraLevelRecords.length > 0) {
      extraLevelRecords.forEach(r => {
        if (r.codeMassar && !recordByMassar.has(r.codeMassar.toUpperCase().trim())) {
          recordByMassar.set(r.codeMassar.toUpperCase().trim(), r);
        }
        if (r.numeroEleve && !recordByMassar.has(r.numeroEleve.toUpperCase().trim())) {
          recordByMassar.set(r.numeroEleve.toUpperCase().trim(), r);
        }
        const norm = normalizeArabic(r.nomEleve);
        if (!recordByName.has(norm)) {
          recordByName.set(norm, r);
        }
      });
    }

    for (let r = studentStartRow; r < json.length; r++) {
      const row = json[r];
      if (!row || row.length === 0) continue;

      const massarVal = colMassar !== -1 ? String(row[colMassar] || '').trim() : '';
      const nameVal = colName !== -1 ? String(row[colName] || '').trim() : '';

      if (!nameVal || isForbiddenStudentName(nameVal)) continue;

      totalStudentsInFile++;

      fileStudents.push({
        numeroEleve: massarVal || `std_${totalStudentsInFile}`,
        codeMassar: massarVal,
        nomEleve: nameVal
      });

      // Find match
      let matchedRecord: MassarGradeRecord | undefined;

      if (massarVal) {
        matchedRecord = recordByMassar.get(massarVal.toUpperCase());
      }

      if (!matchedRecord && nameVal) {
        const normName = normalizeArabic(nameVal);
        matchedRecord = recordByName.get(normName);
        if (!matchedRecord) {
          // Partial name search
          for (const [key, rec] of recordByName.entries()) {
            if (key.includes(normName) || normName.includes(key)) {
              matchedRecord = rec;
              break;
            }
          }
        }
      }

      if (matchedRecord) {
        matchedCount++;
        matchedRecords.push(matchedRecord);

        // Inject grades into worksheet cells
        const writeCell = (colIdx: number, val: number | null | undefined, isText: boolean = false) => {
          if (colIdx < 0) return;
          const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });

          if (val === null || val === undefined || isNaN(Number(val))) {
            if (matchedRecord?.isDispense) {
              worksheet[cellRef] = { t: 's', v: 'معفى' };
            }
            return;
          }

          if (isText) {
            worksheet[cellRef] = { t: 's', v: String(val) };
          } else {
            worksheet[cellRef] = { t: 'n', v: Number(val) };
          }
        };

        if (!matchedRecord.isDispense) {
          writeCell(colDevoir1, matchedRecord.noteDevoir1);
          writeCell(colDevoir2, matchedRecord.noteDevoir2);
          writeCell(colDevoir3, matchedRecord.noteDevoir3);
        } else {
          writeCell(colDevoir1, null);
          writeCell(colDevoir2, null);
          writeCell(colDevoir3, null);
        }

        if (colRemarque !== -1 && matchedRecord.remarque) {
          writeCell(colRemarque, matchedRecord.remarque as any, true);
        }
      } else {
        unmatchedNames.push(nameVal);
      }
    }

    return {
      success: true,
      matchedCount,
      totalStudentsInFile,
      unmatchedNames,
      matchedRecords,
      rawWorkbook: workbook,
      sheetName,
      originalFileName: fileName,
      fileStudents
    };
  } catch (err: any) {
    console.error('Error filling Massar Excel', err);
    return {
      success: false,
      matchedCount: 0,
      totalStudentsInFile: 0,
      unmatchedNames: [],
      matchedRecords: [],
      rawWorkbook: null,
      sheetName: '',
      originalFileName: fileName,
      error: `حدث خطأ أثناء معالجة ملف مسار: ${err?.message || String(err)}`
    };
  }
};

/**
 * Downloads the updated raw workbook that was imported and filled
 */
export const exportFilledMassarWorkbook = (workbook: any, fileName: string) => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error('مكتبة XLSX غير متوفرة.');
  }
  XLSX.writeFile(workbook, fileName);
};

/**
 * Generates an official Moroccan Massar Excel workbook template for the class
 */
export const generateOfficialMassarExcel = (
  className: string,
  students: StudentIdentity[],
  records: MassarGradeRecord[],
  config: MassarClassConfig,
  isBlank: boolean = false
) => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error('مكتبة XLSX غير متوفرة.');
  }

  const act1Meta = getActivityMeta(config.activity1);
  const act2Meta = getActivityMeta(config.activity2);
  const act3Meta = getActivityMeta(config.activity3);

  const act1Label = config.activity1CustomLabel || act1Meta.shortAr;
  const act2Label = config.activity2CustomLabel || act2Meta.shortAr;
  const act3Label = config.activity3CustomLabel || act3Meta.shortAr;

  // Build AOA (Array of Arrays)
  const rows: any[][] = [];

  // Official Massar Ministry Header
  rows.push(['المملكة المغربية']);
  rows.push(['وزارة التربية الوطنية والتعليم الأولي والرياضة']);
  rows.push([
    `الأكاديمية الجهوية: ${config.academie || 'الجهة الشرقية'}`,
    '',
    '',
    `المديرية الإقليمية: ${config.direction || 'مديرية فكيك'}`,
    '',
    '',
    `المؤسسة: ${config.schoolName || 'الثانوية التأهيلية'}`
  ]);
  rows.push([
    `المادة: التربية البدنية والرياضية`,
    '',
    `القسم: ${className}`,
    '',
    `الدورة: ${config.semestre === '1' ? 'الدورة الأولى' : 'الدورة الثانية'}`,
    '',
    `السنة الدراسية: ${config.schoolYear}`,
    '',
    config.teacherName ? `الأستاذ: ${config.teacherName}` : ''
  ]);
  rows.push([]); // blank separator

  // Table Headers (Row 6)
  const headerRow = [
    'الرقم الترتيبي',
    'رمز مسار',
    'الاسم والنسب',
    `الفرض الأول (${act1Label})`,
    `الفرض الثاني (${act2Label})`,
    `الفرض الثالث (${act3Label})`,
    'معدل المراقبة المستمرة',
    'ملاحظات الأستاذ'
  ];
  rows.push(headerRow);

  // Student Rows
  const sortedStudents = [...students].sort((a, b) => {
    return (a.nomEleve || '').localeCompare(b.nomEleve || '', 'ar');
  });

  const recordsMap = new Map<string, MassarGradeRecord>();
  records.forEach(r => recordsMap.set(r.numeroEleve, r));

  sortedStudents.forEach((student, idx) => {
    const rec = recordsMap.get(student.numeroEleve);
    const orderNum = idx + 1;
    const massarCode = rec?.codeMassar || student.codeMassar || (student.numeroEleve.length > 5 ? student.numeroEleve : '');
    const studentName = student.nomEleve || '';

    if (isBlank) {
      rows.push([
        orderNum,
        massarCode,
        studentName,
        '',
        '',
        '',
        '',
        ''
      ]);
    } else {
      const isDispense = rec?.isDispense;
      const isAbsent = rec?.isAbsent;

      const n1 = isDispense ? 'معفى' : (isAbsent ? 'غائب' : (rec?.noteDevoir1 !== null && rec?.noteDevoir1 !== undefined ? rec.noteDevoir1 : ''));
      const n2 = isDispense ? 'معفى' : (isAbsent ? 'غائب' : (rec?.noteDevoir2 !== null && rec?.noteDevoir2 !== undefined ? rec.noteDevoir2 : ''));
      const n3 = isDispense ? 'معفى' : (isAbsent ? 'غائب' : (rec?.noteDevoir3 !== null && rec?.noteDevoir3 !== undefined ? rec.noteDevoir3 : ''));

      const avg = isDispense ? 'معفى' : (isAbsent ? 'غائب' : (calculateMassarAverage(rec?.noteDevoir1, rec?.noteDevoir2, rec?.noteDevoir3, config.rounding) ?? ''));
      const remarque = rec?.remarque || (isDispense ? 'معفى طبياً' : '');

      rows.push([
        orderNum,
        massarCode,
        studentName,
        n1,
        n2,
        n3,
        avg,
        remarque
      ]);
    }
  });

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // الرقم الترتيبي
    { wch: 16 }, // رمز مسار
    { wch: 32 }, // الاسم والنسب
    { wch: 18 }, // الفرض 1
    { wch: 18 }, // الفرض 2
    { wch: 18 }, // الفرض 3
    { wch: 20 }, // معدل المراقبة
    { wch: 36 }  // ملاحظات الأستاذ
  ];

  // Set RTL direction on sheet
  ws['!views'] = [{ rightToLeft: true }];

  const wb = XLSX.utils.book_new();
  const cleanSheetName = `مسار_${className}`.replace(/[\/\\?*:[\]]/g, '_').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);

  const fileName = isBlank 
    ? `نموذج_مسار_فارغ_${className}_S${config.semestre}.xlsx`
    : `لائحة_مسار_نقط_EPS_${className}_S${config.semestre}.xlsx`;

  XLSX.writeFile(wb, fileName);
};

/**
 * Generates an official Massar Excel workbook for an entire educational level (e.g. 1AC, 2AC, 3AC)
 * Includes sheets for each class of that level with official Moroccan Ministry layout.
 */
export const generateOfficialMassarExcelForLevel = (
  level: SchoolLevel,
  classesData: {
    className: string;
    students: StudentIdentity[];
    records: MassarGradeRecord[];
  }[],
  config: MassarClassConfig,
  isBlank: boolean = false
) => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error('مكتبة XLSX غير متوفرة.');
  }

  const wb = XLSX.utils.book_new();
  const act1Meta = getActivityMeta(config.activity1);
  const act2Meta = getActivityMeta(config.activity2);
  const act3Meta = getActivityMeta(config.activity3);

  const act1Label = config.activity1CustomLabel || act1Meta.shortAr;
  const act2Label = config.activity2CustomLabel || act2Meta.shortAr;
  const act3Label = config.activity3CustomLabel || act3Meta.shortAr;

  classesData.forEach(({ className, students, records }) => {
    const rows: any[][] = [];

    // Official Moroccan Massar Header
    rows.push(['المملكة المغربية']);
    rows.push(['وزارة التربية الوطنية والتعليم الأولي والرياضة']);
    rows.push([
      `الأكاديمية الجهوية: ${config.academie || 'الجهة الشرقية'}`,
      '',
      '',
      `المديرية الإقليمية: ${config.direction || 'مديرية فكيك'}`,
      '',
      '',
      `المؤسسة: ${config.schoolName || 'الثانوية التأهيلية'}`
    ]);
    rows.push([
      `المادة: التربية البدنية والرياضية`,
      '',
      `المستوى: ${level.name} | القسم: ${className}`,
      '',
      `الدورة: ${config.semestre === '1' ? 'الدورة الأولى' : 'الدورة الثانية'}`,
      '',
      `السنة الدراسية: ${config.schoolYear}`,
      '',
      config.teacherName ? `الأستاذ: ${config.teacherName}` : ''
    ]);
    rows.push([]); // blank separator

    // Table Headers
    rows.push([
      'الرقم الترتيبي',
      'رمز مسار',
      'الاسم والنسب',
      `الفرض الأول (${act1Label})`,
      `الفرض الثاني (${act2Label})`,
      `الفرض الثالث (${act3Label})`,
      'معدل المراقبة المستمرة',
      'ملاحظات الأستاذ'
    ]);

    const sorted = [...students].sort((a, b) => (a.nomEleve || '').localeCompare(b.nomEleve || '', 'ar'));
    const recMap = new Map<string, MassarGradeRecord>();
    records.forEach(r => recMap.set(r.numeroEleve, r));

    sorted.forEach((s, idx) => {
      const rec = recMap.get(s.numeroEleve);
      const code = rec?.codeMassar || s.codeMassar || (s.numeroEleve.length > 5 ? s.numeroEleve : '');
      if (isBlank) {
        rows.push([idx + 1, code, s.nomEleve || '', '', '', '', '', '']);
      } else {
        const isDispense = rec?.isDispense;
        const isAbsent = rec?.isAbsent;
        const n1 = isDispense ? 'معفى' : (isAbsent ? 'غائب' : (rec?.noteDevoir1 !== null && rec?.noteDevoir1 !== undefined ? rec.noteDevoir1 : ''));
        const n2 = isDispense ? 'معفى' : (isAbsent ? 'غائب' : (rec?.noteDevoir2 !== null && rec?.noteDevoir2 !== undefined ? rec.noteDevoir2 : ''));
        const n3 = isDispense ? 'معفى' : (isAbsent ? 'غائب' : (rec?.noteDevoir3 !== null && rec?.noteDevoir3 !== undefined ? rec.noteDevoir3 : ''));
        const avg = isDispense ? 'معفى' : (isAbsent ? 'غائب' : (calculateMassarAverage(rec?.noteDevoir1, rec?.noteDevoir2, rec?.noteDevoir3, config.rounding) ?? ''));
        const rem = rec?.remarque || (isDispense ? 'معفى طبياً' : '');
        rows.push([idx + 1, code, s.nomEleve || '', n1, n2, n3, avg, rem]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 12 }, { wch: 16 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 36 }
    ];
    ws['!views'] = [{ rightToLeft: true }];
    const safeSheetName = `${className}`.replace(/[\/\\?*:[\]]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName || `قسم_${level.id}`);
  });

  const fileName = isBlank
    ? `نماذج_مسار_فارغة_${level.shortName}_S${config.semestre}.xlsx`
    : `لوائح_مسار_مملوءة_${level.shortName}_S${config.semestre}.xlsx`;

  XLSX.writeFile(wb, fileName);
};
