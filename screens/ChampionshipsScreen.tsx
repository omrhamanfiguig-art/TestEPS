import React, { useState, useEffect, useMemo } from 'react';
import type { StudentIdentity, ChampionshipRegistration } from '../types';
import { 
  TrophyIcon, 
  UserGroupIcon, 
  TrashIcon, 
  CheckCircleIcon, 
  PlusIcon, 
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  SparklesIcon,
  InformationCircleIcon,
  PrinterIcon
} from '../components/Icons';
import { useLanguage } from '../utils/i18n';
import { StudentAvatar } from '../components/StudentAvatar';
import { PrintPreviewModal, PrintPreviewColumn } from '../components/PrintPreviewModal';
import { exportParticipantsToExcel } from '../utils/excelHelper';
import { 
  getAllClasses, 
  saveChampionshipRegistration, 
  deleteChampionshipRegistration,
  getAllChampionshipRegistrations,
  searchStudentsGlobal,
  normalizeArabicText,
  ClassStats,
  GlobalStudentSearchResult
} from '../utils/db';
import { detectLevelFromClassName, EDUCATIONAL_LEVELS, LevelKey } from '../utils/teacherHelper';

interface ChampionshipsScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
}

type ChampionshipType = 'cross_country' | 'athletics' | 'football';

