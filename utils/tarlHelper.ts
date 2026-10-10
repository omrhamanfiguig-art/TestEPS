import type { StudentIdentity, MassarGradeRecord, MassarClassConfig, TarlLevelKey, TarlStudentRow, PhysicalTests, StudentResult } from '../types';
import { normalizeArabic, isForbiddenStudentName } from './excelHelper';
import { calculateMassarAverage, getMassarAppreciation } from './massarHelper';

export interface TarlLevelMeta {
  key: TarlLevelKey;
  numericLevel: number;
  nameAr: string;
  shortAr: string;
  descAr: string;
  badgeClass: string;
  dotColor: string;
  defaultScore: number;
  minScore: number;
  maxScore: number;
  defaultRemediation: string;
  defaultMassarAppreciation: string;
}

export const TARL_LEVELS: TarlLevelMeta[] = [
  {
    key: 'niveau_1',
    numericLevel: 1,
    nameAr: 'المستوى 1: مبتدئ (صعوبات أولية)',
    shortAr: 'مبتدئ (م1)',
    descAr: 'صعوبات ملحوظة في التوافق الحركي والمكتسبات البدنية الأساسية',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    dotColor: 'bg-rose-500',
    defaultScore: 6.5,
    minScore: 0,
    maxScore: 7.5,
    defaultRemediation: 'دعم علاجي مكثف: أنشطة بناء التوافق الحركي الأولي والتحكم البسيط',
    defaultMassarAppreciation: 'ضعيف، صعوبات بدنية وحركية تستلزم الدعم المكثف'
  },
  {
    key: 'niveau_2',
    numericLevel: 2,
    nameAr: 'المستوى 2: كلمة (تحكم أولي)',
    shortAr: 'تحكم أولي (م2)',
    descAr: 'بداية اكتساب المهارات الحركية مع صعوبة في الاستمرارية والربط',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    defaultScore: 9.5,
    minScore: 8,
    maxScore: 10.5,
    defaultRemediation: 'تمارين موجهة فردية وثنائية لتعزيز الدقة والتوازن والثقة بالنفس',
    defaultMassarAppreciation: 'دون المتوسط، يحتاج لمزيد من الجهد والمواظبة على الأنشطة'
  },
  {
    key: 'niveau_3',
    numericLevel: 3,
    nameAr: 'المستوى 3: جملة (في طور التمكن)',
    shortAr: 'في طور التمكن (م3)',
    descAr: 'تحكم متوسط وتطبيق لا بأس به للمهارات مع حاجة لتعزيز الانسجام والتكتيك',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    dotColor: 'bg-blue-500',
    defaultScore: 12.5,
    minScore: 11,
    maxScore: 13.5,
    defaultRemediation: 'أنشطة ومواقف لعب جماعية لتطوير اتخاذ القرار والسرعة التكتيكية',
    defaultMassarAppreciation: 'مستحسن، عمل جاد ومستوى متطور وإمكانات قابلة للتقدم'
  },
  {
    key: 'niveau_4',
    numericLevel: 4,
    nameAr: 'المستوى 4: فقرة (متمكن)',
    shortAr: 'متمكن (م4)',
    descAr: 'تحكم جيد في المهارات التقنية والبدنية ومشاركة إيجابية وفعالة',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    dotColor: 'bg-indigo-500',
    defaultScore: 15.5,
    minScore: 14,
    maxScore: 16.5,
    defaultRemediation: 'إسناد مهام القيادة والتحكيم وتنظيم اللعب والتطوير الذاتي',
    defaultMassarAppreciation: 'حسن، مشاركة إيجابية ومستوى تقني وبدني جيد جداً'
  },
  {
    key: 'niveau_5',
    numericLevel: 5,
    nameAr: 'المستوى 5: قصة (متمكن جداً / متفوق)',
    shortAr: 'متفوق (م5)',
    descAr: 'أداء نموذجي ومتميز وتفوق بدني وتكتيكي ومواظبة استثنائية',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    defaultScore: 18.5,
    minScore: 17,
    maxScore: 20,
    defaultRemediation: 'تأطير المنافسات، التشجيع على المشاركة في البطولات المدرسية والألعاب',
    defaultMassarAppreciation: 'ممتاز، أداء رياضي متميز ومواظبة نموذجية وتفوق تكتيكي'
  }
];

export const getTarlLevelMeta = (key: TarlLevelKey): TarlLevelMeta => {
  return TARL_LEVELS.find(l => l.key === key) || TARL_LEVELS[2];
};

