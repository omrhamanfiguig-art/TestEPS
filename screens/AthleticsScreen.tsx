import React, { useState, useEffect, useMemo } from 'react';
import { getStudentList, getPhysicalTests, savePhysicalTests, getAllClasses, ClassStats } from '../utils/db';
import type { StudentIdentity, PhysicalTests } from '../types';
import { 
    RunningManIcon, 
    TrophyIcon,
    ChevronDownIcon,
    TableCellsIcon,
    Squares2X2Icon,
    ArrowDownTrayIcon,
    XMarkIcon,
    InformationCircleIcon,
    BoltIcon
} from '../components/Icons';
import { StudentAvatar } from '../components/StudentAvatar';
import { AthleticsTestModal } from '../components/AthleticsTestModal';
import { BaremeSettingsModal } from '../components/BaremeSettingsModal';
import { Sprint30mTestModal, RaceTestType } from '../components/Sprint30mTestModal';
import { QuickEvaluationModal } from '../components/QuickEvaluationModal';
import { 
    calculateScore, 
    getCustomScale,
    formatSecondsToMinSec
} from '../utils/ScoringConstants';
import { exportClassPhysicalTestsToExcel } from '../utils/excelHelper';
import { useLanguage } from '../utils/i18n';

interface AthleticsScreenProps {
    selectedClass: string;
    setSelectedClass: (className: string) => void;
}

