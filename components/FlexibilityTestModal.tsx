import React, { useState, useEffect, useMemo } from 'react';
import { StudentIdentity, PhysicalTests } from '../types';
import { getStudentList, getPhysicalTests, savePhysicalTests, getAllClasses, ClassStats } from '../utils/db';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  UserGroupIcon, 
  SparklesIcon, 
  ArrowPathIcon,
  TableCellsIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon
} from './Icons';
import { StudentAvatar } from './StudentAvatar';
import { calculateScore, getCustomScale } from '../utils/ScoringConstants';
import { detectLevelFromClassName, EDUCATIONAL_LEVELS } from '../utils/teacherHelper';
import { useLanguage } from '../utils/i18n';

interface FlexibilityTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass: string;
  onDataSaved?: () => void;
}

export const FlexibilityTestModal: React.FC<FlexibilityTestModalProps> = ({
  isOpen,
  onClose,
  initialClass,
  onDataSaved
}) => {
  const { language } = useLanguage();
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [physicalResults, setPhysicalResults] = useState<PhysicalTests[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Flexibility mode: 'assis' (ثني الجذع من وضع الجلوس) or 'debout' (ثني الجذع من وضع الوقوف)
  const [testVariant, setTestVariant] = useState<'assis' | 'debout'>('assis');

  useEffect(() => {
    const fetchClasses = async () => {
      const cls = await getAllClasses();
      setClasses(cls);
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (initialClass) {
      setSelectedClass(initialClass);
    }
  }, [initialClass]);

  useEffect(() => {
    if (!selectedClass) return;
    const loadClassData = async () => {
      const [stdList, testList] = await Promise.all([
        getStudentList(selectedClass),
        getPhysicalTests(selectedClass)
      ]);
      setStudents(stdList);
      setPhysicalResults(testList);
    };
    loadClassData();
  }, [selectedClass]);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const filteredClasses = useMemo(() => {
    if (selectedLevel === 'ALL') return classes;
    return classes.filter(c => detectLevelFromClassName(c.className).key === selectedLevel);
  }, [classes, selectedLevel]);

  // Handle score value update
  const handleValChange = async (studentNumber: string, rawVal: string) => {
    const val = rawVal === '' ? undefined : parseFloat(rawVal);
    const existingIdx = physicalResults.findIndex(r => r.numeroEleve === studentNumber);
    const student = students.find(s => s.numeroEleve === studentNumber);

    let updatedList = [...physicalResults];
    const fieldKey = testVariant === 'assis' ? 'souplesseAssis' : 'souplesseDebout';

    let item: PhysicalTests;
    if (existingIdx >= 0) {
      item = {
        ...updatedList[existingIdx],
        [fieldKey]: val
      };
      if (val === undefined) {
        delete item[fieldKey];
      }
      updatedList[existingIdx] = item;
    } else {
      item = {
        numeroEleve: studentNumber,
        nomEleve: student?.nomEleve,
        sexe: student?.sexe,
        date: new Date().toISOString(),
        [fieldKey]: val
      };
      updatedList.push(item);
    }

    setPhysicalResults(updatedList);
    try {
      await savePhysicalTests(selectedClass, updatedList);
      onDataSaved?.();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.nomEleve.toLowerCase().includes(q) ||
        s.numeroEleve.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery]);

  const stats = useMemo(() => {
    const fieldKey = testVariant === 'assis' ? 'souplesseAssis' : 'souplesseDebout';
    const tested = students.filter(s => {
      const r = physicalResults.find(item => item.numeroEleve === s.numeroEleve);
      return r && (r as any)[fieldKey] !== undefined;
    }).length;
    return {
      tested,
      total: students.length,
      remaining: students.length - tested
    };
  }, [students, physicalResults, testVariant]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-4xl h-[96vh] sm:h-auto sm:max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-2xl backdrop-blur-md">
              <SparklesIcon className="w-6 h-6 text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black">
                  {language === 'ar' ? 'اختبار المرونة البدنية (ثني الجذع)' : 'Test de Souplesse (Flexion du tronc)'}
                </h2>
                <span className="text-[10px] font-bold bg-black/30 px-2 py-0.5 rounded-full border border-white/20">
                  {selectedClass || 'قسم'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/80 font-medium">
                {language === 'ar' 
                  ? 'قياس مرونة الجذع والمفصل بالسنتيمتر (cm) مع الحفظ الآلي' 
                  : 'Mesure de la souplesse en centimètres (cm) avec sauvegarde automatique'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
            >
              <ArrowRightIcon className="w-4 h-4" />
              <span>{language === 'ar' ? 'العودة للاختبارات' : 'Retour'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="bg-emerald-600 text-white text-xs font-black py-1 px-4 text-center shadow-lg transition-all flex items-center justify-center gap-2">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Level & Class Selector Toolbar */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {/* Level selector */}
            <div className="flex items-center gap-1.5">
              <label className="font-bold text-gray-600 dark:text-gray-300">المستوى:</label>
              <select
                value={selectedLevel}
                onChange={(e) => {
                  setSelectedLevel(e.target.value);
                  const matched = classes.filter(c => e.target.value === 'ALL' || detectLevelFromClassName(c.className).key === e.target.value);
                  if (matched.length > 0 && !matched.some(c => c.className === selectedClass)) {
                    setSelectedClass(matched[0].className);
                  }
                }}
                className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="ALL">جميع المستويات</option>
                {EDUCATIONAL_LEVELS.filter(l => l.key !== 'all').map(l => (
                  <option key={l.key} value={l.key}>{l.labelAr}</option>
                ))}
              </select>
            </div>

            {/* Class selector */}
            <div className="flex items-center gap-1.5">
              <label className="font-bold text-gray-600 dark:text-gray-300">القسم:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                {filteredClasses.map(c => (
                  <option key={c.className} value={c.className}>
                    {c.className} ({c.studentCount} {language === 'ar' ? 'تلميذ' : 'élèves'})
                  </option>
                ))}
              </select>
            </div>

            {/* Test Variant Toggle */}
            <div className="flex items-center bg-gray-200 dark:bg-gray-700 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setTestVariant('assis')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  testVariant === 'assis' ? 'bg-white dark:bg-gray-800 text-cyan-600 dark:text-cyan-400 shadow-xs' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                من وضع الجلوس (Assis)
              </button>
              <button
                type="button"
                onClick={() => setTestVariant('debout')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  testVariant === 'debout' ? 'bg-white dark:bg-gray-800 text-cyan-600 dark:text-cyan-400 shadow-xs' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                من وضع الوقوف (Debout)
              </button>
            </div>
          </div>

          {/* Stats Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
              تم الاختبار: {stats.tested} / {stats.total}
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 بحث باسم التلميذ أو رقمه..."
              className="w-full text-xs px-3.5 py-2 pe-8 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Student Rows Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs bg-white dark:bg-gray-800">
            <table className="w-full text-start text-xs border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="p-2.5 text-center w-12">#</th>
                  <th className="p-2.5 text-start">التلميذ(ة)</th>
                  <th className="p-2.5 text-center w-20">الجنس</th>
                  <th className="p-2.5 text-center w-48">
                    {testVariant === 'assis' ? 'المرونة - جلوس (cm)' : 'المرونة - وقوف (cm)'}
                  </th>
                  <th className="p-2.5 text-center w-28">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      لا يوجد تلاميذ في هذا القسم
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const r = physicalResults.find(item => item.numeroEleve === s.numeroEleve);
                    const fieldKey = testVariant === 'assis' ? 'souplesseAssis' : 'souplesseDebout';
                    const curVal = r ? (r as any)[fieldKey] : undefined;
                    const isDone = curVal !== undefined && !isNaN(curVal);

                    return (
                      <tr key={s.numeroEleve} className="hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20 transition-colors">
                        <td className="p-2.5 text-center font-bold text-gray-500">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <StudentAvatar student={s} size="sm" />
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{s.nomEleve}</div>
                              <div className="text-[10px] text-gray-400">{s.numeroEleve}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {s.sexe === 'F' ? 'أنثى' : 'ذكر'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <input
                              type="number"
                              step="0.5"
                              value={curVal !== undefined ? curVal : ''}
                              onChange={(e) => handleValChange(s.numeroEleve, e.target.value)}
                              placeholder="0.0"
                              className="w-24 text-center font-black text-sm px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs"
                            />
                            <span className="text-gray-400 font-bold text-xs">سم</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                              <span>✓</span>
                              <span>تم التسجيل</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">قيد الانتظار</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            يتم حفظ النتائج تلقائياً في قاعدة البيانات ومزامنتها سحابياً
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            تم / إنهاء
          </button>
        </div>
      </div>
    </div>
  );
};