/**
 * Detects TaRL level from score (0 to 20)
 */
export const detectTarlLevelFromScore = (score: number): TarlLevelKey => {
  if (isNaN(score) || score === null || score === undefined) return 'niveau_3';
  if (score < 8) return 'niveau_1';
  if (score < 11) return 'niveau_2';
  if (score < 14) return 'niveau_3';
  if (score < 17) return 'niveau_4';
  return 'niveau_5';
};

/**
 * Detects TaRL level from string text (e.g. from imported Excel cell)
 */
export const detectTarlLevelFromString = (text: any): TarlLevelKey => {
  if (!text) return 'niveau_3';
  const str = normalizeArabic(String(text)).toLowerCase();

  if (str.includes('5') || str.includes('قصه') || str.includes('متفوق') || str.includes('متميز') || str.includes('histoire') || str.includes('expert')) {
    return 'niveau_5';
  }
  if (str.includes('4') || str.includes('فقره') || str.includes('متمكن') || str.includes('paragraphe') || str.includes('acquis')) {
    return 'niveau_4';
  }
  if (str.includes('3') || str.includes('جمله') || str.includes('في طور') || str.includes('phrase') || str.includes('cours')) {
    return 'niveau_3';
  }
  if (str.includes('2') || str.includes('كلمه') || str.includes('اولي') || str.includes('mot') || str.includes('debut')) {
    return 'niveau_2';
  }
  if (str.includes('1') || str.includes('مبتدئ') || str.includes('صعوب') || str.includes('ضعيف') || str.includes('debutant') || str.includes('non')) {
    return 'niveau_1';
  }

  // Try numeric parsing
  const num = parseFloat(str.replace(',', '.'));
  if (!isNaN(num)) {
    if (num <= 5 && num >= 1) {
      if (num === 1) return 'niveau_1';
      if (num === 2) return 'niveau_2';
      if (num === 3) return 'niveau_3';
      if (num === 4) return 'niveau_4';
      if (num === 5) return 'niveau_5';
    }
    return detectTarlLevelFromScore(num);
  }

  return 'niveau_3';
};

/**
 * Helper to round note according to Massar rounding config
 */
export const roundMassarNote = (num: number, rounding: 'none' | '0.25' | '0.5' | '1' = '0.25'): number => {
  if (isNaN(num)) return 0;
  if (rounding === '0.25') return Math.round(num * 4) / 4;
  if (rounding === '0.5') return Math.round(num * 2) / 2;
  if (rounding === '1') return Math.round(num);
  return Number(num.toFixed(2));
};

/**
 * Converts TaRL student evaluations into official Massar Grade Records (نقط الفروض الثلاثة CC1, CC2, CC3)
 */