export const ChampionshipsScreen: React.FC<ChampionshipsScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  const { language } = useLanguage();
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [students, setStudents] = useState<GlobalStudentSearchResult[]>([]);
  const [registrations, setRegistrations] = useState<ChampionshipRegistration[]>([]);
  const [activeTab, setActiveChampionship] = useState<ChampionshipType>('cross_country');

  // New level and class filters (Requested in point 6 & 7)
  const [selectedLevel, setSelectedLevel] = useState<LevelKey | 'all'>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Search & auxiliary filter states (Point 6)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [vmaFilter, setVmaFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [testFilter, setTestFilter] = useState<'ALL' | 'PHYSICAL_DONE' | 'VMA_DONE' | 'ANY_TEST_DONE'>('ALL');

  // Form states
  const [selectedStudent, setSelectedStudent] = useState<GlobalStudentSearchResult | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [editingRegistration, setEditingRegistration] = useState<ChampionshipRegistration | null>(null);
  const [birthDate, setBirthDate] = useState<string>('');
  const [sportRole, setSportRole] = useState<string>('');
  const [studentPhotoUrl, setStudentPhotoUrl] = useState<string | undefined>(undefined);
  const [note, setNote] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Print Preview Modal State
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printPreviewConfig, setPrintPreviewConfig] = useState<{
    title: string;
    subtitle?: string;
    columns: PrintPreviewColumn[];
    data: Array<Record<string, any>>;
    onExportExcel?: () => void;
  }>({
    title: '',
    columns: [],
    data: []
  });

  // Sport roles dropdown options based on championship type
  const sportRoleOptions = useMemo(() => {
    switch (activeTab) {
      case 'cross_country':
        return [
          { value: 'صغار / صغيراث (Minimes)', label: 'صغار / صغيراث (Minimes)' },
          { value: 'فتيان / فتيَات (Cadets)', label: 'فتيان / فتيَات (Cadets)' },
          { value: 'شبان / شابات (Juniors)', label: 'شبان / شابات (Juniors)' },
          { value: 'سباق ريفي عام (Cross Country Mass)', label: 'سباق ريفي عام (Cross Country Mass)' }
        ];
      case 'athletics':
        return [
          { value: 'سباق السرعة 60م / 100م (Vitesse)', label: 'سباق السرعة 60م / 100م (Vitesse)' },
          { value: 'الوثب الطولي (Saut en Longueur)', label: 'الوثب الطولي (Saut en Longueur)' },
          { value: 'دفع الجلة (Lancer de Poids)', label: 'دفع الجلة (Lancer de Poids)' },
          { value: 'سباق التحمل والمطاردة (Demi-fond)', label: 'سباق التحمل والمطاردة (Demi-fond)' },
          { value: 'مسابقة مركبة (Épreuves Combinées)', label: 'مسابقة مركبة (Épreuves Combinées)' }
        ];
      case 'football':
        return [
          { value: 'حارس مرمى (Gardien)', label: 'حارس مرمى (Gardien)' },
          { value: 'مدافع أوسط / جانبي (Défenseur)', label: 'مدافع أوسط / جانبي (Défenseur)' },
          { value: 'وسط ميدان (Milieu)', label: 'وسط ميدان (Milieu)' },
          { value: 'مهاجم صريح / جناح (Attaquant)', label: 'مهاجم صريح / جناح (Attaquant)' },
          { value: 'قائد الفريق (Capitaine)', label: 'قائد الفريق (Capitaine)' }
        ];
    }
  }, [activeTab]);

  useEffect(() => {
    if (sportRoleOptions.length > 0 && (!sportRole || !sportRoleOptions.some(o => o.value === sportRole))) {
      setSportRole(sportRoleOptions[0].value);
    }
  }, [activeTab, sportRoleOptions]);

  // Load classes, all students & registrations
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const cls = await getAllClasses();
      setClasses(cls);

      const allRegs = await getAllChampionshipRegistrations();
      setRegistrations(allRegs);

      const allStds = await searchStudentsGlobal('');
      setStudents(allStds);
    } catch (err) {
      console.error('Error loading championships data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Sync with prop if user selects a specific class filter
  useEffect(() => {
    if (selectedClassFilter !== 'all' && selectedClassFilter !== selectedClass) {
      setSelectedClass(selectedClassFilter);
    }
  }, [selectedClassFilter]);

  // Sync local filter if selectedClass prop changes externally
  useEffect(() => {
    if (selectedClass && selectedClassFilter !== selectedClass && selectedClassFilter !== 'all') {
      setSelectedClassFilter(selectedClass);
    }
  }, [selectedClass]);

  // Reset student selection when active sport tab or level/class filters change
  useEffect(() => {
    setSelectedStudent(null);
    setBirthDate('');
    if (sportRoleOptions.length > 0) {
      setSportRole(sportRoleOptions[0].value);
    }
    setNote('');
    setStudentPhotoUrl(undefined);
  }, [activeTab, selectedLevel, selectedClassFilter]);

  // Sync photo & birthdate when student selected or editing
  useEffect(() => {
    if (selectedStudent) {
      setStudentPhotoUrl(selectedStudent.student.photoUrl);
      const num = selectedStudent.student.numeroEleve;
      const priorReg = registrations.find(r => r.numeroEleve === num && r.dateNaissance);
      if (priorReg && priorReg.dateNaissance) {
        setBirthDate(priorReg.dateNaissance);
      } else {
        setBirthDate('');
      }
    } else if (editingRegistration) {
      setStudentPhotoUrl(editingRegistration.photoUrl);
    } else {
      setStudentPhotoUrl(undefined);
      setBirthDate('');
    }
  }, [selectedStudent, editingRegistration, registrations]);

  // Handle db update events (e.g. from background cloud sync)
  useEffect(() => {
    const handleDbUpdate = () => {
      loadAllData();
    };
    window.addEventListener('dbUpdated', handleDbUpdate);
    return () => window.removeEventListener('dbUpdated', handleDbUpdate);
  }, []);

  // Filter available classes to show in Class Filter dropdown based on selected Level
  const filteredClassOptions = useMemo(() => {
    if (selectedLevel === 'all') {
      return classes;
    }
    return classes.filter(c => detectLevelFromClassName(c.className).key === selectedLevel);
  }, [classes, selectedLevel]);

  // Whenever level changes, if current class filter is not compatible, reset it to 'all'
  useEffect(() => {
    if (selectedLevel !== 'all' && selectedClassFilter !== 'all') {
      const isCompatible = filteredClassOptions.some(c => c.className === selectedClassFilter);
      if (!isCompatible) {
        setSelectedClassFilter('all');
      }
    }
  }, [selectedLevel, filteredClassOptions, selectedClassFilter]);

  // Filter registrations by sport tab, level, and class (Point 7: ability to filter rosters by level & section)
  const filteredRegs = useMemo(() => {
    return registrations.filter(r => {
      // 1. Sport check
      if (r.championshipType !== activeTab) return false;

      // 2. Level filter check
      if (selectedLevel !== 'all') {
        const lvl = detectLevelFromClassName(r.className).key;
        if (lvl !== selectedLevel) return false;
      }

      // 3. Section/Class filter check
      if (selectedClassFilter !== 'all') {
        if (r.className !== selectedClassFilter) return false;
      }

      return true;
    });
  }, [registrations, activeTab, selectedLevel, selectedClassFilter]);

  // Subdivide filtered registrations into male & female lists
  const femaleList = useMemo(() => {
    return filteredRegs.filter(r => r.sexe === 'F');
  }, [filteredRegs]);

  const maleList = useMemo(() => {
    return filteredRegs.filter(r => r.sexe === 'M');
  }, [filteredRegs]);

  // Get list of students who are NOT registered in the CURRENT active championship yet
  const nonRegisteredStudents = useMemo(() => {
    const registeredKeys = new Set(
      registrations
        .filter(r => r.championshipType === activeTab)
        .map(r => `${r.className}_${r.numeroEleve}`)
    );
    return students.filter(s => {
      const key = `${s.className}_${s.student.numeroEleve}`;
      return !registeredKeys.has(key);
    });
  }, [students, registrations, activeTab]);

  // Filter non-registered students based on text query, selected level, class, gender, and VMA (Point 6)
  const filteredNonRegisteredStudents = useMemo(() => {
    return nonRegisteredStudents.filter(s => {
      // 1. Level Filter Check
      if (selectedLevel !== 'all') {
        const lvl = detectLevelFromClassName(s.className).key;
        if (lvl !== selectedLevel) return false;
      }

      // 2. Class Filter Check
      if (selectedClassFilter !== 'all') {
        if (s.className !== selectedClassFilter) return false;
      }

      // 3. Gender Filter Check
      if (genderFilter !== 'ALL' && s.student.sexe !== genderFilter) return false;

      // 4. VMA Performance Filter Check
      const vmaVal = s.vmaVal || 0;
      if (vmaFilter === 'HIGH' && vmaVal < 14) return false;
      if (vmaFilter === 'MEDIUM' && (vmaVal < 11 || vmaVal >= 14)) return false;
      if (vmaFilter === 'LOW' && (vmaVal <= 0 || vmaVal >= 11)) return false;

      // 4.5. Test Completion Filter
      if (testFilter !== 'ALL') {
        const hasPhysical = s.isPhysicalDone;
        const hasVma = s.isVmaDone;
        if (testFilter === 'PHYSICAL_DONE' && !hasPhysical) return false;
        if (testFilter === 'VMA_DONE' && !hasVma) return false;
        if (testFilter === 'ANY_TEST_DONE' && !hasPhysical && !hasVma) return false;
      }

      // 5. Text Search Query (Matches student name, order index, Massar number, or Class)
      const query = searchQuery.trim();
      if (query !== '') {
        const normQuery = normalizeArabicText(query);
        const normName = normalizeArabicText(s.student.nomEleve);
        const normNum = String(s.student.numeroEleve || '').toLowerCase();
        const normClass = String(s.className || '').toLowerCase();
        const normOrder = String(s.orderIndex || '');

        const matches = normName.includes(normQuery) || 
                        normNum.includes(normQuery) || 
                        normClass.includes(normQuery) ||
                        normOrder === normQuery;

        if (!matches) return false;
      }

      return true;
    });
  }, [nonRegisteredStudents, selectedLevel, selectedClassFilter, genderFilter, vmaFilter, searchQuery]);

  // Automatically fetch previously entered birthdate for selected student to save time
  useEffect(() => {
    if (selectedStudent) {
      const num = selectedStudent.student.numeroEleve;
      const priorReg = registrations.find(r => r.numeroEleve === num && r.dateNaissance);
      if (priorReg && priorReg.dateNaissance) {
        setBirthDate(priorReg.dateNaissance);
      } else {
        setBirthDate('');
      }
    } else {
      setBirthDate('');
    }
  }, [selectedStudent, registrations]);

  const handleStartEdit = (reg: ChampionshipRegistration) => {
    setEditingRegistration(reg);
    setSelectedStudent(null);
    setBirthDate(reg.dateNaissance || '');
    setSportRole(reg.sportCollectifRole || sportRoleOptions[0]?.value || '');
    setNote(reg.note || '');
    setStudentPhotoUrl(reg.photoUrl);
  };

  // Submit Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we are in bulk mode or editing mode
    const isBulk = selectedStudents.size > 0;
    
    if (!isBulk && !selectedStudent && !editingRegistration) {
      setFeedback('⚠️ الرجاء اختيار تلميذ(ة) أولاً.');
      return;
    }

    const registrationsToSave: ChampionshipRegistration[] = [];

    if (editingRegistration) {
        // Edit mode
        const newReg: ChampionshipRegistration = {
            ...editingRegistration,
            dateNaissance: birthDate || undefined,
            sportCollectifRole: sportRole || undefined,
            note: note || undefined,
            photoUrl: studentPhotoUrl || editingRegistration.photoUrl,
            updatedAt: new Date().toISOString()
        };
        registrationsToSave.push(newReg);
    } else {
        // Add mode (Bulk or Single)
        const studentsToRegister = isBulk 
            ? students.filter(s => selectedStudents.has(`${s.className}_${s.student.numeroEleve}`))
            : [selectedStudent!];

        studentsToRegister.forEach(s => {
            const registrationId = `${activeTab}_${s.className}_${s.student.numeroEleve}`;
            registrationsToSave.push({
                id: registrationId,
                className: s.className,
                numeroEleve: s.student.numeroEleve,
                nomEleve: s.student.nomEleve,
                sexe: s.student.sexe || 'M',
                dateNaissance: birthDate || undefined,
                championshipType: activeTab,
                sportCollectifRole: sportRole || undefined,
                note: note || undefined,
                photoUrl: studentPhotoUrl || s.student.photoUrl,
                createdAt: new Date().toISOString()
            });
        });
    }

    for (const reg of registrationsToSave) {
        await saveChampionshipRegistration(reg);
    }

    setFeedback(
        editingRegistration 
        ? '✏️ تم تحديث بيانات المشاركة بنجاح!' 
        : `🎉 تم تعيين ${registrationsToSave.length} تلميذ(ة) للمشاركة بنجاح!`
    );
    
    setSelectedStudent(null);
    setSelectedStudents(new Set());
    setEditingRegistration(null);
    setSportRole(sportRoleOptions[0]?.value || '');
    setNote('');
    setBirthDate('');
    setStudentPhotoUrl(undefined);
    
    setTimeout(() => setFeedback(null), 4000);
    loadAllData();
  };

  const handleDelete = async (regId: string) => {
    if (window.confirm('هل أنت متأكد من إلغاء وحذف مشاركة هذا التلميذ نهائياً من البطولة؟')) {
      try {
        await deleteChampionshipRegistration(regId);
        setFeedback('🗑️ تم إلغاء مشاركة التلميذ وحذفها بنجاح.');
        setTimeout(() => setFeedback(null), 3500);
        await loadAllData();
      } catch (err) {
        console.error('Error deleting championship registration:', err);
        setFeedback('❌ حدث خطأ أثناء محاولة الحذف.');
        setTimeout(() => setFeedback(null), 3500);
      }
    }
  };

  const getChampionshipTitle = (type: ChampionshipType) => {
    switch (type) {
      case 'cross_country':
        return 'بطولة العدو الريفي المدرسي';
      case 'athletics':
        return 'بطولة ألعاب القوى المدرسية';
      case 'football':
        return 'بطولة كرة القدم المدرسية';
    }
  };

  const getChampionshipEmoji = (type: ChampionshipType) => {
    switch (type) {
      case 'cross_country': return '🏃‍♂️';
      case 'athletics': return '👟';
      case 'football': return '⚽';
    }
  };

  // Export current lists as clean Word/HTML report
  const handleExportWord = () => {
    if (filteredRegs.length === 0) {
      alert("لا يوجد تلاميذ مشاركون للتصدير.");
      return;
    }

    const title = getChampionshipTitle(activeTab);
    const emoji = getChampionshipEmoji(activeTab);
    const currentDate = new Date().toLocaleDateString('ar-MA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const levelLabel = selectedLevel === 'all' 
      ? 'جميع المستويات' 
      : EDUCATIONAL_LEVELS.find(l => l.key === selectedLevel)?.label || selectedLevel;
    
    const classLabel = selectedClassFilter === 'all' ? 'جميع الأقسام' : selectedClassFilter;

    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>لائحة المشاركين - ${title}</title>
        <style>
          @page { size: A4; margin: 1.2cm; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            direction: rtl;
            text-align: right;
            color: #1e293b;
          }
          .header { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .header td { border: none; font-size: 11pt; font-weight: bold; color: #475569; }
          .title { font-size: 20pt; font-weight: 900; color: #1e3a8a; text-align: center; margin-top: 15px; border-bottom: 3px double #1e3a8a; padding-bottom: 10px; }
          .subtitle { font-size: 11pt; color: #475569; text-align: center; margin-bottom: 30px; }
          .section-title { font-size: 13pt; font-weight: bold; color: #1e3a8a; border-right: 4px solid #1e3a8a; padding-right: 10px; margin-top: 25px; margin-bottom: 10px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          table.data-table th { background-color: #1e3a8a; color: white; font-weight: bold; padding: 8px 12px; border: 1px solid #1e3a8a; font-size: 10.5pt; text-align: center; }
          table.data-table td { padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10pt; text-align: center; }
          table.data-table tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <table class="header">
          <tr>
            <td>وزارة التربية الوطنية والتعليم الأولي والرياضة<br/>الجمعية الرياضية المدرسية</td>
            <td style="text-align: left;">المستوى: ${levelLabel}<br/>القسم: ${classLabel}<br/>تاريخ التصدير: ${currentDate}</td>
          </tr>
        </table>

        <div class="title">${emoji} لائحة المشاركين في ${title}</div>
        <div class="subtitle">السنة الدراسية: ${new Date().getFullYear()}/${new Date().getFullYear() + 1}</div>

        <!-- FEMALE LIST -->
        <div class="section-title">🚺 قائمة الإناث (${femaleList.length} مشاركة)</div>
        ${femaleList.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 15%;">القسم</th>
                <th style="width: 15%;">رقم التلميذ</th>
                <th style="text-align: right; width: 35%;">الاسم الكامل للتلميذة</th>
                <th style="width: 20%;">تاريخ الازدياد</th>
                <th style="width: 15%;">التخصص / المركز</th>
              </tr>
            </thead>
            <tbody>
              ${femaleList.map(r => `
                <tr>
                  <td><strong>${r.className}</strong></td>
                  <td>#${r.numeroEleve}</td>
                  <td style="text-align: right;"><strong>${r.nomEleve}</strong></td>
                  <td>${r.dateNaissance || 'غير محدد'}</td>
                  <td>${r.sportCollectifRole || 'عمومي'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="font-style: italic; color: #64748b;">لا توجد مشاركات إناث مسجلات حالياً.</p>'}

        <!-- MALE LIST -->
        <div class="section-title">🚹 قائمة الذكور (${maleList.length} مشارك)</div>
        ${maleList.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 15%;">القسم</th>
                <th style="width: 15%;">رقم التلميذ</th>
                <th style="text-align: right; width: 35%;">الاسم الكامل للتلميذ</th>
                <th style="width: 20%;">تاريخ الازدياد</th>
                <th style="width: 15%;">التخصص / المركز</th>
              </tr>
            </thead>
            <tbody>
              ${maleList.map(r => `
                <tr>
                  <td><strong>${r.className}</strong></td>
                  <td>#${r.numeroEleve}</td>
                  <td style="text-align: right;"><strong>${r.nomEleve}</strong></td>
                  <td>${r.dateNaissance || 'غير محدد'}</td>
                  <td>${r.sportCollectifRole || 'عمومي'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="font-style: italic; color: #64748b;">لا يوجد مشاركون ذكور مسجلون حالياً.</p>'}
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('download', `لوائح_مشاركي_${activeTab}_${levelLabel}_${classLabel}.doc`);
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  const handleOpenPrintPreview = () => {
    let title = 'البطولة الرياضية المدرسية';
    if (activeTab === 'cross_country') title = 'بطولة العدو الريفي المدرسي (Cross Country)';
    else if (activeTab === 'athletics') title = 'البطولة الإقليمية لألعاب القوى';
    else if (activeTab === 'football') title = 'دوري كرة القدم والرياضات الجماعية';

    const levelLabel = selectedLevel === 'all' ? 'جميع المستويات' : EDUCATIONAL_LEVELS.find(l => l.key === selectedLevel)?.label || selectedLevel;
    const classLabel = selectedClassFilter === 'all' ? 'جميع الأقسام' : `القسم ${selectedClassFilter}`;

    setPrintPreviewConfig({
      title: `لائحة المشاركين المعينين - ${title}`,
      subtitle: `الجمعية الرياضية المدرسية • ${levelLabel} • ${classLabel}`,
      columns: [
        { key: 'numeroEleve', label: 'رقم مسار', width: '15%' },
        { key: 'nomEleve', label: 'الاسم الكامل', width: '30%' },
        { key: 'sexeLabel', label: 'الجنس', width: '10%', align: 'center' },
        { key: 'className', label: 'القسم', width: '15%' },
        { key: 'sportCollectifRole', label: 'التخصص / الفئة', width: '30%' }
      ],
      data: filteredRegs.map(r => ({
        ...r,
        sexeLabel: r.sexe === 'M' ? 'ذكر' : 'أنثى'
      })),
      onExportExcel: () => {
        exportParticipantsToExcel(filteredRegs, `لوائح_مشاركي_${activeTab}_${levelLabel}`);
      }
    });
    setIsPrintPreviewOpen(true);
  };

  const handleExportExcel = () => {
    const levelLabel = selectedLevel === 'all' ? 'جميع_المستويات' : selectedLevel;
    exportParticipantsToExcel(filteredRegs, `لوائح_مشاركي_${activeTab}_${levelLabel}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      
      {/* Title & Introduction Block */}
      <header className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl">
            <TrophyIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">توجيه وتعيين المشاركين في البطولات</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              إعداد لوائح المنتخبات المدرسية للمشاركة في البطولات الإقليمية والمحلية (إناث وذكور).
            </p>
          </div>
        </div>

        {/* Global Loading Indicator */}
        {isLoading && (
          <div className="text-xs bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-xl border border-amber-500/20 animate-pulse font-bold shrink-0">
            ⏳ جاري مزامنة وتحميل البيانات...
          </div>
        )}
      </header>

      {/* Advanced Global Filter Dashboard Card (Requested in points 6 & 7) */}
      <section className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 transition-colors">
        <h2 className="text-xs font-black text-amber-600 dark:text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
          <span>⚡</span>
          <span>شريط التصفية والبحث المتقدم للبطولة</span>
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Level Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 block flex items-center gap-1">
              <AcademicCapIcon className="w-3.5 h-3.5" />
              <span>المستوى الدراسي:</span>
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="all">جميع المستويات (الكل)</option>
              {EDUCATIONAL_LEVELS.filter(l => l.key !== 'all').map(lvl => (
                <option key={lvl.key} value={lvl.key}>{lvl.label}</option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 block flex items-center gap-1">
              <UserGroupIcon className="w-3.5 h-3.5" />
              <span>القسم / الفوج:</span>
            </label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="all">جميع الأقسام ({filteredClassOptions.length})</option>
              {filteredClassOptions.map(c => (
                <option key={c.className} value={c.className}>{c.className}</option>
              ))}
            </select>
          </div>

          {/* Gender filter button selectors */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 block">
              جنس التلاميذ للمرشحين:
            </label>
            <div className="grid grid-cols-3 gap-1 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
              {(['ALL', 'M', 'F'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderFilter(g)}
                  className={`py-1.5 rounded-lg text-[10px] font-black transition cursor-pointer ${
                    genderFilter === g
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {g === 'ALL' ? 'الكل' : g === 'M' ? 'ذكور' : 'إناث'}
                </button>
              ))}
            </div>
          </div>

          {/* VMA Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 block">
              سرعة VMA للتلميذ:
            </label>
            <select
              value={vmaFilter}
              onChange={(e) => setVmaFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="ALL">جميع السرعات (الكل)</option>
              <option value="HIGH">⚡ سريعة جداً (VMA ≥ 14)</option>
              <option value="MEDIUM">🏃 متوسطة السرعة (11 - 14)</option>
              <option value="LOW">🐢 عادية السرعة (&lt; 11)</option>
            </select>
          </div>

          {/* Test Performance Filter (Requested: تصفية عن طريق الاختبارات) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-400 dark:text-gray-500 block">
              اختبارات التلاميذ المنجزة:
            </label>
            <select
              value={testFilter}
              onChange={(e) => setTestFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="ALL">الكل (بدون تصفية)</option>
              <option value="PHYSICAL_DONE">✅ أتم الاختبارات البدنية</option>
              <option value="VMA_DONE">✅ أتم اختبار VMA</option>
              <option value="ANY_TEST_DONE">✅ أتم اختبار واحد على الأقل</option>
            </select>
          </div>
        </div>

        {/* Text Search Bar Input with absolute cross-class results indicators */}
        <div className="relative pt-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 ابحث عن تلميذ باسمه الكامل أو برقم مسار أو بالترتيب..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold pr-10 pl-16"
          />
          <span className="absolute right-3.5 top-4.5 text-gray-400 text-sm">
            🔍
          </span>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute left-16 top-3 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 px-2 py-1 rounded-lg font-black cursor-pointer"
            >
              تصفية ✕
            </button>
          )}
          <span className="absolute left-3 top-3.5 text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
            {filteredNonRegisteredStudents.length} تلميذ متاح
          </span>
        </div>
      </section>

      {/* Championship Tabs Switcher */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-gray-100 dark:bg-gray-800/60 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700/80 transition-colors">
        {(['cross_country', 'athletics', 'football'] as ChampionshipType[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveChampionship(tab)}
              className={`py-3.5 px-1 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                isActive 
                  ? 'bg-amber-500 text-white shadow-md' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="text-lg">{getChampionshipEmoji(tab)}</span>
              <span className="truncate text-[10px] sm:text-xs md:text-sm">{getChampionshipTitle(tab)}</span>
            </button>
          );
        })}
      </div>

      {/* Grid Layout: Left column Form, Right column Rosters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form & Scrollable Student Search Results */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-4 transition-colors">
            
            <h2 className="text-sm font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2.5 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <span>📋</span>
                <span>اختر التلميذ المراد تعيينه</span>
              </span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold px-2.5 py-0.5 rounded-full shrink-0">
                {filteredNonRegisteredStudents.length} نتائج الفلترة
              </span>
            </h2>

            {/* Scrollable Student Selection Grid List (Requested in point 6 & 7 with improved styling) */}
            <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-950/40 p-2 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {filteredNonRegisteredStudents.length > 0 ? (
                filteredNonRegisteredStudents.map(s => {
                  const isSelected = selectedStudent?.student.numeroEleve === s.student.numeroEleve && selectedStudent?.className === s.className;
                  const vmaSpeed = s.vmaVal || 0;
                  const hasVma = vmaSpeed > 0;

                  return (
                    <button
                      key={`${s.className}_${s.student.numeroEleve}`}
                      type="button"
                      onClick={() => {
                        const studentKey = `${s.className}_${s.student.numeroEleve}`;
                        const newSelected = new Set(selectedStudents);
                        if (newSelected.has(studentKey)) {
                          newSelected.delete(studentKey);
                        } else {
                          newSelected.add(studentKey);
                        }
                        setSelectedStudents(newSelected);
                      }}
                      className={`w-full p-3 rounded-xl border text-right transition flex items-center justify-between gap-3 active:scale-98 cursor-pointer ${
                        selectedStudents.has(`${s.className}_${s.student.numeroEleve}`)
                          ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                          : 'bg-white dark:bg-gray-800 border-gray-200/60 dark:border-gray-700/80 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-500/5 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {/* Checkbox indicator */}
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          selectedStudents.has(`${s.className}_${s.student.numeroEleve}`) ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedStudents.has(`${s.className}_${s.student.numeroEleve}`) && '✓'}
                        </span>
                        {/* Order pill */}
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          selectedStudents.has(`${s.className}_${s.student.numeroEleve}`) ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          #{s.orderIndex}
                        </span>
                        {/* Student Name */}
                        <span className="font-bold text-xs truncate">{s.student.nomEleve}</span>
                        {/* Gender Pill */}
                        <span className={`text-[9px] font-black px-1.5 rounded-sm ${
                          s.student.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/40' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40'
                        }`}>
                          {s.student.sexe === 'F' ? '🚺' : '🚹'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Class Badge */}
                        <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 px-2 py-0.5 rounded-md">
                          {s.className}
                        </span>

                        {/* Performance display (VMA) */}
                        {hasVma && (
                          <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-400/20 flex items-center gap-0.5">
                            <span>⚡</span>
                            <span>{vmaSpeed.toFixed(1)}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500 italic">
                  ❌ لا يوجد تلاميذ يطابقون خيارات البحث والفلترة حالياً.
                </div>
              )}
            </div>

            {/* Selected Student Confirmation indicator */}
            {selectedStudent && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/50 dark:border-amber-800/40 text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center justify-between animate-fade-in">
                <span>🎯 المختار: #{selectedStudent.student.numeroEleve} - {selectedStudent.student.nomEleve} ({selectedStudent.className})</span>
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="text-amber-600 dark:text-amber-400 hover:text-red-500 text-xs font-black cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            )}

            {/* Editing Registration indicator */}
            {editingRegistration && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/40 text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center justify-between animate-fade-in">
                <span>✏️ تعديل مشاركة: #{editingRegistration.numeroEleve} - {editingRegistration.nomEleve} ({editingRegistration.className})</span>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingRegistration(null);
                    setBirthDate('');
                    setSportRole('');
                    setNote('');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-red-500 text-xs font-black cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              </div>
            )}

            {/* Registration details form */}
            <form onSubmit={handleRegister} className="space-y-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              
              {/* Student Photo Picker */}
              {(selectedStudent || editingRegistration) && (
                <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center gap-3.5">
                  <StudentAvatar
                    photoUrl={studentPhotoUrl}
                    nomEleve={selectedStudent ? selectedStudent.student.nomEleve : editingRegistration?.nomEleve}
                    sexe={selectedStudent ? selectedStudent.student.sexe : editingRegistration?.sexe}
                    size="lg"
                    editable={true}
                    onPhotoChange={(newPhoto) => setStudentPhotoUrl(newPhoto)}
                  />
                  <div className="flex-1 space-y-1">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                      صورة التلميذ(ة) في البطولة
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      انقر لتعديل أو رفع صورة خاصة لهذا التلميذ.
                    </p>
                  </div>
                </div>
              )}

              {/* Date of Birth (تاريخ الازدياد) */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-500 dark:text-gray-400 block">
                  تاريخ الازدياد (Date de Naissance):
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-bold"
                  placeholder="YYYY-MM-DD"
                />
                <p className="text-[10px] text-gray-400">مطلوب للتأكد من تصنيف الفئة العمرية المدرسية (صغار، فتيان، شبان).</p>
              </div>

              {/* Discipline / Role / Position Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-500 dark:text-gray-400 block">
                  {activeTab === 'football' 
                    ? 'مركز اللاعب في كرة القدم:' 
                    : activeTab === 'athletics' 
                      ? 'الفعالية في ألعاب القوى:' 
                      : 'التخصص / الفئة الرياضية:'}
                </label>
                <select
                  value={sportRole}
                  onChange={(e) => setSportRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-bold cursor-pointer"
                >
                  {sportRoleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* General Note */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-500 dark:text-gray-400 block">
                  ملاحظات أو تعليق:
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثال: مؤهل بدنياً، قائد منتخب المؤسسة..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 h-14 resize-none font-bold"
                />
              </div>

              {/* Feedback messages */}
              {feedback && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40 text-xs font-bold text-center animate-bounce">
                  {feedback}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!selectedStudent && !editingRegistration}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-lg hover:shadow-amber-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
              >
                <PlusIcon className="w-4 h-4" />
                <span>{editingRegistration ? '✏️ حفظ وتعديل بيانات المشاركة' : 'توجيه وتعيين التلميذ(ة) المختار 🏆'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active Rosters split by gender (F / M) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs space-y-4 transition-colors">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h2 className="text-base font-black text-gray-950 dark:text-white flex items-center gap-1.5">
                  <span>📋</span>
                  <span>قائمة المشاركين المعينين للبطولة</span>
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {selectedLevel === 'all' ? 'جميع المستويات' : EDUCATIONAL_LEVELS.find(l => l.key === selectedLevel)?.label} • {selectedClassFilter === 'all' ? 'جميع الأقسام' : `القسم: ${selectedClassFilter}`}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenPrintPreview}
                  disabled={filteredRegs.length === 0}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  title="معاينة اللائحة قبل الطباعة والتعديل"
                >
                  <PrinterIcon className="w-4 h-4 shrink-0" />
                  <span>معاينة قبل الطباعة / PDF 🖨️</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={filteredRegs.length === 0}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  title="تصدير إلى Excel"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
                  <span>Excel 📊</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportWord}
                  disabled={filteredRegs.length === 0}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <DocumentTextIcon className="w-4 h-4 shrink-0" />
                  <span>Word (.doc)</span>
                </button>
              </div>
            </div>

            {/* List Subdivision Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Female Subdivision Card */}
              <div className="space-y-3 bg-pink-50/20 dark:bg-pink-950/10 p-4 rounded-2xl border border-pink-100/50 dark:border-pink-950/20 animate-fade-in flex flex-col">
                <div className="flex items-center justify-between border-b border-pink-200/50 dark:border-pink-900/30 pb-2">
                  <h3 className="font-black text-xs text-pink-700 dark:text-pink-400 flex items-center gap-1.5">
                    <span>🚺</span>
                    <span>لوائح الإناث</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 font-bold shrink-0">
                    {femaleList.length} مشاركة
                  </span>
                </div>

                {femaleList.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {femaleList.map(r => (
                      <div 
                        key={r.id} 
                        className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-pink-100/80 dark:border-gray-700 shadow-2xs flex items-center justify-between gap-3 transition-colors hover:border-pink-300"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <StudentAvatar photoUrl={r.photoUrl} nomEleve={r.nomEleve} sexe={r.sexe} size="sm" />
                          <div className="overflow-hidden space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono px-1 rounded bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-200/40 font-bold">
                                #{r.numeroEleve}
                              </span>
                              <span className="font-bold text-xs text-gray-900 dark:text-white break-words">
                                {r.nomEleve}
                              </span>
                              <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.1 rounded-sm border border-indigo-100 dark:border-indigo-900">
                                {r.className}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-bold">
                              {r.dateNaissance && (
                                <span className="flex items-center gap-0.5 font-mono font-black">
                                  <CalendarDaysIcon className="w-3 h-3 text-pink-500" />
                                  <span>{r.dateNaissance}</span>
                                </span>
                              )}
                              {r.sportCollectifRole && (
                                <span className="text-pink-600 dark:text-pink-400 bg-pink-100/40 dark:bg-pink-950/20 px-1 py-0.2 rounded font-black text-[9px]">
                                  {r.sportCollectifRole}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons (Edit & Remove) */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(r)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition active:scale-90 cursor-pointer"
                            title="تعديل بيانات المشاركة"
                          >
                            <span className="text-xs">✏️</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition active:scale-90 cursor-pointer"
                            title="إلغاء التسجيل"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500 italic">
                    لا توجد تلميذات مسجلات في هذه البطولة حالياً.
                  </div>
                )}
              </div>

              {/* Male Subdivision Card */}
              <div className="space-y-3 bg-blue-50/20 dark:bg-blue-950/10 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-950/20 animate-fade-in flex flex-col">
                <div className="flex items-center justify-between border-b border-blue-200/50 dark:border-blue-900/30 pb-2">
                  <h3 className="font-black text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <span>🚹</span>
                    <span>لوائح الذكور</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold shrink-0">
                    {maleList.length} مشارك
                  </span>
                </div>

                {maleList.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {maleList.map(r => (
                      <div 
                        key={r.id} 
                        className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-blue-100/80 dark:border-gray-700 shadow-2xs flex items-center justify-between gap-3 transition-colors hover:border-blue-300"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <StudentAvatar photoUrl={r.photoUrl} nomEleve={r.nomEleve} sexe={r.sexe} size="sm" />
                          <div className="overflow-hidden space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono px-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/40 font-bold">
                                #{r.numeroEleve}
                              </span>
                              <span className="font-bold text-xs text-gray-900 dark:text-white break-words">
                                {r.nomEleve}
                              </span>
                              <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.1 rounded-sm border border-indigo-100 dark:border-indigo-900">
                                {r.className}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-bold">
                              {r.dateNaissance && (
                                <span className="flex items-center gap-0.5 font-mono font-black">
                                  <CalendarDaysIcon className="w-3 h-3 text-blue-500" />
                                  <span>{r.dateNaissance}</span>
                                </span>
                              )}
                              {r.sportCollectifRole && (
                                <span className="text-blue-600 dark:text-blue-400 bg-blue-100/40 dark:bg-blue-950/20 px-1 py-0.2 rounded font-black text-[9px]">
                                  {r.sportCollectifRole}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons (Edit & Remove) */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(r)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition active:scale-90 cursor-pointer"
                            title="تعديل بيانات المشاركة"
                          >
                            <span className="text-xs">✏️</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition active:scale-90 cursor-pointer"
                            title="إلغاء التسجيل"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500 italic">
                    لا يوجد تلاميذ ذكور مسجلون في هذه البطولة حالياً.
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* PRINT PREVIEW MODAL */}
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title={printPreviewConfig.title}
        subtitle={printPreviewConfig.subtitle}
        columns={printPreviewConfig.columns}
        data={printPreviewConfig.data}
        onExportExcel={printPreviewConfig.onExportExcel}
      />

    </div>
  );
};
