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
import type { StudentIdentity, PhysicalTests, StudentResult, ArchiveRecord } from '../types';
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
    ClipboardDocumentCheckIcon,
    CloudIcon,
    CloudArrowUpIcon,
    CloudArrowDownIcon,
    ArrowPathIcon,
    ArchiveBoxIcon,
    TrashIcon
} from '../components/Icons';
import { 
    syncCloudToLocalDB, 
    syncLocalToCloudDB, 
    syncAllData, 
    fetchAllClassesFromCloud,
    saveArchiveToCloud,
    fetchArchivesFromCloud,
    deleteArchiveFromCloud,
    restoreArchive,
    exportArchiveAsFile,
    wipeAllData
} from '../utils/firebase';
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

    // Cloud database state
    const [isSyncingCloud, setIsSyncingCloud] = useState(false);
    const [cloudStatus, setCloudStatus] = useState<{ classCount: number; studentCount: number } | null>(null);

    // Archives state
    const [archives, setArchives] = useState<ArchiveRecord[]>([]);
    const [loadingArchives, setLoadingArchives] = useState(false);
    const [isCreateArchiveModalOpen, setIsCreateArchiveModalOpen] = useState(false);
    const [archiveTitle, setArchiveTitle] = useState('');
    const [archiveDescription, setArchiveDescription] = useState('');
    const [isSavingArchive, setIsSavingArchive] = useState(false);

    // Archive restore & delete state
    const [archiveToRestore, setArchiveToRestore] = useState<ArchiveRecord | null>(null);
    const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
    const [isRestoringArchive, setIsRestoringArchive] = useState(false);
    const [archiveToDelete, setArchiveToDelete] = useState<ArchiveRecord | null>(null);
    const [isDeletingArchive, setIsDeletingArchive] = useState(false);

    // Wipe all data state
    const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
    const [wipeIncludeCloud, setWipeIncludeCloud] = useState(true);
    const [wipeConfirmationInput, setWipeConfirmationInput] = useState('');
    const [isWipingData, setIsWipingData] = useState(false);

    const loadCloudStatus = async () => {
        try {
            const cloudClasses = await fetchAllClassesFromCloud();
            const totalStudents = cloudClasses.reduce((acc, c) => acc + (c.studentCount || c.students?.length || 0), 0);
            setCloudStatus({ classCount: cloudClasses.length, studentCount: totalStudents });
        } catch (e) {
            console.warn('Could not load cloud status', e);
        }
    };

    const loadArchives = async () => {
        setLoadingArchives(true);
        try {
            const list = await fetchArchivesFromCloud();
            setArchives(list);
        } catch (e) {
            console.warn('Could not load archives', e);
        } finally {
            setLoadingArchives(false);
        }
    };

    useEffect(() => {
        loadCloudStatus();
        loadArchives();
    }, []);

    const handleSyncCloudToLocal = async () => {
        setIsSyncingCloud(true);
        try {
            const res = await syncCloudToLocalDB();
            if (res.success) {
                setMessage({
                    text: `تم جلب وتحديث ${res.classCount} قسم (${res.studentCount} تلميذ) من قاعدة البيانات السحابية، وهي الآن متاحة في جهازك!`,
                    type: 'success'
                });
                await loadCloudStatus();
            } else {
                setMessage({ text: res.error || "تعذر جلب الأقسام من السحابة.", type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message || "خطأ أثناء المزامنة مع السحابة.", type: 'error' });
        } finally {
            setIsSyncingCloud(false);
        }
    };

    const handleSyncLocalToCloud = async () => {
        setIsSyncingCloud(true);
        try {
            const res = await syncLocalToCloudDB();
            if (res.success) {
                setMessage({
                    text: `تم رفع وحفظ ${res.classCount} قسم (${res.studentCount} تلميذ) بنجاح في قاعدة البيانات السحابية، وأصبحت متاحة لكافة الأساتذة!`,
                    type: 'success'
                });
                await loadCloudStatus();
            } else {
                setMessage({ text: res.error || "تعذر رفع الأقسام إلى السحابة.", type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message || "خطأ أثناء رفع الأقسام إلى السحابة.", type: 'error' });
        } finally {
            setIsSyncingCloud(false);
        }
    };

    const handleFullSync = async () => {
        setIsSyncingCloud(true);
        try {
            const res = await syncAllData();
            setMessage({
                text: res.message,
                type: res.success ? 'success' : 'error'
            });
            await loadCloudStatus();
            await loadArchives();
        } catch (err: any) {
            setMessage({ text: err.message || "خطأ أثناء المزامنة الشاملة.", type: 'error' });
        } finally {
            setIsSyncingCloud(false);
        }
    };

    const handleOpenCreateArchiveModal = () => {
        const curYear = new Date().getFullYear();
        setArchiveTitle(`الموسم الدراسي ${curYear - 1}/${curYear}`);
        setArchiveDescription('');
        setIsCreateArchiveModalOpen(true);
    };

    const handleCreateArchive = async () => {
        if (!archiveTitle.trim()) {
            setMessage({ text: 'يرجى إدخال اسم أو عنوان للأرشيف.', type: 'error' });
            return;
        }
        setIsSavingArchive(true);
        try {
            const res = await saveArchiveToCloud(archiveTitle, archiveDescription);
            if (res.success && res.archive) {
                setMessage({ 
                    text: `تم حفظ الأرشيف «${res.archive.title}» بنجاح في قاعدة البيانات السحابية (${res.archive.classCount} قسم، ${res.archive.studentCount} تلميذ)!`, 
                    type: 'success' 
                });
                setIsCreateArchiveModalOpen(false);
                setArchiveTitle('');
                setArchiveDescription('');
                await loadArchives();
            } else {
                setMessage({ text: res.error || 'تعذر حفظ الأرشيف.', type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message || 'خطأ أثناء حفظ الأرشيف.', type: 'error' });
        } finally {
            setIsSavingArchive(false);
        }
    };

    const handleConfirmRestore = async () => {
        if (!archiveToRestore) return;
        setIsRestoringArchive(true);
        try {
            const res = await restoreArchive(archiveToRestore, restoreMode);
            if (res.success) {
                setMessage({ text: res.message || 'تم استرجاع الأرشيف بنجاح!', type: 'success' });
                setArchiveToRestore(null);
                await loadCloudStatus();
            } else {
                setMessage({ text: res.error || 'تعذر استرجاع الأرشيف.', type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message || 'خطأ أثناء استرجاع الأرشيف.', type: 'error' });
        } finally {
            setIsRestoringArchive(false);
        }
    };

    const handleConfirmDeleteArchive = async () => {
        if (!archiveToDelete) return;
        setIsDeletingArchive(true);
        try {
            const res = await deleteArchiveFromCloud(archiveToDelete.id);
            if (res.success) {
                setMessage({ text: `تم حذف الأرشيف «${archiveToDelete.title}» بنجاح.`, type: 'success' });
                setArchiveToDelete(null);
                await loadArchives();
            } else {
                setMessage({ text: res.error || 'تعذر حذف الأرشيف.', type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message || 'خطأ أثناء حذف الأرشيف.', type: 'error' });
        } finally {
            setIsDeletingArchive(false);
        }
    };

    const handleConfirmWipe = async () => {
        setIsWipingData(true);
        try {
            const res = await wipeAllData({ wipeCloud: wipeIncludeCloud });
            if (res.success) {
                setMessage({ 
                    text: wipeIncludeCloud 
                        ? 'تم مسح جميع البيانات واللوائح بنجاح من جهازك ومن قاعدة البيانات السحابية (Firebase).'
                        : 'تم مسح جميع البيانات واللوائح المحلية من هذا الجهاز بنجاح.', 
                    type: 'success' 
                });
                setIsWipeModalOpen(false);
                setWipeConfirmationInput('');
                await loadCloudStatus();
            } else {
                setMessage({ text: res.error || 'تعذر مسح البيانات.', type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message || 'خطأ أثناء مسح البيانات.', type: 'error' });
        } finally {
            setIsWipingData(false);
        }
    };

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
                setMessage({ text: `تم اكتشاف ${allGroups.length} أقسام (${totalStudents} تلميذ). يرجى التأكيد للحفظ في قاعدة البيانات.`, type: 'success' });
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

            const total = importedGroups.reduce((acc, g) => acc + g.students.length, 0);
            setMessage({ 
                text: `تم استيراد وحفظ ${importedGroups.length} لوائح (${total} تلميذ) بنجاح في قاعدة البيانات السحابية (Firestore)، وهي متاحة الآن لجميع الأساتذة!`, 
                type: 'success' 
            });
            window.dispatchEvent(new CustomEvent('dbUpdated'));
            setImportedGroups([]);
            if (studentFileInputRef.current) studentFileInputRef.current.value = '';
            loadCloudStatus();
        } catch (err) {
            setMessage({ text: "خطأ أثناء حفظ لوائح التلاميذ في قاعدة البيانات.", type: 'error' });
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

            {/* Cloud Database Sync Card for Teachers */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-indigo-950 rounded-2xl shadow-xl p-6 text-white border border-indigo-700/50">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-white/10 text-white backdrop-blur-xs">
                                <CloudIcon className="w-6 h-6" />
                            </span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black text-white">
                                        قاعدة البيانات السحابية المشتركة (Firebase Firestore)
                                    </h2>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        <span>مزامنة سحابية نشطة</span>
                                    </span>
                                </div>
                                <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                                    جميع لوائح التلاميذ التي يتم استيرادها تُحفظ تلقائياً في السحابة لتكون متاحة لجميع الأساتذة عبر كافة الأجهزة والهواتف. يمكنك أيضاً جلب أي لوائح تم استيرادها من قبل زملاء آخرين بضغطة واحدة.
                                </p>
                            </div>
                        </div>

                        {cloudStatus && (
                            <div className="flex items-center gap-4 text-xs font-bold text-indigo-200 pt-1">
                                <span>المخزون السحابي المتاح لجميع الأساتذة:</span>
                                <span className="bg-white/10 px-2 py-0.5 rounded-md text-white font-mono">
                                    {cloudStatus.classCount} أقسام
                                </span>
                                <span className="bg-white/10 px-2 py-0.5 rounded-md text-white font-mono">
                                    {cloudStatus.studentCount} تلميذ
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleSyncCloudToLocal}
                            disabled={isSyncingCloud}
                            className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/20 disabled:opacity-50"
                            title="تحميل لوائح التلاميذ المخزنة في السحابة التي استوردها الأساتذة"
                        >
                            <CloudArrowDownIcon className="w-4 h-4 text-emerald-300" />
                            <span>جلب من السحابة</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSyncLocalToCloud}
                            disabled={isSyncingCloud}
                            className="px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 border border-indigo-400/30 disabled:opacity-50"
                            title="رفع جميع لوائح التلاميذ الحالية إلى قاعدة البيانات السحابية"
                        >
                            <CloudArrowUpIcon className="w-4 h-4" />
                            <span>حفظ بالسحابة</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenCreateArchiveModal}
                            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 border border-amber-400/30"
                            title="حفظ لقطة كاملة من جميع الأقسام والنتائج في الأرشيف السحابي"
                        >
                            <ArchiveBoxIcon className="w-4 h-4" />
                            <span>حفظ بالأرشيف</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setWipeConfirmationInput('');
                                setWipeIncludeCloud(true);
                                setIsWipeModalOpen(true);
                            }}
                            className="px-3 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 border border-rose-400/40"
                            title="مسح جميع البيانات واللوائح من الجهاز ومن قاعدة البيانات السحابية"
                        >
                            <TrashIcon className="w-4 h-4" />
                            <span>مسح البيانات</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleFullSync}
                            disabled={isSyncingCloud}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition border border-white/15 disabled:opacity-50"
                            title="تحيين ومزامنة شاملة فورية"
                        >
                            <div className={isSyncingCloud ? 'animate-spin' : ''}>
                                <ArrowPathIcon />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Cloud Archives Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                            <ArchiveBoxIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                                    أرشيف المواسم الدراسية والبيانات السحابية
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                                    {archives.length} أرشيف محفوظ
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                يمكنك حفظ لقطات أرشيفية لكل موسم دراسي أو دورة، واسترجاعها أو تحميلها في أي وقت دون المساس بالبيانات الحالية.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={loadArchives}
                            disabled={loadingArchives}
                            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            title="تحديث قائمة الأرشيفات"
                        >
                            <div className={loadingArchives ? 'animate-spin' : ''}>
                                <ArrowPathIcon />
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenCreateArchiveModal}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition"
                        >
                            <ArchiveBoxIcon className="w-4 h-4" />
                            <span>حفظ أرشيف جديد الآن</span>
                        </button>
                    </div>
                </div>

                {/* Archives List */}
                {loadingArchives ? (
                    <div className="py-8 text-center text-xs font-bold text-gray-400">
                        جاري تحميل الأرشيفات من السحابة...
                    </div>
                ) : archives.length === 0 ? (
                    <div className="py-8 px-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl space-y-2 bg-gray-50/50 dark:bg-gray-900/20">
                        <ArchiveBoxIcon className="w-10 h-10 mx-auto text-gray-400" />
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">لا يوجد أي أرشيف محفوظ حالياً</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            عند انتهاء موسم دراسي أو عند الرغبة في تفريغ قاعدة البيانات للموسم الجديد، اضغط على "حفظ أرشيف جديد" لتخزين لقطة كاملة لجميع الأقسام والاختبارات بأمان في السحابة.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        {archives.map((arch) => (
                            <div key={arch.id} className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/30 dark:bg-gray-850 shadow-xs flex flex-col justify-between space-y-3">
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-black text-sm text-gray-900 dark:text-white line-clamp-1">
                                            {arch.title}
                                        </h3>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold shrink-0">
                                            {arch.createdAt ? new Date(arch.createdAt).toLocaleDateString('ar-MA') : ''}
                                        </span>
                                    </div>
                                    {arch.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {arch.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pt-2 font-medium">
                                        <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                            🏫 {arch.classCount} أقسام
                                        </span>
                                        <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                            👥 {arch.studentCount} تلميذ
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 border-t border-amber-100 dark:border-gray-700 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setArchiveToRestore(arch);
                                            setRestoreMode('replace');
                                        }}
                                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                                        title="استرجاع هذا الأرشيف إلى قاعدة البيانات النشطة"
                                    >
                                        <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                                        <span>استرجاع</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => exportArchiveAsFile(arch)}
                                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                        title="تحميل كملف JSON احتياطي"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4 text-indigo-600" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setArchiveToDelete(arch)}
                                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                        title="حذف هذا الأرشيف"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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

            {/* MODAL: Create Archive */}
            {isCreateArchiveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                                <ArchiveBoxIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white">
                                    حفظ لقطة في الأرشيف السحابي
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    سيتم تخزين كافة لوائح الأقسام، القياسات، ونتائج VMA كأرشيف تاريخي دائم.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    عنوان أو اسم الأرشيف *
                                </label>
                                <input
                                    type="text"
                                    value={archiveTitle}
                                    onChange={(e) => setArchiveTitle(e.target.value)}
                                    placeholder="مثال: الموسم الدراسي 2024 - 2025"
                                    className="w-full px-3 py-2 text-sm font-bold border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    ملاحظات أو وصف (اختياري)
                                </label>
                                <textarea
                                    value={archiveDescription}
                                    onChange={(e) => setArchiveDescription(e.target.value)}
                                    rows={2}
                                    placeholder="مثال: نتائج الأسدوس الأول لجميع مستويات الإعدادي"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setIsCreateArchiveModalOpen(false)}
                                disabled={isSavingArchive}
                                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateArchive}
                                disabled={isSavingArchive}
                                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition flex items-center gap-2"
                            >
                                {isSavingArchive && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                <span>تأكيد الحفظ في الأرشيف</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Restore Archive */}
            {archiveToRestore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-fadeIn">
                        <div className="flex items-center gap-3 text-emerald-600">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 rounded-xl">
                                <ArrowUpTrayIcon />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white">
                                    استرجاع الأرشيف «{archiveToRestore.title}»
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    يتضمن {archiveToRestore.classCount} قسم و {archiveToRestore.studentCount} تلميذ.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                طريقة الاسترجاع:
                            </label>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setRestoreMode('replace')}
                                    className={`p-3 rounded-xl border text-right transition ${
                                        restoreMode === 'replace'
                                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-800 dark:text-emerald-300'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-600'
                                    }`}
                                >
                                    <div className="font-black mb-0.5">استبدال البيانات الحالية</div>
                                    <div className="text-[11px] opacity-75">مسح الأقسام النشطة وتعيين الأرشيف مكانها تماماً</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRestoreMode('merge')}
                                    className={`p-3 rounded-xl border text-right transition ${
                                        restoreMode === 'merge'
                                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-800 dark:text-emerald-300'
                                            : 'border-gray-200 dark:border-gray-700 text-gray-600'
                                    }`}
                                >
                                    <div className="font-black mb-0.5">دمج مع الأقسام الحالية</div>
                                    <div className="text-[11px] opacity-75">إضافة أقسام الأرشيف إلى جانب الأقسام الموجودة</div>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setArchiveToRestore(null)}
                                disabled={isRestoringArchive}
                                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRestore}
                                disabled={isRestoringArchive}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
                            >
                                {isRestoringArchive && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                <span>تأكيد الاسترجاع</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Delete Archive */}
            {archiveToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-fadeIn">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="p-3 bg-rose-100 dark:bg-rose-950 rounded-xl">
                                <TrashIcon />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white">
                                    حذف الأرشيف «{archiveToDelete.title}»
                                </h3>
                                <p className="text-xs text-rose-600 dark:text-rose-400">
                                    سيتم حذف هذا الأرشيف نهائياً من السحابة.
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                            هل أنت متأكد من رغبتك في حذف هذا الأرشيف؟ لا يؤثر حذف الأرشيف على الأقسام النشطة حالياً.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setArchiveToDelete(null)}
                                disabled={isDeletingArchive}
                                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteArchive}
                                disabled={isDeletingArchive}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-2"
                            >
                                {isDeletingArchive && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                <span>نعم، حذف الأرشيف</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Wipe All Data */}
            {isWipeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-rose-200 dark:border-rose-900 space-y-4 animate-fadeIn">
                        <div className="flex items-start gap-3 text-rose-600">
                            <div className="p-3 bg-rose-100 dark:bg-rose-950 rounded-xl shrink-0">
                                <TrashIcon />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                    مسح جميع البيانات واللوائح (إعادة الضبط)
                                </h3>
                                <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                                    تحذير: هذا الإجراء سيقوم بحذف كافة لوائح الأقسام والتلاميذ وجميع نتائج الاختبارات والقياسات!
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                            <span className="text-base">💡</span>
                            <span>
                                <strong>نصيحة هامة:</strong> إذا كنت تريد إنهاء الموسم الدراسي والبدء من جديد، نوصي أولاً بالضغط على <strong>"حفظ في الأرشيف"</strong> لتخزين نسخة من نتائج الموسم الحالي قبل المسح.
                            </span>
                        </div>

                        <div className="space-y-3 pt-1">
                            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={wipeIncludeCloud}
                                    onChange={(e) => setWipeIncludeCloud(e.target.checked)}
                                    className="rounded text-rose-600 w-4 h-4"
                                />
                                <div className="text-xs">
                                    <div className="font-black text-gray-900 dark:text-white">
                                        مسح البيانات أيضاً من قاعدة البيانات السحابية المشتركة (Firebase Firestore)
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400 text-[11px]">
                                        عند تفعيل هذا الخيار، سيتم مسح اللوائح من السحابة ولن تظهر لدى أي أستاذ آخر.
                                    </div>
                                </div>
                            </label>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    لتأكيد العملية، يرجى كتابة كلمة <span className="font-mono text-rose-600 font-black">مسح</span> أدناه:
                                </label>
                                <input
                                    type="text"
                                    value={wipeConfirmationInput}
                                    onChange={(e) => setWipeConfirmationInput(e.target.value)}
                                    placeholder="اكتب: مسح"
                                    className="w-full px-3 py-2 text-sm font-bold border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setIsWipeModalOpen(false)}
                                disabled={isWipingData}
                                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmWipe}
                                disabled={isWipingData || wipeConfirmationInput.trim() !== 'مسح'}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-2"
                            >
                                {isWipingData && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                <span>تأكيد مسح كافة البيانات</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
