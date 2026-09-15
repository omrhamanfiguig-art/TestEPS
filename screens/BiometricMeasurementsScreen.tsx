import React, { useState, useEffect, useMemo } from 'react';
import { getStudentList, getPhysicalTests, savePhysicalTests, getAllClasses, ClassStats } from '../utils/db';
import type { StudentIdentity, PhysicalTests } from '../types';
import { 
    SaveIcon, 
    ArrowDownTrayIcon, 
    RulerIcon, 
    ScaleIcon, 
    HeartIcon, 
    ListBulletIcon, 
    InformationCircleIcon, 
    XMarkIcon,
    PencilSquareIcon,
    ChevronDownIcon
} from '../components/Icons';
import { StudentDataModal } from '../components/StudentDataModal';
import { useLanguage } from '../utils/i18n';

interface BiometricMeasurementsScreenProps {
    selectedClass: string;
    setSelectedClass: (className: string) => void;
    sessionDate: string;
}

// Calculate Body Mass Index (IMC/BMI) = weight (kg) / (height in m)^2
export const calculateBMI = (weightKg?: number, heightCm?: number): number | null => {
    if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return Number(bmi.toFixed(1));
};

export const getBMICategory = (bmi: number | null, t: any) => {
    if (bmi === null) return { label: '-', color: 'text-gray-400 bg-gray-100 dark:bg-gray-800' };
    if (bmi < 18.5) return { label: t.bmiUnderweight, color: 'text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300' };
    if (bmi < 25) return { label: t.bmiNormal, color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300' };
    if (bmi < 30) return { label: t.bmiOverweight, color: 'text-orange-700 bg-orange-100 dark:bg-orange-950/60 dark:text-orange-300' };
    return { label: t.bmiObese, color: 'text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300' };
};

export const BiometricMeasurementsScreen: React.FC<BiometricMeasurementsScreenProps> = ({
    selectedClass,
    setSelectedClass,
    sessionDate
}) => {
    const { t, language } = useLanguage();
    const [classList, setClassList] = useState<ClassStats[]>([]);
    const [studentList, setStudentList] = useState<StudentIdentity[]>([]);
    const [testsData, setTestsData] = useState<PhysicalTests[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentIdentity | null>(null);
    const [filterQuery, setFilterQuery] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [modalStudentNumber, setModalStudentNumber] = useState<string | null>(null);

    // Form data for individual card mode
    const [formData, setFormData] = useState<{
        taille?: number;
        poids?: number;
        frequenceCardiaque?: number;
    }>({});

    const loadClassData = (className: string) => {
        getAllClasses().then(cls => setClassList(cls));
        if (!className) return;

        getStudentList(className).then(list => {
            const normalized = list.map(s => ({
                ...s,
                numeroEleve: String(s.numeroEleve)
            }));
            setStudentList(normalized);
            if (normalized.length > 0 && !selectedStudent) {
                setSelectedStudent(normalized[0]);
            }
        });

        getPhysicalTests(className).then(res => {
            setTestsData(res || []);
        });
    };

    // Load data
    useEffect(() => {
        loadClassData(selectedClass);
        const handleDbUpdate = () => loadClassData(selectedClass);
        window.addEventListener('dbUpdated', handleDbUpdate);
        return () => window.removeEventListener('dbUpdated', handleDbUpdate);
    }, [selectedClass]);

    // When selected student changes in card mode
    useEffect(() => {
        if (!selectedStudent) {
            setFormData({});
            return;
        }
        const record = testsData.find(r => r.numeroEleve === selectedStudent.numeroEleve);
        setFormData({
            taille: record?.taille,
            poids: record?.poids,
            frequenceCardiaque: record?.frequenceCardiaque
        });
    }, [selectedStudent, testsData]);

    // Handle inline table editing
    const handleTableValueChange = (studentId: string, field: 'taille' | 'poids' | 'frequenceCardiaque', value: string) => {
        const numVal = value === '' ? undefined : parseFloat(value);
        setTestsData(prev => {
            const student = studentList.find(s => s.numeroEleve === studentId);
            const index = prev.findIndex(item => item.numeroEleve === studentId);
            const updatedItem: PhysicalTests = index >= 0 
                ? { ...prev[index], [field]: numVal }
                : {
                    numeroEleve: studentId,
                    nomEleve: student?.nomEleve,
                    sexe: student?.sexe,
                    [field]: numVal,
                    date: sessionDate || new Date().toISOString()
                };

            if (index >= 0) {
                const next = [...prev];
                next[index] = updatedItem;
                return next;
            } else {
                return [...prev, updatedItem];
            }
        });
    };

    // Save all table changes
    const handleSaveAll = async () => {
        try {
            await savePhysicalTests(selectedClass, testsData);
            window.dispatchEvent(new CustomEvent('dbUpdated'));
            setNotification({
                message: `${t.success} : تم حفظ قياسات القسم بنجاح.`,
                type: 'success'
            });
        } catch (err: any) {
            setNotification({
                message: err.message || t.error,
                type: 'error'
            });
        }
    };

    // Save individual student card
    const handleSaveIndividual = async () => {
        if (!selectedStudent) return;
        const index = testsData.findIndex(r => r.numeroEleve === selectedStudent.numeroEleve);
        const updatedItem: PhysicalTests = index >= 0 
            ? { ...testsData[index], ...formData, nomEleve: selectedStudent.nomEleve, sexe: selectedStudent.sexe }
            : {
                numeroEleve: selectedStudent.numeroEleve,
                nomEleve: selectedStudent.nomEleve,
                sexe: selectedStudent.sexe,
                ...formData,
                date: sessionDate || new Date().toISOString()
            };

        let nextList = [...testsData];
        if (index >= 0) {
            nextList[index] = updatedItem;
        } else {
            nextList.push(updatedItem);
        }

        setTestsData(nextList);
        await savePhysicalTests(selectedClass, nextList);
        setNotification({
            message: `${t.success}: تم حفظ قياسات ${selectedStudent.nomEleve}.`,
            type: 'success'
        });
    };

    // Export measurements to Excel
    const handleExportMeasurements = () => {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
            setNotification({ message: "مكتبة Excel غير متوفرة.", type: 'error' });
            return;
        }

        const rows = studentList.map(student => {
            const data = testsData.find(d => d.numeroEleve === student.numeroEleve);
            const bmi = calculateBMI(data?.poids, data?.taille);
            const cat = getBMICategory(bmi, t);

            return {
                "الرقم": student.numeroEleve,
                "الاسم والنسب": student.nomEleve,
                "الجنس": student.sexe === 'F' ? 'أنثى' : student.sexe === 'M' ? 'ذكر' : '',
                "الطول (سم)": data?.taille ?? '',
                "الوزن (كغ)": data?.poids ?? '',
                "مؤشر كتلة الجسم (IMC)": bmi ?? '',
                "الحالة": cat.label !== '-' ? cat.label : '',
                "النبض (bpm)": data?.frequenceCardiaque ?? '',
                "التاريخ": data?.date ? new Date(data.date).toLocaleDateString() : ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "القياسات البيومترية");
        XLSX.writeFile(wb, `القياسات_البيومترية_${selectedClass.replace(/\s+/g, '_')}.xlsx`);
    };

    // Stats calculations
    const validHeights = testsData.map(d => d.taille).filter((v): v is number => typeof v === 'number' && v > 0);
    const validWeights = testsData.map(d => d.poids).filter((v): v is number => typeof v === 'number' && v > 0);
    const validHeartRates = testsData.map(d => d.frequenceCardiaque).filter((v): v is number => typeof v === 'number' && v > 0);

    const bmis = testsData.map(d => calculateBMI(d.poids, d.taille)).filter((b): b is number => b !== null);

    const avgHeight = validHeights.length ? (validHeights.reduce((a, b) => a + b, 0) / validHeights.length).toFixed(1) : '-';
    const avgWeight = validWeights.length ? (validWeights.reduce((a, b) => a + b, 0) / validWeights.length).toFixed(1) : '-';
    const avgHR = validHeartRates.length ? Math.round(validHeartRates.reduce((a, b) => a + b, 0) / validHeartRates.length) : '-';
    const avgBMI = bmis.length ? (bmis.reduce((a, b) => a + b, 0) / bmis.length).toFixed(1) : '-';

    const filteredStudents = useMemo(() => {
        return studentList.map((s, idx) => ({
            ...s,
            orderIndex: idx + 1
        })).filter(s => {
            if (!filterQuery) return true;
            const q = filterQuery.trim().toLowerCase();
            const matchesOrder = String(s.orderIndex) === q || String(s.orderIndex).startsWith(q);
            const matchesName = (s.nomEleve || '').toLowerCase().includes(q);
            const matchesMassar = s.numeroEleve.toLowerCase().includes(q);
            return matchesOrder || matchesName || matchesMassar;
        });
    }, [studentList, filterQuery]);

    const activeRecord = selectedStudent ? testsData.find(r => r.numeroEleve === selectedStudent.numeroEleve) : null;
    const currentBMI = calculateBMI(formData.poids, formData.taille);
    const currentCategory = getBMICategory(currentBMI, t);

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
            {/* Notification */}
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

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <ScaleIcon />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.measurementsTitle}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.measurementsSubtitle}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div>
                        <div className="relative">
                            <select
                                id="measurements-class-select"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="appearance-none w-full sm:w-48 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 pe-8 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
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

                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                                viewMode === 'table' ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            <ListBulletIcon />
                            <span>{t.quickTableMode}</span>
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                                viewMode === 'cards' ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            <RulerIcon />
                            <span>{t.individualMode}</span>
                        </button>
                    </div>

                    {viewMode === 'table' && (
                        <button
                            onClick={handleSaveAll}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 transition"
                        >
                            <SaveIcon />
                            <span>{t.save}</span>
                        </button>
                    )}

                    <button
                        onClick={handleExportMeasurements}
                        disabled={studentList.length === 0}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition"
                    >
                        <ArrowDownTrayIcon />
                        <span>{t.export}</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center font-bold">
                        <RulerIcon />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t.avgHeight}</div>
                        <div className="text-lg font-black text-gray-800 dark:text-gray-100">{avgHeight} <span className="text-xs font-normal">{t.heightUnit}</span></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center font-bold">
                        <ScaleIcon />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t.avgWeight}</div>
                        <div className="text-lg font-black text-gray-800 dark:text-gray-100">{avgWeight} <span className="text-xs font-normal">{t.weightUnit}</span></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center font-bold">
                        <HeartIcon />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t.avgHeartRate}</div>
                        <div className="text-lg font-black text-gray-800 dark:text-gray-100">{avgHR} <span className="text-xs font-normal">{t.heartRateUnit}</span></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/60 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center font-bold">
                        IMC
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t.avgBmi}</div>
                        <div className="text-lg font-black text-gray-800 dark:text-gray-100">{avgBMI}</div>
                    </div>
                </div>
            </div>

            {/* Mode 1: Quick Table Mode */}
            {viewMode === 'table' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <span>{t.quickTableMode}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                                {studentList.length} {t.student}
                            </span>
                        </h2>

                        <div className="w-full sm:w-64">
                            <input
                                type="text"
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                placeholder={t.searchPlaceholder}
                                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[880px] text-sm text-right border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 text-xs">
                                    <th className="py-3 px-3 font-semibold text-center w-14"># الترتيب</th>
                                    <th className="py-3 px-3 font-semibold min-w-[150px]">{t.studentName}</th>
                                    <th className="py-3 px-2 font-semibold text-center w-16">{t.gender}</th>
                                    <th className="py-3 px-3 font-semibold text-center min-w-[90px]">{t.height} ({t.heightUnit})</th>
                                    <th className="py-3 px-3 font-semibold text-center min-w-[90px]">{t.weight} ({t.weightUnit})</th>
                                    <th className="py-3 px-3 font-semibold text-center min-w-[80px]">{t.bmi}</th>
                                    <th className="py-3 px-3 font-semibold text-center min-w-[100px]">{t.bmiCategory}</th>
                                    <th className="py-3 px-3 font-semibold text-center min-w-[90px]">{t.heartRate} ({t.heartRateUnit})</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {filteredStudents.map(student => {
                                    const record = testsData.find(d => d.numeroEleve === student.numeroEleve);
                                    const bmi = calculateBMI(record?.poids, record?.taille);
                                    const category = getBMICategory(bmi, t);

                                    return (
                                        <tr key={student.numeroEleve} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="py-2.5 px-3 text-center">
                                                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black text-xs border border-emerald-200/60 dark:border-emerald-800/60">
                                                    {student.orderIndex}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 font-bold text-gray-800 dark:text-gray-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setModalStudentNumber(student.numeroEleve)}
                                                    className="text-right hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1.5 group/name"
                                                    title="انقر لفتح نافذة بيانات التلميذ وتعديلها بسهولة"
                                                >
                                                    <span className="group-hover/name:underline">{student.nomEleve}</span>
                                                    <PencilSquareIcon className="w-3.5 h-3.5 text-emerald-600 opacity-40 group-hover/name:opacity-100 transition-opacity" />
                                                </button>
                                            </td>
                                            <td className="py-2.5 px-2 text-center">
                                                {student.sexe && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                                        student.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                    }`}>
                                                        {student.sexe === 'F' ? t.female : t.male}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Height Input */}
                                            <td className="py-2 px-2 text-center">
                                                <input
                                                    type="number"
                                                    min="80"
                                                    max="230"
                                                    step="1"
                                                    placeholder=""
                                                    value={record?.taille ?? ''}
                                                    onChange={(e) => handleTableValueChange(student.numeroEleve, 'taille', e.target.value)}
                                                    className="w-20 text-center font-bold px-2 py-1 text-xs rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                />
                                            </td>

                                            {/* Weight Input */}
                                            <td className="py-2 px-2 text-center">
                                                <input
                                                    type="number"
                                                    min="20"
                                                    max="160"
                                                    step="0.5"
                                                    placeholder=""
                                                    value={record?.poids ?? ''}
                                                    onChange={(e) => handleTableValueChange(student.numeroEleve, 'poids', e.target.value)}
                                                    className="w-20 text-center font-bold px-2 py-1 text-xs rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                />
                                            </td>

                                            {/* BMI Real-Time Display */}
                                            <td className="py-2.5 px-3 text-center font-black text-sm text-gray-800 dark:text-gray-200">
                                                {bmi !== null ? bmi : '-'}
                                            </td>

                                            {/* BMI Category Badge */}
                                            <td className="py-2.5 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${category.color}`}>
                                                    {category.label}
                                                </span>
                                            </td>

                                            {/* Heart Rate Input */}
                                            <td className="py-2 px-2 text-center">
                                                <input
                                                    type="number"
                                                    min="40"
                                                    max="220"
                                                    step="1"
                                                    placeholder=""
                                                    value={record?.frequenceCardiaque ?? ''}
                                                    onChange={(e) => handleTableValueChange(student.numeroEleve, 'frequenceCardiaque', e.target.value)}
                                                    className="w-20 text-center font-bold px-2 py-1 text-xs rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-rose-500 text-rose-600 dark:text-rose-400"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {filteredStudents.length === 0 && (
                            <div className="text-center py-10 text-gray-500 text-sm">
                                {t.emptyStudentsNotice}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mode 2: Individual Card Mode */}
            {viewMode === 'cards' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Student Selector List */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 h-[550px] flex flex-col">
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                            {t.studentsList} ({filteredStudents.length})
                        </h2>

                        <div className="mb-3">
                            <input
                                type="text"
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                placeholder={t.searchPlaceholder}
                                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                            {filteredStudents.map(student => {
                                const isSelected = selectedStudent?.numeroEleve === student.numeroEleve;
                                const rec = testsData.find(d => d.numeroEleve === student.numeroEleve);
                                const bmi = calculateBMI(rec?.poids, rec?.taille);

                                return (
                                    <button
                                        key={student.numeroEleve}
                                        onClick={() => {
                                            setSelectedStudent(student);
                                            setModalStudentNumber(student.numeroEleve);
                                        }}
                                        className={`w-full text-right p-3 rounded-xl border transition-all flex justify-between items-center group/card ${
                                            isSelected 
                                                ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-500 shadow-sm' 
                                                : 'bg-gray-50/70 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <div className="truncate pr-1">
                                            <div className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">
                                                {student.nomEleve}
                                            </div>
                                        </div>

                                        {bmi !== null && (
                                            <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                IMC {bmi}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Individual Details Form */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col justify-between">
                        {selectedStudent ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
                                    <div>
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer group/title"
                                            onClick={() => setModalStudentNumber(selectedStudent.numeroEleve)}
                                            title="انقر لفتح نافذة بيانات التلميذ وتعديلها بسهولة"
                                        >
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white group-hover/title:text-emerald-600 dark:group-hover/title:text-emerald-400 group-hover/title:underline">
                                                {selectedStudent.nomEleve}
                                            </h2>
                                            <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 group-hover/title:bg-emerald-100 dark:group-hover/title:bg-emerald-900 transition">
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {t.gender}: <strong>{selectedStudent.sexe === 'F' ? t.female : selectedStudent.sexe === 'M' ? t.male : t.unspecified}</strong>
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleSaveIndividual}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition"
                                    >
                                        <SaveIcon />
                                        <span>{t.save}</span>
                                    </button>
                                </div>

                                {/* BMI Gauge Card */}
                                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                                            {t.bmi}
                                        </div>
                                        <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                                            {currentBMI !== null ? currentBMI : '--'}
                                        </div>
                                        <div className="mt-1">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${currentCategory.color}`}>
                                                {currentCategory.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 bg-white/70 dark:bg-gray-800/70 p-3 rounded-xl border border-emerald-100 dark:border-gray-700">
                                        <div>• <strong>نقص وزن:</strong> أقل من 18.5</div>
                                        <div>• <strong>وزن طبيعي:</strong> بين 18.5 و 24.9</div>
                                        <div>• <strong>زيادة في الوزن:</strong> بين 25 و 29.9</div>
                                        <div>• <strong>سمنة:</strong> 30 فما فوق</div>
                                    </div>
                                </div>

                                {/* Inputs Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    {/* Height */}
                                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                                            <RulerIcon />
                                            <label className="text-sm font-bold">{t.height}</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="80"
                                                max="230"
                                                step="1"
                                                value={formData.taille ?? ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, taille: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                                                placeholder=""
                                                className="w-full text-xl font-bold py-2 px-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-center"
                                            />
                                            <span className="text-xs font-semibold text-gray-500">{t.heightUnit}</span>
                                        </div>
                                    </div>

                                    {/* Weight */}
                                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400">
                                            <ScaleIcon />
                                            <label className="text-sm font-bold">{t.weight}</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="20"
                                                max="160"
                                                step="0.5"
                                                value={formData.poids ?? ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, poids: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                                                placeholder=""
                                                className="w-full text-xl font-bold py-2 px-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-center"
                                            />
                                            <span className="text-xs font-semibold text-gray-500">{t.weightUnit}</span>
                                        </div>
                                    </div>

                                    {/* Heart Rate */}
                                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-2 text-rose-600 dark:text-rose-400">
                                            <HeartIcon />
                                            <label className="text-sm font-bold">{t.heartRate}</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="40"
                                                max="220"
                                                step="1"
                                                value={formData.frequenceCardiaque ?? ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, frequenceCardiaque: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                                                placeholder=""
                                                className="w-full text-xl font-bold py-2 px-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-center text-rose-600"
                                            />
                                            <span className="text-xs font-semibold text-gray-500">{t.heartRateUnit}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-400">
                                يرجى اختيار تلميذ من القائمة
                            </div>
                        )}
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
                />
            )}
        </div>
    );
};
