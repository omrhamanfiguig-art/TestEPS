import React, { useState, useEffect, useMemo } from 'react';
import { StudentIdentity, AttendanceSession, AttendanceRecord, AttendanceStatus } from '../types';
import { 
  getStudentList, 
  saveStudentList,
  getAllClasses, 
  ClassStats,
  getAttendanceSessions, 
  saveAttendanceSession, 
  deleteAttendanceSession 
} from '../utils/db';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  UserGroupIcon, 
  CheckCircleIcon, 
  XMarkIcon, 
  ArrowDownTrayIcon, 
  ArrowPathIcon,
  TrashIcon,
  PencilSquareIcon,
  UserPlusIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  InformationCircleIcon,
  DocumentTextIcon
} from '../components/Icons';
import { StudentAvatar } from '../components/StudentAvatar';
import { AddEditStudentModal } from '../components/AddEditStudentModal';
import { 
  exportSessionAttendanceToExcel, 
  exportClassAttendanceCumulativeToExcel,
  exportAllSessionsSportsActivityToExcel
} from '../utils/excelHelper';
import { useSportsList } from '../utils/SportsConstants';
import { useLanguage } from '../utils/i18n';

interface AttendanceScreenProps {
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  sessionDate?: string;
}

const COMMON_TIME_SLOTS = [
  "08:30 - 10:30",
  "10:30 - 12:30",
  "14:30 - 16:30",
  "16:30 - 18:30",
  "08:00 - 10:00",
  "10:00 - 12:00",
  "14:00 - 16:00",
  "16:00 - 18:00"
];

const COMMON_TOPICS = [
  "ألعاب القوى (Athlétisme)",
  "كرة السلة (Basketball)",
  "كرة القدم (Football)",
  "كرة اليد (Handball)",
  "كرة الطائرة (Volleyball)",
  "جري الجلاد (Course du Jelad / Cross)",
  "الجري السريع (Sprint)",
  "دفع الجلة (Lancer du Poids)",
  "الجمباز (Gymnastique)",
  "جري المسافات المتوسطة والتحمل",
  "القفز الطولي / الارتقاء",
  "اختبار السرعة الهوائية VMA",
  "التقويم التشخيصي / البدني"
];