export const convertTarlToMassarGrades = (
  students: StudentIdentity[],
  tarlMap: Record<string, TarlStudentRow>,
  config: MassarClassConfig,
  existingRecords: MassarGradeRecord[] = [],
  physicalTests: PhysicalTests[] = [],
  vmaList: StudentResult[] = []
): MassarGradeRecord[] => {
  const existingMap = new Map<string, MassarGradeRecord>();
  existingRecords.forEach(r => existingMap.set(r.numeroEleve, r));

  return students.map((std, idx) => {
    const existing = existingMap.get(std.numeroEleve);
    const normName = normalizeArabic(std.nomEleve || '').trim();
    const massarCode = (std.codeMassar || '').trim().toUpperCase();

    // Match physical tests
    const isMatching = (candidate: { numeroEleve?: string; nomEleve?: string; codeMassar?: string } | null | undefined): boolean => {
      if (!candidate) return false;
      if (candidate.numeroEleve && candidate.numeroEleve === std.numeroEleve) return true;
      if (massarCode) {
        if (candidate.numeroEleve && candidate.numeroEleve.trim().toUpperCase() === massarCode) return true;
        if (candidate.codeMassar && candidate.codeMassar.trim().toUpperCase() === massarCode) return true;
      }
      if (candidate.nomEleve && normName) {
        const cName = normalizeArabic(candidate.nomEleve).trim();
        if (cName === normName) return true;
        if (normName.length > 3 && (cName.includes(normName) || normName.includes(cName))) return true;
      }
      return false;
    };

    const pTest = physicalTests.find(isMatching);
    const pVma = vmaList.find(isMatching);

    const tRow = tarlMap[std.numeroEleve] || {
      numeroEleve: std.numeroEleve,
      codeMassar: std.codeMassar,
      nomEleve: std.nomEleve,
      sexe: std.sexe,
      className: (std as any).className || config.className,
      tarlLevel: detectTarlLevelFromString(std.tarlLevel || ''),
      tarlLevelLabel: '',
      tarlGroup: std.tarlGroup || `فوج طارل ${(idx % 3) + 1}`,
      tarlScore: std.tarlScore || 12,
      tarlRemediation: std.tarlRemediation || ''
    };

    const meta = getTarlLevelMeta(tRow.tarlLevel);

    // If student is medically excused
    if (existing?.isDispense) {
      return {
        ...existing,
        codeMassar: std.codeMassar || existing.codeMassar,
        nomEleve: std.nomEleve || existing.nomEleve,
        isDispense: true,
        noteDevoir1: null,
        noteDevoir2: null,
        noteDevoir3: null,
        remarque: 'معفى طبياً'
      };
    }

    // Base score from TaRL diagnostic or level's default score
    const base = tRow.tarlScore > 0 ? tRow.tarlScore : meta.defaultScore;

    // Extract actual physical tests performed in TaRL
    const testSummaries: string[] = [];
    const vmaVal = pVma?.vma || pTest?.vma;

    let testSpeedScore: number | undefined = undefined;
    if (pTest?.scoreVitesse30m !== undefined && !isNaN(pTest.scoreVitesse30m)) {
      testSpeedScore = Number(pTest.scoreVitesse30m);
      testSummaries.push(`سرعة 30م: ${testSpeedScore}/20`);
    } else if (pTest?.scoreVitesse !== undefined && !isNaN(pTest.scoreVitesse)) {
      testSpeedScore = Number(pTest.scoreVitesse);
      testSummaries.push(`سرعة: ${testSpeedScore}/20`);
    }

    let testVmaScore: number | undefined = undefined;
    if (vmaVal !== undefined && !isNaN(vmaVal) && vmaVal > 0) {
      testVmaScore = Math.min(20, Math.max(6, (vmaVal - 8) * 1.5 + 8));
      testSummaries.push(`VMA: ${vmaVal} كم/س (${Number(testVmaScore.toFixed(1))}/20)`);
    }

    let testJumpScore: number | undefined = undefined;
    if (pTest?.scoreSautLong !== undefined && !isNaN(pTest.scoreSautLong)) {
      testJumpScore = Number(pTest.scoreSautLong);
      testSummaries.push(`ارتقاء/قفز: ${testJumpScore}/20`);
    } else if (pTest?.scoreSautHorizontal !== undefined && !isNaN(pTest.scoreSautHorizontal)) {
      testJumpScore = Number(pTest.scoreSautHorizontal);
      testSummaries.push(`ارتقاء أفقي: ${testJumpScore}/20`);
    }

    let testThrowScore: number | undefined = undefined;
    if (pTest?.scoreMedball !== undefined && !isNaN(pTest.scoreMedball)) {
      testThrowScore = Number(pTest.scoreMedball);
      testSummaries.push(`رمي: ${testThrowScore}/20`);
    }

    let testFlexScore: number | undefined = undefined;
    if (pTest?.scoreSouplesse !== undefined && !isNaN(pTest.scoreSouplesse)) {
      testFlexScore = Number(pTest.scoreSouplesse);
      testSummaries.push(`مرونة: ${testFlexScore}/20`);
    }

    let testSportScore: number | undefined = undefined;
    if (pTest?.sportCollectifScore !== undefined && !isNaN(pTest.sportCollectifScore)) {
      testSportScore = Number(pTest.sportCollectifScore);
      testSummaries.push(`رياضة جماعية: ${testSportScore}/20`);
    }

    let testGymScore: number | undefined = undefined;
    if (pTest?.gymScoreTotal !== undefined && !isNaN(pTest.gymScoreTotal)) {
      testGymScore = Number(pTest.gymScoreTotal);
      testSummaries.push(`جمباز: ${testGymScore}/20`);
    }

    testSummaries.push(`مستوى طارل: ${meta.shortAr} (${base}/20)`);

    // Devoir 1: Sport collectif / participation
    const rawN1 = testSportScore !== undefined ? testSportScore : (base - 0.25);

    // Devoir 2: Gymnastique / coordination
    let rawN2 = base;
    if (testGymScore !== undefined) {
      rawN2 = testGymScore;
    } else if (testFlexScore !== undefined || testJumpScore !== undefined) {
      const parts = [testFlexScore, testJumpScore].filter(v => v !== undefined) as number[];
      rawN2 = parts.reduce((a, b) => a + b, 0) / parts.length;
    }

    // Devoir 3: Physical tests / Speed / Endurance / Jump
    let rawN3 = base + 0.5;
    if (testSpeedScore !== undefined || testVmaScore !== undefined || testJumpScore !== undefined) {
      const physScores = [testSpeedScore, testVmaScore, testJumpScore].filter(v => v !== undefined) as number[];
      rawN3 = physScores.reduce((a, b) => a + b, 0) / physScores.length;
    }

    const clamp = (val: number) => Math.max(1, Math.min(20, val));

    const note1 = roundMassarNote(clamp(rawN1), config.rounding);
    const note2 = roundMassarNote(clamp(rawN2), config.rounding);
    const note3 = roundMassarNote(clamp(rawN3), config.rounding);

    const avg = calculateMassarAverage(note1, note2, note3, config.rounding);
    const appreciation = meta.defaultMassarAppreciation || getMassarAppreciation(avg);

    const summaryStr = testSummaries.join(' | ');

    return {
      numeroEleve: std.numeroEleve,
      codeMassar: std.codeMassar || existing?.codeMassar,
      nomEleve: std.nomEleve,
      sexe: std.sexe,
      dateNaissance: std.dateNaissance || existing?.dateNaissance,
      className: (std as any).className || existing?.className || config.className,
      noteDevoir1: note1,
      noteDevoir2: note2,
      noteDevoir3: note3,
      isDispense: false,
      isAbsent: false,
      remarque: appreciation,
      matchedFromClass: existing?.matchedFromClass || (std as any).className,
      populatedFromTarl: true,
      tarlSourceDetails: summaryStr,
      physicalTestsSummary: summaryStr
    };
  });
};

