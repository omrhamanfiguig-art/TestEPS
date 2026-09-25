import React, { useState, useEffect, useMemo } from 'react';
import { 
  AcademicCapIcon, 
  UsersIcon, 
  ArrowPathIcon, 
  MagnifyingGlassIcon, 
  TrashIcon, 
  EyeIcon, 
  CheckIcon, 
  XMarkIcon, 
  RunningManIcon, 
  ScaleIcon, 
  RulerIcon, 
  ArrowUpTrayIcon,
  PencilSquareIcon,
  ExcelIcon,
  ArrowDownTrayIcon,
  UserPlusIcon
} from '../components/Icons';
import { StudentDataModal } from '../components/StudentDataModal';
import { AddEditStudentModal } from '../components/AddEditStudentModal';
import { StudentAvatar } from '../components/StudentAvatar';
import { useLanguage } from '../utils/i18n';
import { 
  getAllClasses, 
  ClassStats, 
  deleteClass, 
  getStudentList, 
  getPhysicalTests, 
  getVmaResults,
  saveStudentList,
  deleteStudentFromClass,
  searchStudentsGlobal,
  GlobalStudentSearchResult,
  normalizeArabicText
} from '../utils/db';
import {
  exportClassPhysicalTestsToExcel,
  exportClassMeasurementsToExcel,
  exportClassVmaResultsToExcel,
  parseStudentExcel,
  downloadStudentsTemplate
} from '../utils/excelHelper';
import type { StudentIdentity, PhysicalTests, StudentResult } from '../types';
import type { ActiveScreen } from '../components/Sidebar';

interface ClassesScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
  onNavigateToScreen: (screen: ActiveScreen) => void;
}

interface StudentStatusRow {
  student: StudentIdentity;
  physicalTest?: PhysicalTests;
  vmaResult?: StudentResult;
  isPhysicalDone: boolean;
  isVmaDone: boolean;
  isMeasurementsDone: boolean;
}

