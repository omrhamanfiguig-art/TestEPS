import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { StudentIdentity, PhysicalTests, StudentResult, MassarActivityKey, MassarGradeRecord, MassarClassConfig } from '../types';
import { 
  getStudentList, 
  getPhysicalTests, 
  savePhysicalTests,
  getVmaResults, 
  saveStudentList, 
  getAllClasses, 
  ClassStats 
} from '../utils/db';
import { 
  MASSAR_ACTIVITIES, 
  getActivityMeta, 
  getMassarConfig, 
  saveMassarConfig, 
  getMassarGrades, 
  saveMassarGrades, 
  autoPopulateMassarGrades, 
  calculateMassarAverage, 
  getMassarAppreciation, 
  fillImportedMassarExcel, 
  exportFilledMassarWorkbook, 
  generateOfficialMassarExcel,
  generateOfficialMassarExcelForLevel,
  ImportedMassarResult,
  detectClassLevel,
  groupClassesByLevel,
  SchoolLevel
} from '../utils/massarHelper';
import { 
  ExcelIcon, 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon, 
  PrinterIcon, 
  CheckCircleIcon, 
  InformationCircleIcon, 
  XMarkIcon, 
  BoltIcon, 
  ChevronDownIcon, 
  MagnifyingGlassIcon, 
  PencilSquareIcon,
  SparklesIcon,
  Cog6ToothIcon,
  CheckIcon
} from '../components/Icons';
import { StudentAvatar } from '../components/StudentAvatar';
import { QuickEvaluationModal } from '../components/QuickEvaluationModal';
import { useLanguage } from '../utils/i18n';

interface MassarScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
}