/**
 * Converts Massar Grade Records into TaRL student entries
 */
export const convertMassarToTarlRows = (
  students: StudentIdentity[],
  records: MassarGradeRecord[],
  defaultClass: string = ''
): TarlStudentRow[] => {
  const recordMap = new Map<string, MassarGradeRecord>();
  records.forEach(r => recordMap.set(r.numeroEleve, r));

  return students.map((std, idx) => {
    const rec = recordMap.get(std.numeroEleve);
    let score = 12;

    if (rec && !rec.isDispense) {
      const avg = calculateMassarAverage(rec.noteDevoir1, rec.noteDevoir2, rec.noteDevoir3);
      if (avg !== null) {
        score = avg;
      }
    } else if (std.tarlScore) {
      score = std.tarlScore;
    }

    const levelKey: TarlLevelKey = std.tarlLevel 
      ? detectTarlLevelFromString(std.tarlLevel)
      : detectTarlLevelFromScore(score);

    const meta = getTarlLevelMeta(levelKey);

    return {
      numeroEleve: std.numeroEleve,
      codeMassar: std.codeMassar || rec?.codeMassar || '',
      nomEleve: std.nomEleve,
      sexe: std.sexe,
      className: (std as any).className || rec?.className || defaultClass,
      dateNaissance: std.dateNaissance || rec?.dateNaissance,
      tarlLevel: levelKey,
      tarlLevelLabel: meta.nameAr,
      tarlGroup: std.tarlGroup || `فوج طارل ${(idx % 3) + 1}`,
      tarlScore: score,
      tarlRemediation: std.tarlRemediation || meta.defaultRemediation,
      observation: rec?.remarque || ''
    };
  });
};

/**
 * Exports TaRL students list to Excel workbook (.xlsx)
 */
