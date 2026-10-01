import React, { useState, useEffect, useMemo } from 'react';
import { 
  getStudentList, 
  getPhysicalTests, 
  savePhysicalTests,
  getAttendanceSessions,
  getAllClasses, 
  ClassStats 
} from '../utils/db';
import type { StudentIdentity, PhysicalTests } from '../types';
import { 
    TableCellsIcon, 
    ArrowDownTrayIcon, 
    ChevronDownIcon, 
    XMarkIcon, 
    MagnifyingGlassIcon,
    InformationCircleIcon,
    ArrowPathIcon,
    TrophyIcon,
    RunningManIcon,
    UserGroupIcon,
    CheckCircleIcon,
    SparklesIcon
} from '../components/Icons';
import { StudentAvatar } from '../components/StudentAvatar';
import { useLanguage } from '../utils/i18n';
import { getGradingDistribution, calculateBehaviorScore } from '../utils/ScoringConstants';

interface GlobalGradesScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
}

export const GlobalGradesScreen: React.FC<GlobalGradesScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  const { t, language } = useLanguage();
  const [classList, setClassList] = useState<ClassStats[]>([]);
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [physicalTests, setPhysicalTests] = useState<PhysicalTests[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Bulk scoring state
  const [bulkComponent, setBulkComponent] = useState<'motrice' | 'comportement' | 'cognitive'>('comportement');
  const [bulkValue, setBulkValue] = useState<string>('');

  const gradingDist = useMemo(() => getGradingDistribution(selectedClass), [selectedClass]);

  // Auto-save logic
  useEffect(() => {
    if (physicalTests.length === 0 || isLoading) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await savePhysicalTests(selectedClass, physicalTests);
      } catch (err) {
        console.error('Auto-save failed', err);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [physicalTests, selectedClass, isLoading]);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassData(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const cls = await getAllClasses();
    setClassList(cls);
    if (cls.length > 0 && !selectedClass) {
      setSelectedClass(cls[0].className);
    }
  };

  const loadClassData = async (className: string) => {
    setIsLoading(true);
    try {
      const [stds, tests] = await Promise.all([
        getStudentList(className),
        getPhysicalTests(className)
      ]);
      setStudents(stds);
      setPhysicalTests(tests || []);
    } catch (err) {
      console.error(err);
      setNotification({ message: "خطأ في تحميل البيانات", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComponentChange = (studentNumber: string, component: 'motrice' | 'comportement' | 'cognitive', value: string) => {
    const val = value === '' ? undefined : Number(value);
    const max = component === 'motrice' ? gradingDist.motrice : 
                component === 'comportement' ? gradingDist.comportement : 
                gradingDist.cognitive;
    
    if (val !== undefined && (val < 0 || val > max)) return;

    setPhysicalTests(prev => {
      const existing = prev.find(t => t.numeroEleve === studentNumber);
      const student = students.find(s => s.numeroEleve === studentNumber);
      
      const field = component === 'motrice' ? 'noteMotrice' : 
                    component === 'comportement' ? 'noteComportement' : 
                    'noteCognitive';

      if (existing) {
        return prev.map(t => t.numeroEleve === studentNumber ? { ...t, [field]: val } : t);
      } else {
        return [...prev, {
          numeroEleve: studentNumber,
          nomEleve: student?.nomEleve,
          sexe: student?.sexe,
          [field]: val,
          date: new Date().toISOString()
        }];
      }
    });
  };

  const handleApplyBulkScore = () => {
    const val = bulkValue === '' ? undefined : Number(bulkValue);
    const max = bulkComponent === 'motrice' ? gradingDist.motrice : 
                bulkComponent === 'comportement' ? gradingDist.comportement : 
                gradingDist.cognitive;

    if (val !== undefined && (val < 0 || val > max)) {
        alert(`النقطة القصوى لهذا العنصر هي ${max}`);
        return;
    }

    if (!confirm(`هل أنت متأكد من تطبيق النقطة (${bulkValue || 'فارغ'}) على جميع تلاميذ هذا القسم في عنصر (${bulkComponent === 'motrice' ? 'حركي' : bulkComponent === 'comportement' ? 'سلوكي' : 'معرفي'})؟`)) {
        return;
    }

    setPhysicalTests(prev => {
        const field = bulkComponent === 'motrice' ? 'noteMotrice' : 
                      bulkComponent === 'comportement' ? 'noteComportement' : 
                      'noteCognitive';

        const testMap = new Map<string, PhysicalTests>(prev.map(t => [t.numeroEleve, t]));
        
        return students.map(s => {
            const existing = testMap.get(s.numeroEleve);
            if (existing) {
                return { ...existing, [field]: val } as PhysicalTests;
            } else {
                return {
                    numeroEleve: s.numeroEleve,
                    nomEleve: s.nomEleve,
                    sexe: s.sexe,
                    [field]: val,
                    date: new Date().toISOString()
                };
            }
        });
    });

    setNotification({ message: "تم تطبيق النقطة على الجميع بنجاح", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAutoCalculateBehavior = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
        const attendance = await getAttendanceSessions(selectedClass);
        if (attendance.length === 0) {
            alert("لا توجد حصص غياب مسجلة لهذا القسم لحساب النقط تلقائياً.");
            setIsLoading(false);
            return;
        }

        if (!confirm(`سيتم حساب نقطة السلوك تلقائياً لـ ${students.length} تلميذ بناءً على ${attendance.length} حصة مسجلة. هل تود الاستمرار؟`)) {
            setIsLoading(false);
            return;
        }

        setPhysicalTests(prev => {
            const testMap = new Map<string, PhysicalTests>(prev.map(t => [t.numeroEleve, t]));
            
            return students.map(s => {
                let absences = 0;
                let noKits = 0;
                let lates = 0;

                attendance.forEach(session => {
                    const record = session.records.find(r => r.studentNumber === s.numeroEleve);
                    if (record) {
                        if (record.status === 'absent') absences++;
                        if (record.status === 'no-kit') noKits++;
                        if (record.status === 'late') lates++;
                    }
                });

                const autoScore = calculateBehaviorScore(
                    gradingDist.comportement,
                    absences,
                    noKits,
                    lates
                );

                const existing = testMap.get(s.numeroEleve);
                if (existing) {
                    return { ...existing, noteComportement: autoScore } as PhysicalTests;
                } else {
                    return {
                        numeroEleve: s.numeroEleve,
                        nomEleve: s.nomEleve,
                        sexe: s.sexe,
                        noteComportement: autoScore,
                        date: new Date().toISOString()
                    };
                }
            });
        });

        setNotification({ message: "تم حساب نقط السلوك تلقائياً بنجاح", type: 'success' });
        setTimeout(() => setNotification(null), 3000);
    } catch (err) {
        console.error(err);
        setNotification({ message: "خطأ أثناء حساب النقط", type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (students.length === 0) return;
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
        alert("لم يتم تحميل مكتبة Excel.");
        return;
    }
    
    const headers = [
      "الرقم", "الاسم والنسب", "الجنس",
      "VMA", "سرعة", "قفز", "جلة", "تحمل",
      "رياضة جماعية", "نقطة الرياضة الجماعية",
      "الجانب الحركي", "الجانب السلوكي", "الجانب المعرفي",
      "المعدل النهائي /20"
    ];

    const rows = students.map((s, idx) => {
      const test = physicalTests.find(t => t.numeroEleve === s.numeroEleve);
      
      const nMotrice = test?.noteMotrice;
      const nComportement = test?.noteComportement;
      const nCognitive = test?.noteCognitive;
      const finalGrade = (nMotrice !== undefined || nComportement !== undefined || nCognitive !== undefined) 
        ? ((nMotrice || 0) + (nComportement || 0) + (nCognitive || 0)).toFixed(2) 
        : '-';

      return [
        s.numeroEleve,
        s.nomEleve,
        s.sexe === 'F' ? 'أنثى' : 'ذكر',
        test?.vma || '-',
        test?.scoreVitesse || '-',
        test?.scoreSautLong || '-',
        test?.scoreLancerPoids || '-',
        test?.scoreEndurance || '-',
        test?.sportCollectifName || '-',
        test?.sportCollectifScore || '-',
        nMotrice !== undefined ? nMotrice : '-',
        nComportement !== undefined ? nComportement : '-',
        nCognitive !== undefined ? nCognitive : '-',
        finalGrade
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "نتائج التلاميذ");
    XLSX.writeFile(wb, `النتائج_الإجمالية_${selectedClass.replace(/\s+/g, '_')}.xlsx`);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.nomEleve.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.numeroEleve.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <TableCellsIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              محضر النقط والنتائج الإجمالية
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                تجميع كافة نقط الروائز البدنية والرياضات الجماعية في لائحة واحدة شاملة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-600 flex items-center gap-2">
             <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ps-2">القسم:</span>
             <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-white dark:bg-gray-800 border-none font-bold text-xs text-gray-900 dark:text-white rounded-xl px-3 py-1.5 focus:ring-0 shadow-sm"
             >
                {classList.map(c => (
                    <option key={c.className} value={c.className}>{c.className}</option>
                ))}
             </select>
          </div>

          {isSaving && (
             <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[10px] font-bold">جاري الحفظ تلقائياً...</span>
             </div>
          )}

          <button
            onClick={handleExportExcel}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* Bulk Scoring & Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="بحث باسم التلميذ..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
                <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase">
                    <div className="flex items-center gap-1"><RunningManIcon className="w-3 h-3 text-indigo-500"/> ألعاب قوى</div>
                    <div className="flex items-center gap-1"><UserGroupIcon className="w-3 h-3 text-orange-500"/> رياضة جماعية</div>
                </div>
            </div>

            {/* Bulk Action UI */}
            <div className="flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-900/10 p-2 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 w-full lg:w-auto">
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap px-1">نقطة موحدة:</span>
                <select 
                    value={bulkComponent}
                    onChange={(e) => setBulkComponent(e.target.value as any)}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-indigo-500"
                >
                    <option value="motrice">حركي</option>
                    <option value="comportement">سلوكي</option>
                    <option value="cognitive">معرفي</option>
                </select>
                <input 
                    type="number"
                    step="0.25"
                    placeholder="نقطة"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    className="w-16 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-indigo-500"
                />
                <button 
                    onClick={handleApplyBulkScore}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-[10px] font-black shadow-sm transition-all active:scale-95"
                >
                    تطبيق على الكل
                </button>
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                <button 
                    onClick={handleAutoCalculateBehavior}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-[10px] font-black shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                    title="حساب نقط السلوك تلقائياً من سجل الغياب"
                >
                    <SparklesIcon className="w-3 h-3" />
                    <span>حساب السلوك آلياً</span>
                </button>
            </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-right text-[11px] border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700/80 sticky top-0 z-10 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th className="p-3 w-10 text-center" rowSpan={2}>#</th>
                        <th className="p-3 min-w-[180px]" rowSpan={2}>الاسم والنسب</th>
                        <th className="p-3 text-center" colSpan={5}>معدلات الأنشطة (ألعاب قوى + VMA)</th>
                        <th className="p-3 text-center bg-orange-100 dark:bg-orange-900/40 text-orange-950 dark:text-orange-100" colSpan={2}>رياضة جماعية</th>
                        <th className="p-3 text-center bg-indigo-100 dark:bg-indigo-900/40 text-indigo-950 dark:text-indigo-100" colSpan={4}>عناصر التنقيط (حسب المستوى)</th>
                    </tr>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                        <th className="p-2 text-center font-normal">VMA</th>
                        <th className="p-2 text-center font-normal">سرعة</th>
                        <th className="p-2 text-center font-normal">قفز</th>
                        <th className="p-2 text-center font-normal">جلة</th>
                        <th className="p-2 text-center font-normal">تحمل</th>
                        
                        <th className="p-2 text-center bg-orange-50/50 dark:bg-orange-900/20">النوع</th>
                        <th className="p-2 text-center bg-orange-50/50 dark:bg-orange-900/20">النقطة</th>
                        
                        <th className="p-2 text-center bg-indigo-50/50 dark:bg-indigo-900/20">حركي (/{gradingDist.motrice})</th>
                        <th className="p-2 text-center bg-indigo-50/50 dark:bg-indigo-900/20">سلوكي (/{gradingDist.comportement})</th>
                        <th className="p-2 text-center bg-indigo-50/50 dark:bg-indigo-900/20">معرفي (/{gradingDist.cognitive})</th>
                        <th className="p-2 text-center bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-black">المعدل النهائي (/20)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {filteredStudents.map((s, idx) => {
                        const test = physicalTests.find(t => t.numeroEleve === s.numeroEleve);
                        
                        const nMotrice = test?.noteMotrice;
                        const nComportement = test?.noteComportement;
                        const nCognitive = test?.noteCognitive;
                        
                        const finalGrade = (nMotrice || 0) + (nComportement || 0) + (nCognitive || 0);
                        const displayFinal = (nMotrice !== undefined || nComportement !== undefined || nCognitive !== undefined) ? finalGrade.toFixed(2) : '--';

                        return (
                            <tr key={s.numeroEleve} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors">
                                <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <StudentAvatar photoUrl={s.photoUrl} nomEleve={s.nomEleve} sexe={s.sexe} size="xs" />
                                        <div className="font-bold text-gray-900 dark:text-white truncate">{s.nomEleve}</div>
                                    </div>
                                </td>
                                <td className="p-2 text-center font-bold text-gray-500">{test?.vma || '-'}</td>
                                <td className="p-2 text-center font-bold text-gray-500">{test?.scoreVitesse || '-'}</td>
                                <td className="p-2 text-center font-bold text-gray-500">{test?.scoreSautLong || '-'}</td>
                                <td className="p-2 text-center font-bold text-gray-500">{test?.scoreLancerPoids || '-'}</td>
                                <td className="p-2 text-center font-bold text-gray-500">{test?.scoreEndurance || '-'}</td>

                                <td className="p-2 text-center bg-orange-50/20 dark:bg-orange-950/10 text-[10px] font-bold text-gray-600">
                                    {test?.sportCollectifName || '-'}
                                </td>
                                <td className="p-2 text-center bg-orange-50/20 dark:bg-orange-950/10 font-black text-orange-600">
                                    {test?.sportCollectifScore || '-'}
                                </td>
                                
                                <td className="p-2 text-center bg-indigo-50/20 dark:bg-indigo-900/10">
                                    <input 
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        max={gradingDist.motrice}
                                        value={nMotrice === undefined ? '' : nMotrice}
                                        onChange={(e) => handleComponentChange(s.numeroEleve, 'motrice', e.target.value)}
                                        className="w-12 mx-auto text-center py-1 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-bold focus:ring-1 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="p-2 text-center bg-indigo-50/20 dark:bg-indigo-900/10">
                                    <input 
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        max={gradingDist.comportement}
                                        value={nComportement === undefined ? '' : nComportement}
                                        onChange={(e) => handleComponentChange(s.numeroEleve, 'comportement', e.target.value)}
                                        className="w-12 mx-auto text-center py-1 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-bold focus:ring-1 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="p-2 text-center bg-indigo-50/20 dark:bg-indigo-900/10">
                                    <input 
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        max={gradingDist.cognitive}
                                        value={nCognitive === undefined ? '' : nCognitive}
                                        onChange={(e) => handleComponentChange(s.numeroEleve, 'cognitive', e.target.value)}
                                        className="w-12 mx-auto text-center py-1 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-bold focus:ring-1 focus:ring-indigo-500"
                                    />
                                </td>
                                
                                <td className="p-3 text-center font-black text-sm bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-300 border-l border-gray-100 dark:border-gray-700">
                                    {displayFinal}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/40 flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
              <p className="font-bold mb-1">معايير التنقيط المعتمدة حالياً للقسم ({selectedClass}):</p>
              <ul className="list-disc ps-4 space-y-0.5">
                  <li>الجانب الحركي (Performance): <strong>{gradingDist.motrice} نقطة</strong></li>
                  <li>الجانب السلوكي (Comportement): <strong>{gradingDist.comportement} نقطة</strong></li>
                  <li>الجانب المعرفي (Cognitif): <strong>{gradingDist.cognitive} نقطة</strong></li>
              </ul>
              <p className="mt-2">يتم حساب المعدل النهائي بجمع هذه العناصر الثلاثة (المجموع على 20). يمكنك رصد هذه النقط مباشرة هنا وتصديرها بصيغة Excel.</p>
          </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 animate-slide-up z-50 ${
            notification.type === 'success' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-rose-600 text-white border-rose-500'
        }`}>
            {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
            <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
};
