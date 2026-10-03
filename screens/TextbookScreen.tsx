import React, { useState, useEffect, useMemo } from 'react';
import { TextbookSession, StudentIdentity } from '../types';
import { 
  getTextbookSessions, 
  saveTextbookSession, 
  deleteTextbookSession 
} from '../utils/textbookDb';
import { 
  getAllClasses, 
  ClassStats 
} from '../utils/db';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  CalendarDaysIcon, 
  CheckCircleIcon, 
  XMarkIcon, 
  TrashIcon, 
  PencilSquareIcon,
  PlusIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  UserCircleIcon,
  AcademicCapIcon,
  SparklesIcon
} from '../components/Icons';
import { useLanguage } from '../utils/i18n';
import { 
  saveTeacherProfileToCloud, 
  fetchTeacherProfilesFromCloud 
} from '../utils/firebase';

interface TextbookScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
}

interface TeacherProfile {
  id: string;
  name: string;
  assignedClasses: string[];
  timetable: {
    [day: string]: {
      [slotId: string]: string;
    };
  };
}

const DAYS = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const SLOTS = [
  { id: '1', label: 'الحصة 1 (08:00 - 09:00)', time: '08:00 - 09:00' },
  { id: '2', label: 'الحصة 2 (09:00 - 10:00)', time: '09:00 - 10:00' },
  { id: '3', label: 'الحصة 3 (10:00 - 11:00)', time: '10:00 - 11:00' },
  { id: '4', label: 'الحصة 4 (11:00 - 12:00)', time: '11:00 - 12:00' },
];

const DEFAULT_TEACHERS: TeacherProfile[] = [
  {
    id: 'teacher_1',
    name: 'أحمد السعيدي',
    assignedClasses: [],
    timetable: {
      'الاثنين': { '1': '', '2': '', '3': '', '4': '' },
      'الثلاثاء': { '1': '', '2': '', '3': '', '4': '' },
      'الأربعاء': { '1': '', '2': '', '3': '', '4': '' },
      'الخميس': { '1': '', '2': '', '3': '', '4': '' },
      'الجمعة': { '1': '', '2': '', '3': '', '4': '' },
      'السبت': { '1': '', '2': '', '3': '', '4': '' },
    }
  },
  {
    id: 'teacher_2',
    name: 'فاطمة الزهراء',
    assignedClasses: [],
    timetable: {
      'الاثنين': { '1': '', '2': '', '3': '', '4': '' },
      'الثلاثاء': { '1': '', '2': '', '3': '', '4': '' },
      'الأربعاء': { '1': '', '2': '', '3': '', '4': '' },
      'الخميس': { '1': '', '2': '', '3': '', '4': '' },
      'الجمعة': { '1': '', '2': '', '3': '', '4': '' },
      'السبت': { '1': '', '2': '', '3': '', '4': '' },
    }
  },
  {
    id: 'teacher_3',
    name: 'يوسف العراقي',
    assignedClasses: [],
    timetable: {
      'الاثنين': { '1': '', '2': '', '3': '', '4': '' },
      'الثلاثاء': { '1': '', '2': '', '3': '', '4': '' },
      'الأربعاء': { '1': '', '2': '', '3': '', '4': '' },
      'الخميس': { '1': '', '2': '', '3': '', '4': '' },
      'الجمعة': { '1': '', '2': '', '3': '', '4': '' },
      'السبت': { '1': '', '2': '', '3': '', '4': '' },
    }
  }
];

