import React, { useState, useRef, useEffect } from 'react';
import { 
    parseStudentExcel, 
    parsePhysicalTestsExcel, 
    downloadPhysicalTestsTemplate, 
    downloadStudentsTemplate,
    ParsedPhysicalTestsData
} from '../utils/excelHelper';
import { 
    getStudentList, 
    saveStudentList, 
    getPhysicalTests, 
    savePhysicalTests, 
    getVmaResults, 
    saveVmaResults 
} from '../utils/db';
import { exportGroupsToWord } from '../utils/wordHelper';
import { generateAffinityGroups } from '../utils/groupHelper';
import { LUC_LEGER_DATA } from '../constants';
import type { StudentIdentity, PhysicalTests, StudentResult } from '../types';
import { 
    ExcelIcon, 
    ArrowUpTrayIcon, 
    ArrowDownTrayIcon, 
    DocumentTextIcon, 
    SaveIcon, 
    XMarkIcon, 
    InformationCircleIcon, 
    CheckIcon,
    ArrowsRightLeftIcon,
    ScaleIcon,
    ClipboardDocumentCheckIcon
} from '../components/Icons';
import { useLanguage } from '../utils/i18n';
import { calculateBMI, getBMICategory } from './BiometricMeasurementsScreen';

interface ImportExportScreenProps {
    selectedClass: string;
    setSelectedClass: (className: string) => void;
    groupSize: number;
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

export const ImportExportScreen: React.FC<ImportExportScreenProps> = ({
    selectedClass,
    setSelectedClass,
    groupSize
}) => {
    const { t } = useLanguage();

    // Feedback notifications
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // 1. Student list import state
    const [importingStudents, setImportingStudents] = useState(false);
    const [importedGroups, setImportedGroups] = useState<{ className: string; students: StudentIdentity[] }[]>([]);
    const studentFileInputRef = useRef<HTMLInputElement>(null);

    // 2. Physical tests & VMA import state
    const [parsedPhysicalData, setParsedPhysicalData] = useState<ParsedPhysicalTestsData | null>(null);
    const [syncVma, setSyncVma] = useState(true);
    const [updateStudentList, setUpdateStudentList] = useState(true);
    const physicalFileInputRef = useRef<HTMLInputElement>(null);

    // Backup restore input
    const backupInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Handle student list Excel upload
    const handleStudentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setImportingStudents(true);
        try {
            const allGroups: { className: string; students: StudentIdentity[] }[] = [];
            
            for (let i = 0; i < files.length; i++) {
                const arrayBuffer = await files[i].arrayBuffer();
                const fileResults = parseStudentExcel(arrayBuffer);
                allGroups.push(...fileResults);
            }

            if (allGroups.length === 0) {
                setMessage({ text: "لم يتم العثور على أي لوائح تلاميذ في الملفات المختارة.", type: 'error' });
            } else {
                setImportedGroups(allGroups);
                const totalStudents = allGroups.reduce((acc, g) => acc + g.students.length, 0);
                setMessage({ text: `تم اكتشاف ${allGroups.length} أقسام (${totalStudents} تلميذ). يرجى التأكيد للحفظ.`, type: 'success' });
            }
        } catch (err: any) {
            setMessage({ text: err.message || "خطأ أثناء قراءة ملفات Excel.", type: 'error' });
        } finally {
            setImportingStudents(false);
        }
    };

    const confirmStudentImport = async () => {
        if (importedGroups.length === 0) return;
        try {
            for (const group of importedGroups) {
                await saveStudentList(group.className, group.students);
            }

            if (importedGroups.length === 1) {
                setSelectedClass(importedGroups[0].className);
            }

            setMessage({ text: `تم استيراد وحفظ ${importedGroups.length} لوائح بنجاح.`, type: 'success' });
            window.dispatchEvent(new CustomEvent('dbUpdated'));
            setImportedGroups([]);
            if (studentFileInputRef.current) studentFileInputRef.current.value = '';
        } catch (err) {
            setMessage({ text: "خطأ أثناء حفظ لوائح التلاميذ.", type: 'error' });
        }
    };