export const AthleticsScreen: React.FC<AthleticsScreenProps> = ({ 
    selectedClass, 
    setSelectedClass
}) => {
    const { t, language } = useLanguage();
    const [classList, setClassList] = useState<ClassStats[]>([]);
    const [studentList, setStudentList] = useState<StudentIdentity[]>([]);
    const [results, setResults] = useState<PhysicalTests[]>([]);
    const [isAthleticsModalOpen, setIsAthleticsModalOpen] = useState(false);
    const [athleticsTestType, setAthleticsTestType] = useState<'speed' | 'speed-60' | 'speed-80' | 'speed-100' | 'endurance' | 'long-jump' | 'shot-put'>('speed');
    const [isRaceStopwatchOpen, setIsRaceStopwatchOpen] = useState(false);
    const [raceStopwatchType, setRaceStopwatchType] = useState<RaceTestType>('speed');
    const [isBaremeModalOpen, setIsBaremeModalOpen] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [selectedStudentForQuickEval, setSelectedStudentForQuickEval] = useState<string | null>(null);
    const [isQuickEvalOpen, setIsQuickEvalOpen] = useState(false);

    // Load data when selectedClass changes
    const loadClassData = (className: string) => {
        getAllClasses().then(cls => setClassList(cls));
        if (!className) return;
        getStudentList(className).then(list => setStudentList(list));
        getPhysicalTests(className).then(res => setResults(res || []));
    };

    const handleOpenQuickEval = (studentNum: string) => {
        setSelectedStudentForQuickEval(studentNum);
        setIsQuickEvalOpen(true);
    };

    const handleSaveQuickEvalScores = async (updatedTest: PhysicalTests) => {
        const updatedList = results.map(t => t.numeroEleve === updatedTest.numeroEleve ? updatedTest : t);
        if (!results.some(t => t.numeroEleve === updatedTest.numeroEleve)) {
            updatedList.push(updatedTest);
        }
        setResults(updatedList);
        await savePhysicalTests(selectedClass, updatedList);
        window.dispatchEvent(new CustomEvent('dbUpdated'));
        setNotification({ message: `تم حفظ نقط التلميذ (${updatedTest.nomEleve || updatedTest.numeroEleve}) بنجاح!`, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        loadClassData(selectedClass);
        const handleDbUpdate = () => loadClassData(selectedClass);
        window.addEventListener('dbUpdated', handleDbUpdate);
        return () => window.removeEventListener('dbUpdated', handleDbUpdate);
    }, [selectedClass]);

    const handleExport = async () => {
        try {
            const res = await exportClassPhysicalTestsToExcel(selectedClass);
            if (res.success) {
                setNotification({ message: `تم تصدير نتائج ${res.count} تلميذ بنجاح.`, type: 'success' });
            }
        } catch (err) {
            setNotification({ message: "فشل تصدير ملف Excel.", type: 'error' });
        }
    };

    const athleticsTests = [
        { id: 'speed', label: t.sprint30m, icon: <RunningManIcon className="w-5 h-5" />, color: 'bg-orange-500', testKey: 'speed' },
        { id: 'speed-60', label: t.sprint60m, icon: <RunningManIcon className="w-5 h-5" />, color: 'bg-orange-600', testKey: 'speed-60' },
        { id: 'speed-80', label: t.sprint80m, icon: <RunningManIcon className="w-5 h-5" />, color: 'bg-orange-700', testKey: 'speed-80' },
        { id: 'speed-100', label: t.sprint100m, icon: <RunningManIcon className="w-5 h-5" />, color: 'bg-rose-600', testKey: 'speed-100' },
        { id: 'relay', label: 'سباق التتابع (Relay)', icon: <RunningManIcon className="w-5 h-5" />, color: 'bg-amber-600', testKey: 'relay' },
        { id: 'endurance', label: t.endurance, icon: <RunningManIcon className="w-5 h-5" />, color: 'bg-red-600', testKey: 'endurance' },
        { id: 'long-jump', label: t.longJumpAthletic, icon: <TrophyIcon className="w-5 h-5" />, color: 'bg-indigo-600', testKey: 'long-jump' },
        { id: 'shot-put', label: t.shotPut, icon: <TrophyIcon className="w-5 h-5" />, color: 'bg-gray-600', testKey: 'shot-put' },
    ];

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col gap-6">
            {/* Notification */}
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

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                        <RunningManIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.navAthletics}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">تقييم المسابقات الميدانية ومسابقات الجري</p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-end gap-2.5 w-full lg:w-auto">
                    <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-600">
                        <label className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 shrink-0 ps-1.5">🏫 {t.class}:</label>
                        <div className="relative flex-1 sm:w-48">
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="appearance-none w-full bg-white dark:bg-gray-800 border-none rounded-xl px-2.5 py-1.5 pe-7 text-xs sm:text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
                            >
                                <option value="" disabled>{t.classNamePlaceholder}</option>
                                {classList.map(cls => (
                                    <option key={cls.className} value={cls.className}>
                                        {cls.className} ({cls.studentCount} {language === 'ar' ? 'تلميذ' : 'élèves'})
                                    </option>
                                ))}
                            </select>
                            <div className="absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDownIcon className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gray-50/70 dark:bg-gray-900/40 p-1.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs">
                        <button
                            onClick={() => setIsBaremeModalOpen(true)}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl shadow-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition active:scale-95 cursor-pointer"
                        >
                            <TrophyIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>سلم التنقيط</span>
                        </button>

                        <button
                            onClick={handleExport}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl shadow-xs text-white bg-emerald-600 hover:bg-emerald-700 transition active:scale-95 cursor-pointer"
                        >
                            <ArrowDownTrayIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>تصدير Excel</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Test Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {athleticsTests.map((test) => (
                    <div 
                        key={test.id}
                        className="bg-white dark:bg-gray-800 rounded-3xl shadow-md border border-gray-100 dark:border-gray-700 p-6 flex flex-col gap-4 hover:shadow-xl transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div className={`p-3 rounded-2xl ${test.color} text-white shadow-lg`}>
                                {test.icon}
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">اختبار ميداني</span>
                        </div>
                        
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">{test.label}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">تسجيل النتائج وحساب النقطة آلياً بناءً على سلم التنقيط المعتمد.</p>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => {
                                    if (test.testKey === 'speed' || test.testKey === 'speed-60' || test.testKey === 'speed-80' || test.testKey === 'speed-100' || test.testKey === 'relay' || test.testKey === 'endurance') {
                                        setRaceStopwatchType(test.testKey as RaceTestType);
                                        setIsRaceStopwatchOpen(true);
                                    } else {
                                        setAthleticsTestType(test.testKey as any);
                                        setIsAthleticsModalOpen(true);
                                    }
                                }}
                                className={`w-full py-3 rounded-2xl ${test.color} text-white font-bold text-sm shadow-md hover:opacity-90 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer`}
                            >
                                <span>{test.testKey === 'speed' || test.testKey === 'speed-60' || test.testKey === 'speed-80' || test.testKey === 'speed-100' || test.testKey === 'endurance' ? '⏱️ تشغيل الميقاتي والسباق' : 'ابدأ الاختبار'}</span>
                                <ChevronDownIcon className="-rotate-90 w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary List */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <TableCellsIcon className="w-5 h-5 text-indigo-500" />
                        <span>معاينة نتائج مسابقات ألعاب القوى</span>
                    </h2>
                    <span className="text-xs text-gray-500">عدد التلاميذ: {studentList.length}</span>
                </div>
                
                <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                    <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                            <tr>
                                <th className="p-3 font-bold text-right">الاسم والنسب</th>
                                <th className="p-3 font-bold">30 م (ث)</th>
                                <th className="p-3 font-bold">60 م (ث)</th>
                                <th className="p-3 font-bold">80 م (ث)</th>
                                <th className="p-3 font-bold">100 م (ث)</th>
                                <th className="p-3 font-bold">سباق التتابع (ث)</th>
                                <th className="p-3 font-bold">السرعة المتوسطة (د:ث)</th>
                                <th className="p-3 font-bold">القفز الطولي (م)</th>
                                <th className="p-3 font-bold">دفع الجلة (م)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {studentList.map(s => {
                                const r = results.find(res => res.numeroEleve === s.numeroEleve);
                                return (
                                    <tr key={s.numeroEleve} className="hover:bg-gray-50 dark:hover:bg-indigo-950/20">
                                        <td 
                                            className="p-3 text-right font-bold text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors group"
                                            onClick={() => handleOpenQuickEval(s.numeroEleve)}
                                            title="اضغط لفتح نافذة التقويم السريع"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <StudentAvatar photoUrl={s.photoUrl} nomEleve={s.nomEleve} sexe={s.sexe} size="xs" />
                                                    <span className="group-hover:text-indigo-600 transition-colors">{s.nomEleve}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenQuickEval(s.numeroEleve);
                                                    }}
                                                    className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-black flex items-center gap-1 active:scale-95 transition cursor-pointer"
                                                    title="تقويم سريع"
                                                >
                                                    <BoltIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                    <span>تقويم ⚡</span>
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-3 font-mono">
                                            <div>{r?.vitesse30m ? `${r.vitesse30m} ث` : '-'}</div>
                                            {typeof (r?.scoreVitesse30m ?? r?.scoreVitesse) === 'number' && !isNaN(Number(r?.scoreVitesse30m ?? r?.scoreVitesse)) && (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mt-0.5">
                                                    {(r?.scoreVitesse30m ?? r?.scoreVitesse)} / 20
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono">
                                            <div>{(r as any)?.vitesse60m ? `${(r as any).vitesse60m} ث` : '-'}</div>
                                            {typeof r?.scoreVitesse60m === 'number' && !isNaN(r.scoreVitesse60m) && (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800 mt-0.5">
                                                    {r.scoreVitesse60m} / 20
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono">
                                            <div>{(r as any)?.vitesse80m ? `${(r as any).vitesse80m} ث` : '-'}</div>
                                            {typeof r?.scoreVitesse80m === 'number' && !isNaN(r.scoreVitesse80m) && (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-700 mt-0.5">
                                                    {r.scoreVitesse80m} / 20
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono">
                                            <div>{(r as any)?.vitesse100m ? `${(r as any).vitesse100m} ث` : '-'}</div>
                                            {typeof r?.scoreVitesse100m === 'number' && !isNaN(r.scoreVitesse100m) && (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 mt-0.5">
                                                    {r.scoreVitesse100m} / 20
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono">
                                            <div>{(r as any)?.vitesseRelay ? `${(r as any).vitesseRelay} ث` : '-'}</div>
                                            {typeof r?.scoreRelay === 'number' && !isNaN(r.scoreRelay) && (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mt-0.5">
                                                    {r.scoreRelay} / 20
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono text-red-600 dark:text-red-400 font-bold">
                                            <div>{r?.enduranceTemps ? `${formatSecondsToMinSec(r.enduranceTemps)} د` : '-'}</div>
                                            {typeof r?.scoreEndurance === 'number' && !isNaN(r.scoreEndurance) && (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 mt-0.5">
                                                    {r.scoreEndurance} / 20
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono">
                                            <div>{r?.sautLong ? `${r.sautLong} م` : '-'}</div>
                                            {typeof r?.scoreSautLong === 'number' && !isNaN(r.scoreSautLong) && (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mt-0.5">
                                                    {r.scoreSautLong} / 20
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-mono">
                                            <div>{r?.lancerPoids ? `${r.lancerPoids} م` : '-'}</div>
                                            {typeof r?.scoreLancerPoids === 'number' && !isNaN(r.scoreLancerPoids) && (
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-900/60 dark:text-slate-300 border border-slate-300 dark:border-slate-700 mt-0.5">
                                                    {r.scoreLancerPoids} / 20
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {studentList.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-10 text-center text-gray-400 font-medium">يرجى اختيار قسم أو استيراد لائحة تلاميذ</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {isRaceStopwatchOpen && (
                <Sprint30mTestModal
                    isOpen={isRaceStopwatchOpen}
                    onClose={() => setIsRaceStopwatchOpen(false)}
                    initialClass={selectedClass || (classList.length > 0 ? classList[0].className : '')}
                    classList={classList.map(c => c.className)}
                    testType={raceStopwatchType}
                    onDataSaved={() => loadClassData(selectedClass)}
                />
            )}

            {isAthleticsModalOpen && (
                <AthleticsTestModal
                    isOpen={isAthleticsModalOpen}
                    onClose={() => setIsAthleticsModalOpen(false)}
                    initialClass={selectedClass}
                    testType={athleticsTestType as any}
                    onDataSaved={() => loadClassData(selectedClass)}
                />
            )}

            {isBaremeModalOpen && (
                <BaremeSettingsModal
                    isOpen={isBaremeModalOpen}
                    onClose={() => setIsBaremeModalOpen(false)}
                    defaultTestKey={athleticsTestType as any}
                />
            )}

            {isQuickEvalOpen && (
                <QuickEvaluationModal
                    isOpen={isQuickEvalOpen}
                    onClose={() => {
                        setIsQuickEvalOpen(false);
                        setSelectedStudentForQuickEval(null);
                    }}
                    selectedClass={selectedClass}
                    studentNumber={selectedStudentForQuickEval || undefined}
                    allStudents={studentList}
                    physicalTests={results}
                    onSelectStudent={(num) => setSelectedStudentForQuickEval(num)}
                    onSaveStudentScores={handleSaveQuickEvalScores}
                    initialMode="athletics"
                />
            )}
        </div>
    );
};