export const ClassesScreen: React.FC<ClassesScreenProps> = ({
  selectedClass,
  setSelectedClass,
  onNavigateToScreen,
}) => {
  const { language, t, isRtl } = useLanguage();
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'tested' | 'untested'>('all');

  // Modal for Viewing Student Roster
  const [rosterClass, setRosterClass] = useState<string | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterStudents, setRosterStudents] = useState<StudentStatusRow[]>([]);
  const [rosterSearch, setRosterSearch] = useState('');

  // Search Mode & Global Student Search
  const [searchMode, setSearchMode] = useState<'classes' | 'students'>('classes');
  const [globalStudents, setGlobalStudents] = useState<GlobalStudentSearchResult[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  // Add / Edit Student Modal
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<StudentIdentity | null>(null);
  const [addEditClass, setAddEditClass] = useState<string>('');

  // Delete Student Confirmation
  const [studentToDelete, setStudentToDelete] = useState<{ student: StudentIdentity; className: string } | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  // Delete Confirmation Modal
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalStudentNumber, setModalStudentNumber] = useState<string | null>(null);

  const fetchClassesData = async () => {
    setLoading(true);
    try {
      const data = await getAllClasses();
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassesData();
    window.addEventListener('dbUpdated', fetchClassesData);
    return () => window.removeEventListener('dbUpdated', fetchClassesData);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Direct Multi-Class and Multi-File Student Roster Import (Excel)
  const handleImportStudentExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      showToast(language === 'ar' ? 'جاري قراءة واستيراد الأقسام...' : 'Lecture et importation des classes...');
      let importedTotal = 0;
      const classesImportedSet = new Set<string>();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buffer = await file.arrayBuffer();
        const parsedGroups = parseStudentExcel(buffer);

        for (const group of parsedGroups) {
          if (group.students.length > 0) {
            // Merge with existing students or save new list
            const existingList = await getStudentList(group.className);
            const studentMap = new Map<string, StudentIdentity>();
            existingList.forEach(s => studentMap.set(s.numeroEleve, s));
            group.students.forEach(s => {
              if (studentMap.has(s.numeroEleve)) {
                studentMap.set(s.numeroEleve, {
                  ...studentMap.get(s.numeroEleve)!,
                  nomEleve: s.nomEleve || studentMap.get(s.numeroEleve)!.nomEleve,
                  sexe: s.sexe || studentMap.get(s.numeroEleve)!.sexe
                });
              } else {
                studentMap.set(s.numeroEleve, s);
              }
            });

            const mergedList = Array.from(studentMap.values());
            await saveStudentList(group.className, mergedList);
            importedTotal += group.students.length;
            classesImportedSet.add(group.className);
          }
        }
      }

      const classesImported = Array.from(classesImportedSet);

      if (importedTotal > 0) {
        window.dispatchEvent(new Event('dbUpdated'));
        await fetchClassesData();
        showToast(
          language === 'ar' 
            ? `تم استيراد ${importedTotal} تلميذ بنجاح (${classesImported.length} قسم: ${classesImported.join('، ')})` 
            : `${importedTotal} élèves importés avec succès (${classesImported.length} classe(s))`
        );
      } else {
        showToast(language === 'ar' ? 'لم يتم العثور على بيانات صالحة في الملفات.' : 'Aucune donnée valide trouvée.');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || (language === 'ar' ? 'حدث خطأ أثناء قراءة الملف.' : 'Erreur de lecture.'));
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Direct Export: Physical Tests Results
  const handleExportPhysical = async (className: string) => {
    try {
      showToast(language === 'ar' ? `جاري تصدير نتائج الاختبارات البدنية للقسم ${className}...` : `Génération de l'export...`);
      const res = await exportClassPhysicalTestsToExcel(className);
      if (res.success) {
        showToast(language === 'ar' ? `تم تصدير نتائج الاختبارات البدنية للقسم ${className} بنجاح` : `Tests physiques exportés pour ${className}`);
      } else {
        showToast(res.error || (language === 'ar' ? `لا توجد بيانات مسجلة لهذا القسم` : `Aucune donnée trouvée`));
      }
    } catch (err: any) {
      showToast(err.message || (language === 'ar' ? 'حدث خطأ أثناء التصدير' : 'Erreur d\'export'));
    }
  };

  // Direct Export: Biometric Measurements & BMI
  const handleExportMeasurements = async (className: string) => {
    try {
      showToast(language === 'ar' ? `جاري تصدير القياسات البيومترية ومؤشر IMC للقسم ${className}...` : `Génération de l'export...`);
      const res = await exportClassMeasurementsToExcel(className);
      if (res.success) {
        showToast(language === 'ar' ? `تم تصدير القياسات البيومترية ومؤشر IMC للقسم ${className} بنجاح` : `Mesures & IMC exportés pour ${className}`);
      } else {
        showToast(res.error || (language === 'ar' ? `لا توجد قياسات مسجلة لهذا القسم` : `Aucune mesure trouvée`));
      }
    } catch (err: any) {
      showToast(err.message || (language === 'ar' ? 'حدث خطأ أثناء التصدير' : 'Erreur d\'export'));
    }
  };

  // Direct Export: Luc Léger VMA Results
  const handleExportVma = async (className: string) => {
    try {
      showToast(language === 'ar' ? `جاري تصدير نتائج VMA للقسم ${className}...` : `Génération de l'export...`);
      const res = await exportClassVmaResultsToExcel(className);
      if (res.success) {
        showToast(language === 'ar' ? `تم تصدير نتائج VMA للقسم ${className} بنجاح` : `Résultats VMA exportés pour ${className}`);
      } else {
        showToast(res.error || (language === 'ar' ? `لا توجد نتائج VMA مسجلة لهذا القسم` : `Aucun résultat VMA trouvé`));
      }
    } catch (err: any) {
      showToast(err.message || (language === 'ar' ? 'حدث خطأ أثناء التصدير' : 'Erreur d\'export'));
    }
  };

  // Open Student Roster Modal
  const handleOpenRoster = async (className: string) => {
    setRosterClass(className);
    setRosterLoading(true);
    setRosterSearch('');
    try {
      const [students, physical, vma] = await Promise.all([
        getStudentList(className),
        getPhysicalTests(className),
        getVmaResults(className)
      ]);

      const physicalMap = new Map<string, PhysicalTests>();
      physical.forEach(p => physicalMap.set(p.numeroEleve, p));

      const vmaMap = new Map<string, StudentResult>();
      vma.forEach(v => vmaMap.set(v.numeroEleve, v));

      const rows: StudentStatusRow[] = students.map(s => {
        const p = physicalMap.get(s.numeroEleve);
        const v = vmaMap.get(s.numeroEleve);

        const isPhysicalDone = !!(
          p && (
            p.vitesse30m !== undefined ||
            p.sautHorizontal !== undefined ||
            p.sautVertical !== undefined ||
            p.lancerMedball !== undefined ||
            p.souplesseAssis !== undefined ||
            p.souplesseDebout !== undefined ||
            p.equilibreStatique !== undefined
          )
        );

        const isVmaDone = !!((v && v.vma) || (p && p.vma));

        const isMeasurementsDone = !!(
          p && (
            p.taille !== undefined ||
            p.poids !== undefined ||
            p.frequenceCardiaque !== undefined
          )
        );

        return {
          student: s,
          physicalTest: p,
          vmaResult: v,
          isPhysicalDone,
          isVmaDone,
          isMeasurementsDone
        };
      });

      setRosterStudents(rows);
    } catch (err) {
      console.error('Error loading class roster', err);
    } finally {
      setRosterLoading(false);
    }
  };

  // Open Add Student Modal
  const handleOpenAddStudent = (targetClass?: string) => {
    const cls = targetClass || rosterClass || selectedClass || (classes[0]?.className) || '';
    if (!cls) {
      showToast(language === 'ar' ? 'يرجى إنشاء أو استيراد قسم أولاً.' : 'Veuillez d’abord créer ou importer une classe.');
      return;
    }
    setAddEditClass(cls);
    setStudentToEdit(null);
    setIsAddEditModalOpen(true);
  };

  // Open Edit Student Modal
  const handleOpenEditStudent = (student: StudentIdentity, targetClass: string) => {
    setAddEditClass(targetClass);
    setStudentToEdit(student);
    setIsAddEditModalOpen(true);
  };

  // Confirm delete student
  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeletingStudent(true);
    try {
      const res = await deleteStudentFromClass(studentToDelete.className, studentToDelete.student.numeroEleve);
      if (res.success) {
        showToast(
          language === 'ar' 
            ? `تم حذف التلميذ «${studentToDelete.student.nomEleve}» بنجاح` 
            : `Élève ${studentToDelete.student.nomEleve} supprimé`
        );
        if (rosterClass === studentToDelete.className) {
          handleOpenRoster(rosterClass);
        }
        await fetchClassesData();
      } else {
        showToast(res.error || (language === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Erreur de suppression'));
      }
    } catch (err: any) {
      console.error('Failed to delete student:', err);
      showToast(err.message || (language === 'ar' ? 'حدث خطأ غير متوقع' : 'Erreur'));
    } finally {
      setIsDeletingStudent(false);
      setStudentToDelete(null);
    }
  };

  // Global student search effect
  useEffect(() => {
    if (searchMode !== 'students') return;

    const timer = setTimeout(async () => {
      setIsSearchingStudents(true);
      try {
        const query = searchQuery.trim();
        // If empty query, show all students (up to 100) or matching query
        const results = await searchStudentsGlobal(query || ' ');
        setGlobalStudents(results);
      } catch (err) {
        console.error('Error during global student search:', err);
      } finally {
        setIsSearchingStudents(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode]);

  // Delete class action
  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    setDeleting(true);
    try {
      await deleteClass(classToDelete);
      showToast(language === 'ar' ? `تم حذف القسم ${classToDelete} بنجاح` : `Classe ${classToDelete} supprimée`);
      window.dispatchEvent(new CustomEvent('dbUpdated'));
      setClassToDelete(null);
    } catch (err) {
      console.error('Failed to delete class', err);
    } finally {
      setDeleting(false);
    }
  };

  // Quick select class
  const handleSelectClass = (className: string) => {
    setSelectedClass(className);
    showToast(language === 'ar' ? `تم تحديد القسم ${className} كقسم نشط للاختبار` : `Classe ${className} sélectionnée`);
  };

  // Navigate directly to a specific test for a class
  const handleJumpToTest = (className: string, screen: ActiveScreen) => {
    setSelectedClass(className);
    onNavigateToScreen(screen);
  };

  // KPI Calculations
  const totalClasses = classes.length;
  const totalStudents = useMemo(() => classes.reduce((acc, c) => acc + c.studentCount, 0), [classes]);
  const totalBoys = useMemo(() => classes.reduce((acc, c) => acc + c.boysCount, 0), [classes]);
  const totalGirls = useMemo(() => classes.reduce((acc, c) => acc + c.girlsCount, 0), [classes]);
  const totalPhysicalTested = useMemo(() => classes.reduce((acc, c) => acc + c.testedCount, 0), [classes]);
  const totalVmaTested = useMemo(() => classes.reduce((acc, c) => acc + c.vmaCount, 0), [classes]);
  const totalMeasured = useMemo(() => classes.reduce((acc, c) => acc + c.measurementsCount, 0), [classes]);

  const physicalRate = totalStudents > 0 ? Math.round((totalPhysicalTested / totalStudents) * 100) : 0;
  const vmaRate = totalStudents > 0 ? Math.round((totalVmaTested / totalStudents) * 100) : 0;
  const measurementsRate = totalStudents > 0 ? Math.round((totalMeasured / totalStudents) * 100) : 0;

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchesSearch = c.className.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;

      if (filterStatus === 'tested') {
        return c.testedCount > 0 || c.vmaCount > 0;
      }
      if (filterStatus === 'untested') {
        return c.testedCount === 0 && c.vmaCount === 0;
      }
      return true;
    });
  }, [classes, searchQuery, filterStatus]);

  // Filtered roster students in modal (supports Arabic normalized search)
  const filteredRoster = useMemo(() => {
    if (!rosterSearch.trim()) return rosterStudents;
    const q = normalizeArabicText(rosterSearch);
    return rosterStudents.filter(r => {
      const normName = normalizeArabicText(r.student.nomEleve);
      const normNum = String(r.student.numeroEleve || '').toLowerCase();
      return normName.includes(q) || normNum.includes(q);
    });
  }, [rosterStudents, rosterSearch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 start-6 z-50 bg-gray-900 text-white dark:bg-indigo-900 dark:text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-700 dark:border-indigo-700 flex items-center gap-3 animate-bounce">
          <CheckIcon />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <AcademicCapIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              {t.classesTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {t.classesSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hidden File Input for Excel student import (Multiple files supported) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportStudentExcel}
            accept=".xlsx,.xls,.csv"
            multiple
            className="hidden"
          />

          {/* Quick Add Student button */}
          <button
            onClick={() => handleOpenAddStudent(selectedClass || classes[0]?.className)}
            disabled={classes.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition"
            title={language === 'ar' ? 'إضافة تلميذ جديد إلى لائحة القسم' : 'Ajouter un élève'}
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة تلميذ' : 'Ajouter élève'}</span>
          </button>

          {/* Import Classes (استيراد الأقسام) button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition"
            title={language === 'ar' ? 'استيراد قسم أو عدة أقسام من ملفات Excel دفعة واحدة' : 'Importer une ou plusieurs classes'}
          >
            <ArrowUpTrayIcon />
            <span>{language === 'ar' ? 'استيراد الأقسام' : 'استيراد الأقسام (Excel)'}</span>
          </button>

          {/* Download Template button */}
          <button
            onClick={() => downloadStudentsTemplate(selectedClass)}
            title={language === 'ar' ? 'تحميل نموذج Excel فارغ' : 'Télécharger modèle Excel'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm font-bold transition"
          >
            <ExcelIcon className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{language === 'ar' ? 'نموذج فارغ' : 'Modèle'}</span>
          </button>

          {/* Refresh Classes button */}
          <button
            onClick={fetchClassesData}
            title={language === 'ar' ? 'تحديث الإحصائيات' : 'Actualiser'}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <ArrowPathIcon />
          </button>
        </div>
      </div>

      {/* Overview Statistics KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Classes */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {language === 'ar' ? 'إجمالي الأقسام' : 'Total Classes'}
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <AcademicCapIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{totalClasses}</span>
            <span className="text-xs font-medium text-gray-400">{language === 'ar' ? 'قسم' : 'classes'}</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            {language === 'ar' ? `القسم الحالي: ${selectedClass || 'غير محدد'}` : `Actuelle: ${selectedClass || '-'}`}
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {language === 'ar' ? 'إجمالي التلاميذ' : 'Total Élèves'}
            </span>
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <UsersIcon />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{totalStudents}</span>
            <span className="text-xs font-medium text-gray-400">{language === 'ar' ? 'تلميذ' : 'élèves'}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            <span>{language === 'ar' ? `ذكور: ${totalBoys}` : `G: ${totalBoys}`}</span>
            <span>•</span>
            <span>{language === 'ar' ? `إناث: ${totalGirls}` : `F: ${totalGirls}`}</span>
          </div>
        </div>

        {/* Physical Tests Tested */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {language === 'ar' ? 'المختبرون بدنياً' : 'Tests Physiques'}
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ScaleIcon />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{totalPhysicalTested}</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{physicalRate}%</span>
          </div>
          <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${physicalRate}%` }}
            />
          </div>
        </div>

        {/* VMA Endurance Tested */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {language === 'ar' ? 'إنجاز اختبار VMA' : 'Test VMA'}
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <RunningManIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{totalVmaTested}</span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{vmaRate}%</span>
          </div>
          <div className="mt-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${vmaRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Search Mode Selector & Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Toggle between Classes and Students search */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => {
                setSearchMode('classes');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                searchMode === 'classes'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <AcademicCapIcon className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'الأقسام' : 'Classes'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchMode('students');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                searchMode === 'students'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <UsersIcon />
              <span>{language === 'ar' ? 'بحث باسم التلميذ' : 'Recherche élèves'}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-gray-400">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchMode === 'students'
                  ? (language === 'ar' ? 'ابحث بالاسم الكامل للتلميذ أو رقم مسار في كل الأقسام...' : 'Recherche élève par nom ou Massar...')
                  : (language === 'ar' ? 'بحث عن قسم بالاسم...' : 'Rechercher une classe...')
              }
              className="w-full ps-9 pe-8 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 end-0 pe-2.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills (when in classes mode) or Student count & Add button */}
        {searchMode === 'classes' ? (
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto shrink-0">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterStatus === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {language === 'ar' ? 'الكل' : 'Toutes'} ({classes.length})
            </button>
            <button
              onClick={() => setFilterStatus('tested')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterStatus === 'tested'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {language === 'ar' ? 'تم بدء الاختبارات' : 'En cours / Testées'}
            </button>
            <button
              onClick={() => setFilterStatus('untested')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterStatus === 'untested'
                  ? 'bg-rose-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {language === 'ar' ? 'لم تُختبر بعد' : 'Non testées'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto shrink-0">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {language === 'ar' ? `المعروض: ${globalStudents.length} تلميذ` : `${globalStudents.length} élèves`}
            </span>
            <button
              type="button"
              onClick={() => handleOpenAddStudent(selectedClass || classes[0]?.className)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
            >
              <UserPlusIcon className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إضافة تلميذ' : 'Ajouter élève'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Render Student Search Results OR Classes Grid */}
      {searchMode === 'students' ? (
        <div className="space-y-4">
          {isSearchingStudents ? (
            <div className="py-20 text-center space-y-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                {language === 'ar' ? 'جاري البحث في لوائح التلاميذ...' : 'Recherche des élèves...'}
              </p>
            </div>
          ) : globalStudents.length === 0 ? (
            <div className="py-16 px-6 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-500">
                <UsersIcon />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">
                  {searchQuery.trim()
                    ? (language === 'ar' ? `لم يتم العثور على أي تلميذ يطابق «${searchQuery}»` : `Aucun élève correspondant à «${searchQuery}»`)
                    : (language === 'ar' ? 'لا يوجد تلاميذ مسجلون حالياً' : 'Aucun élève enregistré')}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {searchQuery.trim()
                    ? (language === 'ar' ? 'تأكد من كتابة الاسم أو رقم مسار بشكل صحيح، أو أضف تلميذاً جديداً.' : 'Vérifiez l’orthographe ou ajoutez un élève.')
                    : (language === 'ar' ? 'قم باستيراد لائحة أو أضف تلميذاً يدوياً للبدء.' : 'Importez une liste ou ajoutez un élève manuellement.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAddStudent(selectedClass || classes[0]?.className)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition"
              >
                <UserPlusIcon className="w-4 h-4" />
                <span>{language === 'ar' ? 'إضافة تلميذ جديد الآن' : 'Ajouter un élève maintenant'}</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/60 dark:bg-gray-850">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-gray-900 dark:text-white">
                    {language === 'ar' ? 'نتائج البحث عن التلاميذ' : 'Résultats de recherche'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {globalStudents.length} {language === 'ar' ? 'تلميذ' : 'élèves'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAddStudent(selectedClass || classes[0]?.className)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  <UserPlusIcon className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إضافة تلميذ' : 'Ajouter'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 uppercase text-[10px] font-black bg-gray-50/40 dark:bg-gray-800/40">
                      <th className="py-3 px-3 text-start">#</th>
                      <th className="py-3 px-3 text-start">{t.studentName}</th>
                      <th className="py-3 px-3 text-start">{language === 'ar' ? 'القسم' : 'Classe'}</th>
                      <th className="py-3 px-3 text-center">{t.gender}</th>
                      <th className="py-3 px-3 text-center">{t.navPhysicalTests}</th>
                      <th className="py-3 px-3 text-center">{t.vmaTitle}</th>
                      <th className="py-3 px-3 text-center">{t.navMeasurements}</th>
                      <th className="py-3 px-3 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {globalStudents.map((item, idx) => (
                      <tr key={`${item.className}-${item.student.numeroEleve}-${idx}`} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition">
                        <td className="py-2.5 px-3 text-gray-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClass(item.className);
                              setModalStudentNumber(item.student.numeroEleve);
                            }}
                            className="font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-2.5 group/name text-start"
                            title={language === 'ar' ? 'فتح بطاقة التلميذ' : 'Voir fiche élève'}
                          >
                            <StudentAvatar
                              photoUrl={item.student.photoUrl}
                              nomEleve={item.student.nomEleve}
                              sexe={item.student.sexe}
                              size="sm"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="group-hover/name:underline truncate">{item.student.nomEleve}</span>
                              <span className="text-[10px] font-mono text-gray-400 leading-none">
                                {item.student.numeroEleve}
                              </span>
                            </div>
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleOpenRoster(item.className)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-black text-xs border border-indigo-200/80 dark:border-indigo-800 transition"
                            title={language === 'ar' ? 'فتح لائحة هذا القسم' : 'Ouvrir cette classe'}
                          >
                            <AcademicCapIcon className="w-3.5 h-3.5" />
                            <span>{item.className}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                            item.student.sexe === 'M'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                          }`}>
                            {item.student.sexe === 'M' ? (language === 'ar' ? 'ذكر' : 'G') : (language === 'ar' ? 'أنثى' : 'F')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.isPhysicalDone ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                              <CheckIcon />
                              <span>{language === 'ar' ? 'منجز' : 'Fait'}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.isVmaDone && item.vmaVal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold font-mono">
                              <span>{item.vmaVal}</span>
                              <span className="text-[9px]">km/h</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.imcVal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold font-mono">
                              <span>{item.imcVal}</span>
                            </span>
                          ) : item.isMeasurementsDone ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold">
                              <CheckIcon />
                              <span>{language === 'ar' ? 'مسجل' : 'Saisi'}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Student */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditStudent(item.student, item.className)}
                              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                              title={language === 'ar' ? 'تعديل بيانات التلميذ' : 'Modifier'}
                            >
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                            </button>
                            {/* Complete Data Modal */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedClass(item.className);
                                setModalStudentNumber(item.student.numeroEleve);
                              }}
                              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                              title={language === 'ar' ? 'بطاقة التلميذ والاختبارات' : 'Fiche complète'}
                            >
                              <EyeIcon className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete Student */}
                            <button
                              type="button"
                              onClick={() => setStudentToDelete({ student: item.student, className: item.className })}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title={language === 'ar' ? 'حذف التلميذ' : 'Supprimer'}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
            {language === 'ar' ? 'جاري تحميل لوائح الأقسام...' : 'Chargement des classes...'}
          </p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-500">
            <AcademicCapIcon className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">
              {classes.length === 0 
                ? (language === 'ar' ? 'لا توجد لوائح أقسام مسجلة حالياً' : 'Aucune classe enregistrée')
                : (language === 'ar' ? 'لا توجد نتائج تطابق بحثك' : 'Aucun résultat correspondant')}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {classes.length === 0 
                ? (language === 'ar' ? 'قم باستيراد لوائح التلاميذ بصيغة Excel (Massar) للبدء في إجراء القياسات والاختبارات.' : 'Importez vos listes au format Excel pour commencer les évaluations.')
                : (language === 'ar' ? 'جرب البحث باسم آخر أو إزالة التصفية.' : 'Essayez avec un autre mot-clé.')}
            </p>
          </div>
          {classes.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-600/20 transition"
            >
              <ArrowUpTrayIcon />
              <span>{language === 'ar' ? 'استيراد لائحة تلاميذ (Excel) الآن' : 'Importer des listes maintenant'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((item) => {
            const isCurrent = selectedClass === item.className;
            const physPercent = item.studentCount > 0 ? Math.round((item.testedCount / item.studentCount) * 100) : 0;
            const vmaPercent = item.studentCount > 0 ? Math.round((item.vmaCount / item.studentCount) * 100) : 0;

            return (
              <div
                key={item.className}
                className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md ${
                  isCurrent
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:ring-indigo-500/30'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Card Top: Class Info & Badge */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700/60 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        isCurrent 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                      }`}>
                        <AcademicCapIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                          {item.className}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          <span>{item.studentCount} {language === 'ar' ? 'تلميذ' : 'élèves'}</span>
                          <span>•</span>
                          <span>{item.boysCount} {language === 'ar' ? 'ذكر' : 'G'}</span>
                          <span>•</span>
                          <span>{item.girlsCount} {language === 'ar' ? 'أنثى' : 'F'}</span>
                        </div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[11px] font-black border border-indigo-200 dark:border-indigo-800">
                        {language === 'ar' ? 'القسم النشط' : 'Actuelle'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelectClass(item.className)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        {language === 'ar' ? 'تحديد' : 'Sélectionner'}
                      </button>
                    )}
                  </div>

                  {/* Progress Indicators */}
                  <div className="space-y-2 pt-2">
                    {/* Physical tests progress */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold mb-1">
                        <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                          <ScaleIcon />
                          <span>{t.navPhysicalTests}</span>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {item.testedCount} / {item.studentCount} ({physPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${physPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* VMA progress */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold mb-1">
                        <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                          <RunningManIcon className="w-3.5 h-3.5" />
                          <span>{t.vmaTitle}</span>
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                          {item.vmaCount} / {item.studentCount} ({vmaPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${vmaPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Class Export Buttons (Requested by user) */}
                <div className="p-3 bg-gray-100/60 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700/60 flex flex-col gap-2">
                  <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ArrowDownTrayIcon />
                      <span>{language === 'ar' ? 'تصدير نتائج القسم مباشرة (Excel):' : 'Exporter ce groupe (Excel) :'}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleExportPhysical(item.className)}
                      title={language === 'ar' ? 'تصدير نتائج الاختبارات البدنية للقسم إلى ملف Excel' : 'Exporter les tests physiques en Excel'}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition shadow-2xs"
                    >
                      <ExcelIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'الاختبارات البدنية' : 'Tests physiques'}</span>
                    </button>

                    <button
                      onClick={() => handleExportMeasurements(item.className)}
                      title={language === 'ar' ? 'تصدير القياسات البيومترية ومؤشر كتلة الجسم IMC للقسم إلى ملف Excel' : 'Exporter les mesures et IMC en Excel'}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/80 text-sky-800 dark:text-sky-300 text-xs font-bold transition shadow-2xs"
                    >
                      <RulerIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                      <span className="truncate">{language === 'ar' ? 'القياسات و IMC' : 'Mesures & IMC'}</span>
                    </button>
                  </div>
                </div>

                {/* Card Bottom: Quick Actions */}
                <div className="p-3 bg-gray-50/70 dark:bg-gray-800/60 rounded-b-2xl flex items-center justify-between gap-1.5">
                  {/* View Roster Modal */}
                  <button
                    onClick={() => handleOpenRoster(item.className)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition shadow-xs"
                  >
                    <EyeIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{language === 'ar' ? 'معاينة التلاميذ' : 'Voir élèves'}</span>
                  </button>

                  {/* Jump to Physical Tests & VMA */}
                  <button
                    onClick={() => handleJumpToTest(item.className, 'physical-tests')}
                    title={language === 'ar' ? 'الانتقال للاختبارات البدنية و VMA' : 'Tests physiques & VMA'}
                    className="p-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                  >
                    <RunningManIcon className="w-4 h-4" />
                  </button>

                  {/* Jump to Measurements */}
                  <button
                    onClick={() => handleJumpToTest(item.className, 'measurements')}
                    title={language === 'ar' ? 'الانتقال للقياسات البيومترية' : 'Mesures IMC'}
                    className="p-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                  >
                    <RulerIcon />
                  </button>

                  {/* Delete class */}
                  <button
                    onClick={() => setClassToDelete(item.className)}
                    title={language === 'ar' ? 'حذف القسم' : 'Supprimer'}
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: View Class Roster */}
      {rosterClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-850">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <AcademicCapIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    {language === 'ar' ? `لائحة تلاميذ القسم: ${rosterClass}` : `Élèves de la classe : ${rosterClass}`}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? `إجمالي التلاميذ: ${rosterStudents.length} تلميذ` : `Total : ${rosterStudents.length} élèves`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddStudent(rosterClass)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                  title={language === 'ar' ? 'إضافة تلميذ جديد لهذا القسم' : 'Ajouter un élève'}
                >
                  <UserPlusIcon className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'إضافة تلميذ' : 'Ajouter élève'}</span>
                </button>

                <button
                  onClick={() => handleExportPhysical(rosterClass)}
                  title={language === 'ar' ? 'تصدير نتائج الاختبارات البدنية لهذا القسم (Excel)' : 'Exporter tests physiques'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                >
                  <ExcelIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{language === 'ar' ? 'تصدير الاختبارات (Excel)' : 'Tests (Excel)'}</span>
                </button>

                <button
                  onClick={() => handleExportMeasurements(rosterClass)}
                  title={language === 'ar' ? 'تصدير القياسات البيومترية ومؤشر IMC لهذا القسم (Excel)' : 'Exporter mesures & IMC'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 text-xs font-bold border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition"
                >
                  <RulerIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{language === 'ar' ? 'تصدير القياسات (Excel)' : 'Mesures (Excel)'}</span>
                </button>

                <button
                  onClick={() => {
                    handleSelectClass(rosterClass);
                    setRosterClass(null);
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
                >
                  <CheckIcon />
                  <span>{language === 'ar' ? 'تحديد كقسم حالي' : 'Activer'}</span>
                </button>
                <button
                  onClick={() => setRosterClass(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750 transition"
                >
                  <XMarkIcon />
                </button>
              </div>
            </div>

            {/* Modal Search and Quick Add Bar */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-gray-400">
                  <MagnifyingGlassIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder={language === 'ar' ? '🔍 ابحث باسم التلميذ أو رقم مسار في هذا القسم...' : 'Rechercher un élève...'}
                  className="w-full ps-9 pe-8 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {rosterSearch && (
                  <button
                    type="button"
                    onClick={() => setRosterSearch('')}
                    className="absolute inset-y-0 end-0 pe-2.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleOpenAddStudent(rosterClass)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                <UserPlusIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'ar' ? 'إضافة تلميذ' : 'Ajouter'}</span>
              </button>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {rosterLoading ? (
                <div className="py-16 text-center space-y-2">
                  <div className="animate-spin inline-block w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full" />
                  <p className="text-xs text-gray-500">{language === 'ar' ? 'جاري التحميل...' : 'Chargement...'}</p>
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs sm:text-sm space-y-3">
                  <p>{language === 'ar' ? 'لا يوجد تلاميذ يطابقون البحث.' : 'Aucun élève trouvé.'}</p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddStudent(rosterClass)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <UserPlusIcon className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إضافة تلميذ جديد الآن' : 'Ajouter un élève'}</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-400 uppercase text-[10px] font-black">
                        <th className="py-2.5 px-3 text-start">#</th>
                        <th className="py-2.5 px-3 text-start">{t.studentName}</th>
                        <th className="py-2.5 px-3 text-center">{t.gender}</th>
                        <th className="py-2.5 px-3 text-center">{t.navPhysicalTests}</th>
                        <th className="py-2.5 px-3 text-center">{t.vmaTitle}</th>
                        <th className="py-2.5 px-3 text-center">{t.navMeasurements}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredRoster.map((row, idx) => (
                        <tr key={row.student.numeroEleve || idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-750 transition">
                          <td className="py-2 px-3 text-gray-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-gray-900 dark:text-white">
                            <button
                              type="button"
                              onClick={() => setModalStudentNumber(row.student.numeroEleve)}
                              className="text-start hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-2.5 group/rosterName"
                              title={language === 'ar' ? 'انقر لفتح نافذة بيانات التلميذ وتعديلها بسهولة' : 'Voir données'}
                            >
                              <StudentAvatar
                                photoUrl={row.student.photoUrl}
                                nomEleve={row.student.nomEleve}
                                sexe={row.student.sexe}
                                size="sm"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="group-hover/rosterName:underline truncate">{row.student.nomEleve}</span>
                                <span className="text-[10px] font-mono text-gray-400 leading-none">
                                  {row.student.numeroEleve}
                                </span>
                              </div>
                            </button>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                              row.student.sexe === 'M'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                            }`}>
                              {row.student.sexe === 'M' ? (language === 'ar' ? 'ذكر' : 'G') : (language === 'ar' ? 'أنثى' : 'F')}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.isPhysicalDone ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                                <CheckIcon />
                                <span>{language === 'ar' ? 'منجز' : 'Fait'}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.isVmaDone ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold font-mono">
                                <span>{row.vmaResult?.vma || row.physicalTest?.vma || '-'}</span>
                                <span className="text-[9px]">km/h</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.isMeasurementsDone ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold">
                                <CheckIcon />
                                <span>{language === 'ar' ? 'مسجل' : 'Saisi'}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Edit Student Identity */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditStudent(row.student, rosterClass)}
                                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                                title={language === 'ar' ? 'تعديل بيانات التلميذ (الاسم، الرقم، الجنس)' : 'Modifier'}
                              >
                                <PencilSquareIcon className="w-3.5 h-3.5" />
                              </button>
                              {/* Complete Data Modal */}
                              <button
                                type="button"
                                onClick={() => setModalStudentNumber(row.student.numeroEleve)}
                                className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                                title={language === 'ar' ? 'بطاقة التلميذ والقياسات والاختبارات' : 'Fiche élève'}
                              >
                                <EyeIcon className="w-3.5 h-3.5" />
                              </button>
                              {/* Delete Student */}
                              <button
                                type="button"
                                onClick={() => setStudentToDelete({ student: row.student, className: rosterClass })}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title={language === 'ar' ? 'حذف التلميذ من اللائحة' : 'Supprimer'}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {language === 'ar' ? `المعروض: ${filteredRoster.length} من ${rosterStudents.length}` : `Affichés : ${filteredRoster.length} sur ${rosterStudents.length}`}
              </span>
              <button
                onClick={() => setRosterClass(null)}
                className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Student Confirmation */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <StudentAvatar
                photoUrl={studentToDelete.student.photoUrl}
                nomEleve={studentToDelete.student.nomEleve}
                sexe={studentToDelete.student.sexe}
                size="md"
              />
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {language === 'ar' ? 'تأكيد حذف التلميذ' : 'Supprimer l’élève'}
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {studentToDelete.student.nomEleve} ({studentToDelete.student.numeroEleve})
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {language === 'ar'
                ? `هل أنت متأكد من رغبتك في حذف التلميذ(ة) «${studentToDelete.student.nomEleve}» من القسم "${studentToDelete.className}"؟ سيتم حذف بياناته ونتائجه المرتبطة به نهائياً.`
                : `Êtes-vous sûr de vouloir supprimer définitivement ${studentToDelete.student.nomEleve} de la classe "${studentToDelete.className}" ?`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setStudentToDelete(null)}
                disabled={isDeletingStudent}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmDeleteStudent}
                disabled={isDeletingStudent}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-2"
              >
                {isDeletingStudent && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{language === 'ar' ? 'نعم، حذف التلميذ' : 'Supprimer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Class Confirmation */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950">
                <TrashIcon />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {language === 'ar' ? 'تأكيد حذف القسم' : 'Confirmer la suppression'}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {language === 'ar'
                ? `هل أنت متأكد من رغبتك في حذف القسم "${classToDelete}"؟ سيتم حذف لائحة التلاميذ ونتائج الاختبارات البدنية والتحمل المرتبطة به نهائياً.`
                : `Êtes-vous sûr de vouloir supprimer définitivement la classe "${classToDelete}" ainsi que l'ensemble des résultats associés ?`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setClassToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-2"
              >
                {deleting && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{language === 'ar' ? 'نعم، حذف القسم' : 'Supprimer définitivement'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Student */}
      {isAddEditModalOpen && (
        <AddEditStudentModal
          isOpen={isAddEditModalOpen}
          onClose={() => {
            setIsAddEditModalOpen(false);
            setStudentToEdit(null);
          }}
          className={addEditClass}
          studentToEdit={studentToEdit}
          existingStudentsCount={rosterStudents.length}
          onSuccess={(savedStudent) => {
            showToast(
              studentToEdit 
                ? (language === 'ar' ? `تم تحديث بيانات التلميذ «${savedStudent.nomEleve}» بنجاح` : `Élève mis à jour`)
                : (language === 'ar' ? `تمت إضافة التلميذ «${savedStudent.nomEleve}» بنجاح` : `Élève ajouté`)
            );
            fetchClassesData();
            if (rosterClass) handleOpenRoster(rosterClass);
            if (searchMode === 'students') {
              searchStudentsGlobal(searchQuery.trim() || ' ').then(res => setGlobalStudents(res));
            }
          }}
        />
      )}

      {modalStudentNumber && rosterClass && (
        <StudentDataModal
          isOpen={!!modalStudentNumber}
          onClose={() => setModalStudentNumber(null)}
          className={rosterClass}
          studentNumber={modalStudentNumber}
          allStudents={rosterStudents.map(r => r.student)}
          onSelectStudent={(nextNum) => setModalStudentNumber(nextNum)}
          onDataSaved={() => {
            fetchClassesData();
            if (rosterClass) handleOpenRoster(rosterClass);
          }}
        />
      )}
    </div>
  );
};
