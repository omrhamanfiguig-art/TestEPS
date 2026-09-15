// Fix: Provide implementation for the VmaTestScreen component.
import React, { useState, useEffect } from 'react';
import { useLucLeger } from '../hooks/useLucLeger';
import { generateAffinityGroups } from '../utils/groupHelper';
import { Controls } from '../components/Controls';
import { Display } from '../components/Display';
import { StudentGrid } from '../components/StudentGrid';
import { ResultsTable } from '../components/ResultsTable';
import { GroupsModal } from '../components/GroupsModal';
import { StudentDataModal } from '../components/StudentDataModal';
import type { AffinityGroup, StudentIdentity } from '../types';
import { getStudentList, saveStudentList, getAllClasses, ClassStats } from '../utils/db';
import { useLanguage } from '../utils/i18n';
import { TrashIcon, ChevronDownIcon } from '../components/Icons';

interface VmaTestScreenProps {
    selectedClass: string;
    setSelectedClass: (className: string) => void;
    groupSize: number;
    sessionDate: string;
}

export const VmaTestScreen: React.FC<VmaTestScreenProps> = ({ selectedClass, setSelectedClass, groupSize, sessionDate }) => {
    const { language, t } = useLanguage();
    const [studentList, setStudentList] = useState<StudentIdentity[]>([]);
    const [classList, setClassList] = useState<ClassStats[]>([]);
    const { 
        testState, 
        time, 
        currentLevel, 
        finishedStudents, 
        results, 
        startTest, 
        stopTest, 
        clearAllData,
        prepareNextRun,
        recordStudentFinish,
        undoStudentFinish
    } = useLucLeger(selectedClass, studentList, sessionDate, language);

    const [groups, setGroups] = useState<AffinityGroup[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStudentNumber, setModalStudentNumber] = useState<string | null>(null);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [notificationToast, setNotificationToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setNotificationToast(msg);
        setTimeout(() => setNotificationToast(null), 3000);
    };

    const handleConfirmClear = async () => {
        await clearAllData();
        setIsClearConfirmOpen(false);
        showToast("تم مسح جميع نتائج السرعة الهوائية بنجاح.");
    };

    const loadStudents = (cls: string) => {
        if (!cls) return;
        getStudentList(cls).then(list => {
            const normalizedList = list.map(s => ({
                ...s,
                numeroEleve: String(s.numeroEleve)
            }));
            setStudentList(normalizedList);
        });
    };

    useEffect(() => {
        const fetchClasses = async () => {
            const classes = await getAllClasses();
            setClassList(classes);
            // If selectedClass is default/not found and classes exist, select first class
            if (classes.length > 0 && (!selectedClass || selectedClass === '6ème A')) {
                if (!classes.some(c => c.className === selectedClass)) {
                    setSelectedClass(classes[0].className);
                }
            }
        };

        fetchClasses();
        loadStudents(selectedClass);

        const handleDbUpdate = () => {
            fetchClasses();
            loadStudents(selectedClass);
        };

        window.addEventListener('dbUpdated', handleDbUpdate);
        return () => window.removeEventListener('dbUpdated', handleDbUpdate);
    }, [selectedClass]);

    const handleGenerateGroups = () => {
        const generated = generateAffinityGroups(results, groupSize);
        setGroups(generated);
        setIsModalOpen(true);
    };

    // Toggle gender manually
    const handleToggleGender = (id: string) => {
        setStudentList(prevList => {
            const existingStudentIndex = prevList.findIndex(s => s.numeroEleve === id);
            let newList = [...prevList];

            if (existingStudentIndex >= 0) {
                // Toggle: M -> F -> undefined -> M
                const currentSexe = newList[existingStudentIndex].sexe;
                let newSexe: 'M' | 'F' | undefined;
                if (currentSexe === 'M') newSexe = 'F';
                else if (currentSexe === 'F') newSexe = undefined;
                else newSexe = 'M';
                
                newList[existingStudentIndex] = { ...newList[existingStudentIndex], sexe: newSexe };
            } else {
                // If student doesn't exist in list yet, create it with Male default
                newList.push({ numeroEleve: id, nomEleve: '', sexe: 'M' });
            }
            
            // Auto save
            saveStudentList(selectedClass, newList).then(() => {
                window.dispatchEvent(new CustomEvent('dbUpdated'));
            });
            return newList;
        });
    };

    return (
        <div className="p-2 sm:p-4 md:p-6 max-w-7xl mx-auto h-full flex flex-col gap-4 sm:gap-6">
            {/* Notification Toast */}
            {notificationToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900/90 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xl border border-gray-700 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                    {notificationToast}
                </div>
            )}

            {/* Quick Navigation Anchors / Section Headers */}
            <div className="flex flex-wrap items-center justify-between bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-gray-800 dark:text-gray-200">
                        اختبار Luc Léger VMA
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                        {selectedClass}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold">
                    <a
                        href="#vma-timer-section"
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition flex items-center gap-1"
                    >
                        ⏱️ المؤقت
                    </a>
                    <a
                        href="#vma-grid-section"
                        className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 transition flex items-center gap-1"
                    >
                        👥 الشبكة
                    </a>
                    <a
                        href="#vma-results-section"
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition flex items-center gap-1"
                    >
                        📊 النتائج ({results.length})
                    </a>
                </div>
            </div>

            {/* 1. Unified Top Control & Timer Panel */}
            <section id="vma-timer-section" className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-3.5 sm:p-5 flex flex-col gap-4 border border-gray-100 dark:border-gray-700">
                {/* Header Bar: Class Selector & Quick Stats */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700/80">
                    <div className="flex items-center gap-2.5">
                        <label htmlFor="class-select" className="text-xs sm:text-sm font-black text-gray-800 dark:text-gray-200 shrink-0">
                            {t.class}:
                        </label>
                        <div className="relative min-w-[180px] sm:w-60">
                            {classList.length > 0 ? (
                                <div className="relative">
                                    <select
                                        id="class-select"
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        disabled={testState !== 'idle'}
                                        className="block w-full appearance-none px-3 py-2 pe-8 text-xs sm:text-sm font-bold bg-gray-50 dark:bg-gray-700/70 text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {classList.map(c => (
                                            <option key={c.className} value={c.className} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                                {c.className} ({c.studentCount} تلميذ)
                                            </option>
                                        ))}
                                        {!classList.some(c => c.className === selectedClass) && (
                                            <option value={selectedClass} className="bg-white dark:bg-gray-800">{selectedClass}</option>
                                        )}
                                    </select>
                                    <div className="absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDownIcon className="w-4 h-4" />
                                    </div>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    id="class-select"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="block w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-700/70 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
                                    disabled={testState !== 'idle'}
                                    placeholder="مثال: 6ème A"
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 justify-between sm:justify-end">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-gray-600/50">
                            التلاميذ: <strong className="text-indigo-600 dark:text-indigo-400 font-black font-mono ms-1">{studentList.length}</strong>
                        </span>
                    </div>
                </div>

                {/* Display Component (Timer + Level + Track) */}
                <Display currentLevel={currentLevel} time={time} testState={testState} />

                {/* Action Controls Toolbar */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700/80">
                    <Controls 
                        testState={testState} 
                        results={results}
                        selectedClass={selectedClass}
                        onStart={startTest} 
                        onStop={stopTest} 
                        onClearAllData={() => setIsClearConfirmOpen(true)}
                        onPrepareNextRun={prepareNextRun}
                    />
                </div>
            </section>

            {/* 2. Student Grid Container */}
            <section id="vma-grid-section" className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-3 sm:p-5 flex flex-col border border-gray-100 dark:border-gray-700 min-h-[300px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-gray-800 dark:text-gray-200">شبكة التلاميذ</h2>
                        <span className="text-[11px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg">
                            {studentList.length > 0 ? `${studentList.length} تلميذ` : '40 تلميذ'}
                        </span>
                    </div>

                    {testState === 'idle' && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            اضغط على التلميذ لتحديد الجنس (أزرق = ذكر، وردي = أنثى)
                        </span>
                    )}
                    {testState === 'running' && (
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            ⏱️ اضغط على بطاقة التلميذ عند توقفه لتسجيل VMA
                        </span>
                    )}
                    {testState === 'finished' && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                            انتهى الاختبار • يمكنك مراجعة النتائج أسفله أو بدء مجموعة تالية
                        </span>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto">
                    <StudentGrid 
                        studentList={studentList}
                        finishedStudents={finishedStudents} 
                        onStudentClick={recordStudentFinish}
                        onStudentUndo={undoStudentFinish}
                        onToggleGender={handleToggleGender}
                        testIsRunning={testState === 'running'}
                        testState={testState}
                        results={results}
                    />
                </div>
            </section>

            {/* 3. Results Table (Displayed BELOW the Timer and Grid) */}
            <section id="vma-results-section" className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-3 sm:p-5 flex flex-col border border-gray-100 dark:border-gray-700">
                <ResultsTable 
                    results={results} 
                    onStudentClick={(num) => setModalStudentNumber(num)} 
                    onDeleteResult={(num) => undoStudentFinish(num)}
                    onClearAll={() => setIsClearConfirmOpen(true)}
                    onGenerateGroups={handleGenerateGroups}
                    selectedClass={selectedClass}
                />
            </section>
            
            {/* Affinity Groups Modal */}
            {isModalOpen && (
                <GroupsModal 
                    groups={groups}
                    results={results}
                    selectedClass={selectedClass} 
                    onClose={() => setIsModalOpen(false)} 
                />
            )}

            {/* Student Data Editor Modal */}
            {modalStudentNumber && (
                <StudentDataModal
                    isOpen={!!modalStudentNumber}
                    onClose={() => setModalStudentNumber(null)}
                    className={selectedClass}
                    studentNumber={modalStudentNumber}
                    allStudents={studentList}
                    onSelectStudent={(nextNum) => setModalStudentNumber(nextNum)}
                    onDataSaved={() => loadStudents(selectedClass)}
                    defaultTab="vma"
                />
            )}

            {/* Clear All Results Confirmation Modal */}
            {isClearConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-gray-100 dark:border-gray-700 text-right">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                            <TrashIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-2">
                            تأكيد مسح نتائج السرعة الهوائية
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                            هل أنت متأكد من رغبتك في مسح جميع نتائج VMA المسجلة لقسم <strong className="text-gray-900 dark:text-white font-bold">{selectedClass}</strong>؟
                            سيتم حذف النتائج نهائياً من هذا الاختبار ومن سجل الاختبارات البدنية.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsClearConfirmOpen(false)}
                                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmClear}
                                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 active:scale-95"
                            >
                                <TrashIcon className="w-4 h-4" />
                                <span>نعم، مسح النتائج</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
