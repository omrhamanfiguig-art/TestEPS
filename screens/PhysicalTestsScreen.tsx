import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getStudentList, getPhysicalTests, savePhysicalTests, saveStudentList, getVmaResults, saveVmaResults, getAllClasses, ClassStats } from '../utils/db';
import type { StudentIdentity, PhysicalTests, StudentResult } from '../types';
import { 
    SaveIcon, 
    ArrowDownTrayIcon, 
    ArrowUpTrayIcon, 
    UsersIcon, 
    DocumentTextIcon, 
    XMarkIcon,
    ClipboardDocumentCheckIcon,
    InformationCircleIcon,
    PencilSquareIcon,
    RunningManIcon,
    TableCellsIcon,
    Squares2X2Icon,
    ChevronDownIcon
} from '../components/Icons';
import { StudentDataModal } from '../components/StudentDataModal';
import { Sprint30mTestModal } from '../components/Sprint30mTestModal';
import { parsePhysicalTestsExcel, downloadPhysicalTestsTemplate, ParsedPhysicalTestsData } from '../utils/excelHelper';
import { LUC_LEGER_DATA } from '../constants';
import { VmaTestScreen } from './VmaTestScreen';
import { useLanguage } from '../utils/i18n';

interface PhysicalTestsScreenProps {
    selectedClass: string;
    setSelectedClass: (className: string) => void;
    sessionDate: string;
    groupSize?: number;
}

const findClosestPalier = (vma: number) => {
    let closest = LUC_LEGER_DATA[0];
    let minDiff = Math.abs(closest.vma - vma);
    for (const level of LUC_LEGER_DATA) {
        const diff = Math.abs(level.vma - vma);
        if (diff < minDiff) {
            minDiff = diff;
            closest = level;
        }
    }
    return closest;
};

// Physical test keys (8 tests in total - strictly NO biometric measurements)
type PhysicalTestField = 'vma' | 'vitesse30m' | 'sautHorizontal' | 'sautVertical' | 'lancerMedball' | 'souplesseAssis' | 'souplesseDebout' | 'equilibreStatique';

