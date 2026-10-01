import React, { useState, useEffect, useMemo } from 'react';
import { 
  getStudentList, 
  getPhysicalTests, 
  savePhysicalTests, 
  getAllClasses, 
  ClassStats 
} from '../utils/db';
import type { StudentIdentity, PhysicalTests } from '../types';
import { 
    UserGroupIcon, 
    SparklesIcon, 
    ArrowDownTrayIcon, 
    ChevronDownIcon, 
    XMarkIcon, 
    MagnifyingGlassIcon,
    CheckCircleIcon,
    TableCellsIcon,
    InformationCircleIcon,
    ArrowPathIcon,
    PlusIcon,
    TrashIcon
} from '../components/Icons';
import { StudentAvatar } from '../components/StudentAvatar';
import { 
  calculateScore, 
  getCustomScale,
  getGradingDistribution,
  GradingDistribution
} from '../utils/ScoringConstants';
import { useLanguage } from '../utils/i18n';
import { useSportsList, SportType } from '../utils/SportsConstants';

interface TeamGamesScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
}

export const TeamGamesScreen: React.FC<TeamGamesScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  const { t, language } = useLanguage();
  const { sports, addSport, deleteSport } = useSportsList();
  const [classList, setClassList] = useState<ClassStats[]>([]);
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [physicalTests, setPhysicalTests] = useState<PhysicalTests[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Add Sport modal/state
  const [isAddSportOpen, setIsAddSportOpen] = useState(false);
  const [newSportAr, setNewSportAr] = useState('');
  const [newSportIcon, setNewSportIcon] = useState('🏅');

  // Bulk scoring state
  const [bulkComponent, setBulkComponent] = useState<'motrice' | 'comportement' | 'cognitive'>('comportement');
  const [bulkValue, setBulkValue] = useState<string>('');

  // Default sport
  const [currentSport, setCurrentSport] = useState(sports[0]?.id || 'football');

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
      setNotification({ message: "خطأ في تحميل بيانات القسم", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComponentScoreChange = (studentNumber: string, component: 'motrice' | 'comportement' | 'cognitive', score: number | string) => {
    const val = score === '' ? undefined : Number(score);
    const max = component === 'motrice' ? gradingDist.motrice : 
                component === 'comportement' ? gradingDist.comportement : 
                gradingDist.cognitive;
    
    if (val !== undefined && (val < 0 || val > max)) return;

    setPhysicalTests(prev => {
      const existing = prev.find(t => t.numeroEleve === studentNumber);
      const student = students.find(s => s.numeroEleve === studentNumber);
      
      const baseObj = existing || {
        numeroEleve: studentNumber,
        nomEleve: student?.nomEleve,
        sexe: student?.sexe,
        date: new Date().toISOString(),
        sportCollectifName: sports.find(s => s.id === currentSport)?.labelAr
      };

      const field = component === 'motrice' ? 'noteMotrice' : 
                    component === 'comportement' ? 'noteComportement' : 
                    'noteCognitive';

      const updatedObj = { ...baseObj, [field]: val };
      
      // Recalculate total score
      const total = (updatedObj.noteMotrice || 0) + (updatedObj.noteComportement || 0) + (updatedObj.noteCognitive || 0);
      updatedObj.sportCollectifScore = total > 0 ? total : undefined;

      if (existing) {
        return prev.map(t => t.numeroEleve === studentNumber ? updatedObj : t);
      } else {
        return [...prev, updatedObj];
      }
    });
  };

  const handleNoteChange = (studentNumber: string, note: string) => {
    setPhysicalTests(prev => {
      const existing = prev.find(t => t.numeroEleve === studentNumber);
      if (existing) {
        return prev.map(t => t.numeroEleve === studentNumber ? { ...t, sportCollectifNote: note } : t);
      } else {
        const student = students.find(s => s.numeroEleve === studentNumber);
        return [...prev, {
          numeroEleve: studentNumber,
          nomEleve: student?.nomEleve,
          sexe: student?.sexe,
          sportCollectifNote: note,
          sportCollectifName: sports.find(s => s.id === currentSport)?.labelAr,
          date: new Date().toISOString()
        }];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      await savePhysicalTests(selectedClass, physicalTests);
      setNotification({ message: "تم حفظ نقط الرياضة الجماعية بنجاح", type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({ message: "خطأ أثناء الحفظ", type: 'error' });
    } finally {
      setIsLoading(false);
    }
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
            const baseObj: PhysicalTests = existing || {
                numeroEleve: s.numeroEleve,
                nomEleve: s.nomEleve,
                sexe: s.sexe,
                date: new Date().toISOString(),
                sportCollectifName: sports.find(sp => sp.id === currentSport)?.labelAr
            };

            const updatedObj: PhysicalTests = { ...baseObj, [field]: val };
            const total = (updatedObj.noteMotrice || 0) + (updatedObj.noteComportement || 0) + (updatedObj.noteCognitive || 0);
            updatedObj.sportCollectifScore = total > 0 ? total : undefined;

            return updatedObj;
        });
    });

    setNotification({ message: "تم تطبيق النقطة على الجميع بنجاح", type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.nomEleve.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.numeroEleve.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const activeSportInfo = sports.find(s => s.id === currentSport);

  const handleAddSport = () => {
    if (!newSportAr.trim()) return;
    addSport(newSportAr, newSportAr, newSportIcon);
    setNewSportAr('');
    setIsAddSportOpen(false);
  };

  const handleDeleteSport = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا النشاط الرياضي؟')) {
        deleteSport(id);
        if (currentSport === id) {
            setCurrentSport(sports[0]?.id);
        }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            <UserGroupIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              تنقيط الألعاب الجماعية
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                رصد وتقييم أداء التلاميذ في الرياضات الجماعية المبرمجة
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
             <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-lg border border-orange-100 dark:border-orange-800">
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[10px] font-bold">جاري الحفظ تلقائياً...</span>
             </div>
          )}

          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>حفظ النقط</span>
          </button>
        </div>
      </div>

      {/* Sport Selector Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {sports.map(sport => (
            <button
                key={sport.id}
                onClick={() => setCurrentSport(sport.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border group relative ${
                    currentSport === sport.id 
                    ? 'bg-orange-600 text-white border-orange-500 shadow-md' 
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-orange-50'
                }`}
            >
                <span>{sport.icon}</span>
                <span>{language === 'ar' ? sport.labelAr : sport.labelFr}</span>
                
                {sport.id !== 'football' && (
                    <span 
                        onClick={(e) => handleDeleteSport(e, sport.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                    >
                        <TrashIcon className="w-3 h-3" />
                    </span>
                )}
            </button>
        ))}
        
        <button
            onClick={() => setIsAddSportOpen(true)}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-orange-500 hover:text-orange-500"
        >
            <PlusIcon className="w-4 h-4" />
            <span>إضافة نشاط</span>
        </button>
      </div>

      {/* Add Sport Modal */}
      {isAddSportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700">
                  <h3 className="text-xl font-black mb-4">إضافة نشاط رياضي جديد</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">اسم النشاط:</label>
                          <input 
                            type="text" 
                            value={newSportAr}
                            onChange={(e) => setNewSportAr(e.target.value)}
                            placeholder="مثال: التيكواندو"
                            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">أيقونة (إيموجي):</label>
                          <input 
                            type="text" 
                            value={newSportIcon}
                            onChange={(e) => setNewSportIcon(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-center text-2xl"
                          />
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button 
                            onClick={handleAddSport}
                            className="flex-1 bg-orange-600 text-white font-black py-2.5 rounded-xl hover:bg-orange-700"
                          >
                              إضافة
                          </button>
                          <button 
                            onClick={() => setIsAddSportOpen(false)}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 font-black py-2.5 rounded-xl"
                          >
                              إلغاء
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Bulk Scoring & Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="بحث باسم التلميذ..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
                
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <span className="p-1.5 bg-orange-100 text-orange-700 rounded-lg">
                        الرياضة: {activeSportInfo?.labelAr}
                    </span>
                </div>
            </div>

            {/* Bulk Action UI */}
            <div className="flex items-center gap-2 bg-orange-50/50 dark:bg-orange-900/10 p-2 rounded-2xl border border-orange-100 dark:border-orange-800/40 w-full lg:w-auto">
                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 whitespace-nowrap px-1">نقطة موحدة:</span>
                <select 
                    value={bulkComponent}
                    onChange={(e) => setBulkComponent(e.target.value as any)}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-orange-500"
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
                    className="w-16 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-[10px] font-bold focus:ring-1 focus:ring-orange-500"
                />
                <button 
                    onClick={handleApplyBulkScore}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg text-[10px] font-black shadow-sm transition-all active:scale-95"
                >
                    تطبيق على الكل
                </button>
            </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                    <tr>
                        <th className="p-4 w-12 text-center">#</th>
                        <th className="p-4">التلميذ</th>
                        <th className="p-4 text-center">الجنس</th>
                        <th className="p-4 text-center">حركي (/{gradingDist.motrice})</th>
                        <th className="p-4 text-center">سلوكي (/{gradingDist.comportement})</th>
                        <th className="p-4 text-center">معرفي (/{gradingDist.cognitive})</th>
                        <th className="p-4 text-center bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400">الإجمالي (/20)</th>
                        <th className="p-4">ملاحظات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {filteredStudents.map((s, idx) => {
                        const test = physicalTests.find(t => t.numeroEleve === s.numeroEleve);
                        const nMotrice = test?.noteMotrice;
                        const nComportement = test?.noteComportement;
                        const nCognitive = test?.noteCognitive;
                        const totalScore = test?.sportCollectifScore;
                        const note = test?.sportCollectifNote || '';

                        return (
                            <tr key={s.numeroEleve} className="hover:bg-orange-50/30 dark:hover:bg-orange-950/10 transition-colors">
                                <td className="p-4 text-center text-gray-400 font-bold">{idx + 1}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <StudentAvatar photoUrl={s.photoUrl} nomEleve={s.nomEleve} sexe={s.sexe} size="sm" />
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white text-sm">{s.nomEleve}</div>
                                            <div className="text-[10px] text-gray-400 font-mono">{s.numeroEleve}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        s.sexe === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {s.sexe === 'F' ? 'أنثى' : 'ذكر'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <input 
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        max={gradingDist.motrice}
                                        value={nMotrice === undefined ? '' : nMotrice}
                                        onChange={(e) => handleComponentScoreChange(s.numeroEleve, 'motrice', e.target.value)}
                                        placeholder="--"
                                        className="w-16 mx-auto block text-center py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </td>
                                <td className="p-4">
                                    <input 
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        max={gradingDist.comportement}
                                        value={nComportement === undefined ? '' : nComportement}
                                        onChange={(e) => handleComponentScoreChange(s.numeroEleve, 'comportement', e.target.value)}
                                        placeholder="--"
                                        className="w-16 mx-auto block text-center py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </td>
                                <td className="p-4">
                                    <input 
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        max={gradingDist.cognitive}
                                        value={nCognitive === undefined ? '' : nCognitive}
                                        onChange={(e) => handleComponentScoreChange(s.numeroEleve, 'cognitive', e.target.value)}
                                        placeholder="--"
                                        className="w-16 mx-auto block text-center py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </td>
                                <td className="p-4 text-center bg-orange-50/50 dark:bg-orange-950/10">
                                    <span className="font-black text-sm text-orange-600 dark:text-orange-400">
                                        {totalScore === undefined ? '--' : totalScore}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <input 
                                        type="text"
                                        value={note}
                                        onChange={(e) => handleNoteChange(s.numeroEleve, e.target.value)}
                                        placeholder="ملاحظات..."
                                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-[11px] focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </td>
                            </tr>
                        );
                    })}

                    {filteredStudents.length === 0 && (
                        <tr>
                            <td colSpan={8} className="p-12 text-center text-gray-400">
                                <InformationCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="font-bold">لا توجد نتائج تطابق بحثك</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 animate-slide-up z-50 ${
            notification.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-500'
        }`}>
            {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
            <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
};