export const MassarScreen: React.FC<MassarScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  const { language } = useLanguage();

  // Scope and Display View states
  const [scopeMode, setScopeMode] = useState<'level' | 'class'>('level');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [crossClassSearchEnabled, setCrossClassSearchEnabled] = useState(true);
  const [displayView, setDisplayView] = useState<'table' | 'roster'>('table');

  // Data states
  const [classList, setClassList] = useState<ClassStats[]>([]);
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [physicalTests, setPhysicalTests] = useState<PhysicalTests[]>([]);
  const [vmaResults, setVmaResults] = useState<StudentResult[]>([]);
  const [extraLevelTests, setExtraLevelTests] = useState<PhysicalTests[]>([]);
  const [extraLevelVma, setExtraLevelVma] = useState<StudentResult[]>([]);
  const [extraLevelRecords, setExtraLevelRecords] = useState<MassarGradeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Massar Configuration state
  const [config, setConfig] = useState<MassarClassConfig>(() => getMassarConfig(selectedClass));
  const [records, setRecords] = useState<MassarGradeRecord[]>([]);

  // Imported raw workbook state (when teacher imports blank Massar file)
  const [importedResult, setImportedResult] = useState<ImportedMassarResult | null>(null);
  const [importedFileBuffer, setImportedFileBuffer] = useState<ArrayBuffer | null>(null);
  const [importedFileName, setImportedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'filled' | 'missing' | 'dispense' | 'below10'>('all');

  // Quick evaluation modal
  const [isQuickEvalOpen, setIsQuickEvalOpen] = useState(false);
  const [quickEvalStudentNumber, setQuickEvalStudentNumber] = useState<string | null>(null);

  // Settings & Feedback state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [editingMassarCodeNum, setEditingMassarCodeNum] = useState<string | null>(null);
  const [tempMassarCode, setTempMassarCode] = useState('');

  // Group classes into educational levels
  const availableLevels = useMemo(() => {
    return groupClassesByLevel(classList);
  }, [classList]);

  const activeLevel = useMemo(() => {
    if (availableLevels.length === 0) return null;
    return availableLevels.find(l => l.id === selectedLevelId) || availableLevels[0];
  }, [availableLevels, selectedLevelId]);

  // Load Classes on mount
  useEffect(() => {
    getAllClasses().then(cls => {
      setClassList(cls);
      if (cls.length > 0) {
        if (!selectedClass) {
          setSelectedClass(cls[0].className);
        }
        const levels = groupClassesByLevel(cls);
        if (levels.length > 0 && !selectedLevelId) {
          const currentLevel = detectClassLevel(selectedClass || cls[0].className);
          setSelectedLevelId(currentLevel.id);
        }
      }
    });
  }, []);

  // Sync selectedLevelId when selectedClass changes in class mode
  useEffect(() => {
    if (selectedClass && scopeMode === 'class') {
      const lvl = detectClassLevel(selectedClass);
      setSelectedLevelId(lvl.id);
    }
  }, [selectedClass, scopeMode]);

  // Load Data based on scopeMode (Level vs Single Class)
  useEffect(() => {
    if (classList.length === 0) return;

    setIsLoading(true);
    setImportedResult(null);
    setImportedFileBuffer(null);
    setImportedFileName('');

    if (scopeMode === 'level' && activeLevel) {
      // Level Mode: Fetch all classes belonging to this level
      const lvlConfig = getMassarConfig(`level_${activeLevel.id}`);
      setConfig({ ...lvlConfig, className: activeLevel.name });

      Promise.all(activeLevel.classes.map(cName => Promise.all([
        getStudentList(cName),
        getPhysicalTests(cName),
        getVmaResults(cName),
        Promise.resolve(getMassarGrades(cName))
      ]))).then(results => {
        const combinedStudents: (StudentIdentity & { className: string })[] = [];
        const combinedTests: PhysicalTests[] = [];
        const combinedVma: StudentResult[] = [];
        const combinedSavedGrades: MassarGradeRecord[] = [];

        results.forEach(([stds, tests, vma, savedGrades], idx) => {
          const cName = activeLevel.classes[idx];
          (stds || []).forEach(s => combinedStudents.push({ ...s, className: cName }));
          (tests || []).forEach(t => combinedTests.push({ ...t, className: cName }));
          (vma || []).forEach(v => combinedVma.push({ ...v, className: cName } as any));
          (savedGrades || []).forEach(g => combinedSavedGrades.push({ ...g, className: cName }));
        });

        setStudents(combinedStudents);
        setPhysicalTests(combinedTests);
        setVmaResults(combinedVma);
        setExtraLevelTests(combinedTests);
        setExtraLevelVma(combinedVma);
        setExtraLevelRecords(combinedSavedGrades);

        if (combinedSavedGrades.length > 0) {
          const merged = autoPopulateMassarGrades(combinedStudents, combinedTests, combinedVma, lvlConfig, combinedSavedGrades);
          setRecords(merged);
        } else {
          const initial = autoPopulateMassarGrades(combinedStudents, combinedTests, combinedVma, lvlConfig);
          setRecords(initial);
          // persist initial
          activeLevel.classes.forEach(cName => {
            const classSubset = initial.filter(r => (r.className || '').trim() === cName);
            if (classSubset.length > 0) saveMassarGrades(cName, classSubset);
          });
        }

        setIsLoading(false);
      }).catch(err => {
        console.error('Error loading level Massar data', err);
        setIsLoading(false);
        setNotification({ message: 'تعذر تحميل بيانات أقسام المستوى', type: 'error' });
      });

    } else if (scopeMode === 'class' && selectedClass) {
      // Single Class Mode: Fetch class data + load peer classes in background
      const loadedConfig = getMassarConfig(selectedClass);
      setConfig(loadedConfig);

      const currentLevel = detectClassLevel(selectedClass);
      const peerClasses = classList
        .filter(c => c.className !== selectedClass && detectClassLevel(c.className).id === currentLevel.id)
        .map(c => c.className);

      Promise.all([
        getStudentList(selectedClass),
        getPhysicalTests(selectedClass),
        getVmaResults(selectedClass),
        Promise.all(peerClasses.map(c => Promise.all([
          getPhysicalTests(c),
          getVmaResults(c),
          Promise.resolve(getMassarGrades(c))
        ])))
      ]).then(([stds, tests, vma, peerData]) => {
        setStudents(stds || []);
        setPhysicalTests(tests || []);
        setVmaResults(vma || []);

        const peerTests: PhysicalTests[] = [];
        const peerVma: StudentResult[] = [];
        const peerGrades: MassarGradeRecord[] = [];

        peerData.forEach(([pTests, pVma, pGrades], pIdx) => {
          const peerCName = peerClasses[pIdx];
          (pTests || []).forEach(t => peerTests.push({ ...t, className: peerCName }));
          (pVma || []).forEach(v => peerVma.push({ ...v, className: peerCName } as any));
          (pGrades || []).forEach(g => peerGrades.push({ ...g, className: peerCName }));
        });

        setExtraLevelTests(peerTests);
        setExtraLevelVma(peerVma);
        setExtraLevelRecords(peerGrades);

        const savedGrades = getMassarGrades(selectedClass);
        const extraData = crossClassSearchEnabled ? { tests: peerTests, vmaList: peerVma } : undefined;

        if (savedGrades && savedGrades.length > 0) {
          const merged = autoPopulateMassarGrades(stds || [], tests || [], vma || [], loadedConfig, savedGrades, extraData);
          setRecords(merged);
        } else {
          const initial = autoPopulateMassarGrades(stds || [], tests || [], vma || [], loadedConfig, [], extraData);
          setRecords(initial);
          saveMassarGrades(selectedClass, initial);
        }

        setIsLoading(false);
      }).catch(err => {
        console.error('Error loading Massar class data', err);
        setIsLoading(false);
        setNotification({ message: 'تعذر تحميل بيانات القسم', type: 'error' });
      });
    }
  }, [selectedClass, scopeMode, selectedLevelId, classList, crossClassSearchEnabled]);

  // Persist records to storage (handles level breakdown or single class)
  const persistRecords = (updatedRecords: MassarGradeRecord[]) => {
    if (scopeMode === 'level' && activeLevel) {
      activeLevel.classes.forEach(cName => {
        const classSubset = updatedRecords.filter(r => (r.className || '').trim() === cName);
        if (classSubset.length > 0) {
          saveMassarGrades(cName, classSubset);
        }
      });
      saveMassarGrades(`level_${activeLevel.id}`, updatedRecords);
    } else {
      saveMassarGrades(selectedClass, updatedRecords);
    }
  };

  // Save config changes
  const handleUpdateConfig = (updates: Partial<MassarClassConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    if (scopeMode === 'level' && activeLevel) {
      saveMassarConfig(`level_${activeLevel.id}`, updated);
      if (activeLevel.classes.length > 0) {
        saveMassarConfig(activeLevel.classes[0], updated);
      }
    } else {
      saveMassarConfig(selectedClass, updated);
    }
  };

  // One-click Auto Populate from App Tests
  const handleAutoPopulate = () => {
    const extraData = (scopeMode === 'class' && crossClassSearchEnabled) || scopeMode === 'level'
      ? { tests: extraLevelTests, vmaList: extraLevelVma }
      : undefined;

    const studentListForPopulate = (importedResult?.fileStudents && importedResult.fileStudents.length > 0)
      ? importedResult.fileStudents
      : students;

    const populated = autoPopulateMassarGrades(studentListForPopulate, physicalTests, vmaResults, config, records, extraData);
    setRecords(populated);
    persistRecords(populated);

    if (importedFileBuffer) {
      const res = fillImportedMassarExcel(
        importedFileBuffer, 
        studentListForPopulate, 
        populated, 
        config, 
        importedFileName, 
        extraLevelRecords
      );
      if (res.success) {
        setImportedResult(res);
      }
    }

    const filledCount = populated.filter(r => !r.isDispense && (r.noteDevoir1 !== null || r.noteDevoir2 !== null || r.noteDevoir3 !== null)).length;
    const crossClassCount = populated.filter(r => r.matchedFromClass).length;

    const levelTitle = scopeMode === 'level' && activeLevel ? activeLevel.shortName : (detectClassLevel(selectedClass).shortName);
    setNotification({
      message: `تم ملء نقط الفروض الثلاثة لـ ${filledCount} تلميذ بنجاح! ${crossClassCount > 0 ? `(تم جلب نقط ${crossClassCount} تلميذ من أقسام المستوى ${levelTitle})` : ''} ⚡`,
      type: 'success'
    });
    setTimeout(() => setNotification(null), 5000);
  };

  // Apply Quick Preset for 3 activities
  const handleApplyPreset = (act1: MassarActivityKey, act2: MassarActivityKey, act3: MassarActivityKey, label?: string) => {
    const updated: MassarClassConfig = {
      ...config,
      activity1: act1,
      activity2: act2,
      activity3: act3,
      activity1CustomLabel: '',
      activity2CustomLabel: '',
      activity3CustomLabel: ''
    };
    setConfig(updated);
    if (scopeMode === 'level' && activeLevel) {
      saveMassarConfig(`level_${activeLevel.id}`, updated);
    } else {
      saveMassarConfig(selectedClass, updated);
    }

    const extraData = (scopeMode === 'class' && crossClassSearchEnabled) || scopeMode === 'level'
      ? { tests: extraLevelTests, vmaList: extraLevelVma }
      : undefined;

    const studentListForPopulate = (importedResult?.fileStudents && importedResult.fileStudents.length > 0)
      ? importedResult.fileStudents
      : students;

    const populated = autoPopulateMassarGrades(studentListForPopulate, physicalTests, vmaResults, updated, records, extraData);
    setRecords(populated);
    persistRecords(populated);

    if (importedFileBuffer) {
      const res = fillImportedMassarExcel(importedFileBuffer, studentListForPopulate, populated, updated, importedFileName, extraLevelRecords);
      if (res.success) {
        setImportedResult(res);
      }
    }

    setNotification({
      message: `تم تطبيق قالب الأنشطة (${label || 'المحدد'}) وتحديث النقط تلقائياً!`,
      type: 'success'
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Grade edit handler
  const handleGradeChange = (studentNum: string, field: 'noteDevoir1' | 'noteDevoir2' | 'noteDevoir3', value: string) => {
    let numVal: number | null = null;
    if (value.trim() !== '') {
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < 0 || parsed > 20) return;
      numVal = parsed;
    }

    setRecords(prev => {
      const updated = prev.map(rec => {
        if (rec.numeroEleve === studentNum) {
          const newRec = { ...rec, [field]: numVal };
          const avg = calculateMassarAverage(newRec.noteDevoir1, newRec.noteDevoir2, newRec.noteDevoir3, config.rounding);
          newRec.remarque = getMassarAppreciation(avg, newRec.isDispense, newRec.isAbsent);
          return newRec;
        }
        return rec;
      });
      persistRecords(updated);
      return updated;
    });
  };

  // Quick step (+0.25 / -0.25)
  const handleStepGrade = (studentNum: string, field: 'noteDevoir1' | 'noteDevoir2' | 'noteDevoir3', delta: number) => {
    setRecords(prev => {
      const updated = prev.map(rec => {
        if (rec.numeroEleve === studentNum) {
          const current = rec[field] ?? 10;
          const nextVal = Math.min(20, Math.max(0, Math.round((current + delta) * 4) / 4));
          const newRec = { ...rec, [field]: nextVal };
          const avg = calculateMassarAverage(newRec.noteDevoir1, newRec.noteDevoir2, newRec.noteDevoir3, config.rounding);
          newRec.remarque = getMassarAppreciation(avg, newRec.isDispense, newRec.isAbsent);
          return newRec;
        }
        return rec;
      });
      persistRecords(updated);
      return updated;
    });
  };

  // Status toggle (Dispense / Absent)
  const handleToggleStatus = (studentNum: string, statusType: 'isDispense' | 'isAbsent') => {
    setRecords(prev => {
      const updated = prev.map(rec => {
        if (rec.numeroEleve === studentNum) {
          const nextState = !rec[statusType];
          const newRec = { 
            ...rec, 
            [statusType]: nextState,
            ...(statusType === 'isDispense' && nextState ? { isAbsent: false } : {}),
            ...(statusType === 'isAbsent' && nextState ? { isDispense: false } : {})
          };
          const avg = calculateMassarAverage(newRec.noteDevoir1, newRec.noteDevoir2, newRec.noteDevoir3, config.rounding);
          newRec.remarque = getMassarAppreciation(avg, newRec.isDispense, newRec.isAbsent);
          return newRec;
        }
        return rec;
      });
      persistRecords(updated);
      return updated;
    });
  };

  // Remark change
  const handleRemarkChange = (studentNum: string, remark: string) => {
    setRecords(prev => {
      const updated = prev.map(rec => {
        if (rec.numeroEleve === studentNum) {
          return { ...rec, remarque: remark };
        }
        return rec;
      });
      persistRecords(updated);
      return updated;
    });
  };

  // Inline Massar Code Edit & Persistence
  const handleSaveMassarCode = (studentNum: string) => {
    const code = tempMassarCode.trim();
    setRecords(prev => {
      const updated = prev.map(rec => rec.numeroEleve === studentNum ? { ...rec, codeMassar: code } : rec);
      persistRecords(updated);
      return updated;
    });

    const updatedStudents = students.map(s => s.numeroEleve === studentNum ? { ...s, codeMassar: code } : s);
    setStudents(updatedStudents);
    if (scopeMode === 'class') {
      saveStudentList(selectedClass, updatedStudents).catch(console.error);
    }

    setEditingMassarCodeNum(null);
    setTempMassarCode('');
    setNotification({ message: 'تم حفظ رمز مسار بنجاح!', type: 'success' });
    setTimeout(() => setNotification(null), 2500);
  };

  // Handle Import of Blank Massar Excel File
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      setImportedFileBuffer(buffer);
      setImportedFileName(file.name);

      const extraData = (scopeMode === 'class' && crossClassSearchEnabled) || scopeMode === 'level'
        ? { tests: extraLevelTests, vmaList: extraLevelVma }
        : undefined;

      // First pass: inspect sheet and extract all students directly from the imported Excel
      const initialRes = fillImportedMassarExcel(
        buffer, 
        students, 
        records, 
        config, 
        file.name, 
        extraLevelRecords
      );

      if (!initialRes.success) {
        setNotification({ message: initialRes.error || 'فشل استيراد ورقة مسار', type: 'error' });
        return;
      }

      // If the Excel file contains students, use them as the primary student roster
      let effectiveStudents = students;
      if (initialRes.fileStudents && initialRes.fileStudents.length > 0) {
        effectiveStudents = initialRes.fileStudents;
        setStudents(effectiveStudents);
      }

      // Auto-populate grades for all students in the imported sheet across all level classes
      const populated = autoPopulateMassarGrades(effectiveStudents, physicalTests, vmaResults, config, records, extraData);
      setRecords(populated);
      persistRecords(populated);

      // Second pass: inject populated grades into the original workbook
      const res = fillImportedMassarExcel(
        buffer, 
        effectiveStudents, 
        populated, 
        config, 
        file.name, 
        extraLevelRecords
      );

      setImportedResult(res);
      setDisplayView('roster');

      const levelTitle = scopeMode === 'level' && activeLevel ? activeLevel.shortName : (detectClassLevel(selectedClass).shortName);
      const filledCountNow = populated.filter(r => !r.isDispense && (r.noteDevoir1 !== null || r.noteDevoir2 !== null || r.noteDevoir3 !== null)).length;

      if (res.matchedCount > 0 || filledCountNow > 0) {
        setNotification({
          message: `تم استيراد ورقة مسار الأصلية بنجاح! تم إظهار ${effectiveStudents.length} تلميذ ومطابقة/ملء نقط ${Math.max(res.matchedCount, filledCountNow)} تلميذ تلقائياً بالبحث في أقسام المستوى (${levelTitle})! 📤 جاهز للتصدير.`,
          type: 'success'
        });
      } else {
        setNotification({
          message: `تم استيراد ورقة مسار بنجاح وتم إظهار ${effectiveStudents.length} تلميذ بالجدول. اضغط على "ملء تلقائي لنقط الفروض الثلاثة" للبحث عن نقطهم في روائز مادة التربية البدنية.`,
          type: 'info'
        });
      }
    } catch (err: any) {
      console.error('Import error', err);
      setNotification({ message: 'حدث خطأ أثناء قراءة ملف الإكسيل', type: 'error' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Export filled Massar file
  const handleExportMassar = () => {
    if (records.length === 0) {
      setNotification({ message: 'لا توجد بيانات تلاميذ لتصديرها.', type: 'error' });
      return;
    }

    try {
      let workbookToExport = importedResult?.rawWorkbook;
      if (importedFileBuffer) {
        const studentListForExport = (importedResult?.fileStudents && importedResult.fileStudents.length > 0) 
          ? importedResult.fileStudents 
          : students;
        const res = fillImportedMassarExcel(importedFileBuffer, studentListForExport, records, config, importedFileName, extraLevelRecords);
        if (res.success && res.rawWorkbook) {
          workbookToExport = res.rawWorkbook;
        }
      }

      if (scopeMode === 'level' && activeLevel && !workbookToExport) {
        const classesData = activeLevel.classes.map(cName => ({
          className: cName,
          students: students.filter(s => (s as any).className === cName),
          records: records.filter(r => (r.className || '').trim() === cName)
        }));
        generateOfficialMassarExcelForLevel(activeLevel, classesData, config, true);
        setNotification({ 
          message: `تم تصدير لوائح مسار للمستوى ${activeLevel.shortName} بنجاح!`, 
          type: 'success' 
        });
      } else {
        const targetLabel = scopeMode === 'level' && activeLevel ? activeLevel.shortName : selectedClass;
        if (workbookToExport) {
          const outName = `مسار_مملوء_${targetLabel}_S${config.semestre}_${importedFileName}`;
          exportFilledMassarWorkbook(workbookToExport, outName);
          setNotification({ 
            message: `تم تصدير ورقة مسار الأصلية بنجاح (${outName}) معبأة بالكامل وجاهزة للإرسال إلى موقع مسار! 📤`, 
            type: 'success' 
          });
        } else {
          generateOfficialMassarExcel(targetLabel, students, records, config, false);
          setNotification({ 
            message: `تم تصدير ورقة مسار الرسمية (${targetLabel}) بنجاح!`, 
            type: 'success' 
          });
        }
      }
    } catch (err: any) {
      console.error('Export error', err);
      setNotification({ message: 'فشل تصدير ملف مسار', type: 'error' });
    }
  };

  // Download Blank Template
  const handleDownloadBlankTemplate = () => {
    try {
      const targetLabel = scopeMode === 'level' && activeLevel ? activeLevel.shortName : selectedClass;
      generateOfficialMassarExcel(targetLabel, students, records, config, true);
      setNotification({ message: `تم تنزيل نموذج مسار فارغ لـ ${targetLabel}`, type: 'success' });
    } catch (err) {
      setNotification({ message: 'فشل تنزيل النموذج', type: 'error' });
    }
  };

  // Printable view
  const handlePrint = () => {
    window.print();
  };

  // Filtered students for display
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = rec.nomEleve.toLowerCase().includes(q);
        const matchCode = (rec.codeMassar || '').toLowerCase().includes(q);
        const matchNum = rec.numeroEleve.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchNum) return false;
      }

      // Filter Mode
      if (filterMode === 'filled') {
        return !rec.isDispense && (rec.noteDevoir1 !== null || rec.noteDevoir2 !== null || rec.noteDevoir3 !== null);
      }
      if (filterMode === 'missing') {
        return !rec.isDispense && (rec.noteDevoir1 === null || rec.noteDevoir2 === null || rec.noteDevoir3 === null);
      }
      if (filterMode === 'dispense') {
        return rec.isDispense;
      }
      if (filterMode === 'below10') {
        const avg = calculateMassarAverage(rec.noteDevoir1, rec.noteDevoir2, rec.noteDevoir3, config.rounding);
        return avg !== null && avg < 10 && !rec.isDispense;
      }

      return true;
    });
  }, [records, searchQuery, filterMode, config.rounding]);

  // Count of students with populated grades
  const filledCount = useMemo(() => {
    return records.filter(r => !r.isDispense && (r.noteDevoir1 !== null || r.noteDevoir2 !== null || r.noteDevoir3 !== null)).length;
  }, [records]);

  // Statistics KPI calculations
  const stats = useMemo(() => {
    const total = records.length;
    if (total === 0) return { total: 0, gradedCount: 0, rate: 0, avg1: 0, avg2: 0, avg3: 0, globalAvg: 0, successRate: 0, minGrade: 0, maxGrade: 0 };

    let n1Sum = 0, n1Count = 0;
    let n2Sum = 0, n2Count = 0;
    let n3Sum = 0, n3Count = 0;
    let avgSum = 0, avgCount = 0;
    let successCount = 0;
    let minGrade = 20;
    let maxGrade = 0;
    let fullyGradedCount = 0;

    records.forEach(r => {
      if (r.isDispense) return;

      if (r.noteDevoir1 !== null && r.noteDevoir1 !== undefined) {
        n1Sum += r.noteDevoir1;
        n1Count++;
      }
      if (r.noteDevoir2 !== null && r.noteDevoir2 !== undefined) {
        n2Sum += r.noteDevoir2;
        n2Count++;
      }
      if (r.noteDevoir3 !== null && r.noteDevoir3 !== undefined) {
        n3Sum += r.noteDevoir3;
        n3Count++;
      }

      const avg = calculateMassarAverage(r.noteDevoir1, r.noteDevoir2, r.noteDevoir3, config.rounding);
      if (avg !== null) {
        avgSum += avg;
        avgCount++;
        if (avg >= 10) successCount++;
        if (avg < minGrade) minGrade = avg;
        if (avg > maxGrade) maxGrade = avg;
      }

      if (r.noteDevoir1 !== null && r.noteDevoir2 !== null && r.noteDevoir3 !== null) {
        fullyGradedCount++;
      }
    });

    const activeTotal = records.filter(r => !r.isDispense).length;

    return {
      total,
      gradedCount: fullyGradedCount,
      rate: activeTotal > 0 ? Math.round((fullyGradedCount / activeTotal) * 100) : 0,
      avg1: n1Count > 0 ? parseFloat((n1Sum / n1Count).toFixed(2)) : 0,
      avg2: n2Count > 0 ? parseFloat((n2Sum / n2Count).toFixed(2)) : 0,
      avg3: n3Count > 0 ? parseFloat((n3Sum / n3Count).toFixed(2)) : 0,
      globalAvg: avgCount > 0 ? parseFloat((avgSum / avgCount).toFixed(2)) : 0,
      successRate: avgCount > 0 ? Math.round((successCount / avgCount) * 100) : 0,
      minGrade: avgCount > 0 ? minGrade : 0,
      maxGrade: avgCount > 0 ? maxGrade : 0
    };
  }, [records, config.rounding]);

  const act1Meta = getActivityMeta(config.activity1);
  const act2Meta = getActivityMeta(config.activity2);
  const act3Meta = getActivityMeta(config.activity3);

  return (
    <div className="p-3 sm:p-5 md:p-8 max-w-7xl mx-auto flex flex-col gap-6" dir="rtl">
      {/* Hidden File Input for Blank Massar Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileImport} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-2xl shadow-lg border text-sm font-medium flex items-center justify-between gap-3 animate-fadeIn ${
          notification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
            : notification.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
            {notification.type === 'error' && <InformationCircleIcon />}
            {notification.type === 'info' && <InformationCircleIcon />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <XMarkIcon />
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-7 shadow-sm border border-gray-100 dark:border-gray-700/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Title & Description */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20 text-2xl font-black">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-black text-gray-900 dark:text-white">
                  فضاء مسار (Massar)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  رسمي
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                ملء، استيراد وتصدير لوائح إكسيل متوافقة مع مسار.
              </p>
            </div>
          </div>

          {/* Quick Selectors (Scope, Level/Class & Semester & Settings) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Scope Mode Switch: Level vs Single Class */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-0.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[10px] font-black shadow-xs">
              <button
                onClick={() => setScopeMode('level')}
                className={`px-2 py-1 rounded-lg transition ${
                  scopeMode === 'level'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                🎓 المستوى
              </button>
              <button
                onClick={() => setScopeMode('class')}
                className={`px-2 py-1 rounded-lg transition ${
                  scopeMode === 'class'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                🏫 القسم
              </button>
            </div>

            {/* Level Selector (when in Level Mode) */}
            {scopeMode === 'level' ? (
              <select
                value={selectedLevelId}
                onChange={(e) => setSelectedLevelId(e.target.value)}
                className="bg-indigo-50 dark:bg-indigo-950/40 text-[11px] font-black text-indigo-950 dark:text-indigo-100 rounded-xl px-2 py-1.5 border border-indigo-200 focus:outline-none"
              >
                {availableLevels.map(lvl => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name} ({lvl.totalStudents})
                  </option>
                ))}
              </select>
            ) : (
              /* Class Selector (when in Class Mode) */
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-gray-50 dark:bg-gray-900 text-[11px] font-black text-gray-800 dark:text-gray-200 rounded-xl px-2 py-1.5 border border-gray-200 focus:outline-none"
              >
                {classList.map(c => (
                  <option key={c.className} value={c.className}>
                    {c.className} ({c.studentCount})
                  </option>
                ))}
              </select>
            )}

            {/* Semester Selector */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-0.5 rounded-xl border border-gray-200 text-[10px] font-bold">
              <button
                onClick={() => handleUpdateConfig({ semestre: '1' })}
                className={`px-2 py-1 rounded-lg ${config.semestre === '1' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500'}`}
              >
                S1
              </button>
              <button
                onClick={() => handleUpdateConfig({ semestre: '2' })}
                className={`px-2 py-1 rounded-lg ${config.semestre === '2' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500'}`}
              >
                S2
              </button>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600"
              title="إعدادات"
            >
              <Cog6ToothIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Level / Multi-Class Info Banner */}
        {scopeMode === 'level' && activeLevel && (
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-[10px]">
            <div className="flex flex-wrap gap-1">
              {activeLevel.classes.map(c => (
                <span key={c} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-black border border-indigo-100">
                  {c}
                </span>
              ))}
            </div>
            <span className="text-gray-500 font-bold shrink-0">
              ({activeLevel.totalStudents} تلميذ)
            </span>
          </div>
        )}

        {/* Single Class Mode Info Banner with Cross-Class Toggle */}
        {scopeMode === 'class' && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-300 font-bold">
                المستوى الدراسي المقابل: <strong className="text-indigo-600 dark:text-indigo-400">{detectClassLevel(selectedClass).name}</strong>
              </span>
            </div>
            <button
              onClick={() => setCrossClassSearchEnabled(!crossClassSearchEnabled)}
              className={`px-3 py-1 rounded-xl font-black border transition flex items-center gap-1.5 cursor-pointer ${
                crossClassSearchEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}
              title="جلب نقط التلاميذ الذين تم اختبارهم في أقسام أخرى لنفس المستوى الدراسي"
            >
              <span>{crossClassSearchEnabled ? '✓ جلب النقط من كافة أقسام نفس المستوى مفعّل' : 'البحث في هذا القسم فقط'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3 Selected Activities Configuration Cards */}
      <div className="bg-gradient-to-br from-indigo-50/50 via-white to-emerald-50/40 dark:from-gray-800/80 dark:via-gray-800 dark:to-gray-800/60 rounded-3xl p-5 md:p-6 border border-indigo-100/80 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base md:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>🎯 أنشطة الفروض الثلاثة المعتمدة في مسار</span>
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(لكل فرض نشاط رياضي محدد)</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              حدد الأنشطة التي تم اختبار التلاميذ فيها ليتم ملء نقط الفروض الثلاثة تلقائياً لكل تلميذ.
            </p>
          </div>

          {/* Quick Preset Buttons - Centered on mobile */}
          <div className="flex items-center justify-center md:justify-start gap-1.5 flex-wrap">
            <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold">قوالب جاهزة:</span>
            <button
              onClick={() => handleApplyPreset('sport_collectif', 'gymnastique', 'vitesse_30m', 'ألعاب جماعية + جمباز + سرعة 30م')}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-gray-700 hover:bg-indigo-50 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition"
            >
              ⚽ جماعية + 🤸 جمباز + ⚡ 30م
            </button>
            <button
              onClick={() => handleApplyPreset('sport_collectif', 'gymnastique', 'vitesse_60m', 'ألعاب جماعية + جمباز + سرعة 60م')}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-gray-700 hover:bg-indigo-50 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition"
            >
              ⚽ جماعية + 🤸 جمباز + ⚡ 60م
            </button>
            <button
              onClick={() => handleApplyPreset('vitesse_30m', 'saut_long', 'sport_collectif', 'سرعة 30م + وثب + ألعاب جماعية')}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-gray-700 hover:bg-indigo-50 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition"
            >
              ⚡ 30م + 🦘 وثب + ⚽ ألعاب
            </button>
            <button
              onClick={() => handleApplyPreset('endurance', 'gymnastique', 'sport_collectif', 'VMA + جمباز + ألعاب جماعية')}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-white dark:bg-gray-700 hover:bg-indigo-50 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition"
            >
              🏃 VMA + 🤸 جمباز + ⚽ ألعاب
            </button>
          </div>
        </div>

        {/* The 3 Activity Selectors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Activity 1 (Devoir 1) */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-indigo-100 dark:border-gray-700/80 shadow-xs relative">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-600 text-white">
                الفرض الأول (CC 1)
              </span>
              <span className="text-xl">{act1Meta.icon}</span>
            </div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              النشاط الرياضي المعتمد:
            </label>
            <select
              value={config.activity1}
              onChange={(e) => {
                const newAct = e.target.value as MassarActivityKey;
                handleUpdateConfig({ activity1: newAct });
              }}
              className="w-full text-sm font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {MASSAR_ACTIVITIES.map(a => (
                <option key={a.key} value={a.key}>
                  {a.icon} {a.nameAr}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="تخصيص تسمية الفرض 1 (اختياري)..."
              value={config.activity1CustomLabel || ''}
              onChange={(e) => handleUpdateConfig({ activity1CustomLabel: e.target.value })}
              className="w-full text-xs mt-2 bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-gray-600 dark:text-gray-300 placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Activity 2 (Devoir 2) */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-purple-100 dark:border-gray-700/80 shadow-xs relative">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-purple-600 text-white">
                الفرض الثاني (CC 2)
              </span>
              <span className="text-xl">{act2Meta.icon}</span>
            </div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              النشاط الرياضي المعتمد:
            </label>
            <select
              value={config.activity2}
              onChange={(e) => {
                const newAct = e.target.value as MassarActivityKey;
                handleUpdateConfig({ activity2: newAct });
              }}
              className="w-full text-sm font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {MASSAR_ACTIVITIES.map(a => (
                <option key={a.key} value={a.key}>
                  {a.icon} {a.nameAr}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="تخصيص تسمية الفرض 2 (اختياري)..."
              value={config.activity2CustomLabel || ''}
              onChange={(e) => handleUpdateConfig({ activity2CustomLabel: e.target.value })}
              className="w-full text-xs mt-2 bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-gray-600 dark:text-gray-300 placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Activity 3 (Devoir 3) */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-amber-100 dark:border-gray-700/80 shadow-xs relative">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-600 text-white">
                الفرض الثالث (CC 3)
              </span>
              <span className="text-xl">{act3Meta.icon}</span>
            </div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              النشاط الرياضي المعتمد:
            </label>
            <select
              value={config.activity3}
              onChange={(e) => {
                const newAct = e.target.value as MassarActivityKey;
                handleUpdateConfig({ activity3: newAct });
              }}
              className="w-full text-sm font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {MASSAR_ACTIVITIES.map(a => (
                <option key={a.key} value={a.key}>
                  {a.icon} {a.nameAr}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="تخصيص تسمية الفرض 3 (اختياري)..."
              value={config.activity3CustomLabel || ''}
              onChange={(e) => handleUpdateConfig({ activity3CustomLabel: e.target.value })}
              className="w-full text-xs mt-2 bg-transparent border-b border-gray-200 dark:border-gray-700 py-1 text-gray-600 dark:text-gray-300 placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Auto Fill Button - Centered on mobile */}
        <div className="mt-4 flex items-center justify-center sm:justify-end">
          <button
            onClick={handleAutoPopulate}
            className="flex items-center justify-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-500/25 active:scale-95 transition cursor-pointer w-full sm:w-auto"
          >
            <BoltIcon className="w-4 h-4 text-amber-300 shrink-0" />
            <span>ملء تلقائي لنقط الفروض الثلاثة ⚡</span>
          </button>
        </div>
      </div>

      {/* Action Toolbar - Centered Dock on Mobile */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
          {/* Import Empty Massar Excel */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[11px] sm:text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer"
          >
            <ArrowUpTrayIcon className="w-3.5 h-3.5 shrink-0" />
            <span>استيراد ورقة مسار</span>
          </button>

          {/* Export Filled Massar Excel */}
          <button
            onClick={handleExportMassar}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-black transition active:scale-95 shadow-xs shadow-emerald-600/25 cursor-pointer"
          >
            <ExcelIcon className="w-3.5 h-3.5 shrink-0" />
            <span>تصدير لمسار</span>
          </button>

          {/* Download Blank Template */}
          <button
            onClick={handleDownloadBlankTemplate}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-[11px] sm:text-xs font-bold transition cursor-pointer"
            title="تحميل نموذج مسار فارغ للقسم"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5 shrink-0" />
            <span>نموذج فارغ</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
          {/* Printable Sheet */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs font-bold transition cursor-pointer"
          >
            <PrinterIcon className="w-3.5 h-3.5 shrink-0" />
            <span>طباعة المحضر</span>
          </button>
        </div>
      </div>

      {/* Imported File Status Banner (if a file was loaded) */}
      {importedResult && (
        <div className="bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg">
              ✓
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                تم استيراد ورقة مسار الأصلية ({importedResult.originalFileName})
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                تمت مطابقة <strong>{importedResult.matchedCount}</strong> من أصل <strong>{importedResult.totalStudentsInFile}</strong> تلميذ بنجاح. تم حقن النقط مباشرة في خلايا الملف الأصلي.
              </p>
            </div>
          </div>
          <button
            onClick={handleExportMassar}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs self-end sm:self-auto"
          >
            تنزيل الملف المحقون الآن 📤
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">نسبة المسك الكامل</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">{stats.rate}%</span>
            <span className="text-xs text-gray-400">({stats.gradedCount}/{stats.total})</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-1">معدل الفرض 1</span>
          <span className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.avg1}</span>
          <span className="text-[10px] text-gray-400 block truncate">/20 ({act1Meta.shortAr})</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 block mb-1">معدل الفرض 2</span>
          <span className="text-xl md:text-2xl font-black text-purple-600 dark:text-purple-400">{stats.avg2}</span>
          <span className="text-[10px] text-gray-400 block truncate">/20 ({act2Meta.shortAr})</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block mb-1">معدل الفرض 3</span>
          <span className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400">{stats.avg3}</span>
          <span className="text-[10px] text-gray-400 block truncate">/20 ({act3Meta.shortAr})</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mb-1">المعدل العام للمراقبة</span>
          <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.globalAvg}</span>
          <span className="text-[10px] text-gray-400 block">/20 للقسم</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-1">نسبة النجاح (≥10)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400">{stats.successRate}%</span>
            <span className="text-xs text-gray-400">أعلى: {stats.maxGrade}</span>
          </div>
        </div>
      </div>

      {/* Search, Display Views, and Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو رمز مسار أو رقم التلميذ أو القسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-gray-100"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon />
              </button>
            )}
          </div>

          {/* View Switcher: Interactive Table vs Official Massar Roster */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-black shadow-xs self-start sm:self-auto">
            <button
              onClick={() => setDisplayView('table')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                displayView === 'table'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>📋 جدول المسك والتعديل السريع</span>
            </button>
            <button
              onClick={() => setDisplayView('roster')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                displayView === 'roster'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>📜 كشف نقط مسار المعبأة (معاينة وطباعة)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                {filledCount}
              </span>
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl transition ${
              filterMode === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            الكل ({records.length})
          </button>
          <button
            onClick={() => setFilterMode('filled')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
              filterMode === 'filled'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700'
            }`}
          >
            <span>التي تم ملؤها بنجاح 🌟</span>
            <span>({filledCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('missing')}
            className={`px-3 py-1.5 rounded-xl transition ${
              filterMode === 'missing'
                ? 'bg-rose-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            تنقصهم نقط ({records.filter(r => !r.isDispense && (r.noteDevoir1 === null || r.noteDevoir2 === null || r.noteDevoir3 === null)).length})
          </button>
          <button
            onClick={() => setFilterMode('dispense')}
            className={`px-3 py-1.5 rounded-xl transition ${
              filterMode === 'dispense'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            المعفون طبياً ({records.filter(r => r.isDispense).length})
          </button>
          <button
            onClick={() => setFilterMode('below10')}
            className={`px-3 py-1.5 rounded-xl transition ${
              filterMode === 'below10'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            أقل من 10 ({records.filter(r => {
              const avg = calculateMassarAverage(r.noteDevoir1, r.noteDevoir2, r.noteDevoir3, config.rounding);
              return avg !== null && avg < 10 && !r.isDispense;
            }).length})
          </button>
        </div>
      </div>

      {/* VIEW 1: OFFICIAL POPULATED MASSAR ROSTER (كشف نقط مسار المعبأة) */}
      {displayView === 'roster' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700/80 shadow-md p-6 sm:p-8 animate-fadeIn">
          {/* Printable Header Card */}
          <div className="border-b-2 border-gray-900 dark:border-gray-100 pb-5 mb-6 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
              <div className="text-right text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <p className="font-bold">المملكة المغربية</p>
                <p className="font-black text-gray-900 dark:text-white">وزارة التربية الوطنية والتعليم الأولي والرياضة</p>
                <p>الأكاديمية الجهوية: <span className="font-bold">{config.academie || 'الجهة الشرقية'}</span></p>
                <p>المديرية الإقليمية: <span className="font-bold">{config.direction || 'مديرية فكيك'}</span></p>
                <p>المؤسسة: <span className="font-bold">{config.schoolName || 'الثانوية التأهيلية'}</span></p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-2xl shadow-sm mb-1">
                  🇲🇦
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  كشف نقط المراقبة المستمرة لمادة التربية البدنية والرياضية
                </h3>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {scopeMode === 'level' && activeLevel 
                    ? `لائحة مجمعة لمستوى: ${activeLevel.name} (تشمل الأقسام: ${activeLevel.classes.join(', ')})`
                    : `لائحة مسار للقسم: ${selectedClass}`
                  }
                </p>
              </div>

              <div className="text-left text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <p>المادة: <span className="font-bold text-gray-900 dark:text-white">التربية البدنية والرياضية</span></p>
                <p>الدورة: <span className="font-bold">{config.semestre === '1' ? 'الدورة الأولى (S1)' : 'الدورة الثانية (S2)'}</span></p>
                <p>السنة الدراسية: <span className="font-bold">{config.schoolYear}</span></p>
                <p>الأستاذ: <span className="font-bold">{config.teacherName || '—'}</span></p>
                <p className="text-[11px] text-gray-400">تاريخ الطباعة: {new Date().toLocaleDateString('ar-MA')}</p>
              </div>
            </div>

            {/* Activities Legend Bar */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 flex flex-wrap items-center justify-around gap-2 text-xs">
              <span className="font-black text-emerald-900 dark:text-emerald-200">
                🎯 الأنشطة المعتمدة في الفروض الثلاثة:
              </span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                1️⃣ الفرض الأول: {config.activity1CustomLabel || act1Meta.nameAr}
              </span>
              <span className="font-bold text-purple-700 dark:text-purple-300">
                2️⃣ الفرض الثاني: {config.activity2CustomLabel || act2Meta.nameAr}
              </span>
              <span className="font-bold text-amber-700 dark:text-amber-300">
                3️⃣ الفرض الثالث: {config.activity3CustomLabel || act3Meta.nameAr}
              </span>
            </div>
          </div>

          {/* Action buttons inside Roster View */}
          <div className="flex items-center justify-between gap-3 mb-4 print:hidden flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-700 dark:text-gray-300">
                عرض {filteredRecords.length} تلميذ ({filteredRecords.filter(r => !r.isDispense && (r.noteDevoir1 !== null || r.noteDevoir2 !== null || r.noteDevoir3 !== null)).length} معبأة)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-black shadow-xs hover:opacity-90 transition cursor-pointer"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>طباعة هذا الكشف الرسمي 🖨️</span>
              </button>

              <button
                onClick={handleExportMassar}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition cursor-pointer"
              >
                <ExcelIcon className="w-4 h-4" />
                <span>تصدير ورقة مسار Excel 📊</span>
              </button>
            </div>
          </div>

          {/* Official Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border border-gray-300 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-900/90 text-gray-800 dark:text-gray-200 font-black border-b border-gray-300 dark:border-gray-700">
                  <th className="py-2.5 px-2 text-center w-10 border-l border-gray-300 dark:border-gray-700">ر.ت</th>
                  <th className="py-2.5 px-2.5 min-w-[110px] border-l border-gray-300 dark:border-gray-700">رمز مسار</th>
                  <th className="py-2.5 px-3 min-w-[170px] border-l border-gray-300 dark:border-gray-700">الاسم والنسب</th>
                  <th className="py-2.5 px-2 text-center min-w-[80px] border-l border-gray-300 dark:border-gray-700">القسم</th>
                  <th className="py-2.5 px-2.5 text-center min-w-[110px] bg-indigo-50/70 dark:bg-indigo-950/30 border-l border-gray-300 dark:border-gray-700">
                    <div>الفرض الأول</div>
                    <div className="text-[10px] font-normal text-indigo-700 dark:text-indigo-300 truncate max-w-[100px]">{act1Meta.shortAr}</div>
                  </th>
                  <th className="py-2.5 px-2.5 text-center min-w-[110px] bg-purple-50/70 dark:bg-purple-950/30 border-l border-gray-300 dark:border-gray-700">
                    <div>الفرض الثاني</div>
                    <div className="text-[10px] font-normal text-purple-700 dark:text-purple-300 truncate max-w-[100px]">{act2Meta.shortAr}</div>
                  </th>
                  <th className="py-2.5 px-2.5 text-center min-w-[110px] bg-amber-50/70 dark:bg-amber-950/30 border-l border-gray-300 dark:border-gray-700">
                    <div>الفرض الثالث</div>
                    <div className="text-[10px] font-normal text-amber-700 dark:text-amber-300 truncate max-w-[100px]">{act3Meta.shortAr}</div>
                  </th>
                  <th className="py-2.5 px-2.5 text-center min-w-[100px] bg-emerald-50/80 dark:bg-emerald-950/30 border-l border-gray-300 dark:border-gray-700 font-black">
                    معدل المراقبة
                  </th>
                  <th className="py-2.5 px-3 min-w-[180px] border-l border-gray-300 dark:border-gray-700">ملاحظات الأستاذ</th>
                  <th className="py-2.5 px-2 text-center min-w-[80px]">حالة المسك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400 font-bold">
                      لا يوجد تلاميذ يطابقون خيارات البحث أو التصفية الحالية
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, idx) => {
                    const student = students.find(s => s.numeroEleve === rec.numeroEleve);
                    const avg = calculateMassarAverage(rec.noteDevoir1, rec.noteDevoir2, rec.noteDevoir3, config.rounding);
                    const isAllFilled = rec.noteDevoir1 !== null && rec.noteDevoir2 !== null && rec.noteDevoir3 !== null;
                    const isPartFilled = !isAllFilled && (rec.noteDevoir1 !== null || rec.noteDevoir2 !== null || rec.noteDevoir3 !== null);

                    return (
                      <tr 
                        key={`${rec.numeroEleve}-${idx}`} 
                        className={`hover:bg-gray-50/60 dark:hover:bg-gray-700/30 ${
                          rec.isDispense ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="py-2 px-2 text-center font-bold text-gray-500 border-l border-gray-200 dark:border-gray-700">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-gray-800 dark:text-gray-200 border-l border-gray-200 dark:border-gray-700">
                          {rec.codeMassar || rec.numeroEleve}
                        </td>
                        <td className="py-2 px-3 font-bold text-gray-900 dark:text-white border-l border-gray-200 dark:border-gray-700">
                          {rec.nomEleve}
                        </td>
                        <td className="py-2 px-2 text-center border-l border-gray-200 dark:border-gray-700">
                          <span className="px-2 py-0.5 rounded font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {rec.className || student?.className || selectedClass}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-center font-black border-l border-gray-200 dark:border-gray-700 bg-indigo-50/20 dark:bg-indigo-950/10">
                          {rec.isDispense ? (
                            <span className="text-amber-600 font-bold">معفى</span>
                          ) : rec.noteDevoir1 !== null && rec.noteDevoir1 !== undefined ? (
                            <span className="text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950 px-2 py-0.5 rounded font-black">
                              {rec.noteDevoir1}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center font-black border-l border-gray-200 dark:border-gray-700 bg-purple-50/20 dark:bg-purple-950/10">
                          {rec.isDispense ? (
                            <span className="text-amber-600 font-bold">معفى</span>
                          ) : rec.noteDevoir2 !== null && rec.noteDevoir2 !== undefined ? (
                            <span className="text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950 px-2 py-0.5 rounded font-black">
                              {rec.noteDevoir2}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center font-black border-l border-gray-200 dark:border-gray-700 bg-amber-50/20 dark:bg-amber-950/10">
                          {rec.isDispense ? (
                            <span className="text-amber-600 font-bold">معفى</span>
                          ) : rec.noteDevoir3 !== null && rec.noteDevoir3 !== undefined ? (
                            <span className="text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950 px-2 py-0.5 rounded font-black">
                              {rec.noteDevoir3}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-center font-black border-l border-gray-200 dark:border-gray-700 bg-emerald-50/20 dark:bg-emerald-950/10">
                          {rec.isDispense ? (
                            <span className="text-amber-600 font-bold">معفى</span>
                          ) : avg !== null ? (
                            <span className={`px-2 py-0.5 rounded font-black ${
                              avg >= 15 ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950' :
                              avg >= 10 ? 'text-blue-700 bg-blue-100 dark:bg-blue-950' :
                              'text-rose-700 bg-rose-100 dark:bg-rose-950'
                            }`}>
                              {avg}/20
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700">
                          {rec.remarque || '—'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {rec.isDispense ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              معفى
                            </span>
                          ) : isAllFilled ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              ✓ مكتمل (3/3)
                            </span>
                          ) : isPartFilled ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                              ⚡ جزئي
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-bold">- فارغ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Roster Summary KPI footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-gray-600 dark:text-gray-300">
            <div>
              <span>مجموع التلاميذ: <strong>{records.length}</strong></span>
              <span className="mx-2">•</span>
              <span className="text-emerald-600 dark:text-emerald-400">المعبأة نقطهم: <strong>{filledCount}</strong> ({records.length > 0 ? Math.round((filledCount / records.length) * 100) : 0}%)</span>
              <span className="mx-2">•</span>
              <span className="text-amber-600">المعفون: <strong>{records.filter(r => r.isDispense).length}</strong></span>
            </div>
            <div>
              <span className="text-indigo-600 dark:text-indigo-400">معدل الفرض 1: <strong>{stats.avg1}/20</strong></span>
              <span className="mx-2">•</span>
              <span className="text-purple-600 dark:text-purple-400">الفرض 2: <strong>{stats.avg2}/20</strong></span>
              <span className="mx-2">•</span>
              <span className="text-amber-600 dark:text-amber-400">الفرض 3: <strong>{stats.avg3}/20</strong></span>
              <span className="mx-2">•</span>
              <span className="text-emerald-600 dark:text-emerald-400">المعدل العام: <strong>{stats.globalAvg}/20</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: INTERACTIVE MASSAR TABLE (جدول المسك والتعديل السريع) */}
      {displayView === 'table' && (
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700/80 shadow-sm overflow-hidden animate-fadeIn">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/90 text-gray-600 dark:text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="py-3.5 px-3 text-center w-12">ر.ت</th>
                <th className="py-3.5 px-3 min-w-[120px]">رمز مسار</th>
                <th className="py-3.5 px-4 min-w-[200px]">الاسم والنسب</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">القسم</th>
                <th className="py-3.5 px-3 text-center min-w-[130px] bg-indigo-50/50 dark:bg-indigo-950/20">
                  <div className="flex flex-col items-center">
                    <span className="text-indigo-700 dark:text-indigo-300 font-black">الفرض الأول (CC1)</span>
                    <span className="text-[10px] font-normal text-indigo-500 truncate max-w-[120px]">
                      {config.activity1CustomLabel || act1Meta.shortAr}
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-3 text-center min-w-[130px] bg-purple-50/50 dark:bg-purple-950/20">
                  <div className="flex flex-col items-center">
                    <span className="text-purple-700 dark:text-purple-300 font-black">الفرض الثاني (CC2)</span>
                    <span className="text-[10px] font-normal text-purple-500 truncate max-w-[120px]">
                      {config.activity2CustomLabel || act2Meta.shortAr}
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-3 text-center min-w-[130px] bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="flex flex-col items-center">
                    <span className="text-amber-700 dark:text-amber-300 font-black">الفرض الثالث (CC3)</span>
                    <span className="text-[10px] font-normal text-amber-500 truncate max-w-[120px]">
                      {config.activity3CustomLabel || act3Meta.shortAr}
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-3 text-center min-w-[110px] bg-emerald-50/40 dark:bg-emerald-950/20">
                  <span className="text-emerald-700 dark:text-emerald-300 font-black">معدل المراقبة</span>
                </th>
                <th className="py-3.5 px-3 text-center min-w-[100px]">الحالة</th>
                <th className="py-3.5 px-4 min-w-[200px]">ملاحظات الأستاذ</th>
                <th className="py-3.5 px-2 text-center w-12">تقويم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    لا يوجد تلاميذ يطابقون خيارات البحث أو التصفية
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, idx) => {
                  const student = students.find(s => s.numeroEleve === rec.numeroEleve);
                  const avg = calculateMassarAverage(rec.noteDevoir1, rec.noteDevoir2, rec.noteDevoir3, config.rounding);

                  const avgColor = rec.isDispense 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                    : avg === null
                    ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    : avg >= 15
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300'
                    : avg >= 12
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300'
                    : avg >= 10
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300';

                  const studentClassName = rec.className || student?.className || selectedClass;

                  return (
                    <tr 
                      key={`${rec.numeroEleve}-${idx}-2`} 
                      className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors ${
                        rec.isDispense ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Order N° */}
                      <td className="py-3 px-3 text-center text-xs font-bold text-gray-400">
                        {idx + 1}
                      </td>

                      {/* Massar Code */}
                      <td className="py-3 px-3 text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                        {editingMassarCodeNum === rec.numeroEleve ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempMassarCode}
                              onChange={(e) => setTempMassarCode(e.target.value.toUpperCase())}
                              className="w-24 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-gray-900 border-indigo-500 focus:outline-none"
                              placeholder="G13456789"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveMassarCode(rec.numeroEleve)}
                              className="p-1 text-emerald-600 hover:text-emerald-700"
                              title="حفظ"
                            >
                              <CheckIcon />
                            </button>
                            <button
                              onClick={() => setEditingMassarCodeNum(null)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="إلغاء"
                            >
                              <XMarkIcon />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span>{rec.codeMassar || rec.numeroEleve}</span>
                            <button
                              onClick={() => {
                                setEditingMassarCodeNum(rec.numeroEleve);
                                setTempMassarCode(rec.codeMassar || rec.numeroEleve);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition p-0.5"
                              title="تعديل رمز مسار"
                            >
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar 
                            student={student || { numeroEleve: rec.numeroEleve, nomEleve: rec.nomEleve, sexe: rec.sexe }} 
                            size="sm" 
                          />
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white block">
                              {rec.nomEleve}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              رقم: {rec.numeroEleve} {rec.sexe === 'F' ? '• أنثى' : '• ذكر'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Class Badge */}
                      <td className="py-3 px-2 text-center text-xs">
                        <span className="px-2 py-0.5 rounded-lg font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {studentClassName}
                        </span>
                        {rec.matchedFromClass && rec.matchedFromClass !== studentClassName && (
                          <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5" title={`تم جلب النقط من رائز ${rec.matchedFromClass}`}>
                            جُلب من {rec.matchedFromClass}
                          </span>
                        )}
                      </td>

                      {/* Note CC1 */}
                      <td className="py-3 px-3 text-center bg-indigo-50/20 dark:bg-indigo-950/10">
                        {rec.isDispense ? (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">معفى</span>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleStepGrade(rec.numeroEleve, 'noteDevoir1', -0.25)}
                              className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                              title="-0.25"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={rec.noteDevoir1 !== null && rec.noteDevoir1 !== undefined ? rec.noteDevoir1 : ''}
                              onChange={(e) => handleGradeChange(rec.numeroEleve, 'noteDevoir1', e.target.value)}
                              placeholder="-"
                              className={`w-14 text-center font-black text-sm py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                rec.noteDevoir1 !== null && rec.noteDevoir1 !== undefined 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' 
                                  : 'bg-white dark:bg-gray-900 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                              }`}
                            />
                            <button
                              onClick={() => handleStepGrade(rec.numeroEleve, 'noteDevoir1', 0.25)}
                              className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                              title="+0.25"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Note CC2 */}
                      <td className="py-3 px-3 text-center bg-purple-50/20 dark:bg-purple-950/10">
                        {rec.isDispense ? (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">معفى</span>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleStepGrade(rec.numeroEleve, 'noteDevoir2', -0.25)}
                              className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                              title="-0.25"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={rec.noteDevoir2 !== null && rec.noteDevoir2 !== undefined ? rec.noteDevoir2 : ''}
                              onChange={(e) => handleGradeChange(rec.numeroEleve, 'noteDevoir2', e.target.value)}
                              placeholder="-"
                              className={`w-14 text-center font-black text-sm py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                rec.noteDevoir2 !== null && rec.noteDevoir2 !== undefined 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' 
                                  : 'bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                              }`}
                            />
                            <button
                              onClick={() => handleStepGrade(rec.numeroEleve, 'noteDevoir2', 0.25)}
                              className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                              title="+0.25"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Note CC3 */}
                      <td className="py-3 px-3 text-center bg-amber-50/20 dark:bg-amber-950/10">
                        {rec.isDispense ? (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">معفى</span>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleStepGrade(rec.numeroEleve, 'noteDevoir3', -0.25)}
                              className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                              title="-0.25"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={rec.noteDevoir3 !== null && rec.noteDevoir3 !== undefined ? rec.noteDevoir3 : ''}
                              onChange={(e) => handleGradeChange(rec.numeroEleve, 'noteDevoir3', e.target.value)}
                              placeholder="-"
                              className={`w-14 text-center font-black text-sm py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                                rec.noteDevoir3 !== null && rec.noteDevoir3 !== undefined 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' 
                                  : 'bg-white dark:bg-gray-900 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                              }`}
                            />
                            <button
                              onClick={() => handleStepGrade(rec.numeroEleve, 'noteDevoir3', 0.25)}
                              className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                              title="+0.25"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Calculated Continuous Assessment Average */}
                      <td className="py-3 px-3 text-center bg-emerald-50/20 dark:bg-emerald-950/10">
                        {rec.isDispense ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            معفى
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${avgColor}`}>
                            {avg !== null ? `${avg}/20` : '-'}
                          </span>
                        )}
                      </td>

                      {/* Status Buttons (Dispense / Absent) */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleToggleStatus(rec.numeroEleve, 'isDispense')}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                              rec.isDispense
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-gray-100 dark:bg-gray-700 hover:bg-amber-100 text-gray-500 hover:text-amber-700'
                            }`}
                            title="إعفاء طبي"
                          >
                            معفى
                          </button>
                          <button
                            onClick={() => handleToggleStatus(rec.numeroEleve, 'isAbsent')}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition ${
                              rec.isAbsent
                                ? 'bg-rose-500 text-white shadow-xs'
                                : 'bg-gray-100 dark:bg-gray-700 hover:bg-rose-100 text-gray-500 hover:text-rose-700'
                            }`}
                            title="غائب"
                          >
                            غائب
                          </button>
                        </div>
                      </td>

                      {/* Remarques / Appreciation */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={rec.remarque || ''}
                          onChange={(e) => handleRemarkChange(rec.numeroEleve, e.target.value)}
                          placeholder="ملاحظات الأستاذ..."
                          className="w-full text-xs py-1 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                        />
                      </td>

                      {/* Quick Eval Trigger Button */}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => {
                            setQuickEvalStudentNumber(rec.numeroEleve);
                            setIsQuickEvalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                          title="تقويم سريع وتفصيلي"
                        >
                          <BoltIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-lg w-full border border-gray-200 dark:border-gray-700 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Cog6ToothIcon />
                <span>إعدادات ترويسة مسار والتقريب</span>
              </h3>
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon />
              </button>
            </div>

            <div className="py-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                  المؤسسة التعليمية (Lycée / Collège):
                </label>
                <input
                  type="text"
                  value={config.schoolName || ''}
                  onChange={(e) => handleUpdateConfig({ schoolName: e.target.value })}
                  placeholder="مثال: الثانوية التأهيلية النهضة"
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    المديرية الإقليمية:
                  </label>
                  <input
                    type="text"
                    value={config.direction || ''}
                    onChange={(e) => handleUpdateConfig({ direction: e.target.value })}
                    placeholder="مثال: مديرية فكيك"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    الأكاديمية الجهوية:
                  </label>
                  <input
                    type="text"
                    value={config.academie || ''}
                    onChange={(e) => handleUpdateConfig({ academie: e.target.value })}
                    placeholder="مثال: جهة الشرق"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    أستاذ المادة:
                  </label>
                  <input
                    type="text"
                    value={config.teacherName || ''}
                    onChange={(e) => handleUpdateConfig({ teacherName: e.target.value })}
                    placeholder="اسم الأستاذ"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    السنة الدراسية:
                  </label>
                  <input
                    type="text"
                    value={config.schoolYear || ''}
                    onChange={(e) => handleUpdateConfig({ schoolYear: e.target.value })}
                    placeholder="2025/2026"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                  نظام تقريب النقط (Arrondi des notes):
                </label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    { id: '0.25', label: 'أقرب 0.25 (المعتمد)' },
                    { id: '0.5', label: 'أقرب 0.50' },
                    { id: '1', label: 'أعداد صحيحة' },
                    { id: 'none', label: 'بدون تقريب' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleUpdateConfig({ rounding: opt.id as any })}
                      className={`p-2 rounded-xl border font-bold text-center transition ${
                        config.rounding === opt.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
              >
                حفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Evaluation Modal */}
      {isQuickEvalOpen && quickEvalStudentNumber && (
        <QuickEvaluationModal
          isOpen={isQuickEvalOpen}
          onClose={() => {
            setIsQuickEvalOpen(false);
            setQuickEvalStudentNumber(null);
          }}
          selectedClass={selectedClass}
          allStudents={students}
          physicalTests={physicalTests}
          studentNumber={quickEvalStudentNumber}
          initialMode={
            config.activity1 === 'gymnastique' ? 'gymnastics' :
            (config.activity1 === 'vitesse' || config.activity1 === 'endurance' || config.activity1 === 'saut_long' || config.activity1 === 'lancer_poids') ? 'athletics' :
            config.activity1 === 'global_general' ? 'global' : 'team_games'
          }
          currentSportId={
            config.activity1 === 'basketball' ? 'basketball' :
            config.activity1 === 'handball' ? 'handball' :
            config.activity1 === 'volleyball' ? 'volleyball' :
            config.activity1 === 'rugby' ? 'rugby' : 'football'
          }
          onSelectStudent={(num) => setQuickEvalStudentNumber(num)}
          onSaveStudentScores={async (updatedTest) => {
            // Persist to tests database
            const updatedTests = physicalTests.map(t => t.numeroEleve === updatedTest.numeroEleve ? updatedTest : t);
            if (!updatedTests.some(t => t.numeroEleve === updatedTest.numeroEleve)) {
              updatedTests.push(updatedTest);
            }
            setPhysicalTests(updatedTests);
            await savePhysicalTests(selectedClass, updatedTests);

            const populated = autoPopulateMassarGrades(students, updatedTests, vmaResults, config, records);
            setRecords(populated);
            saveMassarGrades(selectedClass, populated);
            setNotification({ message: 'تم تحديث نقط مسار للتلميذ بنجاح!', type: 'success' });
            setTimeout(() => setNotification(null), 2500);
          }}
        />
      )}
    </div>
  );
};