export const TextbookScreen: React.FC<TextbookScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  const { language } = useLanguage();
  const [classList, setClassList] = useState<ClassStats[]>([]);
  const [sessions, setSessions] = useState<TextbookSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Tab State: sessions feed vs timetable setup
  const [activeTab, setActiveTab] = useState<'sessions' | 'timetable'>('sessions');

  // Teachers State
  const [teachers, setTeachers] = useState<TeacherProfile[]>(DEFAULT_TEACHERS);
  const [activeTeacherId, setActiveTeacherId] = useState<string>('teacher_1');
  
  // Local active teacher state for inputs
  const [editingTeacherName, setEditingTeacherName] = useState('');
  const [editingAssignedClasses, setEditingAssignedClasses] = useState<string[]>([]);
  const [editingTimetable, setEditingTimetable] = useState<any>({});

  // Form State for Textbook Logs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [formSessionNumber, setFormSessionNumber] = useState('الحصة 1');
  const [formGoal, setFormGoal] = useState('');
  const [formClassName, setFormClassName] = useState(selectedClass || '');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTimeSlot, setFormTimeSlot] = useState('08:30 - 10:30');

  // Filter state
  const [classFilter, setClassFilter] = useState<'all' | 'my' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Teacher Profile Helper
  const activeTeacher = useMemo(() => {
    return teachers.find(t => t.id === activeTeacherId) || teachers[0];
  }, [teachers, activeTeacherId]);

  useEffect(() => {
    loadClasses();
    loadSessions();
    loadTeacherProfiles();
    
    // Load last active teacher ID
    const savedActiveId = localStorage.getItem('eps_active_teacher_id');
    if (savedActiveId) {
      setActiveTeacherId(savedActiveId);
    }
  }, []);

  // Sync edits when active teacher switches
  useEffect(() => {
    if (activeTeacher) {
      setEditingTeacherName(activeTeacher.name);
      setEditingAssignedClasses(activeTeacher.assignedClasses || []);
      setEditingTimetable(JSON.parse(JSON.stringify(activeTeacher.timetable || {})));
    }
  }, [activeTeacherId, teachers]);

  useEffect(() => {
    if (selectedClass && !formClassName) {
      setFormClassName(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const list = await getAllClasses();
    setClassList(list);
    if (list.length > 0 && !selectedClass) {
      setSelectedClass(list[0].className);
      setFormClassName(list[0].className);
    }
  };

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await getTextbookSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeacherProfiles = async () => {
    try {
      const cloudProfiles = await fetchTeacherProfilesFromCloud();
      if (cloudProfiles && cloudProfiles.length > 0) {
        const merged = DEFAULT_TEACHERS.map(def => {
          const cloud = cloudProfiles.find(p => p.id === def.id);
          return cloud ? { ...def, ...cloud } : def;
        });
        setTeachers(merged);
        localStorage.setItem('eps_teachers_profiles', JSON.stringify(merged));
        return;
      }
    } catch (e) {
      console.warn('Failed to load teacher profiles from cloud, loading cached:', e);
    }

    try {
      const cached = localStorage.getItem('eps_teachers_profiles');
      if (cached) {
        setTeachers(JSON.parse(cached));
      }
    } catch {}
  };

  const handleSaveTeacherSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacherName.trim()) {
      setNotification({ message: 'المرجو إدخال اسم الأستاذ أولاً.', type: 'error' });
      return;
    }

    const updatedProfiles = teachers.map(t => {
      if (t.id === activeTeacherId) {
        return {
          ...t,
          name: editingTeacherName.trim(),
          assignedClasses: editingAssignedClasses,
          timetable: editingTimetable
        };
      }
      return t;
    });

    setTeachers(updatedProfiles);
    localStorage.setItem('eps_teachers_profiles', JSON.stringify(updatedProfiles));

    // Upload to Firestore
    try {
      setNotification({ message: 'جاري مزامنة بيانات وجدول الأستاذ مع السحابة...', type: 'success' });
      const res = await saveTeacherProfileToCloud(activeTeacherId, {
        name: editingTeacherName.trim(),
        assignedClasses: editingAssignedClasses,
        timetable: editingTimetable
      });

      if (res.success) {
        setNotification({ message: `تم حفظ وإعداد بيانات الأستاذ "${editingTeacherName.trim()}" وجدوله بنجاح!`, type: 'success' });
      } else {
        setNotification({ message: 'تم الحفظ محلياً بنجاح. ستتم المزامنة لاحقاً عند الاتصال بالشبكة.', type: 'success' });
      }
    } catch (err) {
      setNotification({ message: 'تم الحفظ محلياً بنجاح، وحدث خطأ مؤقت أثناء المزامنة السحابية.', type: 'success' });
    }
  };

  const handleActiveTeacherChange = (id: string) => {
    setActiveTeacherId(id);
    localStorage.setItem('eps_active_teacher_id', id);
  };

  const handleClassCheckboxChange = (clsName: string, isChecked: boolean) => {
    if (isChecked) {
      setEditingAssignedClasses(prev => [...prev, clsName]);
    } else {
      setEditingAssignedClasses(prev => prev.filter(c => c !== clsName));
      // Remove this class from timetable if unassigned
      const updatedTimetable = { ...editingTimetable };
      DAYS.forEach(day => {
        if (updatedTimetable[day]) {
          Object.keys(updatedTimetable[day]).forEach(slotId => {
            if (updatedTimetable[day][slotId] === clsName) {
              updatedTimetable[day][slotId] = '';
            }
          });
        }
      });
      setEditingTimetable(updatedTimetable);
    }
  };

  const handleTimetableCellChange = (day: string, slotId: string, value: string) => {
    setEditingTimetable((prev: any) => ({
      ...prev,
      [day]: {
        ...(prev[day] || { '1': '', '2': '', '3': '', '4': '' }),
        [slotId]: value
      }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGoal.trim() || !formSessionNumber.trim() || !formClassName) {
      setNotification({ message: 'المرجو ملء جميع الحقول المطلوبة.', type: 'error' });
      return;
    }

    const sessionObj: TextbookSession = {
      id: editingSessionId || `tb_${Date.now()}`,
      sessionNumber: formSessionNumber.trim(),
      goal: formGoal.trim(),
      className: formClassName,
      date: formDate,
      timeSlot: formTimeSlot.trim(),
      createdAt: editingSessionId ? (sessions.find(s => s.id === editingSessionId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store which teacher logged this session for audit
    (sessionObj as any).loggedByTeacherId = activeTeacherId;
    (sessionObj as any).loggedByTeacherName = activeTeacher.name;

    try {
      await saveTextbookSession(sessionObj);
      setNotification({ 
        message: editingSessionId ? 'تم تعديل الحصة الرياضية في دفتر النصوص بنجاح!' : 'تم إضافة الحصة الرياضية لدفتر النصوص ومزامنتها بنجاح!', 
        type: 'success' 
      });
      setIsFormOpen(false);
      setEditingSessionId(null);
      setFormGoal('');
      loadSessions();
    } catch (err) {
      setNotification({ message: 'حدث خطأ أثناء الحفظ.', type: 'error' });
    }
  };

  const handleEdit = (session: TextbookSession) => {
    setEditingSessionId(session.id);
    setFormSessionNumber(session.sessionNumber);
    setFormGoal(session.goal);
    setFormClassName(session.className);
    setFormDate(session.date);
    setFormTimeSlot(session.timeSlot);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الحصة من دفتر النصوص؟')) {
      try {
        await deleteTextbookSession(id);
        setNotification({ message: 'تم حذف الحصة من دفتر النصوص بنجاح.', type: 'success' });
        loadSessions();
      } catch (err) {
        setNotification({ message: 'حدث خطأ أثناء الحذف.', type: 'error' });
      }
    }
  };

  // Filter textbook logs
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      // Teacher filter: my assigned classes vs all
      let matchClass = true;
      if (classFilter === 'my') {
        matchClass = (activeTeacher.assignedClasses || []).includes(s.className);
      } else if (classFilter !== 'all') {
        matchClass = s.className === classFilter;
      }

      const matchQuery = !searchQuery || 
        s.sessionNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.goal.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s as any).loggedByTeacherName?.toLowerCase().includes(searchQuery.toLowerCase());
        
      return matchClass && matchQuery;
    });
  }, [sessions, classFilter, searchQuery, activeTeacher]);

  const handleExportExcel = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      alert("لم يتم تحميل مكتبة Excel.");
      return;
    }

    const headers = [
      "الحصة / رقم الحصة", 
      "الهدف البيداغوجي / المحتوى", 
      "القسم", 
      "التاريخ", 
      "التوقيت / الحيز الزمني",
      "الأستاذ المؤطر",
      "تاريخ الإضافة"
    ];

    const rows = filteredSessions.map(s => [
      s.sessionNumber,
      s.goal,
      s.className,
      s.date,
      s.timeSlot,
      (s as any).loggedByTeacherName || "أستاذ التربية البدنية",
      new Date(s.createdAt).toLocaleDateString('ar-MA')
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "دفتر النصوص");
    XLSX.writeFile(wb, `دفتر_النصوص_الرياضي_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportWord = () => {
    if (filteredSessions.length === 0) {
      alert("لا توجد حصص مسجلة للتصدير.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>دفتر النصوص الرياضي</title>
        <style>
          body { font-family: 'Traditional Arabic', Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; color: #111; }
          h1 { text-align: center; color: #1e3a8a; margin-bottom: 5px; font-size: 22px; }
          p.subtitle { text-align: center; color: #555; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #94a3b8; padding: 8px 10px; text-align: right; }
          th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>دفتر النصوص - التربية البدنية والرياضية</h1>
        <p class="subtitle">الأستاذ: ${activeTeacher.name} • تاريخ التصدير: ${new Date().toLocaleDateString('ar-MA')}</p>
        <table>
          <thead>
            <tr>
              <th>رقم الحصة</th>
              <th>الهدف البيداغوجي / المحتوى</th>
              <th>القسم</th>
              <th>التاريخ واليوم</th>
              <th>التوقيت</th>
              <th>الأستاذ المؤطر</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSessions.map(s => `
              <tr>
                <td><strong>${s.sessionNumber}</strong></td>
                <td>${s.goal}</td>
                <td><strong>${s.className}</strong></td>
                <td>${s.date} (${getArabicDayName(s.date)})</td>
                <td>${s.timeSlot}</td>
                <td>${(s as any).loggedByTeacherName || activeTeacher.name}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('download', `دفتر_النصوص_الرياضي_${new Date().toISOString().split('T')[0]}.doc`);
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  // Helper to get Arabic weekday name from date
  const getArabicDayName = (dateStr: string): string => {
    if (!dateStr) return '';
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

  const formDateDayName = getArabicDayName(formDate);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl shadow-md text-sm font-bold flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="w-5 h-5" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-80">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header and Teacher Switcher */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <DocumentTextIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              دفتر النصوص الرياضي
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              إدارة صيرورة حصص التربية البدنية، تخصيص الأقسام، وجداول حصص الأساتذة المتزامنة
            </p>
          </div>
        </div>

        {/* Active Teacher Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-black text-indigo-600 dark:text-indigo-400 px-1">
            <UserCircleIcon className="w-4 h-4" />
            <span>الأستاذ الحالي:</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
            {teachers.map((t) => (
              <button
                key={t.id}
                onClick={() => handleActiveTeacherChange(t.id)}
                className={`px-3 py-1.5 rounded-xl text-center text-xs font-black transition whitespace-nowrap active:scale-95 ${
                  activeTeacherId === t.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-white hover:bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {t.name || `أستاذ ${t.id === 'teacher_1' ? '1' : t.id === 'teacher_2' ? '2' : '3'}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-gray-100 dark:border-gray-700 gap-2">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 px-4 font-black text-xs transition relative flex items-center gap-1.5 ${
            activeTab === 'sessions'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4" />
          <span>سجل دفتر النصوص</span>
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`pb-3 px-4 font-black text-xs transition relative flex items-center gap-1.5 ${
            activeTab === 'timetable'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
          }`}
        >
          <CalendarDaysIcon className="w-4 h-4" />
          <span>استعمال الزمن والتخصيص</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/40">مهم</span>
        </button>
      </div>

      {/* TAB 1: SESSIONS Logs View */}
      {activeTab === 'sessions' && (
        <>
          {/* Main Action Buttons Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-50/40 dark:bg-gray-800 p-4 rounded-3xl border border-indigo-50/60 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                أنت تعمل حالياً بملف: <strong>{activeTeacher.name}</strong> ({activeTeacher.assignedClasses.length} أقسام مخصصة)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setEditingSessionId(null);
                  setFormSessionNumber(`الحصة ${sessions.length + 1}`);
                  setFormGoal('');
                  // Default to first assigned class of active teacher if possible
                  if (activeTeacher.assignedClasses.length > 0) {
                    setFormClassName(activeTeacher.assignedClasses[0]);
                  } else if (selectedClass) {
                    setFormClassName(selectedClass);
                  }
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-600/10 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
              >
                <PlusIcon className="w-4 h-4" />
                <span>تسجيل حصة جديدة</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-600/10 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>تصدير دفتر النصوص Excel</span>
              </button>

              <button
                onClick={handleExportWord}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-black rounded-2xl shadow-lg shadow-blue-700/10 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>تصدير دفتر النصوص Word</span>
              </button>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الحصص البيداغوجية والأساتذة..."
                className="w-full pl-4 pr-9 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-right"
              />
              <DocumentTextIcon className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">فلترة الأقسام:</span>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-bold text-xs text-gray-900 dark:text-white rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">جميع أقسام المؤسسة</option>
                  <option value="my">أقسام الأستاذ الحالي فقط</option>
                  {classList.map(c => (
                    <option key={c.className} value={c.className}>{c.className}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Textbook Entry Form (Modal) */}
          {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {editingSessionId ? 'تعديل حصة دفتر النصوص' : 'تسجيل صيرورة حصة رياضية جديدة'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Session Designation */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">رقم الحصة:</label>
                    <select 
                      value={formSessionNumber}
                      onChange={(e) => setFormSessionNumber(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm cursor-pointer"
                      required
                    >
                      {Array.from({ length: 10 }, (_, i) => `الحصة ${i + 1}`).map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>

                  {/* Class Select */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">القسم المستهدف:</label>
                    <select 
                      value={formClassName}
                      onChange={(e) => setFormClassName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm cursor-pointer"
                      required
                    >
                      <option value="" disabled>اختر القسم</option>
                      {classList.map(c => (
                        <option key={c.className} value={c.className}>{c.className}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5" />
                      <span>التاريخ:</span>
                    </label>
                    <input 
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm"
                      required
                    />
                  </div>

                  {/* Time slot */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>الحيز الزمني / التوقيت:</span>
                    </label>
                    <input 
                      type="text"
                      value={formTimeSlot}
                      onChange={(e) => setFormTimeSlot(e.target.value)}
                      placeholder="مثال: 08:30 - 10:30"
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm"
                      required
                    />
                  </div>

                  {/* Quick-fill helper from active teacher's Timetable */}
                  {formDateDayName && formDateDayName !== 'الأحد' && (
                    <div className="col-span-1 sm:col-span-2 p-3 bg-indigo-50/70 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/40 text-xs">
                      <div className="font-bold text-indigo-700 dark:text-indigo-300 mb-1.5 flex items-center gap-1">
                        <span>💡 الملء التلقائي من جدول يوم {formDateDayName} لـ ({activeTeacher.name}):</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SLOTS.map(slot => {
                          const classInSlot = activeTeacher.timetable?.[formDateDayName]?.[slot.id] || '';
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => {
                                if (classInSlot) {
                                  setFormClassName(classInSlot);
                                  setFormTimeSlot(slot.time);
                                }
                              }}
                              disabled={!classInSlot}
                              className={`p-2 rounded-xl text-center border font-bold transition text-[11px] ${
                                classInSlot 
                                  ? 'bg-white hover:bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-gray-800 dark:border-indigo-800 dark:text-indigo-300 cursor-pointer' 
                                  : 'bg-gray-50 border-gray-100 text-gray-400 dark:bg-gray-700/50 dark:border-gray-700 select-none'
                              }`}
                            >
                              <div>حصة {slot.id}</div>
                              <div className="text-[10px] font-normal truncate mt-0.5">{classInSlot || 'فارغ'}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Goal / Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">الهدف البيداغوجي / محتوى الدرس:</label>
                  <textarea 
                    value={formGoal}
                    onChange={(e) => setFormGoal(e.target.value)}
                    placeholder="أدخل الأهداف البيداغوجية والمهارات المبرمجة في هذه الحصة..."
                    rows={4}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                    required
                  />
                </div>

                {/* Form actions */}
                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white font-black py-2.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 cursor-pointer text-xs"
                  >
                    {editingSessionId ? 'تعديل الحصة' : 'تسجيل في الدفتر'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 font-black py-2.5 rounded-xl hover:bg-gray-200 cursor-pointer text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Main Sessions Feed */}
          <div className="space-y-4">
            {filteredSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSessions.map(session => (
                  <div key={session.id} className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-1.5 w-full bg-indigo-600"></div>

                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-xl">
                            {session.sessionNumber}
                          </span>
                          <span className="text-xs font-bold text-gray-400">
                            القسم: <strong className="text-gray-900 dark:text-white">{session.className}</strong>
                          </span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md">
                            👤 {(session as any).loggedByTeacherName || "أستاذ المادة"}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-gray-400 flex items-center gap-4 pt-2">
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{session.date}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{session.timeSlot}</span>
                          </span>
                        </div>
                      </div>

                      {/* Actions (Edit / Delete) */}
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(session)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                          title="تعديل الحصة"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="حذف الحصة"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Pedagoical Goal */}
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/80">
                      <span className="text-[11px] font-black text-gray-400 block mb-1">الهدف البيداغوجي ومحتوى الدرس:</span>
                      <p className="text-xs text-gray-700 dark:text-gray-200 font-bold leading-relaxed whitespace-pre-line text-right">
                        {session.goal}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-700">
                <InformationCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-black text-gray-500">لا توجد أي حصص مبرمجة في دفتر النصوص لخيارات الفلترة الحالية</h3>
                <p className="text-xs text-gray-400 mt-1">اضغط على زر «تسجيل حصة جديدة» لإدخال وتوثيق أول حصة في دفتر النصوص.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: TIMETABLE SETUP View */}
      {activeTab === 'timetable' && (
        <form onSubmit={handleSaveTeacherSetup} className="space-y-6">
          {/* Section 1: Teacher Setup Information */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <h3 className="text-base font-black text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <AcademicCapIcon className="w-5 h-5 text-indigo-600" />
              <span>بيانات تعريف الأستاذ ومجموعة الأقسام المخصصة له</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500">اسم الأستاذ الكامل:</label>
                <input
                  type="text"
                  value={editingTeacherName}
                  onChange={(e) => setEditingTeacherName(e.target.value)}
                  placeholder="أدخل اسم الأستاذ الكامل..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-xs"
                  required
                />
                <p className="text-[10px] text-gray-400">سيتم ربطه بجميع سجلات دفتر النصوص وحصص استعمال الزمن التي ينشئها.</p>
              </div>

              {/* Class Allocation Checkboxes */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-black text-gray-500">تخصيص الأقسام المسندة لهذا الأستاذ (مجموعة الأقسام):</label>
                {classList.length === 0 ? (
                  <div className="text-xs text-amber-600 font-bold p-3 bg-amber-50 rounded-xl">المرجو أولاً التوجه لشاشة «لائحة الأقسام» وإدخال الأقسام الدراسية بالمؤسسة.</div>
                ) : (
                  <div className="flex flex-wrap gap-2.5 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                    {classList.map(cls => {
                      const isChecked = editingAssignedClasses.includes(cls.className);
                      return (
                        <label 
                          key={cls.className}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 font-black'
                              : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleClassCheckboxChange(cls.className, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <span>{cls.className}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-gray-400">سيتمكن الأستاذ من جدولة الأقسام المحددة هنا فقط في استعمال زمنه الصباحي لتجنب التداخل.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Timetable Grid Setup */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
                <span>إعداد استعمال الزمن الصباحي الخاص بالأستاذ (الاثنين إلى السبت)</span>
              </h3>
              <span className="text-[11px] font-bold px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                الصباح فقط (08:00 - 12:00) • 4 حصص في اليوم
              </span>
            </div>

            {/* Desktop Timetable Grid */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse border border-gray-100 dark:border-gray-700 text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th className="border border-gray-100 dark:border-gray-700 p-3 font-black text-gray-600 dark:text-gray-300 text-center w-40">الحيز الزمني / اليوم</th>
                    {DAYS.map(day => (
                      <th key={day} className="border border-gray-100 dark:border-gray-700 p-3 font-black text-gray-900 dark:text-white text-center">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map(slot => (
                    <tr key={slot.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10">
                      <td className="border border-gray-100 dark:border-gray-700 p-3 font-black text-indigo-600 dark:text-indigo-400 bg-gray-50/30 dark:bg-gray-900/10 text-center">
                        <div className="font-bold">{slot.id === '1' ? 'الحصة الأولى' : slot.id === '2' ? 'الحصة الثانية' : slot.id === '3' ? 'الحصة الثالثة' : 'الحصة الرابعة'}</div>
                        <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">{slot.time}</div>
                      </td>
                      {DAYS.map(day => {
                        const cellValue = editingTimetable[day]?.[slot.id] || '';
                        return (
                          <td key={day} className="border border-gray-100 dark:border-gray-700 p-2 text-center">
                            <select
                              value={cellValue}
                              onChange={(e) => handleTimetableCellChange(day, slot.id, e.target.value)}
                              className={`w-full p-2.5 rounded-xl text-xs font-black border text-center cursor-pointer transition ${
                                cellValue
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/60 dark:text-indigo-300 font-black shadow-xs'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400'
                              }`}
                            >
                              <option value="">-- فارغ --</option>
                              {editingAssignedClasses.map(clsName => (
                                <option key={clsName} value={clsName}>{clsName}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet List-based Timetable Configurator */}
            <div className="block lg:hidden space-y-4">
              <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300 text-xs rounded-2xl leading-relaxed">
                💡 في الهواتف، نعرض لك استعمال الزمن مقسماً حسب الأيام لسهولة التحرير والإدخال بشكل واضح وسريع.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DAYS.map(day => (
                  <div key={day} className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-150 dark:border-gray-700 rounded-2xl space-y-3">
                    <h4 className="font-black text-xs text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center justify-between">
                      <span>{day}</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">الحصص الصباحية</span>
                    </h4>

                    <div className="space-y-2">
                      {SLOTS.map(slot => {
                        const cellValue = editingTimetable[day]?.[slot.id] || '';
                        return (
                          <div key={slot.id} className="flex items-center justify-between gap-3 text-xs bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-xs">
                            <span className="font-bold text-gray-600 dark:text-gray-400 truncate">حصة {slot.id} ({slot.time}):</span>
                            <select
                              value={cellValue}
                              onChange={(e) => handleTimetableCellChange(day, slot.id, e.target.value)}
                              className={`p-1.5 rounded-lg text-xs font-black border text-center cursor-pointer transition ${
                                cellValue
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900'
                                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400'
                              }`}
                            >
                              <option value="">-- فارغ --</option>
                              {editingAssignedClasses.map(clsName => (
                                <option key={clsName} value={clsName}>{clsName}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timetable Submit bar */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>حفظ ومزامنة جدول الأستاذ والتخصيص</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
