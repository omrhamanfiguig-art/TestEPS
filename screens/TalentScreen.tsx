import React, { useState, useEffect, useMemo } from 'react';
import { 
  getAllClasses, 
  getStudentList, 
  getPhysicalTests, 
  getVmaResults, 
  ClassStats 
} from '../utils/db';
import type { StudentIdentity, PhysicalTests, StudentResult } from '../types';
import { 
  TrophyIcon, 
  SparklesIcon, 
  ArrowDownTrayIcon, 
  ChevronDownIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  CheckCircleIcon,
  TableCellsIcon,
  InformationCircleIcon,
  UserGroupIcon,
  RunningManIcon,
  RulerIcon,
  ScaleIcon
} from '../components/Icons';
import { StudentAvatar } from '../components/StudentAvatar';
import { 
  calculateScore, 
  getCustomScale, 
  formatSecondsToMinSec,
  parseMinSecToSeconds 
} from '../utils/ScoringConstants';
import { exportTalentAnalysisToExcel, TalentExportRow } from '../utils/excelHelper';
import { useLanguage } from '../utils/i18n';

interface TalentScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
}

type AnalysisMode = 'single' | 'multi';
type GenderFilter = 'all' | 'M' | 'F';

interface MetricConfig {
  key: string;
  label: string;
  category: 'physical' | 'anthropometric';
  icon: string;
  lowerIsBetter?: boolean;
}

const ALL_METRICS: MetricConfig[] = [
  // Physical
  { key: 'vma', label: 'السرعة القصوى الهوائية (VMA)', category: 'physical', icon: '🫁' },
  { key: 'vitesse30m', label: 'سرعة 30 متر / 60م / 80م', category: 'physical', icon: '⚡', lowerIsBetter: true },
  { key: 'sautVertical', label: 'القفز العمودي (سارجنت)', category: 'physical', icon: '🚀' },
  { key: 'sautHorizontal', label: 'القفز الأفقي / الطولي', category: 'physical', icon: '📐' },
  { key: 'lancerMedball', label: 'رمي الكرة الطبية / الجلة', category: 'physical', icon: '💥' },
  { key: 'souplesseAssis', label: 'مرونة جلوس', category: 'physical', icon: '🧘' },
  { key: 'souplesseDebout', label: 'مرونة وقوف', category: 'physical', icon: '🧘‍♂️' },
  { key: 'equilibreStatique', label: 'التوازن الثابت', category: 'physical', icon: '⚖️' },

  // Anthropometric
  { key: 'taille', label: 'طول القامة (Taille)', category: 'anthropometric', icon: '📐' },
  { key: 'poids', label: 'الوزن (Poids)', category: 'anthropometric', icon: '⚖️' },
  { key: 'bmi', label: 'مؤشر كتلة الجسم (IMC)', category: 'anthropometric', icon: '📊' },
  { key: 'frequenceCardiaque', label: 'نبض القلب (FC)', category: 'anthropometric', icon: '❤️', lowerIsBetter: true },
];