export const AttendanceScreen: React.FC<AttendanceScreenProps> = ({
  selectedClass,
  setSelectedClass,
  sessionDate: initialDate
}) => {
  const { language, isRtl } = useLanguage();
  const [classList, setClassList] = useState<ClassStats[]>([]);
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [previousSessions, setPreviousSessions] = useState<AttendanceSession[]>([]);
  
  // Current Session Config
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [date, setDate] = useState<string>(initialDate || todayStr);
  const [timeSlot, setTimeSlot] = useState<string>("08:30 - 10:30");
  const [topic, setTopic] = useState<string>("ألعاب القوى والتربية البدنية");
  const [sessionNumber, setSessionNumber] = useState<string>("الحصة 1");
  const [sessionId, setSessionId] = useState<string>(() => `${Date.now()}`);

  // Dynamic Sports list hook and states
  const { sports, addSport, editSport, deleteSport, resetSports } = useSportsList();
  const [isManageSportsOpen, setIsManageSportsOpen] = useState(false);
  const [editingSportId, setEditingSportId] = useState<string | null>(null);
  const [sportFormLabelAr, setSportFormLabelAr] = useState('');
  const [sportFormLabelFr, setSportFormLabelFr] = useState('');
  const [sportFormIcon, setSportFormIcon] = useState('⚽');
  
  // Records Map: studentNumber -> AttendanceRecord
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  
  // Active Tab: 'roll-call-table' | 'history' | 'cumulative'
  const [activeTab, setActiveTab] = useState<'table' | 'history' | 'cumulative'>('table');
  
  // Interactive Roll Call Carousel Modal
  const [isRollCallModalOpen, setIsRollCallModalOpen] = useState(false);
  const [rollCallIndex, setRollCallIndex] = useState(0);
  
  // Filter & Search in Table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  
  // Student Add / Edit Modal State
  const [isAddEditStudentOpen, setIsAddEditStudentOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<StudentIdentity | null>(null);

  // Feedback notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Derive unique levels from class names
  const academicLevels = useMemo(() => {
    const set = new Set<string>();
    classList.forEach(c => {
      const match = c.className.match(/^(1APIC|2APIC|3APIC|TC|1BAC|2BAC|6ème|5ème|4ème|3ème|1AC|2AC|3AC)/i);
      if (match) set.add(match[1].toUpperCase());
    });
    return Array.from(set);
  }, [classList]);

  const filteredClassList = useMemo(() => {
    if (levelFilter === 'ALL') return classList;
    return classList.filter(c => c.className.toUpperCase().startsWith(levelFilter));
  }, [classList, levelFilter]);

  const handleDeleteStudent = async (studentNum: string, studentName: string) => {
    if (confirm(`هل أنت متأكد من مسح التلميذ(ة) «${studentName}» من لائحة هذا القسم؟`)) {
      const updated = students.filter(s => s.numeroEleve !== studentNum);
      await saveStudentList(selectedClass, updated);
      setStudents(updated);
      setNotification({
        message: `تم مسح التلميذ(ة) «${studentName}» من لائحة القسم بنجاح.`,
        type: 'success'
      });
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load Classes and Data
  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassData(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const list = await getAllClasses();
    setClassList(list);
    if (list.length > 0 && !selectedClass) {
      setSelectedClass(list[0].className);
    }
  };

  const loadClassData = async (className: string) => {
    const stds = await getStudentList(className);
    setStudents(stds);

    const sessions = await getAttendanceSessions(className);
    setPreviousSessions(sessions);

    // Look for an existing session for this date & class
    const existing = sessions.find(s => s.date === date && s.className === className);
    if (existing) {
      setSessionId(existing.id);
      setTimeSlot(existing.timeSlot || "08:30 - 10:30");
      setTopic(existing.topic || "ألعاب القوى والتربية البدنية");
      setSessionNumber(existing.sessionNumber || `الحصة ${sessions.length + 1}`);
      const recMap: Record<string, AttendanceRecord> = {};
      (existing.records || []).forEach(r => {
        recMap[r.studentNumber] = r;
      });
      // Default rest to present
      stds.forEach(s => {
        if (!recMap[s.numeroEleve]) {
          recMap[s.numeroEleve] = { studentNumber: s.numeroEleve, status: 'present' };
        }
      });
      setRecords(recMap);
    } else {
      // New session: default all students to present
      const freshId = `sess_${className.replace(/\s+/g, '_')}_${date}_${Date.now()}`;
      setSessionId(freshId);
      setSessionNumber(`الحصة ${sessions.length + 1}`);
      const freshMap: Record<string, AttendanceRecord> = {};
      stds.forEach(s => {
        freshMap[s.numeroEleve] = { studentNumber: s.numeroEleve, status: 'present' };
      });
      setRecords(freshMap);
    }
  };

  // Change Date Handler
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const existing = previousSessions.find(s => s.date === newDate && s.className === selectedClass);
    if (existing) {
      setSessionId(existing.id);
      setTimeSlot(existing.timeSlot);
      setTopic(existing.topic || '');
      setSessionNumber(existing.sessionNumber || `الحصة ${previousSessions.length + 1}`);
      const recMap: Record<string, AttendanceRecord> = {};
      existing.records.forEach(r => { recMap[r.studentNumber] = r; });
      students.forEach(s => {
        if (!recMap[s.numeroEleve]) {
          recMap[s.numeroEleve] = { studentNumber: s.numeroEleve, status: 'present' };
        }
      });
      setRecords(recMap);
    } else {
      const freshId = `sess_${selectedClass.replace(/\s+/g, '_')}_${newDate}_${Date.now()}`;
      setSessionId(freshId);
      setSessionNumber(`الحصة ${previousSessions.length + 1}`);
      const freshMap: Record<string, AttendanceRecord> = {};
      students.forEach(s => {
        freshMap[s.numeroEleve] = { studentNumber: s.numeroEleve, status: 'present' };
      });
      setRecords(freshMap);
    }
  };

  // Switch to a previous session from history
  const handleLoadPreviousSession = (session: AttendanceSession) => {
    setSessionId(session.id);
    setDate(session.date);
    setTimeSlot(session.timeSlot);
    setTopic(session.topic || '');
    setSessionNumber(session.sessionNumber || `الحصة ${previousSessions.indexOf(session) >= 0 ? previousSessions.length - previousSessions.indexOf(session) : 1}`);
    const recMap: Record<string, AttendanceRecord> = {};
    (session.records || []).forEach(r => { recMap[r.studentNumber] = r; });
    students.forEach(s => {
      if (!recMap[s.numeroEleve]) {
        recMap[s.numeroEleve] = { studentNumber: s.numeroEleve, status: 'present' };
      }
    });
    setRecords(recMap);
    setActiveTab('table');
    setNotification({
      message: `تم تحميل ورقة حضور حصة ${session.date} (${session.timeSlot}) بنجاح.`,
      type: 'success'
    });
  };

  // Update Status for a single student
  const handleStatusChange = (studentNum: string, status: AttendanceStatus) => {
    setRecords(prev => ({
      ...prev,
      [studentNum]: {
        ...(prev[studentNum] || { studentNumber: studentNum }),
        status
      }
    }));
  };

  // Update Note for a single student
  const handleNoteChange = (studentNum: string, note: string) => {
    setRecords(prev => ({
      ...prev,
      [studentNum]: {
        ...(prev[studentNum] || { studentNumber: studentNum, status: 'present' }),
        note
      }
    }));
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceRecord> = {};
    students.forEach(s => {
      updated[s.numeroEleve] = {
        studentNumber: s.numeroEleve,
        status: 'present',
        note: records[s.numeroEleve]?.note || ''
      };
    });
    setRecords(updated);
    setNotification({
      message: "تم تحديد جميع تلاميذ القسم كـ (حاضر) بنجاح.",
      type: 'success'
    });
  };

  // Build Summary
  const summary = useMemo(() => {
    const total = students.length;
    let present = 0;
    let absent = 0;
    let justified = 0;
    let late = 0;
    let noKit = 0;

    students.forEach(s => {
      const rec = records[s.numeroEleve];
      const status = rec?.status || 'present';
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'justified') justified++;
      else if (status === 'late') {
        late++;
        present++;
      } else if (status === 'no-kit') {
        noKit++;
        present++;
      }
    });

    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, justified, late, noKit, rate };
  }, [students, records]);

  // Save current session to DB and Cloud
  const handleSaveSession = async (isAuto = false) => {
    if (!selectedClass || students.length === 0) {
      if (!isAuto) setNotification({ message: "يرجى تحديد قسم به تلاميذ أولاً.", type: 'error' });
      return;
    }

    const recordsList: AttendanceRecord[] = students.map(s => {
      return records[s.numeroEleve] || { studentNumber: s.numeroEleve, status: 'present' };
    });

    const sessionObj: AttendanceSession = {
      id: sessionId,
      className: selectedClass,
      date,
      timeSlot,
      topic: topic.trim(),
      sessionNumber: sessionNumber.trim(),
      records: recordsList,
      summary: {
        total: summary.total,
        present: summary.present,
        absent: summary.absent,
        justified: summary.justified,
        late: summary.late,
        noKit: summary.noKit
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isAuto) setIsSaving(true);
    try {
      await saveAttendanceSession(sessionObj);
      const updated = await getAttendanceSessions(selectedClass);
      setPreviousSessions(updated);

      if (!isAuto) {
        setNotification({
          message: `تم حفظ ورقة غياب حصة ${date} (${timeSlot}) ومزامنتها سحابياً بنجاح!`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      if (isAuto) setIsSaving(false);
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (Object.keys(records).length === 0) return;
    
    const timer = setTimeout(() => {
      handleSaveSession(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [records, date, timeSlot, topic, sessionNumber, selectedClass]);

  // Delete session
  const handleDeleteSession = async (sessId: string, sessDate: string) => {
    if (confirm(`هل أنت متأكد من حذف ورقة غياب حصة ${sessDate}؟`)) {
      await deleteAttendanceSession(selectedClass, sessId);
      const updated = await getAttendanceSessions(selectedClass);
      setPreviousSessions(updated);
      setNotification({ message: "تم حذف ورقة الحصة بنجاح.", type: 'success' });
    }
  };

  // Start Roll Call Modal
  const startRollCall = () => {
    if (students.length === 0) return;
    setRollCallIndex(0);
    setIsRollCallModalOpen(true);
  };

  // Roll Call Modal Actions
  const currentRollStudent = students[rollCallIndex];
  const handleRollCallAnswer = (status: AttendanceStatus) => {
    if (!currentRollStudent) return;
    handleStatusChange(currentRollStudent.numeroEleve, status);
    if (rollCallIndex < students.length - 1) {
      setRollCallIndex(rollCallIndex + 1);
    } else {
      setIsRollCallModalOpen(false);
      setNotification({
        message: "اكتملت المناداة على جميع التلاميذ بنجاح! يمكنك الآن مراجعة اللائحة وحفظها.",
        type: 'success'
      });
    }
  };

  // Filtered Students for the table
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchQuery = !searchQuery || 
        s.nomEleve.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.numeroEleve.toLowerCase().includes(searchQuery.toLowerCase());
      
      const st = records[s.numeroEleve]?.status || 'present';
      const matchStatus = statusFilter === 'all' || st === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [students, searchQuery, statusFilter, records]);

  // Export current session to Excel
  const handleExportExcel = () => {
    const recordsList: AttendanceRecord[] = students.map(s => {
      return records[s.numeroEleve] || { studentNumber: s.numeroEleve, status: 'present' };
    });

    const sessionObj: AttendanceSession = {
      id: sessionId,
      className: selectedClass,
      date,
      timeSlot,
      topic,
      sessionNumber,
      records: recordsList,
      summary: {
        total: summary.total,
        present: summary.present,
        absent: summary.absent,
        justified: summary.justified,
        late: summary.late,
        noKit: summary.noKit
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    exportSessionAttendanceToExcel(sessionObj, students);
  };

  // Export Cumulative report
  const handleExportCumulative = () => {
    if (previousSessions.length === 0) {
      alert("لا توجد حصص مسجلة لهذا القسم بعد.");
      return;
    }
    exportClassAttendanceCumulativeToExcel(selectedClass, previousSessions, students);
  };

  // Export all sessions sports activity report
  const handleExportAllSportsActivity = () => {
    if (previousSessions.length === 0) {
      alert("لا توجد حصص مسجلة لهذا القسم بعد.");
      return;
    }
    exportAllSessionsSportsActivityToExcel(previousSessions);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl shadow-md text-sm font-bold flex items-center justify-between transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-500 text-white'
            : 'bg-rose-600 text-white'
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

      {/* Main Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/60 p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <CalendarDaysIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                تتبع غياب وحضور التلاميذ
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {selectedClass || "اختر القسم"}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              تسجيل الحضور والغياب في كل حصة مع إمكانية المناداة السريعة وحفظ السجل التراكمي
            </p>
          </div>
        </div>

        {/* Top Controls: Level, Class Select & Actions */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Level Filter Dropdown */}
          {academicLevels.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-600">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ps-1.5">المستوى:</span>
              <select
                value={levelFilter}
                onChange={(e) => {
                  setLevelFilter(e.target.value);
                  const matchingClasses = e.target.value === 'ALL' 
                    ? classList 
                    : classList.filter(c => c.className.toUpperCase().startsWith(e.target.value));
                  if (matchingClasses.length > 0) {
                    setSelectedClass(matchingClasses[0].className);
                  }
                }}
                className="bg-white dark:bg-gray-800 border-none font-bold text-xs text-gray-900 dark:text-white rounded-xl px-2.5 py-1.5 focus:ring-0 shadow-xs cursor-pointer"
              >
                <option value="ALL">جميع المستويات</option>
                {academicLevels.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          )}

          {/* Class Select Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-600">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ps-1.5">القسم:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white dark:bg-gray-800 border-none font-bold text-xs text-gray-900 dark:text-white rounded-xl px-2.5 py-1.5 focus:ring-0 shadow-xs cursor-pointer"
            >
              {filteredClassList.map(cls => (
                <option key={cls.className} value={cls.className}>
                  {cls.className} ({cls.studentCount} تلميذ)
                </option>
              ))}
            </select>
          </div>

          {/* Add Student Button */}
          <button
            type="button"
            onClick={() => {
              setStudentToEdit(null);
              setIsAddEditStudentOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs active:scale-95 transition cursor-pointer"
            title="إضافة تلميذ جديد للقسم الحالية"
          >
            <UserPlusIcon className="w-4 h-4 shrink-0" />
            <span>إضافة تلميذ</span>
          </button>

          {/* Roll Call Launcher Button */}
          <button
            type="button"
            onClick={startRollCall}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-xs active:scale-95 transition cursor-pointer"
            title="بدء المناداة السريعة تلميذاً تلو الآخر"
          >
            <span>📢</span>
            <span>بدء المناداة</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={() => handleSaveSession()}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-extrabold text-white bg-indigo-700 hover:bg-indigo-800 shadow-xs active:scale-95 transition cursor-pointer"
          >
            <CheckCircleIcon className="w-4 h-4 shrink-0" />
            <span>حفظ الحصة</span>
          </button>
        </div>
      </div>

      {/* Session Details Bar (Date, Time, Topic, Session Number) */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/60 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
          {/* Session Number */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <span>🔢</span>
              <span>رقم الحصة:</span>
            </label>
            <input
              type="text"
              value={sessionNumber}
              onChange={(e) => setSessionNumber(e.target.value)}
              placeholder="مثال: الحصة 1"
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <CalendarDaysIcon className="w-4 h-4 text-indigo-500" />
              <span>تاريخ الحصة:</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Time Slot Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-indigo-500" />
              <span>توقيت الحصة:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="time-slots-list"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                placeholder="مثال: 08:30 - 10:30"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <datalist id="time-slots-list">
                {COMMON_TIME_SLOTS.map(slot => (
                  <option key={slot} value={slot} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Session Topic / Sport activity with manage button */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🎯</span>
                <span>النشاط / موضوع الحصة:</span>
              </span>
              <button
                type="button"
                onClick={() => setIsManageSportsOpen(true)}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                ⚙️ تسيير لائحة الرياضات
              </button>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="أدخل موضوع الحصة أو النشاط الرياضي..."
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setTopic(e.target.value);
                  }
                }}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[150px]"
                value=""
              >
                <option value="" disabled>اختر رياضة...</option>
                {sports.map(sport => (
                  <option key={sport.id} value={`${sport.icon} ${sport.labelAr}`}>
                    {sport.icon} {sport.labelAr}
                  </option>
                ))}
                <option value="" disabled>-----------</option>
                {COMMON_TOPICS.map(top => (
                  <option key={top} value={top}>{top}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Session Quick Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
          <div className="text-2xl font-black text-gray-900 dark:text-white">{summary.total}</div>
          <div className="text-[11px] font-bold text-gray-400 mt-0.5">مجموع التلاميذ</div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 text-center">
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.present}</div>
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">الحاضرون</div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-800/40 text-center">
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{summary.absent}</div>
          <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">الغائبون (غير مبرر)</div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/40 text-center">
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{summary.late}</div>
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mt-0.5">المتأخرون</div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/40 text-center">
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{summary.justified}</div>
          <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 mt-0.5">غياب مبرر</div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/40 text-center">
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{summary.rate}%</div>
          <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">نسبة الحضور</div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
            }`}
          >
            <span>ورقة حضور الحصة</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {students.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cumulative')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'cumulative'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
            }`}
          >
            <span>المواظبة التراكمية</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {previousSessions.length} حصص
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
            }`}
          >
            <span>سجل الحصص السابقة</span>
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'table' ? (
            <>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 transition"
              >
                تحديد الكل حاضر
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportAllSportsActivity}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100 transition flex items-center gap-1.5 cursor-pointer"
                title="تصدير سجل الأنشطة والغيابات لجميع الحصص الدراسية"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                <span>تصدير سجل الأنشطة (كل الحصص)</span>
              </button>
              <button
                type="button"
                onClick={handleExportCumulative}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                <span>تصدير التقرير التراكمي Excel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab 1: Current Session Roll Call Table */}
      {activeTab === 'table' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/40">
            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم التلميذ أو رقم مسار..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {(['all', 'present', 'absent', 'late', 'justified', 'no-kit'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {st === 'all' && 'الكل'}
                  {st === 'present' && 'الحاضرون'}
                  {st === 'absent' && 'الغائبون'}
                  {st === 'late' && 'المتأخرون'}
                  {st === 'justified' && 'مبرر'}
                  {st === 'no-kit' && 'بدون بذلة'}
                </button>
              ))}
            </div>
          </div>

          {/* Table / Card Container */}
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-3 text-center w-12">#</th>
                  <th className="p-3">التلميذ</th>
                  <th className="p-3 text-center w-16">الجنس</th>
                  <th className="p-3 text-center">حالة الحضور</th>
                  <th className="p-3">ملاحظات إضافية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                {filteredStudents.map((s, idx) => {
                  const rec = records[s.numeroEleve] || { studentNumber: s.numeroEleve, status: 'present' };
                  const currentStatus = rec.status;

                  return (
                    <tr 
                      key={s.numeroEleve} 
                      className={`hover:bg-gray-50/80 dark:hover:bg-gray-750 transition ${
                        currentStatus === 'absent' ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="p-3 text-center font-bold text-gray-400">
                        {idx + 1}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center justify-between gap-3 group">
                          <div className="flex items-center gap-3">
                            <StudentAvatar
                              photoUrl={s.photoUrl}
                              nomEleve={s.nomEleve}
                              sexe={s.sexe}
                              size="sm"
                            />
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white text-sm">
                                {s.nomEleve}
                              </div>
                              <div className="text-[11px] font-mono text-gray-400">
                                {s.numeroEleve}
                              </div>
                            </div>
                          </div>

                          {/* Quick Student Management Actions (Edit / Delete) */}
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => {
                                setStudentToEdit(s);
                                setIsAddEditStudentOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                              title="تعديل بيانات التلميذ"
                            >
                              <PencilSquareIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(s.numeroEleve, s.nomEleve)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="مسح التلميذ من لائحة القسم"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          s.sexe === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {s.sexe === 'F' ? 'أنثى' : 'ذكر'}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.numeroEleve, 'present')}
                            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs transition active:scale-95 ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-emerald-50'
                            }`}
                          >
                            حاضر
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.numeroEleve, 'absent')}
                            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs transition active:scale-95 ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-rose-50'
                            }`}
                          >
                            غائب
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.numeroEleve, 'late')}
                            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs transition active:scale-95 ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-amber-50'
                            }`}
                          >
                            تأخر
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.numeroEleve, 'justified')}
                            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs transition active:scale-95 ${
                              currentStatus === 'justified'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-50'
                            }`}
                          >
                            مبرر
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.numeroEleve, 'no-kit')}
                            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs transition active:scale-95 ${
                              currentStatus === 'no-kit'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-purple-50'
                            }`}
                          >
                            بدون بذلة
                          </button>
                        </div>
                      </td>

                      <td className="p-3 w-48">
                        <input
                          type="text"
                          value={rec.note || ''}
                          onChange={(e) => handleNoteChange(s.numeroEleve, e.target.value)}
                          placeholder="ملاحظة أو سبب الغياب..."
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1 text-xs text-gray-900 dark:text-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Elegant Card List View */}
          <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-750/60">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">لا توجد نتائج تطابق خيارات البحث</div>
            ) : (
              filteredStudents.map((s, idx) => {
                const rec = records[s.numeroEleve] || { studentNumber: s.numeroEleve, status: 'present' };
                const currentStatus = rec.status;
                const isNoteOpen = expandedNotes[s.numeroEleve] || !!rec.note;

                return (
                  <div 
                    key={s.numeroEleve} 
                    className={`p-3.5 flex flex-col gap-2.5 transition ${
                      currentStatus === 'absent' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    {/* Upper Row: Info and Quick Statuses */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Right: Avatar and Name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black text-gray-400 shrink-0">#{idx + 1}</span>
                        <StudentAvatar
                          photoUrl={s.photoUrl}
                          nomEleve={s.nomEleve}
                          sexe={s.sexe}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-950 dark:text-white text-xs truncate">
                            {s.nomEleve}
                          </div>
                          <div className="text-[9px] font-mono text-gray-400 flex items-center gap-1.5 truncate mt-0.5">
                            <span>{s.numeroEleve}</span>
                            <span className={`px-1 py-0.2 rounded-xs text-[8px] font-bold ${
                              s.sexe === 'F' ? 'bg-pink-100/80 text-pink-700' : 'bg-blue-100/80 text-blue-700'
                            }`}>
                              {s.sexe === 'F' ? 'أنثى' : 'ذكر'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Left: Quick Status Buttons + Notes Trigger */}
                      <div className="flex items-center gap-1 shrink-0">
                        {(['present', 'absent', 'late', 'justified', 'no-kit'] as const).map(status => {
                          const statusDetails = {
                            present: { key: 'ح', name: 'حاضر', color: 'bg-emerald-600 text-white border-emerald-600' },
                            absent: { key: 'غ', name: 'غائب', color: 'bg-rose-600 text-white border-rose-600' },
                            late: { key: 'ت', name: 'تأخر', color: 'bg-amber-500 text-white border-amber-500' },
                            justified: { key: 'م', name: 'مبرر', color: 'bg-blue-600 text-white border-blue-600' },
                            'no-kit': { key: 'ب', name: 'بذلة', color: 'bg-purple-600 text-white border-purple-600' },
                          };
                          const isActive = currentStatus === status;
                          const detail = statusDetails[status];

                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusChange(s.numeroEleve, status)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition border active:scale-95 ${
                                isActive 
                                  ? detail.color 
                                  : 'bg-gray-50 border-gray-150 text-gray-400 dark:bg-gray-700/40 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-100'
                              }`}
                              title={detail.name}
                            >
                              {detail.key}
                            </button>
                          );
                        })}

                        {/* Expand Note Input button */}
                        <button
                          type="button"
                          onClick={() => setExpandedNotes(prev => ({ ...prev, [s.numeroEleve]: !prev[s.numeroEleve] }))}
                          className={`w-7 h-7 rounded-full flex items-center justify-center border transition active:scale-95 ${
                            rec.note 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300' 
                              : 'bg-gray-50 border-gray-150 text-gray-400 dark:bg-gray-700/40 dark:border-gray-600'
                          }`}
                          title="إضافة ملاحظة"
                        >
                          <DocumentTextIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Lower Row: Expandable note text-input */}
                    {isNoteOpen && (
                      <div className="relative pl-1 pr-6 flex gap-2 items-center">
                        <input
                          type="text"
                          value={rec.note || ''}
                          onChange={(e) => handleNoteChange(s.numeroEleve, e.target.value)}
                          placeholder="السبب أو الملاحظة..."
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-150 dark:border-gray-650 rounded-xl px-2.5 py-1 text-[10px] text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500/50"
                        />
                        {rec.note && (
                          <button
                            type="button"
                            onClick={() => handleNoteChange(s.numeroEleve, '')}
                            className="p-1 rounded-full text-gray-400 hover:text-rose-600 shrink-0"
                            title="مسح الملاحظة"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Cumulative Attendance Report Across All Sessions */}
      {activeTab === 'cumulative' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                تقرير المواظبة والغيابات التراكمي للقسم
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                مجموع الحصص المنجزة: <strong>{previousSessions.length} حصة</strong>
              </p>
            </div>
            <button
              onClick={handleExportCumulative}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-emerald-700 transition"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>تصدير التقرير التراكمي إلى Excel</span>
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-3 text-center w-12">#</th>
                  <th className="p-3">التلميذ</th>
                  <th className="p-3 text-center w-16">الجنس</th>
                  <th className="p-3 text-center">نسبة الحضور</th>
                  <th className="p-3 text-center">الغياب غير المبرر</th>
                  <th className="p-3 text-center">غياب مبرر</th>
                  <th className="p-3 text-center">التأخرات</th>
                  <th className="p-3 text-center">بدون بذلة</th>
                  <th className="p-3 text-center">التقييم العام للمواظبة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-medium">
                {students.map((s, idx) => {
                  let pres = 0;
                  let abs = 0;
                  let just = 0;
                  let lte = 0;
                  let noK = 0;

                  previousSessions.forEach(sess => {
                    const r = (sess.records || []).find(rec => rec.studentNumber === s.numeroEleve);
                    const st = r?.status || 'present';
                    if (st === 'present') pres++;
                    else if (st === 'absent') abs++;
                    else if (st === 'justified') just++;
                    else if (st === 'late') { lte++; pres++; }
                    else if (st === 'no-kit') { noK++; pres++; }
                  });

                  const total = previousSessions.length;
                  const rate = total > 0 ? Math.round((pres / total) * 100) : 100;

                  return (
                    <tr key={s.numeroEleve} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                      <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900 dark:text-white">{s.nomEleve}</div>
                        <div className="text-[10px] font-mono text-gray-400">{s.numeroEleve}</div>
                      </td>
                      <td className="p-3 text-center font-bold">
                        {s.sexe === 'F' ? 'أنثى' : 'ذكر'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          rate >= 90 ? 'bg-emerald-100 text-emerald-700' :
                          rate >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {rate}%
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded-md ${abs > 2 ? 'bg-rose-100 text-rose-700 font-black' : 'text-gray-700 dark:text-gray-300'}`}>
                          {abs}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-blue-600">
                        {just}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-600">
                        {lte}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-purple-600">
                        {noK}
                      </td>
                      <td className="p-3 text-center">
                        {abs >= 5 ? (
                          <span className="px-2 py-1 rounded-lg bg-rose-600 text-white font-black text-[10px]">
                            ⚠️ غياب مقلق ومتكرر
                          </span>
                        ) : abs >= 3 ? (
                          <span className="px-2 py-1 rounded-lg bg-amber-500 text-white font-bold text-[10px]">
                            تنبيه مواظبة
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            مواظب بانتظام
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-750/60">
            {students.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">لا توجد لوائح تلاميذ لعرضها</div>
            ) : (
              students.map((s, idx) => {
                let pres = 0;
                let abs = 0;
                let just = 0;
                let lte = 0;
                let noK = 0;

                previousSessions.forEach(sess => {
                  const r = (sess.records || []).find(rec => rec.studentNumber === s.numeroEleve);
                  const st = r?.status || 'present';
                  if (st === 'present') pres++;
                  else if (st === 'absent') abs++;
                  else if (st === 'justified') just++;
                  else if (st === 'late') { lte++; pres++; }
                  else if (st === 'no-kit') { noK++; pres++; }
                });

                const total = previousSessions.length;
                const rate = total > 0 ? Math.round((pres / total) * 100) : 100;

                return (
                  <div 
                    key={s.numeroEleve}
                    className="p-3.5 flex flex-col gap-2.5 transition hover:bg-gray-50/40 dark:hover:bg-gray-800/40"
                  >
                    {/* Upper row: Student info + general appraisal */}
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-black text-gray-400 shrink-0">#{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-950 dark:text-white text-xs truncate">{s.nomEleve}</span>
                            {abs >= 5 ? (
                              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" title="غياب مقلق ومتكرر" />
                            ) : abs >= 3 ? (
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="تنبيه مواظبة" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="مواظب بانتظام" />
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-gray-400 flex items-center gap-1.5 mt-0.5 truncate">
                            <span>{s.numeroEleve}</span>
                            <span className={`px-1 py-0.2 rounded-xs text-[8px] font-bold ${
                              s.sexe === 'F' ? 'bg-pink-100/80 text-pink-700' : 'bg-blue-100/80 text-blue-700'
                            }`}>
                              {s.sexe === 'F' ? 'أنثى' : 'ذكر'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* General Assessment label */}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 ${
                        abs >= 5 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' :
                        abs >= 3 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                      }`}>
                        {abs >= 5 ? 'مقلق' : abs >= 3 ? 'تنبيه' : 'منتظم'}
                      </span>
                    </div>

                    {/* Lower row: Stats badges */}
                    <div className="flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700/40 pt-2 shrink-0">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${abs > 2 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-extrabold' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                          <span>غ:</span><span>{abs}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 flex items-center gap-1">
                          <span>م:</span><span>{just}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 flex items-center gap-1">
                          <span>ت:</span><span>{lte}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 flex items-center gap-1">
                          <span>ب:</span><span>{noK}</span>
                        </span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        rate >= 90 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        rate >= 75 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                        {rate}% حضور
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Session History */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                سجل الحصص السابقة لقسم {selectedClass}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                يمكنك الضغط على أي حصة لاستعراض ورقتها وتعديلها أو تصديرها
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-xl">
              {previousSessions.length} حصص مسجلة
            </span>
          </div>

          {previousSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="font-bold">لا توجد حصص سابقة مسجلة لهذا القسم.</p>
              <p className="text-xs text-gray-400 mt-1">سجل أول حصة اليوم وسيتم حفظها تلقائياً في السجل.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {previousSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/50 hover:border-indigo-400 transition space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-mono">
                        <CalendarDaysIcon className="w-4 h-4" />
                        {sess.date}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        حضور {sess.summary.rate || Math.round((sess.summary.present / (sess.summary.total || 1)) * 100)}%
                      </span>
                    </div>

                    <div className="text-sm font-black text-gray-900 dark:text-white mt-2 flex items-center gap-1.5">
                      <ClockIcon className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>{sess.timeSlot || "الحصة العادية"}</span>
                    </div>

                    {sess.topic && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                        🎯 {sess.topic}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span>حاضر: <strong className="text-emerald-600">{sess.summary.present}</strong></span>
                      <span>•</span>
                      <span>غائب: <strong className="text-rose-600">{sess.summary.absent}</strong></span>
                      <span>•</span>
                      <span>تأخر: <strong className="text-amber-600">{sess.summary.late}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleLoadPreviousSession(sess)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
                    >
                      فتح وتعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => exportSessionAttendanceToExcel(sess, students)}
                      className="p-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                      title="تصدير الحصة Excel"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(sess.id, sess.date)}
                      className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                      title="حذف الحصة"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interactive Roll Call Full Carousel Modal */}
      {isRollCallModalOpen && currentRollStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-center space-y-6 border border-gray-200 dark:border-gray-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                  وضع المناداة السريعة ({rollCallIndex + 1} / {students.length})
                </span>
              </div>
              <button 
                onClick={() => setIsRollCallModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2 transition-all duration-300"
                style={{ width: `${((rollCallIndex + 1) / students.length) * 100}%` }}
              />
            </div>

            {/* Student Big Card */}
            <div className="flex flex-col items-center space-y-3 py-2">
              <StudentAvatar
                photoUrl={currentRollStudent.photoUrl}
                nomEleve={currentRollStudent.nomEleve}
                sexe={currentRollStudent.sexe}
                size="lg"
              />
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                  {currentRollStudent.nomEleve}
                </h2>
                <div className="text-xs text-gray-400 font-mono mt-1 flex items-center justify-center gap-2">
                  <span>رقم مسار: <strong>{currentRollStudent.numeroEleve}</strong></span>
                  <span>•</span>
                  <span>{currentRollStudent.sexe === 'F' ? 'أنثى' : 'ذكر'}</span>
                </div>
              </div>

              {/* Current Recorded Status Badge */}
              <div className="text-xs font-bold text-gray-500">
                الحالة المسجلة حالياً:{' '}
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  {records[currentRollStudent.numeroEleve]?.status === 'present' ? 'حاضر' :
                   records[currentRollStudent.numeroEleve]?.status === 'absent' ? 'غائب' :
                   records[currentRollStudent.numeroEleve]?.status === 'late' ? 'متأخر' :
                   records[currentRollStudent.numeroEleve]?.status === 'justified' ? 'مبرر' : 'بدون بذلة'}
                </span>
              </div>
            </div>

            {/* Large One-Tap Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleRollCallAnswer('present')}
                className="py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg shadow-emerald-600/20 active:scale-95 transition"
              >
                ✅ حاضر (P)
              </button>

              <button
                type="button"
                onClick={() => handleRollCallAnswer('absent')}
                className="py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base shadow-lg shadow-rose-600/20 active:scale-95 transition"
              >
                ❌ غائب (A)
              </button>

              <button
                type="button"
                onClick={() => handleRollCallAnswer('late')}
                className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/20 active:scale-95 transition"
              >
                ⏱️ متأخر (L)
              </button>

              <button
                type="button"
                onClick={() => handleRollCallAnswer('justified')}
                className="py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 active:scale-95 transition"
              >
                📄 غياب مبرر (J)
              </button>

              <button
                type="button"
                onClick={() => handleRollCallAnswer('no-kit')}
                className="col-span-2 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs active:scale-95 transition"
              >
                👟 حاضر بدون بذلة رياضية
              </button>
            </div>

            {/* Navigation Carousel controls */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                disabled={rollCallIndex === 0}
                onClick={() => setRollCallIndex(rollCallIndex - 1)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold disabled:opacity-30"
              >
                السابق
              </button>

              <span className="text-xs font-bold text-gray-400">
                {rollCallIndex + 1} من {students.length}
              </span>

              <button
                type="button"
                disabled={rollCallIndex === students.length - 1}
                onClick={() => setRollCallIndex(rollCallIndex + 1)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold disabled:opacity-30"
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isAddEditStudentOpen && (
        <AddEditStudentModal
          isOpen={isAddEditStudentOpen}
          onClose={() => {
            setIsAddEditStudentOpen(false);
            setStudentToEdit(null);
          }}
          className={selectedClass}
          studentToEdit={studentToEdit}
          existingStudentsCount={students.length}
          onSuccess={() => {
            loadClassData(selectedClass);
            setNotification({
              message: studentToEdit ? `تم تحديث بيانات التلميذ بنجاح.` : `تمت إضافة التلميذ بنجاح.`,
              type: 'success'
            });
          }}
        />
      )}

      {/* Manage Sports Modal */}
      {isManageSportsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700 text-right">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                ⚙️ تسيير لائحة الرياضات والأنشطة
              </h3>
              <button 
                onClick={() => {
                  setIsManageSportsOpen(false);
                  setEditingSportId(null);
                  setSportFormLabelAr('');
                  setSportFormLabelFr('');
                  setSportFormIcon('⚽');
                }}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Add / Edit Sport Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!sportFormLabelAr.trim()) return;
                
                if (editingSportId) {
                  editSport(editingSportId, sportFormLabelAr.trim(), sportFormLabelFr.trim() || sportFormLabelAr.trim(), sportFormIcon);
                  setEditingSportId(null);
                  setNotification({ message: 'تم تعديل النشاط الرياضي بنجاح.', type: 'success' });
                } else {
                  addSport(sportFormLabelAr.trim(), sportFormLabelFr.trim() || sportFormLabelAr.trim(), sportFormIcon);
                  setNotification({ message: 'تم إضافة النشاط الرياضي الجديد بنجاح.', type: 'success' });
                }
                
                // Reset form
                setSportFormLabelAr('');
                setSportFormLabelFr('');
                setSportFormIcon('⚽');
              }}
              className="bg-gray-50 dark:bg-gray-750 p-4 rounded-2xl border border-gray-200 dark:border-gray-750/50 space-y-3"
            >
              <h4 className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                {editingSportId ? '✏️ تعديل النشاط الرياضي الحالي' : '➕ إضافة نشاط رياضي جديد'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">اسم الرياضة (بالعربية):</label>
                  <input
                    type="text"
                    required
                    value={sportFormLabelAr}
                    onChange={(e) => setSportFormLabelAr(e.target.value)}
                    placeholder="مثال: جري الجلد"
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">اسم الرياضة (بالفرنسية - اختياري):</label>
                  <input
                    type="text"
                    value={sportFormLabelFr}
                    onChange={(e) => setSportFormLabelFr(e.target.value)}
                    placeholder="مثال: Endurance"
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">الأيقونة (رمز تعبيري Emoji):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={sportFormIcon}
                      onChange={(e) => setSportFormIcon(e.target.value)}
                      placeholder="⚽"
                      className="w-12 text-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-1.5 py-1.5 text-xs font-bold"
                    />
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 active:scale-95 transition"
                    >
                      {editingSportId ? 'تعديل' : 'حفظ'}
                    </button>
                    {editingSportId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSportId(null);
                          setSportFormLabelAr('');
                          setSportFormLabelFr('');
                          setSportFormIcon('⚽');
                        }}
                        className="px-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* List of existing sports */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-gray-500">الرياضات والأنشطة المسجلة حالياً:</h4>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {sports.map((sport) => (
                  <div 
                    key={sport.id} 
                    className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg w-9 h-9 flex items-center justify-center shrink-0">{sport.icon}</span>
                      <div>
                        <span className="font-black text-gray-900 dark:text-white">{sport.labelAr}</span>
                        {sport.labelFr && sport.labelFr !== sport.labelAr && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono block">
                            {sport.labelFr}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSportId(sport.id);
                          setSportFormLabelAr(sport.labelAr);
                          setSportFormLabelFr(sport.labelFr || '');
                          setSportFormIcon(sport.icon);
                        }}
                        className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold rounded-lg transition"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من مسح هذه الرياضة «${sport.labelAr}»؟`)) {
                            deleteSport(sport.id);
                            setNotification({ message: `تم مسح الرياضة «${sport.labelAr}» بنجاح.`, type: 'success' });
                            if (topic.includes(sport.labelAr)) {
                              setTopic('');
                            }
                          }
                        }}
                        className="px-2 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-bold rounded-lg transition"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  if (confirm('هل ترغب في إعادة ضبط لائحة الرياضات إلى اللائحة الافتراضية؟')) {
                    resetSports();
                    setNotification({ message: 'تمت إعادة ضبط لائحة الرياضات.', type: 'success' });
                  }
                }}
                className="px-4 py-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-indigo-600 rounded-lg transition cursor-pointer"
              >
                🔄 إعادة ضبط اللائحة الافتراضية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