    // Handle Physical tests Excel upload
    const handlePhysicalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const data = parsePhysicalTestsExcel(arrayBuffer);

            if (data.results.length === 0) {
                setMessage({ text: "لم يتم العثور على أي بيانات قابلة للاستيراد في الملف.", type: 'error' });
            } else {
                setParsedPhysicalData(data);
                if (data.className && !selectedClass) {
                    setSelectedClass(data.className);
                }
                setMessage({ 
                    text: `تم استخراج ${data.results.length} تلميذاً (${data.vmaCount} بقيمة VMA). يرجى التأكيد للحفظ.`, 
                    type: 'success' 
                });
            }
        } catch (err: any) {
            setMessage({ text: err.message || "خطأ في قراءة ملف الاختبارات.", type: 'error' });
        }
    };

    const confirmPhysicalImport = async () => {
        if (!parsedPhysicalData) return;
        const targetClass = parsedPhysicalData.className || selectedClass;

        try {
            // 1. Save Physical tests
            await savePhysicalTests(targetClass, parsedPhysicalData.results);

            // 2. Optionally update student list
            if (updateStudentList && parsedPhysicalData.students.length > 0) {
                await saveStudentList(targetClass, parsedPhysicalData.students);
            }

            // 3. Optionally sync VMA into Luc Léger results store
            if (syncVma) {
                const existingVma = await getVmaResults(targetClass);
                const updatedVmaMap = new Map<string, StudentResult>();
                existingVma.forEach(r => updatedVmaMap.set(r.numeroEleve, r));

                const today = new Date().toISOString();
                parsedPhysicalData.results.forEach(item => {
                    if (item.vma && item.vma > 0) {
                        const level = findClosestPalier(item.vma);
                        const newRes: StudentResult = {
                            id: updatedVmaMap.get(item.numeroEleve)?.id ?? Date.now() + Math.random(),
                            numeroEleve: item.numeroEleve,
                            nomEleve: item.nomEleve,
                            sexe: item.sexe,
                            vma: item.vma,
                            palierAtteint: level.palier,
                            vitesseMoyenne: level.vitesse,
                            date: item.date || today
                        };
                        updatedVmaMap.set(item.numeroEleve, newRes);
                    }
                });

                await saveVmaResults(targetClass, Array.from(updatedVmaMap.values()));
            }

            if (parsedPhysicalData.className) {
                setSelectedClass(parsedPhysicalData.className);
            }

            setMessage({
                text: `تم استيراد ${parsedPhysicalData.results.length} نتيجة بنجاح للقسم "${targetClass}".`,
                type: 'success'
            });

            setParsedPhysicalData(null);
            if (physicalFileInputRef.current) physicalFileInputRef.current.value = '';
        } catch (err: any) {
            setMessage({ text: err.message || "خطأ أثناء حفظ البيانات.", type: 'error' });
        }
    };

    // Export Luc Léger results (Excel)
    const handleExportLucLeger = async () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) return;

        const results = await getVmaResults(selectedClass);
        if (results.length === 0) {
            setMessage({ text: "لا توجد نتائج اختبار Luc Léger مسجلة لهذا القسم.", type: 'error' });
            return;
        }

        const rows = results.map(r => ({
            "الرقم": r.numeroEleve,
            "الاسم والنسب": r.nomEleve || '',
            "الجنس": r.sexe || '',
            "المستوى (Palier)": r.palierAtteint,
            "المسافة المقطوعة (متر)": r.distanceParcourue !== undefined ? r.distanceParcourue : '',
            "VMA (كم/س)": r.vma,
            "التاريخ": r.date ? new Date(r.date).toLocaleDateString() : ''
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "نتائج VMA Luc Léger");
        XLSX.writeFile(wb, `نتائج_Luc_Leger_${selectedClass.replace(/\s+/g, '_')}.xlsx`);
    };

    // Export VMA Groups to Word
    const handleExportEnduranceWord = async () => {
        const results = await getVmaResults(selectedClass);
        if (results.length === 0) {
            setMessage({ text: "لا توجد نتائج VMA لتوليد مجموعات متجانسة وتقرير Word.", type: 'error' });
            return;
        }
        const groups = generateAffinityGroups(results, groupSize);
        exportGroupsToWord(groups, selectedClass);
    };

    // Export Full Physical Tests to Excel
    const handleExportPhysicalTests = async () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) return;

        const tests = await getPhysicalTests(selectedClass);
        if (tests.length === 0) {
            setMessage({ text: "لا توجد نتائج اختبارات بدنية مسجلة لهذا القسم.", type: 'error' });
            return;
        }

        const rows = tests.map(tItem => ({
            "الرقم": tItem.numeroEleve,
            "الاسم والنسب": tItem.nomEleve || '',
            "الجنس": tItem.sexe || '',
            "VMA (كم/س)": tItem.vma ?? '',
            "30 م سرعة (ث)": tItem.vitesse30m ?? '',
            "رمي الجلة (م)": tItem.lancerPoids ?? '',
            "القفز الأفقي (م)": tItem.sautHorizontal ?? '',
            "القفز العمودي (سم)": tItem.sautVertical ?? '',
            "المرونة (سم)": tItem.souplesse ?? '',
            "الوزن (كغ)": tItem.poids ?? '',
            "الطول (سم)": tItem.taille ?? '',
            "دقات القلب (bpm)": tItem.frequenceCardiaque ?? '',
            "التاريخ": tItem.date ? new Date(tItem.date).toLocaleDateString() : ''
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "الاختبارات البدنية");
        XLSX.writeFile(wb, `الاختبارات_البدنية_${selectedClass.replace(/\s+/g, '_')}.xlsx`);
    };

    // Export Measurements to Excel
    const handleExportMeasurements = async () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) return;

        const students = await getStudentList(selectedClass);
        const tests = await getPhysicalTests(selectedClass);

        if (students.length === 0 && tests.length === 0) {
            setMessage({ text: "لا توجد قياسات مسجلة لهذا القسم.", type: 'error' });
            return;
        }

        const targetList = students.length > 0 ? students : tests.map(t => ({
            numeroEleve: t.numeroEleve,
            nomEleve: t.nomEleve || '',
            sexe: t.sexe
        }));

        const rows = targetList.map(s => {
            const item = tests.find(x => x.numeroEleve === s.numeroEleve);
            const bmi = calculateBMI(item?.poids, item?.taille);
            const cat = getBMICategory(bmi, t);

            return {
                "الرقم": s.numeroEleve,
                "الاسم والنسب": s.nomEleve,
                "الجنس": s.sexe || '',
                "الطول (سم)": item?.taille ?? '',
                "الوزن (كغ)": item?.poids ?? '',
                "مؤشر كتلة الجسم (IMC)": bmi ?? '',
                "الحالة": cat.label !== '-' ? cat.label : '',
                "دقات القلب (bpm)": item?.frequenceCardiaque ?? ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "القياسات البيومترية");
        XLSX.writeFile(wb, `القياسات_${selectedClass.replace(/\s+/g, '_')}.xlsx`);
    };

    // Backup all database to JSON
    const handleExportBackup = async () => {
        try {
            const students = await getStudentList(selectedClass);
            const vma = await getVmaResults(selectedClass);
            const physical = await getPhysicalTests(selectedClass);

            const backupData = {
                app: "EPS-VMA-App",
                version: "2.0",
                exportedAt: new Date().toISOString(),
                selectedClass,
                data: {
                    students,
                    vmaResults: vma,
                    physicalTests: physical
                }
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `نسخة_احتياطية_${selectedClass.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();

            setMessage({ text: "تم تصدير النسخة الاحتياطية بنجاح.", type: 'success' });
        } catch (err: any) {
            setMessage({ text: "خطأ أثناء تصدير النسخة الاحتياطية.", type: 'error' });
        }
    };

    // Restore database from JSON
    const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);

            if (!parsed.data) {
                throw new Error("ملف النسخة الاحتياطية غير صالح.");
            }

            const targetClass = parsed.selectedClass || selectedClass;

            if (parsed.data.students) await saveStudentList(targetClass, parsed.data.students);
            if (parsed.data.vmaResults) await saveVmaResults(targetClass, parsed.data.vmaResults);
            if (parsed.data.physicalTests) await savePhysicalTests(targetClass, parsed.data.physicalTests);

            if (parsed.selectedClass) setSelectedClass(parsed.selectedClass);

            setMessage({ text: `تم استعادة النسخة الاحتياطية للقسم "${targetClass}" بنجاح.`, type: 'success' });
            if (backupInputRef.current) backupInputRef.current.value = '';
        } catch (err: any) {
            setMessage({ text: err.message || "خطأ أثناء استعادة النسخة الاحتياطية.", type: 'error' });
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-8">
            {/* Feedback notification */}
            {message && (
                <div className={`p-4 rounded-xl shadow-md text-sm font-medium flex items-center justify-between transition-all ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800' 
                        : 'bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
                }`}>
                    <div className="flex items-center gap-2">
                        <InformationCircleIcon />
                        <span>{message.text}</span>
                    </div>
                    <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75">
                        <XMarkIcon />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <ArrowsRightLeftIcon />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.importExportTitle}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.importExportSubtitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t.class}:</label>
                    <input
                        type="text"
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="px-3 py-1.5 text-sm font-bold border border-gray-300 dark:bg-gray-700 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder={t.classNamePlaceholder}
                    />
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Import Students */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                            <ExcelIcon />
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.importStudentsCard}</h2>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                            {t.importStudentsDesc}
                        </p>

                        {!importedGroups.length ? (
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center bg-gray-50/50 dark:bg-gray-900/20">
                                <ArrowUpTrayIcon className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                                <input
                                    type="file"
                                    ref={studentFileInputRef}
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleStudentFileUpload}
                                    className="hidden"
                                    id="student-excel-upload"
                                    multiple
                                />
                                <label
                                    htmlFor="student-excel-upload"
                                    className={`cursor-pointer inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition ${importingStudents ? 'opacity-50' : ''}`}
                                >
                                    {importingStudents ? 'جاري التحليل...' : 'اختيار ملفات إكسيل (مسار)'}
                                </label>
                                <p className="text-[10px] text-gray-500 mt-2">يمكنك اختيار عدة ملفات أو ملف واحد به عدة أوراق عمل</p>
                            </div>
                        ) : (
                            <div className="space-y-4 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900">
                                <div className="text-sm font-bold text-indigo-900 dark:text-indigo-200 border-b border-indigo-100 dark:border-indigo-800 pb-2 mb-2">
                                    ✓ تم اكتشاف {importedGroups.length} لوائح تلاميذ:
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                                    {importedGroups.map((group, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800 text-xs">
                                            <span className="font-bold text-gray-700 dark:text-gray-200">{group.className}</span>
                                            <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                                                {group.students.length} تلميذ
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={confirmStudentImport}
                                        className="flex-1 py-2 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                                    >
                                        <SaveIcon className="w-4 h-4" />
                                        {t.confirm} {importedGroups.length > 1 ? `(${importedGroups.length} لوائح)` : ''}
                                    </button>
                                    <button
                                        onClick={() => { setImportedGroups([]); if (studentFileInputRef.current) studentFileInputRef.current.value = ''; }}
                                        className="px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition"
                                    >
                                        {t.cancel}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Import Physical Tests & VMA */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                            <ScaleIcon />
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.importPhysicalCard}</h2>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                            {t.importPhysicalDesc}
                        </p>

                        {!parsedPhysicalData ? (
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center bg-gray-50/50 dark:bg-gray-900/20">
                                <ArrowUpTrayIcon className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                                <input
                                    type="file"
                                    ref={physicalFileInputRef}
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handlePhysicalFileUpload}
                                    className="hidden"
                                    id="physical-excel-upload"
                                />
                                <label
                                    htmlFor="physical-excel-upload"
                                    className="cursor-pointer inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition"
                                >
                                    اختيار ملف الاختبارات و VMA
                                </label>
                            </div>
                        ) : (
                            <div className="space-y-4 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900">
                                <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                                    ✓ تم استخراج {parsedPhysicalData.results.length} تلميذ ({parsedPhysicalData.vmaCount} بقيم VMA)
                                </div>

                                <div className="space-y-2 text-xs">
                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={syncVma}
                                            onChange={(e) => setSyncVma(e.target.checked)}
                                            className="rounded text-emerald-600"
                                        />
                                        <span>مزامنة قيم VMA تلقائياً مع نتائج اختبار Luc Léger ومجموعات التحمل</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={updateStudentList}
                                            onChange={(e) => setUpdateStudentList(e.target.checked)}
                                            className="rounded text-emerald-600"
                                        />
                                        <span>تحديث لائحة تلاميذ القسم بالأسماء الجديدة المكتشفة</span>
                                    </label>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={confirmPhysicalImport}
                                        className="flex-1 py-2 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                                    >
                                        <SaveIcon className="w-4 h-4" />
                                        تأكيد وحفظ الكل
                                    </button>
                                    <button
                                        onClick={() => { setParsedPhysicalData(null); if (physicalFileInputRef.current) physicalFileInputRef.current.value = ''; }}
                                        className="px-3 py-2 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition"
                                    >
                                        {t.cancel}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Blank Templates Download */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                        <DocumentTextIcon />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.downloadTemplatesCard}</h2>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-5">
                        {t.downloadTemplatesDesc}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={async () => {
                                const students = await getStudentList(selectedClass);
                                downloadPhysicalTestsTemplate(selectedClass, students);
                            }}
                            className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition flex items-center justify-center gap-2"
                        >
                            <ArrowDownTrayIcon />
                            <span>{t.templatePhysical}</span>
                        </button>

                        <button
                            onClick={() => downloadStudentsTemplate(selectedClass)}
                            className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 transition flex items-center justify-center gap-2"
                        >
                            <ArrowDownTrayIcon />
                            <span>{t.templateStudents}</span>
                        </button>
                    </div>
                </div>

                {/* 4. Export Results */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700/60">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                        <ArrowDownTrayIcon />
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.exportResultsCard}</h2>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-5">
                        {t.exportResultsDesc}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                            onClick={handleExportLucLeger}
                            className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-700 transition flex items-center gap-2"
                        >
                            <ExcelIcon className="w-4 h-4 text-green-600" />
                            <span className="truncate">{t.exportLucLeger}</span>
                        </button>

                        <button
                            onClick={handleExportEnduranceWord}
                            className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 transition flex items-center gap-2"
                        >
                            <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                            <span className="truncate">{t.exportVmaGroupsWord}</span>
                        </button>

                        <button
                            onClick={handleExportPhysicalTests}
                            className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 transition flex items-center gap-2"
                        >
                            <ExcelIcon className="w-4 h-4 text-emerald-600" />
                            <span className="truncate">{t.exportPhysicalExcel}</span>
                        </button>

                        <button
                            onClick={handleExportMeasurements}
                            className="py-2 px-3 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-300 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-700 transition flex items-center gap-2"
                        >
                            <ScaleIcon className="w-4 h-4 text-amber-600" />
                            <span className="truncate">{t.exportMeasurementsExcel}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 5. Backup & Restore */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700/60">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <SaveIcon className="text-gray-500" />
                            <span>{t.backupRestoreCard}</span>
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t.backupRestoreDesc}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportBackup}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 transition"
                        >
                            <ArrowDownTrayIcon />
                            <span>{t.exportBackup}</span>
                        </button>

                        <input
                            type="file"
                            ref={backupInputRef}
                            accept=".json"
                            onChange={handleImportBackup}
                            className="hidden"
                            id="restore-json-upload"
                        />
                        <label
                            htmlFor="restore-json-upload"
                            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
                        >
                            <ArrowUpTrayIcon />
                            <span>{t.importBackup}</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