export const exportTarlWorkbook = (
  className: string,
  tarlRows: TarlStudentRow[],
  schoolYear: string = '2025/2026',
  teacherName: string = ''
) => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error('مكتبة XLSX غير محملة');
  }

  const wb = XLSX.utils.book_new();

  // Prepare header metadata rows
  const wsData: any[][] = [
    ['المملكة المغربية'],
    ['وزارة التربية الوطنية والتعليم الأولي والرياضة - برنامج معالجة التعلمات (طارل / TaRL) في مادة التربية البدنية والرياضية'],
    [`السنة الدراسية: ${schoolYear}`, '', `الأستاذ(ة): ${teacherName || '—'}`, '', `القسم / الفوج: ${className}`],
    [`تاريخ التصدير: ${new Date().toLocaleDateString('ar-MA')}`, '', `إجمالي التلاميذ: ${tarlRows.length}`],
    [],
    // Table Columns Header
    [
      'ر.ت',
      'رمز مسار',
      'الاسم الكامل للتلميذ(ة)',
      'النوع',
      'القسم',
      'مستوى طارل (TaRL Level)',
      'فوج / مجموعة طارل',
      'نقطة الرائز التشخيصي (/20)',
      'الخطة العلاجية وإجراءات الدعم المقترحة',
      'ملاحظات إضافية'
    ]
  ];

  tarlRows.forEach((row, idx) => {
    const meta = getTarlLevelMeta(row.tarlLevel);
    wsData.push([
      idx + 1,
      row.codeMassar || row.numeroEleve,
      row.nomEleve,
      row.sexe === 'F' ? 'أنثى' : 'ذكر',
      row.className || className,
      meta.nameAr,
      row.tarlGroup,
      row.tarlScore,
      row.tarlRemediation || meta.defaultRemediation,
      row.observation || ''
    ]);
  });

  // Summary statistics block
  wsData.push([]);
  wsData.push(['📊 إحصائيات توزيع التلاميذ حسب مستويات طارل (TaRL):']);
  TARL_LEVELS.forEach(lvl => {
    const count = tarlRows.filter(r => r.tarlLevel === lvl.key).length;
    const pct = tarlRows.length > 0 ? Math.round((count / tarlRows.length) * 100) : 0;
    wsData.push([lvl.nameAr, count, `${pct}%`]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // Massar
    { wch: 28 }, // Name
    { wch: 8 },  // Sex
    { wch: 12 }, // Class
    { wch: 26 }, // TaRL Level
    { wch: 16 }, // TaRL Group
    { wch: 14 }, // Score
    { wch: 38 }, // Remediation
    { wch: 24 }  // Obs
  ];

  XLSX.utils.book_append_sheet(wb, ws, `طارل_${className}`);
  const fileName = `لائحة_طارل_${className}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Downloads a blank TaRL Excel template for teachers to fill
 */
export const downloadBlankTarlTemplate = (className: string = 'القسم') => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error('مكتبة XLSX غير محملة');
  }

  const wb = XLSX.utils.book_new();

  const sampleRows: any[][] = [
    ['المملكة المغربية - وزارة التربية الوطنية والتعليم الأولي والرياضة'],
    [`شبكة تشخيص وتفييء لوائح طارل (TaRL) - مادة التربية البدنية والرياضية`],
    [`القسم: ${className}`, '', `السنة الدراسية: 2025/2026`],
    [],
    [
      'ر.ت',
      'رمز مسار',
      'الاسم الكامل للتلميذ(ة)',
      'النوع (ذكر/أنثى)',
      'القسم',
      'مستوى طارل (مبتدئ / كلمة / جملة / فقرة / قصة)',
      'فوج طارل',
      'نقطة الرائز التشخيصي (/20)',
      'خطة الدعم المقترحة'
    ],
    [1, 'G134012345', 'أحمد بنعلي', 'ذكر', className, 'المستوى 4: فقرة (متمكن)', 'فوج طارل 1', 15.5, 'تطوير القيادة والتنسيق'],
    [2, 'G134012346', 'فاطمة الزهراء العلمي', 'أنثى', className, 'المستوى 5: قصة (متفوق)', 'فوج طارل 1', 18.0, 'المشاركة في الأنشطة التنافسية'],
    [3, 'G134012347', 'ياسين المرابط', 'ذكر', className, 'المستوى 2: كلمة (تحكم أولي)', 'فوج طارل 2', 9.5, 'تمارين موجهة للتوازن والدقة'],
    [4, 'G134012348', 'مريم الادريسي', 'أنثى', className, 'المستوى 1: مبتدئ (صعوبات أولية)', 'فوج طارل 3', 6.0, 'دعم علاجي مكثف للتوافق الحركي'],
    [5, 'G134012349', 'عمر الحسني', 'ذكر', className, 'المستوى 3: جملة (في طور التمكن)', 'فوج طارل 2', 12.0, 'أنشطة جماعية لتطوير اتخاذ القرار']
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 26 },
    { wch: 12 },
    { wch: 12 },
    { wch: 28 },
    { wch: 16 },
    { wch: 16 },
    { wch: 32 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'نموذج_طارل');
  XLSX.writeFile(wb, `نموذج_لائحة_طارل_فارغ_${className}.xlsx`);
};