export const PhysicalTestsScreen: React.FC<PhysicalTestsScreenProps> = ({ 
    selectedClass, 
    setSelectedClass, 
    sessionDate,
    groupSize = 8
}) => {
    const { t, language } = useLanguage();
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [classList, setClassList] = useState<ClassStats[]>([]);
    const [studentList, setStudentList] = useState<StudentIdentity[]>([]);
    const [results, setResults] = useState<PhysicalTests[]>([]);
    const [vmaResults, setVmaResults] = useState<StudentResult[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentIdentity | null>(null);
    const [formData, setFormData] = useState<Partial<PhysicalTests>>({});
    const [filterQuery, setFilterQuery] = useState('');
    const [modalStudentNumber, setModalStudentNumber] = useState<string | null>(null);
    const [isLucLegerModalOpen, setIsLucLegerModalOpen] = useState(false);
    const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
    
    // Import state
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedPhysicalTestsData | null>(null);
    const [syncVma, setSyncVma] = useState(true);
    const [updateStudentList, setUpdateStudentList] = useState(true);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Load data when selectedClass changes
    const loadClassData = (className: string) => {
        getAllClasses().then(cls => setClassList(cls));
        if (!className) return;
        getStudentList(className).then(list => {
            const normalizedList = list.map(s => ({
                ...s,
                numeroEleve: String(s.numeroEleve)
            }));
            setStudentList(normalizedList);
        });
        getPhysicalTests(className).then(res => {
            setResults(res || []);
        });
        getVmaResults(className).then(vmaList => {
            setVmaResults(vmaList || []);
        });
    };

    useEffect(() => {
        loadClassData(selectedClass);
        const handleDbUpdate = () => loadClassData(selectedClass);
        window.addEventListener('dbUpdated', handleDbUpdate);
        return () => window.removeEventListener('dbUpdated', handleDbUpdate);
    }, [selectedClass]);

    const handleSelectStudent = (student: StudentIdentity) => {
        setSelectedStudent(student);
        const existingResult = results.find(r => r.numeroEleve === student.numeroEleve);
        const existingVmaResult = vmaResults.find(v => v.numeroEleve === student.numeroEleve);

        if (existingResult) {
            setFormData({
                ...existingResult,
                // If existing physical test does not have vma set, fill from vmaResults if available
                vma: existingResult.vma !== undefined ? existingResult.vma : existingVmaResult?.vma
            });
        } else {
            setFormData({
                numeroEleve: student.numeroEleve,
                nomEleve: student.nomEleve,
                sexe: student.sexe,
                vma: existingVmaResult?.vma,
                date: sessionDate || new Date().toISOString()
            });
        }
    };

    const handleInputChange = (field: keyof PhysicalTests, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value === '' ? undefined : Number(value)
        }));
    };

    const handleSave = async () => {
        if (!selectedStudent) return;
        
        let newResults = [...results];
        const index = newResults.findIndex(r => r.numeroEleve === selectedStudent.numeroEleve);
        const updatedItem = {
            ...formData,
            numeroEleve: selectedStudent.numeroEleve,
            nomEleve: selectedStudent.nomEleve,
            sexe: selectedStudent.sexe,
            date: formData.date || sessionDate || new Date().toISOString()
        } as PhysicalTests;

        if (index >= 0) {
            newResults[index] = updatedItem;
        } else {
            newResults.push(updatedItem);
        }
        
        setResults(newResults);
        await savePhysicalTests(selectedClass, newResults);
        window.dispatchEvent(new CustomEvent('dbUpdated'));

        // Also sync VMA to vmaResults if entered
        if (updatedItem.vma !== undefined && !isNaN(updatedItem.vma)) {
            const currentVmaList = await getVmaResults(selectedClass);
            let updatedVmaList = [...currentVmaList];
            const vmaIdx = updatedVmaList.findIndex(v => v.numeroEleve === selectedStudent.numeroEleve);
            const levelInfo = findClosestPalier(updatedItem.vma);

            const vmaItem: StudentResult = {
                id: vmaIdx >= 0 ? updatedVmaList[vmaIdx].id : Date.now(),
                numeroEleve: selectedStudent.numeroEleve,
                nomEleve: selectedStudent.nomEleve,
                sexe: selectedStudent.sexe,
                palierAtteint: levelInfo.palier,
                vitesseMoyenne: levelInfo.vitesse,
                vma: updatedItem.vma,
                date: updatedItem.date
            };

            if (vmaIdx >= 0) {
                updatedVmaList[vmaIdx] = vmaItem;
            } else {
                updatedVmaList.push(vmaItem);
            }

            await saveVmaResults(selectedClass, updatedVmaList);
            setVmaResults(updatedVmaList);
        }

        setNotification({
            message: `تم حفظ بيانات التلميذ ${selectedStudent.nomEleve} بنجاح.`,
            type: 'success'
        });
    };

    // Quick table inline field change handler
    const handleTableFieldChange = async (student: StudentIdentity, field: PhysicalTestField, rawVal: string) => {
        const numVal = rawVal === '' ? undefined : Number(rawVal);
        const existingResult = results.find(r => r.numeroEleve === student.numeroEleve);
        
        const updatedItem: PhysicalTests = {
            ...(existingResult || {}),
            numeroEleve: student.numeroEleve,
            nomEleve: student.nomEleve,
            sexe: student.sexe,
            [field]: numVal,
            date: existingResult?.date || sessionDate || new Date().toISOString()
        };

        const updatedResults = [...results];
        const idx = updatedResults.findIndex(r => r.numeroEleve === student.numeroEleve);
        if (idx >= 0) {
            updatedResults[idx] = updatedItem;
        } else {
            updatedResults.push(updatedItem);
        }

        setResults(updatedResults);
        await savePhysicalTests(selectedClass, updatedResults);

        // Sync VMA if vma field changed
        if (field === 'vma' && numVal !== undefined && !isNaN(numVal)) {
            const currentVmaList = await getVmaResults(selectedClass);
            let updatedVmaList = [...currentVmaList];
            const vmaIdx = updatedVmaList.findIndex(v => v.numeroEleve === student.numeroEleve);
            const levelInfo = findClosestPalier(numVal);

            const vmaItem: StudentResult = {
                id: vmaIdx >= 0 ? updatedVmaList[vmaIdx].id : Date.now(),
                numeroEleve: student.numeroEleve,
                nomEleve: student.nomEleve,
                sexe: student.sexe,
                palierAtteint: levelInfo.palier,
                vitesseMoyenne: levelInfo.vitesse,
                vma: numVal,
                date: updatedItem.date
            };

            if (vmaIdx >= 0) {
                updatedVmaList[vmaIdx] = vmaItem;
            } else {
                updatedVmaList.push(vmaItem);
            }

            await saveVmaResults(selectedClass, updatedVmaList);
            setVmaResults(updatedVmaList);
        }
    };

    const hasEnteredValues = useMemo(() => {
        return results.some(r => 
            r.vma !== undefined || 
            r.vitesse30m !== undefined || 
            r.sautHorizontal !== undefined || 
            r.sautVertical !== undefined || 
            r.lancerMedball !== undefined || 
            r.souplesseAssis !== undefined || 
            r.souplesseDebout !== undefined || 
            r.equilibreStatique !== undefined
        ) || vmaResults.some(v => v.vma !== undefined && v.vma > 0);
    }, [results, vmaResults]);

    const handleExport = () => {
        if (typeof (window as any).XLSX === 'undefined') {
            setNotification({ message: "لم يتم تحميل مكتبة التصدير.", type: 'error' });
            return;
        }

        const XLSX = (window as any).XLSX;
        
        // Export ONLY the 8 physical tests (no biometrics!)
        const dataToExport = studentList.map(student => {
            const res = results.find(r => r.numeroEleve === student.numeroEleve);
            const vmaRes = vmaResults.find(v => v.numeroEleve === student.numeroEleve);
            const finalVma = res?.vma !== undefined ? res.vma : vmaRes?.vma;

            return {
                "الرقم": student.numeroEleve,
                "الاسم والنسب": student.nomEleve,
                "الجنس": student.sexe || '',
                "السرعة القصوى الهوائية (كم/س)": finalVma !== undefined ? finalVma : '',
                "30 م سرعة (ث)": res?.vitesse30m !== undefined ? res.vitesse30m : '',
                "القفز الأفقي (سم)": res?.sautHorizontal !== undefined ? res.sautHorizontal : '',
                "القفز العمودي سارجنت (سم)": res?.sautVertical !== undefined ? res.sautVertical : '',
                "رمي الكرة الطبية 3كلغ (متر)": res?.lancerMedball !== undefined ? res.lancerMedball : '',
                "المرونة جلوس (سم)": res?.souplesseAssis !== undefined ? res.souplesseAssis : '',
                "المرونة وقوف (سم)": res?.souplesseDebout !== undefined ? res.souplesseDebout : '',
                "التوازن الثابت (ث)": res?.equilibreStatique !== undefined ? res.equilibreStatique : '',
                "التاريخ": res?.date ? new Date(res.date).toLocaleDateString('ar-MA') : ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "الاختبارات البدنية");
        XLSX.writeFile(wb, `الاختبارات_البدنية_${selectedClass.replace(/\s+/g, '_')}.xlsx`);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const parsed = await parsePhysicalTestsExcel(file);
            if (parsed.totalParsed === 0) {
                setNotification({
                    message: "لم يتم العثور على بيانات صالحة في الملف المرفق. تأكد من تطابق أعمدة ملف Excel.",
                    type: 'error'
                });
                return;
            }

            setParsedData(parsed);
            setIsImportModalOpen(true);
        } catch (err: any) {
            setNotification({
                message: err.message || "حدث خطأ أثناء قراءة ملف Excel.",
                type: 'error'
            });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const confirmImport = async () => {
        if (!parsedData) return;

        const targetClass = parsedData.className || selectedClass;
        if (!targetClass) {
            setNotification({ message: "يرجى تحديد القسم المستهدف للاستيراد.", type: 'error' });
            return;
        }

        // 1. Update student list if requested
        if (updateStudentList && parsedData.students.length > 0) {
            const currentList = await getStudentList(targetClass);
            const mergedMap = new Map<string, StudentIdentity>();
            currentList.forEach(s => mergedMap.set(s.numeroEleve, s));
            parsedData.students.forEach(s => {
                if (!mergedMap.has(s.numeroEleve)) {
                    mergedMap.set(s.numeroEleve, s);
                } else {
                    const existing = mergedMap.get(s.numeroEleve)!;
                    mergedMap.set(s.numeroEleve, {
                        ...existing,
                        nomEleve: s.nomEleve || existing.nomEleve,
                        sexe: s.sexe || existing.sexe
                    });
                }
            });
            const mergedList = Array.from(mergedMap.values());
            await saveStudentList(targetClass, mergedList);
            setStudentList(mergedList);
        }

        // 2. Save physical tests
        let updatedResults = [...results];
        parsedData.results.forEach(newR => {
            const existingIdx = updatedResults.findIndex(r => r.numeroEleve === newR.numeroEleve);
            if (existingIdx >= 0) {
                updatedResults[existingIdx] = {
                    ...updatedResults[existingIdx],
                    ...newR,
                    vma: newR.vma !== undefined ? newR.vma : updatedResults[existingIdx].vma
                };
            } else {
                updatedResults.push(newR);
            }
        });
        await savePhysicalTests(targetClass, updatedResults);
        setResults(updatedResults);

        // 3. Sync VMA if requested
        if (syncVma && parsedData.vmaCount > 0) {
            const currentVmaList = await getVmaResults(targetClass);
            let updatedVmaList = [...currentVmaList];

            parsedData.results.forEach(item => {
                if (item.vma !== undefined && !isNaN(item.vma)) {
                    const levelInfo = findClosestPalier(item.vma);
                    const vmaIdx = updatedVmaList.findIndex(v => v.numeroEleve === item.numeroEleve);
                    const vmaEntry: StudentResult = {
                        id: vmaIdx >= 0 ? updatedVmaList[vmaIdx].id : Date.now() + Math.random(),
                        numeroEleve: item.numeroEleve,
                        nomEleve: item.nomEleve,
                        sexe: item.sexe,
                        palierAtteint: levelInfo.palier,
                        vitesseMoyenne: levelInfo.vitesse,
                        vma: item.vma,
                        date: item.date || new Date().toISOString()
                    };

                    if (vmaIdx >= 0) {
                        updatedVmaList[vmaIdx] = vmaEntry;
                    } else {
                        updatedVmaList.push(vmaEntry);
                    }
                }
            });

            await saveVmaResults(targetClass, updatedVmaList);
            setVmaResults(updatedVmaList);
        }

        setIsImportModalOpen(false);
        setNotification({
            message: `تم بنجاح استيراد بيانات ${parsedData.totalParsed} تلميذ (${parsedData.vmaCount} نتيجة VMA) للقسم "${targetClass}".`,
            type: 'success'
        });
    };

    // Calculate completed tests count for a student (strictly the 8 physical tests)
    const getCompletedCount = (studentId: string) => {
        const res = results.find(r => r.numeroEleve === studentId);
        const vmaRes = vmaResults.find(v => v.numeroEleve === studentId);
        if (!res && !vmaRes) return 0;
        let count = 0;
        if (res?.vma !== undefined || vmaRes?.vma !== undefined) count++;
        if (res?.vitesse30m !== undefined) count++;
        if (res?.sautHorizontal !== undefined) count++;
        if (res?.sautVertical !== undefined) count++;
        if (res?.lancerMedball !== undefined) count++;
        if (res?.souplesseAssis !== undefined) count++;
        if (res?.souplesseDebout !== undefined) count++;
        if (res?.equilibreStatique !== undefined) count++;
        return count;
    };

    const getStudentVma = (studentId: string) => {
        const res = results.find(r => r.numeroEleve === studentId);
        if (res?.vma !== undefined) return res.vma;
        const vmaRes = vmaResults.find(v => v.numeroEleve === studentId);
        return vmaRes?.vma;
    };

    const filteredStudents = useMemo(() => {
        return studentList.map((s, idx) => ({
            ...s,
            orderIndex: idx + 1 // الترقيم الترتيبي من 1 إلى آخر تلميذ
        })).filter(s => {
            if (!filterQuery) return true;
            const q = filterQuery.trim().toLowerCase();
            const matchesOrder = String(s.orderIndex) === q || String(s.orderIndex).startsWith(q);
            const matchesName = (s.nomEleve || '').toLowerCase().includes(q);
            const matchesMassar = s.numeroEleve.toLowerCase().includes(q);
            return matchesOrder || matchesName || matchesMassar;
        });
    }, [studentList, filterQuery]);

    const currentLucLegerVma = selectedStudent ? vmaResults.find(v => v.numeroEleve === selectedStudent.numeroEleve)?.vma : undefined;

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col gap-6">
            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
            />

            {/* Notification Banner */}
            {notification && (
                <div className={`p-4 rounded-xl shadow-md text-sm font-medium flex items-center justify-between transition-all ${
                    notification.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800' 
                        : 'bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
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

            {/* Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                        <RunningManIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.physicalTestsTitle}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.physicalTestsSubtitle}</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-end gap-2.5">
                    <div className="flex-1 sm:flex-initial">
                        <label htmlFor="class-select" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                            {t.class}
                        </label>
                        <div className="relative">
                            <select
                                id="class-select"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="appearance-none w-full sm:w-48 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 pe-8 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
                            >
                                <option value="" disabled>{t.classNamePlaceholder || 'اختر القسم'}</option>
                                {classList.map(cls => (
                                    <option key={cls.className} value={cls.className} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium">
                                        {cls.className} ({cls.studentCount} {language === 'ar' ? 'تلميذ' : 'élèves'})
                                    </option>
                                ))}
                                {selectedClass && !classList.some(c => c.className === selectedClass) && (
                                    <option value={selectedClass} className="bg-white dark:bg-gray-800">{selectedClass}</option>
                                )}
                            </select>
                            <div className="absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDownIcon className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl border border-gray-200 dark:border-gray-600">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                            }`}
                            title="عرض جدول شامل لجميع التلاميذ"
                        >
                            <TableCellsIcon className="w-4 h-4" />
                            <span>جدول شامل</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'cards'
                                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                            }`}
                            title="عرض بطاقة تفصيلية لكل تلميذ"
                        >
                            <Squares2X2Icon className="w-4 h-4" />
                            <span>بطاقات فردية</span>
                        </button>
                    </div>

                    {/* Field Test & Export Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setIsSprintModalOpen(true)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl shadow-xs text-white bg-orange-600 hover:bg-orange-700 transition active:scale-95 cursor-pointer"
                            title="تنظيم سباق 30 م سرعة بين 2 إلى 4 تلاميذ مع توقيت آلي بالعداد"
                        >
                            <RunningManIcon className="w-4 h-4 shrink-0 text-orange-200" />
                            <span>اختبار 30 م سرعة</span>
                        </button>

                        <button
                            onClick={() => setIsLucLegerModalOpen(true)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl shadow-xs text-white bg-amber-600 hover:bg-amber-700 transition active:scale-95 cursor-pointer"
                            title="إجراء اختبار Luc Léger المكوك 20م الميداني لتحديد السرعة القصوى الهوائية"
                        >
                            <RunningManIcon className="w-4 h-4 shrink-0" />
                            <span>اختبار Luc Léger</span>
                        </button>

                        <button
                            onClick={handleExport}
                            disabled={!hasEnteredValues}
                            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 ${
                                hasEnteredValues
                                    ? 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 cursor-pointer'
                                    : 'text-gray-400 bg-gray-200 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed opacity-60'
                            }`}
                            title={hasEnteredValues ? "تصدير النتائج الكاملة إلى ملف Excel" : "يصبح التصدير متاحاً بمجرد إدخال أول قيمة في هذا القسم"}
                        >
                            <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
                            <span>تصدير (Excel)</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* VIEW MODE 1: COMPREHENSIVE TABLE MODE */}
            {viewMode === 'table' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col flex-grow">
                    {/* Table Toolbar */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <input
                                type="text"
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                placeholder="بحث بالرقم الترتيبي أو الاسم..."
                                className="w-full sm:w-72 text-xs px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                عدد التلاميذ: {studentList.length}
                            </span>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            <span>يمكنك إدخال النتائج مباشرة في الجدول بدون أرقام مسبقة، ويتم الحفظ تلقائياً.</span>
                        </div>
                    </div>

                    {/* Mobile Scroll Hint */}
                    <div className="sm:hidden px-3 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border-b border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <span>👈</span>
                            <span>اسحب الجدول أفقياً لتعبئة جميع الاختبارات</span>
                        </span>
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded-full">
                            8 اختبارات + VMA
                        </span>
                    </div>

                    {/* Table Container with safe horizontal & vertical scrolling */}
                    <div className="flex-grow overflow-x-auto overflow-y-auto max-h-[640px] custom-scrollbar">
                        <table className="w-full min-w-[1200px] text-xs text-center border-collapse">
                            <thead className="bg-gray-50 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 shadow-xs">
                                <tr>
                                    <th className="p-2.5 font-bold w-14 text-center bg-gray-100/70 dark:bg-gray-700"># الترتيب</th>
                                    <th className="p-2.5 font-bold text-right min-w-[150px]">الاسم والنسب</th>
                                    <th className="p-2.5 font-bold w-14">الجنس</th>
                                    <th className="p-2.5 font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-x border-amber-200 dark:border-amber-800 min-w-[105px]">
                                        <div>VMA</div>
                                        <div className="text-[10px] font-normal text-amber-600 dark:text-amber-400">كم/س</div>
                                    </th>
                                    <th className="p-2.5 font-bold min-w-[95px]">
                                        <div>30 م سرعة</div>
                                        <div className="text-[10px] font-normal text-gray-400">ثانية</div>
                                    </th>
                                    <th className="p-2.5 font-bold min-w-[95px]">
                                        <div>قفز أفقي</div>
                                        <div className="text-[10px] font-normal text-gray-400">سم</div>
                                    </th>
                                    <th className="p-2.5 font-bold min-w-[95px]">
                                        <div>قفز عمودي</div>
                                        <div className="text-[10px] font-normal text-gray-400">سارجنت (سم)</div>
                                    </th>
                                    <th className="p-2.5 font-bold min-w-[95px]">
                                        <div>رمي كرة</div>
                                        <div className="text-[10px] font-normal text-gray-400">3كلغ (م)</div>
                                    </th>
                                    <th className="p-2.5 font-bold min-w-[95px]">
                                        <div>مرونة جلوس</div>
                                        <div className="text-[10px] font-normal text-gray-400">سم</div>
                                    </th>
                                    <th className="p-2.5 font-bold min-w-[95px]">
                                        <div>مرونة وقوف</div>
                                        <div className="text-[10px] font-normal text-gray-400">سم</div>
                                    </th>
                                    <th className="p-2.5 font-bold min-w-[95px]">
                                        <div>توازن ثابت</div>
                                        <div className="text-[10px] font-normal text-gray-400">ثانية</div>
                                    </th>
                                    <th className="p-2.5 font-bold w-20">الإنجاز</th>
                                    <th className="p-2.5 font-bold w-12">بطاقة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredStudents.map((student) => {
                                    const res = results.find(r => r.numeroEleve === student.numeroEleve);
                                    const vmaRes = vmaResults.find(v => v.numeroEleve === student.numeroEleve);
                                    const finalVma = res?.vma !== undefined ? res.vma : vmaRes?.vma;
                                    const completedCount = getCompletedCount(student.numeroEleve);

                                    return (
                                        <tr key={student.numeroEleve} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                                            {/* Sequential Order Number */}
                                            <td className="p-2 text-center bg-gray-50/40 dark:bg-gray-800/40">
                                                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-black text-xs border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
                                                    {student.orderIndex}
                                                </span>
                                            </td>

                                            {/* Student Name */}
                                            <td className="p-2 text-right font-semibold text-gray-800 dark:text-gray-200">
                                                <button
                                                    type="button"
                                                    onClick={() => setModalStudentNumber(student.numeroEleve)}
                                                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition hover:underline text-right truncate block max-w-[170px]"
                                                >
                                                    {student.nomEleve}
                                                </button>
                                            </td>
                                             <td className="p-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                    student.sexe === 'F' 
                                                        ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' 
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                }`}>
                                                    {student.sexe === 'F' ? 'أنثى' : 'ذكر'}
                                                </span>
                                            </td>

                                            {/* VMA Input */}
                                            <td className="p-1.5 bg-amber-50/50 dark:bg-amber-950/20 border-x border-amber-100 dark:border-amber-800/40">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="5"
                                                    max="25"
                                                    placeholder=""
                                                    defaultValue={finalVma !== undefined ? finalVma : ''}
                                                    key={`vma-${student.numeroEleve}-${finalVma}`}
                                                    onBlur={(e) => handleTableFieldChange(student, 'vma', e.target.value)}
                                                    className="w-full text-center py-1.5 px-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                                />
                                            </td>

                                            {/* 30m Sprint */}
                                            <td className="p-1.5">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder=""
                                                    defaultValue={res?.vitesse30m !== undefined ? res.vitesse30m : ''}
                                                    key={`vitesse-${student.numeroEleve}-${res?.vitesse30m}`}
                                                    onBlur={(e) => handleTableFieldChange(student, 'vitesse30m', e.target.value)}
                                                    className="w-full text-center py-1.5 px-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </td>

                                            {/* Saut Horizontal */}
                                            <td className="p-1.5">
                                                <input
                                                    type="number"
                                                    step="1"
                                                    placeholder=""
                                                    defaultValue={res?.sautHorizontal !== undefined ? res.sautHorizontal : ''}
                                                    key={`sautH-${student.numeroEleve}-${res?.sautHorizontal}`}
                                                    onBlur={(e) => handleTableFieldChange(student, 'sautHorizontal', e.target.value)}
                                                    className="w-full text-center py-1.5 px-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </td>

                                            {/* Saut Vertical (Sargent) */}
                                            <td className="p-1.5">
                                                <input
                                                    type="number"
                                                    step="1"
                                                    placeholder=""
                                                    defaultValue={res?.sautVertical !== undefined ? res.sautVertical : ''}
                                                    key={`sautV-${student.numeroEleve}-${res?.sautVertical}`}
                                                    onBlur={(e) => handleTableFieldChange(student, 'sautVertical', e.target.value)}
                                                    className="w-full text-center py-1.5 px-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </td>

                                            {/* Lancer Medball */}
                                            <td className="p-1.5">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    placeholder=""
                                                    defaultValue={res?.lancerMedball !== undefined ? res.lancerMedball : ''}
                                                    key={`medball-${student.numeroEleve}-${res?.lancerMedball}`}
                                                    onBlur={(e) => handleTableFieldChange(student, 'lancerMedball', e.target.value)}
                                                    className="w-full text-center py-1.5 px-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </td>

                                            {/* Souplesse Assis */}
                                            <td className="p-1.5">
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    placeholder=""
                                                    defaultValue={res?.souplesseAssis !== undefined ? res.souplesseAssis : ''}
                                                    key={`souplesseA-${student.numeroEleve}-${res?.souplesseAssis}`}
                                                    onBlur={(e) => handleTableFieldChange(student, 'souplesseAssis', e.target.value)}
                                                    className="w-full text-center py-1.5 px-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </td>

                                            {/* Souplesse Debout */}
                                            <td className="p-1.5">
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    placeholder=""
                                                    defaultValue={res?.souplesseDebout !== undefined ? res.souplesseDebout : ''}
                                                    key={`souplesseD-${student.numeroEleve}-${res?.souplesseDebout}`}
                                                    onBlur={(e) => handleTableFieldChange(student, 'souplesseDebout', e.target.value)}
                                                    className="w-full text-center py-1.5 px-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </td>

                                            {/* Equilibre Statique */}
                                            <td className="p-1.5">
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    placeholder=""
                                                    defaultValue={res?.equilibreStatique !== undefined ? res.equilibreStatique : ''}
                                                    key={`equilibre-${student.numeroEleve}-${res?.equilibreStatique}`}
                                                    onBlur={(e) => handleTableFieldChange(student, 'equilibreStatique', e.target.value)}
                                                    className="w-full text-center py-1.5 px-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </td>

                                            {/* Completion */}
                                            <td className="p-2">
                                                {completedCount > 0 ? (
                                                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full">
                                                        {completedCount}/8
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400">0/8</span>
                                                )}
                                            </td>

                                            {/* Action: Open modal */}
                                            <td className="p-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setModalStudentNumber(student.numeroEleve)}
                                                    className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="فتح بطاقة التلميذ"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={13} className="py-12 text-center text-gray-400">
                                            <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="font-semibold">لم يتم العثور على أي تلميذ في هذا القسم.</p>
                                            <p className="text-xs mt-1">انقر على "استيراد" لإضافة التلاميذ أو الاختبارات عبر ملف Excel.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VIEW MODE 2: CARDS / INDIVIDUAL STUDENT MODE */}
            {viewMode === 'cards' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
                    {/* Students List Column */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 flex flex-col h-[650px]">
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-gray-800 dark:text-gray-200">لائحة التلاميذ</h2>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full font-bold text-gray-600 dark:text-gray-300">
                                    {studentList.length}
                                </span>
                            </div>
                        </div>

                        {/* Search filter */}
                        <div className="mb-3">
                            <input
                                type="text"
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                placeholder="بحث بالاسم أو الرقم..."
                                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Students List */}
                        <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                            {filteredStudents.map(student => {
                                const completedCount = getCompletedCount(student.numeroEleve);
                                const studentVma = getStudentVma(student.numeroEleve);
                                const isSelected = selectedStudent?.numeroEleve === student.numeroEleve;

                                return (
                                    <div
                                        key={student.numeroEleve}
                                        onClick={() => {
                                            handleSelectStudent(student);
                                            setModalStudentNumber(student.numeroEleve);
                                        }}
                                        className={`w-full text-right p-3 rounded-xl border transition-all flex justify-between items-center cursor-pointer group ${
                                            isSelected 
                                                ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm' 
                                                : 'bg-gray-50/70 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600/70'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate pr-1 flex-1 text-right">
                                            <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-black text-xs border border-indigo-200 dark:border-indigo-800">
                                                #{student.orderIndex}
                                            </span>
                                            <div className="truncate">
                                                <div className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1.5">
                                                    <span>{student.nomEleve}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                                                    {student.sexe && (
                                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                            student.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                        }`}>
                                                            {student.sexe === 'F' ? 'أنثى' : 'ذكر'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            {studentVma !== undefined && (
                                                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono">
                                                    {studentVma.toFixed(1)} كم/س
                                                </span>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                {completedCount > 0 ? (
                                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                                                        {completedCount}/8 مكتمل
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400">فارغ</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setModalStudentNumber(student.numeroEleve);
                                                    }}
                                                    className="p-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                                                    title="عرض وتعديل بطاقة نتائج التلميذ الكاملة"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredStudents.length === 0 && (
                                <div className="text-center py-10 px-4 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm font-medium">لم يتم العثور على أي تلميذ.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Column */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col">
                        {selectedStudent ? (
                            <div className="flex flex-col h-full">
                                {/* Student Header */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                                    <div>
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer group"
                                            onClick={() => setModalStudentNumber(selectedStudent.numeroEleve)}
                                            title="انقر لفتح نافذة بيانات التلميذ وتعديلها بسهولة"
                                        >
                                            <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                                                {selectedStudent.nomEleve}
                                            </h2>
                                            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition">
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>رقم التلميذ: <strong className="text-gray-700 dark:text-gray-200 font-mono">{selectedStudent.numeroEleve}</strong></span>
                                            <span>|</span>
                                            <span>الجنس: <strong className="text-gray-700 dark:text-gray-200">{selectedStudent.sexe === 'F' ? 'أنثى' : selectedStudent.sexe === 'M' ? 'ذكر' : 'غير محدد'}</strong></span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-indigo-600 hover:bg-indigo-700 transition"
                                    >
                                        <SaveIcon />
                                        <span>حفظ التعديلات</span>
                                    </button>
                                </div>

                                {/* VMA Highlight Card as part of Physical Tests */}
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 mb-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                            <label className="text-sm font-bold text-amber-950 dark:text-amber-200">
                                                السرعة القصوى الهوائية VMA (كم/ساعة)
                                            </label>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            {currentLucLegerVma !== undefined && formData.vma !== currentLucLegerVma && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleInputChange('vma', String(currentLucLegerVma))}
                                                    className="text-xs bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1"
                                                >
                                                    <ClipboardDocumentCheckIcon />
                                                    نسخ من اختبار Luc Léger ({currentLucLegerVma} كم/س)
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => setIsLucLegerModalOpen(true)}
                                                className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 shadow-xs"
                                            >
                                                <RunningManIcon className="w-3.5 h-3.5" />
                                                <span>إجراء اختبار Luc Léger</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="30"
                                            value={formData.vma ?? ''}
                                            onChange={e => handleInputChange('vma', e.target.value)}
                                            placeholder=""
                                            className="w-44 px-4 py-2.5 rounded-xl border border-amber-300 dark:bg-gray-700 dark:border-amber-600 font-extrabold text-lg text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm font-mono text-center"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            السرعة المرجعية المعتمدة في التربية البدنية لبرمجة الجري والتحمل.
                                        </span>
                                    </div>
                                </div>

                                {/* Form Sections (Strictly Physical Tests) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto pr-1">
                                    {/* Athletics Section */}
                                    <div className="space-y-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2 flex items-center gap-2">
                                            <span>🏃</span>
                                            <span>ألعاب القوى والسرعة</span>
                                        </h3>
                                        
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">30 م سرعة (ثانية)</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={formData.vitesse30m ?? ''} 
                                                onChange={e => handleInputChange('vitesse30m', e.target.value)}
                                                placeholder=""
                                                className="w-full rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 py-2 px-3 text-sm text-center font-bold" 
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">القفز الأفقي من الثبات (سم)</label>
                                            <input 
                                                type="number" 
                                                step="1" 
                                                value={formData.sautHorizontal ?? ''} 
                                                onChange={e => handleInputChange('sautHorizontal', e.target.value)}
                                                placeholder=""
                                                className="w-full rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 py-2 px-3 text-sm text-center font-bold" 
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">رمي الكرة الطبية 3كلغ (متر)</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={formData.lancerMedball ?? ''} 
                                                onChange={e => handleInputChange('lancerMedball', e.target.value)}
                                                placeholder=""
                                                className="w-full rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 py-2 px-3 text-sm text-center font-bold" 
                                            />
                                        </div>
                                    </div>

                                    {/* Qualities & Balance Section */}
                                    <div className="space-y-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2 flex items-center gap-2">
                                            <span>⚖️</span>
                                            <span>المرونة والتوازن</span>
                                        </h3>
                                        
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">المرونة في وضعية الجلوس (سم)</label>
                                            <input 
                                                type="number" 
                                                step="0.5" 
                                                value={formData.souplesseAssis ?? ''} 
                                                onChange={e => handleInputChange('souplesseAssis', e.target.value)}
                                                placeholder=""
                                                className="w-full rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 py-2 px-3 text-sm text-center font-bold" 
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">المرونة في وضعية الوقوف (سم)</label>
                                            <input 
                                                type="number" 
                                                step="0.5" 
                                                value={formData.souplesseDebout ?? ''} 
                                                onChange={e => handleInputChange('souplesseDebout', e.target.value)}
                                                placeholder=""
                                                className="w-full rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 py-2 px-3 text-sm text-center font-bold" 
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">التوازن الثابت (ثانية)</label>
                                            <input 
                                                type="number" 
                                                step="0.5" 
                                                value={formData.equilibreStatique ?? ''} 
                                                onChange={e => handleInputChange('equilibreStatique', e.target.value)}
                                                placeholder=""
                                                className="w-full rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 py-2 px-3 text-sm text-center font-bold" 
                                            />
                                        </div>
                                    </div>

                                    {/* Explosive Power / Vertical Jump */}
                                    <div className="space-y-4 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 sm:col-span-2">
                                        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-2 flex items-center gap-2">
                                            <span>📐</span>
                                            <span>الارتقاء والقوة الانفجارية</span>
                                        </h3>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">القفز العمودي (سارجنت - Détente verticale) (سم)</label>
                                            <input 
                                                type="number" 
                                                step="1" 
                                                value={formData.sautVertical ?? ''} 
                                                onChange={e => handleInputChange('sautVertical', e.target.value)}
                                                placeholder=""
                                                className="w-full rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 py-2 px-3 text-sm text-center font-bold" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-gray-700 flex items-center justify-center text-indigo-500 mb-4">
                                    <UsersIcon />
                                </div>
                                <p className="text-base font-bold text-gray-700 dark:text-gray-300">اختر تلميذاً من القائمة</p>
                                <p className="text-xs text-gray-400 max-w-sm mt-1">
                                    يمكنك الاطلاع على نتائج الاختبارات البدنية أو تعديلها، أو التحويل إلى "جدول شامل" لتعديل كل القسم مباشرة.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Field Test Runner Modal (Luc Léger) */}
            {isLucLegerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-6xl w-full p-2 sm:p-6 border border-gray-100 dark:border-gray-700 flex flex-col my-auto max-h-[98vh] overflow-y-auto">
                        <div className="flex justify-between items-center pb-2 sm:pb-3 mb-2 sm:mb-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <RunningManIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                                <div>
                                    <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                        اختبار السرعة القصوى الهوائية Luc Léger
                                    </h3>
                                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden xs:block">
                                        يتم حفظ النتائج تلقائياً في الاختبارات البدنية للقسم "{selectedClass}".
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsLucLegerModalOpen(false);
                                    loadClassData(selectedClass);
                                }}
                                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition shrink-0"
                                title="إغلاق"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <VmaTestScreen
                            selectedClass={selectedClass}
                            setSelectedClass={setSelectedClass}
                            groupSize={groupSize}
                            sessionDate={sessionDate}
                        />
                    </div>
                </div>
            )}

            {/* Import Confirmation Modal */}
            {isImportModalOpen && parsedData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                <ArrowUpTrayIcon />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">معاينة استيراد البيانات</h3>
                            </div>
                            <button 
                                onClick={() => setIsImportModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full"
                            >
                                <XMarkIcon />
                            </button>
                        </div>

                        {/* Modal Summary */}
                        <div className="my-4 grid grid-cols-3 gap-3 text-center">
                            <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                <div className="text-xs text-gray-500 dark:text-gray-400">التلاميذ المعثور عليهم</div>
                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{parsedData.totalParsed}</div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-100 dark:border-purple-800">
                                <div className="text-xs text-gray-500 dark:text-gray-400">قيم VMA المكتشفة</div>
                                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{parsedData.vmaCount}</div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                <div className="text-xs text-gray-500 dark:text-gray-400">القسم المستهدف</div>
                                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-1 truncate">
                                    {parsedData.className || selectedClass || 'غير محدد'}
                                </div>
                            </div>
                        </div>

                        {/* Preview Table */}
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">معاينة عينة من البيانات المقروءة:</div>
                        <div className="flex-grow overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl mb-4 max-h-56">
                            <table className="w-full text-xs text-right">
                                <thead className="bg-gray-50 dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 sticky top-0">
                                    <tr>
                                        <th className="p-2">الرقم</th>
                                        <th className="p-2">الاسم</th>
                                        <th className="p-2">الجنس</th>
                                        <th className="p-2">VMA</th>
                                        <th className="p-2">30 م سرعة</th>
                                        <th className="p-2">القفز الأفقي</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {parsedData.results.slice(0, 7).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-2 font-mono">{item.numeroEleve}</td>
                                            <td className="p-2 font-medium">{item.nomEleve}</td>
                                            <td className="p-2">{item.sexe === 'F' ? 'أنثى' : item.sexe === 'M' ? 'ذكر' : '-'}</td>
                                            <td className="p-2 font-bold text-indigo-600 dark:text-indigo-400">
                                                {item.vma ? `${item.vma} كم/س` : '-'}
                                            </td>
                                            <td className="p-2">{item.vitesse30m ? `${item.vitesse30m} ث` : '-'}</td>
                                            <td className="p-2">{item.sautHorizontal ? `${item.sautHorizontal} سم` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Options */}
                        <div className="space-y-2 mb-6 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                                <input 
                                    type="checkbox" 
                                    checked={syncVma} 
                                    onChange={e => setSyncVma(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <span>مزامنة قيم VMA تلقائياً مع اختبار Luc Léger ومجموعات التحمل</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
                                <input 
                                    type="checkbox" 
                                    checked={updateStudentList} 
                                    onChange={e => setUpdateStudentList(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <span>تحديث وإضافة أسماء التلاميذ في لائحة القسم</span>
                            </label>
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={confirmImport}
                                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition"
                            >
                                تأكيد واستيراد
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalStudentNumber && (
                <StudentDataModal
                    isOpen={!!modalStudentNumber}
                    onClose={() => setModalStudentNumber(null)}
                    className={selectedClass}
                    studentNumber={modalStudentNumber}
                    allStudents={studentList}
                    onSelectStudent={(nextNum) => setModalStudentNumber(nextNum)}
                    onDataSaved={() => loadClassData(selectedClass)}
                    defaultTab="physical"
                />
            )}

            {isSprintModalOpen && (
                <Sprint30mTestModal
                    isOpen={isSprintModalOpen}
                    onClose={() => setIsSprintModalOpen(false)}
                    initialClass={selectedClass}
                    classList={classList}
                    onDataSaved={() => loadClassData(selectedClass)}
                />
            )}
        </div>
    );
};