export const TalentScreen: React.FC<TalentScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  const { t, language } = useLanguage();
  const [classList, setClassList] = useState<ClassStats[]>([]);
  const [allStudents, setAllStudents] = useState<{ student: StudentIdentity; className: string }[]>([]);
  const [allTests, setAllTests] = useState<{ className: string; results: PhysicalTests[] }[]>([]);
  const [allVma, setAllVma] = useState<{ className: string; results: StudentResult[] }[]>([]);

  // Filter controls
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('multi');
  const [filterClass, setFilterClass] = useState<string>('ALL'); // 'ALL' or specific className or Level prefix
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Metrics Checkboxes (Defaults to 6 key metrics like screenshot)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'vma', 'vitesse30m', 'sautVertical', 'sautHorizontal', 'lancerMedball', 'taille'
  ]);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const cls = await getAllClasses();
      setClassList(cls);

      const stdPromises = cls.map(c => getStudentList(c.className).then(stds => stds.map(s => ({ student: s, className: c.className }))));
      const testPromises = cls.map(c => getPhysicalTests(c.className).then(res => ({ className: c.className, results: res || [] })));
      const vmaPromises = cls.map(c => getVmaResults(c.className).then(res => ({ className: c.className, results: res || [] })));

      const stdsNested = await Promise.all(stdPromises);
      const testsNested = await Promise.all(testPromises);
      const vmaNested = await Promise.all(vmaPromises);

      setAllStudents(stdsNested.flat());
      setAllTests(testsNested);
      setAllVma(vmaNested);
    } catch (err) {
      console.error('Error loading talent screen data', err);
    }
  };

  // Helper to extract unique academic levels from class names
  const academicLevels = useMemo(() => {
    const levels = new Set<string>();
    classList.forEach(c => {
      const name = c.className;
      // Common level prefixes like 1APIC, 2APIC, 3APIC, TC, 1BAC, 2BAC, 6ème, 3ème, etc.
      const match = name.match(/^(1APIC|2APIC|3APIC|TC|1BAC|2BAC|6ème|5ème|4ème|3ème|1AC|2AC|3AC)/i);
      if (match) {
        levels.add(match[1].toUpperCase());
      }
    });
    return Array.from(levels);
  }, [classList]);

  // Toggle metric selection
  const toggleMetric = (key: string) => {
    if (analysisMode === 'single') {
      setSelectedMetrics([key]);
      return;
    }
    if (selectedMetrics.includes(key)) {
      if (selectedMetrics.length === 1) {
        setNotification({ message: "يجب اختيار معيار واحد على الأقل للتحليل.", type: 'error' });
        return;
      }
      setSelectedMetrics(selectedMetrics.filter(k => k !== key));
    } else {
      setSelectedMetrics([...selectedMetrics, key]);
    }
  };

  // Preset Quick Selectors
  const selectPresetPhysicalFour = () => {
    setSelectedMetrics(['vma', 'vitesse30m', 'sautHorizontal', 'lancerMedball']);
  };

  const selectPresetPhysicalAndAnthrop = () => {
    setSelectedMetrics(['vma', 'vitesse30m', 'sautHorizontal', 'lancerMedball', 'taille', 'poids']);
  };

  const selectPresetAll12 = () => {
    setSelectedMetrics(ALL_METRICS.map(m => m.key));
  };

  // Process & Score Students
  const rankedData = useMemo(() => {
    if (allStudents.length === 0) return [];

    // Filter Students
    const filtered = allStudents.filter(item => {
      const s = item.student;
      // Class or Level Filter
      if (filterClass !== 'ALL') {
        if (filterClass.startsWith('LEVEL_')) {
          const levelCode = filterClass.replace('LEVEL_', '');
          if (!item.className.toUpperCase().startsWith(levelCode)) return false;
        } else if (item.className !== filterClass) {
          return false;
        }
      }

      // Gender
      if (genderFilter !== 'all' && s.sexe !== genderFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = (s.nomEleve || '').toLowerCase().includes(q);
        const idMatch = (s.numeroEleve || '').toLowerCase().includes(q);
        if (!nameMatch && !idMatch) return false;
      }

      return true;
    });

    // Create lookup maps for fast access
    const testMap = new Map<string, PhysicalTests>();
    allTests.forEach(tGroup => {
      tGroup.results.forEach(res => {
        testMap.set(`${tGroup.className}_${res.numeroEleve}`, res);
      });
    });

    const vmaMap = new Map<string, number>();
    allVma.forEach(vGroup => {
      vGroup.results.forEach(res => {
        if (res.vma !== undefined && !isNaN(res.vma)) {
          vmaMap.set(`${vGroup.className}_${res.numeroEleve}`, res.vma);
        }
      });
    });

    // First pass: extract raw values for selected metrics per student
    const studentMetricValues: Array<{
      student: StudentIdentity;
      className: string;
      values: Record<string, number | undefined>;
    }> = [];

    filtered.forEach(item => {
      const key = `${item.className}_${item.student.numeroEleve}`;
      const res = testMap.get(key);
      const vmaVal = vmaMap.get(key) ?? res?.vma;

      const vals: Record<string, number | undefined> = {};

      selectedMetrics.forEach(mKey => {
        if (mKey === 'vma') {
          vals.vma = vmaVal;
        } else if (mKey === 'vitesse30m') {
          vals.vitesse30m = res?.vitesse30m;
        } else if (mKey === 'sautVertical') {
          vals.sautVertical = res?.sautVertical;
        } else if (mKey === 'sautHorizontal') {
          vals.sautHorizontal = res?.sautHorizontal ?? res?.sautLong;
        } else if (mKey === 'lancerMedball') {
          vals.lancerMedball = res?.lancerMedball ?? res?.lancerPoids;
        } else if (mKey === 'souplesseAssis') {
          vals.souplesseAssis = res?.souplesseAssis;
        } else if (mKey === 'souplesseDebout') {
          vals.souplesseDebout = res?.souplesseDebout;
        } else if (mKey === 'equilibreStatique') {
          vals.equilibreStatique = res?.equilibreStatique;
        } else if (mKey === 'taille') {
          vals.taille = res?.taille;
        } else if (mKey === 'poids') {
          vals.poids = res?.poids;
        } else if (mKey === 'bmi') {
          if (res?.poids && res?.taille && res.taille > 0) {
            const hM = res.taille / 100;
            vals.bmi = Number((res.poids / (hM * hM)).toFixed(1));
          } else {
            vals.bmi = undefined;
          }
        } else if (mKey === 'frequenceCardiaque') {
          vals.frequenceCardiaque = res?.frequenceCardiaque;
        }
      });

      studentMetricValues.push({
        student: item.student,
        className: item.className,
        values: vals
      });
    });

    // Compute Min & Max for normalization across current filtered group for each metric
    const minMaxMap: Record<string, { min: number; max: number }> = {};
    selectedMetrics.forEach(mKey => {
      const validVals = studentMetricValues
        .map(s => s.values[mKey])
        .filter((v): v is number => v !== undefined && !isNaN(v));

      if (validVals.length > 0) {
        minMaxMap[mKey] = {
          min: Math.min(...validVals),
          max: Math.max(...validVals)
        };
      } else {
        minMaxMap[mKey] = { min: 0, max: 1 };
      }
    });

    // Compute composite points out of 20 for each student
    const scoredStudents = studentMetricValues.map(item => {
      let totalPts = 0;
      let evaluatedCount = 0;
      const formattedMetricVals: Record<string, string | number> = {};

      selectedMetrics.forEach(mKey => {
        const val = item.values[mKey];
        const cfg = ALL_METRICS.find(m => m.key === mKey);

        if (val !== undefined && !isNaN(val)) {
          evaluatedCount++;
          let pts = 0;

          // For standard physical tests, if custom bareme exists, compute score out of 20 directly!
          if (mKey === 'vma') {
            pts = Math.min(20, Math.max(0, val * 1.2)); // VMA 16.5 = 20 pts
            formattedMetricVals[mKey] = `${val} كم/س`;
          } else if (mKey === 'vitesse30m') {
            pts = calculateScore(val, getCustomScale('speed'), item.student.sexe || 'M', true);
            formattedMetricVals[mKey] = `${val} ث`;
          } else if (mKey === 'sautHorizontal') {
            pts = calculateScore(val, getCustomScale('long-jump'), item.student.sexe || 'M', false);
            formattedMetricVals[mKey] = `${val} ${val < 10 ? 'م' : 'سم'}`;
          } else if (mKey === 'lancerMedball') {
            pts = calculateScore(val, getCustomScale('shot-put'), item.student.sexe || 'M', false);
            formattedMetricVals[mKey] = `${val} م`;
          } else {
            // Min-Max percent normalization (0-20 pts)
            const minMax = minMaxMap[mKey];
            const range = minMax.max - minMax.min;
            if (range > 0) {
              if (cfg?.lowerIsBetter) {
                // Lower is better (e.g. Heart rate)
                pts = 20 * (1 - (val - minMax.min) / range);
              } else if (mKey === 'bmi') {
                // Optimal BMI is 21.5
                const diff = Math.abs(val - 21.5);
                pts = Math.max(0, 20 - diff * 2);
              } else {
                pts = 20 * ((val - minMax.min) / range);
              }
            } else {
              pts = 15;
            }

            if (mKey === 'taille') formattedMetricVals[mKey] = `${val} سم`;
            else if (mKey === 'poids') formattedMetricVals[mKey] = `${val} كغ`;
            else if (mKey === 'bmi') formattedMetricVals[mKey] = `${val}`;
            else if (mKey === 'frequenceCardiaque') formattedMetricVals[mKey] = `${val} bpm`;
            else formattedMetricVals[mKey] = `${val}`;
          }

          totalPts += pts;
        } else {
          formattedMetricVals[mKey] = '-';
        }
      });

      // Composite Score Out of 20
      const averageScoreOut20 = evaluatedCount > 0 ? Number((totalPts / evaluatedCount).toFixed(2)) : 0;
      const scorePercent = Number(((averageScoreOut20 / 20) * 100).toFixed(1));

      // Determine Talent Badge Tag
      let badge = 'مستوى مقبول';
      let badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      
      if (averageScoreOut20 >= 17) {
        badge = '🥇 بطل ذو مؤهلات عالية';
        badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300';
      } else if (averageScoreOut20 >= 14.5) {
        badge = '🌟 موهبة رياضية واعدة';
        badgeColor = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-300';
      } else if (averageScoreOut20 >= 12) {
        badge = '🏅 متفوق جادي';
        badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300';
      }

      return {
        student: item.student,
        className: item.className,
        evaluatedCount,
        metricValues: formattedMetricVals,
        averageScoreOut20,
        scorePercent,
        badge,
        badgeColor
      };
    });

    // Sort by composite average score descending
    scoredStudents.sort((a, b) => b.averageScoreOut20 - a.averageScoreOut20);

    return scoredStudents;
  }, [allStudents, allTests, allVma, filterClass, genderFilter, searchQuery, selectedMetrics]);

  // Export to Excel
  const handleExportExcel = () => {
    if (rankedData.length === 0) {
      setNotification({ message: "لا توجد نتائج جاهزة للتصدير.", type: 'error' });
      return;
    }

    const metricHeaders = selectedMetrics.map(key => {
      const cfg = ALL_METRICS.find(m => m.key === key);
      return { key, label: cfg?.label || key };
    });

    const filterTitle = `${filterClass === 'ALL' ? 'جميع الأقسام' : filterClass} (${genderFilter === 'all' ? 'الكل' : genderFilter === 'M' ? 'ذكور' : 'إناث'})`;

    const exportRows: TalentExportRow[] = rankedData.map((item, idx) => ({
      rank: idx + 1,
      studentNumber: item.student.numeroEleve,
      studentName: item.student.nomEleve,
      className: item.className,
      gender: item.student.sexe || 'M',
      totalScore: item.averageScoreOut20,
      scorePercentage: `${item.scorePercent}%`,
      badge: item.badge,
      metricValues: item.metricValues
    }));

    exportTalentAnalysisToExcel(filterTitle, metricHeaders, exportRows);
  };

  const top1 = rankedData[0];
  const top2 = rankedData[1];
  const top3 = rankedData[2];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col gap-6">
      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl shadow-md text-sm font-medium flex items-center justify-between transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
            : 'bg-rose-50 text-rose-800 border border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <InformationCircleIcon />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <XMarkIcon />
          </button>
        </div>
      )}

      {/* Main Banner Header (Design matching user screenshot 1:1) */}
      <div className="bg-gradient-to-r from-amber-600 via-indigo-600 to-violet-700 rounded-3xl shadow-xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute end-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <TrophyIcon className="w-80 h-80 text-white" />
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl text-amber-300 shrink-0 border border-white/20">
              <SparklesIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                استغلال النتائج وتحديد المتفوقين رياضياً
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-2xl leading-relaxed font-medium">
                احتساب وتجميع نتائج الاختبارات البدنية الميدانية والقياسات الأنثروبومترية (القامة، الوزن، IMC، نبض FC) وانتقاء الموهوبين وتشكيل النخبة الرياضية.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportExcel}
            className="px-6 py-3.5 bg-white text-indigo-950 font-black rounded-2xl shadow-lg hover:bg-amber-100 active:scale-95 transition flex items-center gap-2 text-sm shrink-0 border border-amber-200"
          >
            <ArrowDownTrayIcon className="w-5 h-5 text-indigo-600" />
            <span>تصدير النتائج (Excel)</span>
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-5 border border-gray-100 dark:border-gray-700 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Analysis Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
            نموذج التحليل:
          </span>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl border border-gray-200 dark:border-gray-600">
            <button
              onClick={() => {
                setAnalysisMode('single');
                if (selectedMetrics.length > 1) setSelectedMetrics([selectedMetrics[0]]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                analysisMode === 'single'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              📊 تحليل اختبار فردي واحد
            </button>
            <button
              onClick={() => setAnalysisMode('multi')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                analysisMode === 'multi'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              ⭐ مجمع أكثر من اختبار (3 أو 4+)
            </button>
          </div>
        </div>

        {/* Class / Level Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3.5 py-2 pe-8 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">جميع الأقسام (الكل)</option>
              {academicLevels.map(lvl => (
                <option key={`LEVEL_${lvl}`} value={`LEVEL_${lvl}`}>
                  مستوى: {lvl} (جميع أقسام المستوى)
                </option>
              ))}
              <optgroup label="الأقسام الفردية">
                {classList.map(c => (
                  <option key={c.className} value={c.className}>
                    القسم: {c.className} ({c.studentCount} تلميذ)
                  </option>
                ))}
              </optgroup>
            </select>
            <div className="absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ChevronDownIcon className="w-4 h-4" />
            </div>
          </div>

          {/* Gender Filter Pills */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-xl border border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                genderFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setGenderFilter('M')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                genderFilter === 'M'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              ذكور ♂
            </button>
            <button
              onClick={() => setGenderFilter('F')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                genderFilter === 'F'
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              إناث ♀
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم..."
              className="text-xs px-3.5 py-2 pe-7 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36 sm:w-44"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 end-0 pe-2 flex items-center text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Criteria Multi-Selection Box (Exact matching design from screenshot) */}
      <div className="bg-indigo-950/90 text-white rounded-3xl shadow-xl p-6 border border-indigo-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h2 className="text-base sm:text-lg font-bold">
              اختر الاختبارات والقياسات لتحديد المتفوقين ({selectedMetrics.length} عناصر محددة):
            </h2>
          </div>

          {analysisMode === 'multi' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-indigo-300 font-bold">اختيار سريع:</span>
              <button
                onClick={selectPresetPhysicalFour}
                className="px-3 py-1.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-white text-xs font-bold border border-indigo-600 transition flex items-center gap-1"
              >
                <span>⭐ 4 اختبارات بدنية</span>
              </button>
              <button
                onClick={selectPresetPhysicalAndAnthrop}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1"
              >
                <span>⭐ بدنية + أنثروبومترية</span>
              </button>
              <button
                onClick={selectPresetAll12}
                className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition flex items-center gap-1"
              >
                <span>🎯 شامل للكل (12 قياساً)</span>
              </button>
            </div>
          )}
        </div>

        {/* Section 1: Physical Tests Checkboxes */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <span>🏋️</span>
            <span>الاختبارات البدنية الميدانية:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {ALL_METRICS.filter(m => m.category === 'physical').map(metric => {
              const isSelected = selectedMetrics.includes(metric.key);
              return (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => toggleMetric(metric.key)}
                  className={`p-2.5 rounded-2xl text-xs font-bold transition-all text-right flex items-center justify-between border ${
                    isSelected
                      ? 'bg-amber-500 text-gray-950 border-amber-300 shadow-md font-black'
                      : 'bg-indigo-900/60 text-indigo-200 border-indigo-800/80 hover:bg-indigo-850'
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    <span>{metric.icon}</span>
                    <span className="truncate">{metric.label.split('(')[0]}</span>
                  </span>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                    isSelected ? 'bg-indigo-950 text-amber-300 font-bold' : 'border border-indigo-600'
                  }`}>
                    {isSelected ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Anthropometric Checkboxes */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <span>📏</span>
            <span>القياسات الأنثروبومترية والبيومترية (انتقاء الموهوبين):</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {ALL_METRICS.filter(m => m.category === 'anthropometric').map(metric => {
              const isSelected = selectedMetrics.includes(metric.key);
              return (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => toggleMetric(metric.key)}
                  className={`p-2.5 rounded-2xl text-xs font-bold transition-all text-right flex items-center justify-between border ${
                    isSelected
                      ? 'bg-emerald-500 text-gray-950 border-emerald-300 shadow-md font-black'
                      : 'bg-indigo-900/60 text-indigo-200 border-indigo-800/80 hover:bg-indigo-850'
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    <span>{metric.icon}</span>
                    <span className="truncate">{metric.label}</span>
                  </span>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                    isSelected ? 'bg-indigo-950 text-emerald-300 font-bold' : 'border border-indigo-600'
                  }`}>
                    {isSelected ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 3 Winners Showcase Podium */}
      {rankedData.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* 2nd Place Silver */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col items-center text-center relative overflow-hidden order-2 sm:order-1">
            <div className="absolute top-3 start-3 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300">
              المرتبة 2 🥈
            </div>
            <StudentAvatar photoUrl={top2.student.photoUrl} nomEleve={top2.student.nomEleve} sexe={top2.student.sexe} size="lg" />
            <h3 className="font-black text-sm text-gray-900 dark:text-white mt-2 truncate w-full">{top2.student.nomEleve}</h3>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{top2.className}</span>
            <div className="mt-3 px-4 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 font-black text-lg border border-slate-200">
              {top2.averageScoreOut20} / 20 <span className="text-xs font-bold text-gray-500">({top2.scorePercent}%)</span>
            </div>
          </div>

          {/* 1st Place Gold Leader */}
          <div className="bg-gradient-to-b from-amber-50 to-amber-100/40 dark:from-amber-950/40 dark:to-gray-800 rounded-3xl p-6 border-2 border-amber-400 shadow-xl flex flex-col items-center text-center relative overflow-hidden order-1 sm:order-2 transform sm:-translate-y-2">
            <div className="absolute top-3 start-3 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-black shadow-xs">
              👑 البطل الأخير 1 🥇
            </div>
            <div className="ring-4 ring-amber-400 rounded-full">
              <StudentAvatar photoUrl={top1.student.photoUrl} nomEleve={top1.student.nomEleve} sexe={top1.student.sexe} size="lg" />
            </div>
            <h3 className="font-black text-base text-gray-900 dark:text-white mt-2 truncate w-full">{top1.student.nomEleve}</h3>
            <span className="text-xs text-amber-800 dark:text-amber-300 font-bold">{top1.className}</span>
            <div className="mt-3 px-5 py-2 rounded-2xl bg-amber-400 text-amber-950 font-black text-xl shadow-md">
              {top1.averageScoreOut20} / 20 <span className="text-xs text-amber-900">({top1.scorePercent}%)</span>
            </div>
            <span className="mt-2 text-[11px] font-extrabold px-3 py-0.5 rounded-full bg-amber-200 text-amber-900">
              {top1.badge}
            </span>
          </div>

          {/* 3rd Place Bronze */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-amber-200 dark:border-amber-900 shadow-md flex flex-col items-center text-center relative overflow-hidden order-3">
            <div className="absolute top-3 start-3 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
              المرتبة 3 🥉
            </div>
            <StudentAvatar photoUrl={top3.student.photoUrl} nomEleve={top3.student.nomEleve} sexe={top3.student.sexe} size="lg" />
            <h3 className="font-black text-sm text-gray-900 dark:text-white mt-2 truncate w-full">{top3.student.nomEleve}</h3>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{top3.className}</span>
            <div className="mt-3 px-4 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-black text-lg border border-amber-200">
              {top3.averageScoreOut20} / 20 <span className="text-xs font-bold text-gray-500">({top3.scorePercent}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Ranked Results Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
              جدول ترتيب المتفوقين حسب العناصر المحددة ({rankedData.length} تلميذ)
            </h2>
          </div>
          <span className="text-xs text-gray-500 font-bold">
            مرتبين تنازلياً حسب المعدل التجميعي
          </span>
        </div>

        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-xs text-center border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700/80 sticky top-0 z-10 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="p-3 font-bold w-12"># الترتيب</th>
                <th className="p-3 font-bold text-right">الاسم والنسب</th>
                <th className="p-3 font-bold">القسم</th>
                <th className="p-3 font-bold">الجنس</th>
                {selectedMetrics.map(key => {
                  const cfg = ALL_METRICS.find(m => m.key === key);
                  return (
                    <th key={key} className="p-3 font-bold min-w-[110px] bg-indigo-50/50 dark:bg-indigo-950/30">
                      <div>{cfg?.icon} {cfg?.label.split('(')[0]}</div>
                    </th>
                  );
                })}
                <th className="p-3 font-bold min-w-[130px] bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300">
                  المعدل الإجمالي (/20)
                </th>
                <th className="p-3 font-bold min-w-[150px]">تصنيف الموهبة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-medium">
              {rankedData.map((item, idx) => (
                <tr key={`${item.className}_${item.student.numeroEleve}`} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors">
                  <td className="p-3 font-black text-gray-500">
                    <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-extrabold ${
                      idx === 0 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                      idx === 1 ? 'bg-slate-200 text-slate-900' :
                      idx === 2 ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>

                  <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <StudentAvatar photoUrl={item.student.photoUrl} nomEleve={item.student.nomEleve} sexe={item.student.sexe} size="xs" />
                      <span>{item.student.nomEleve}</span>
                    </div>
                  </td>

                  <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">
                    {item.className}
                  </td>

                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.student.sexe === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.student.sexe === 'F' ? 'أنثى' : 'ذكر'}
                    </span>
                  </td>

                  {selectedMetrics.map(key => (
                    <td key={key} className="p-3 font-mono font-bold text-gray-700 dark:text-gray-300">
                      {item.metricValues[key] || '-'}
                    </td>
                  ))}

                  <td className="p-3 font-mono font-black text-sm text-indigo-700 dark:text-indigo-300 bg-amber-50/50 dark:bg-amber-950/20">
                    {item.averageScoreOut20} <span className="text-[11px] font-normal text-gray-400">({item.scorePercent}%)</span>
                  </td>

                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-block ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </td>
                </tr>
              ))}

              {rankedData.length === 0 && (
                <tr>
                  <td colSpan={5 + selectedMetrics.length} className="p-12 text-center text-gray-400">
                    <p className="font-bold text-sm">لا توجد نتائج تطابق خيارات البحث الفلترة الحالية.</p>
                    <p className="text-xs mt-1">تأكد من استيراد الأقسام وإجراء الاختبارات البدنية أولاً.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
