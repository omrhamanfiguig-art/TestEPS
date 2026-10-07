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
  ArrowUpTrayIcon,
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
import { TextbookScreen } from './TextbookScreen';
import { PedagogicalReportsView } from '../components/PedagogicalReportsView';
import { StudentReportModal } from '../components/StudentReportModal';
import { GroupReportModal } from '../components/GroupReportModal';
import { ImportSessionsModal } from '../components/ImportSessionsModal';
import { 
  exportSessionAttendanceToExcel, 
  exportClassAttendanceCumulativeToExcel,
  exportAllSessionsSportsActivityToExcel
} from '../utils/excelHelper';
import { 
  getTeacherProfiles, 
  getTeacherForClass, 
  TeacherProfile 
} from '../utils/teacherHelper';
import { useSportsList } from '../utils/SportsConstants';
import { useLanguage } from '../utils/i18n';

interface AttendanceScreenProps {
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
  sessionDate?: string;
}

const COMMON_TIME_SLOTS = [
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
  "08:30 - 10:30",
  "10:30 - 12:30",
  "14:30 - 16:30",
  "16:30 - 18:30"
];

const SESSIONS_10 = [
  "الحصة 1",
  "الحصة 2",
  "الحصة 3",
  "الحصة 4",
  "الحصة 5",
  "الحصة 6",
  "الحصة 7",
  "الحصة 8",
  "الحصة 9",
  "الحصة 10"
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
  const [timeSlot, setTimeSlot] = useState<string>("08:00 - 09:00");
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
  
  // Active Tab: 'table' | 'textbook' | 'reports' | 'cumulative' | 'history'
  const [activeTab, setActiveTab] = useState<'table' | 'textbook' | 'reports' | 'cumulative' | 'history'>('table');
  
  // Student Pedagogical Report Modal State
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<StudentIdentity | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGroupReportModalOpen, setIsGroupReportModalOpen] = useState(false);
  
  // Import Sessions & Delete Session Modals
  const [isImportSessionsModalOpen, setIsImportSessionsModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<AttendanceSession | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  
  // Interactive Roll Call Carousel Modal
  const [isRollCallModalOpen, setIsRollCallModalOpen] = useState(false);
  const [rollCallIndex, setRollCallIndex] = useState(0);
  
  // Filter & Search in Table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [teacherProfiles, setTeacherProfiles] = useState<TeacherProfile[]>(() => getTeacherProfiles());

  useEffect(() => {
    const handleTeachersUpdate = () => {
      setTeacherProfiles(getTeacherProfiles());
    };
    window.addEventListener('teachersUpdated', handleTeachersUpdate);
    window.addEventListener('dbUpdated', handleTeachersUpdate);
    return () => {
      window.removeEventListener('teachersUpdated', handleTeachersUpdate);
      window.removeEventListener('dbUpdated', handleTeachersUpdate);
    };
  }, []);

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
    return classList.filter(c => {
      if (levelFilter !== 'ALL' && !c.className.toUpperCase().startsWith(levelFilter)) {
        return false;
      }
      if (teacherFilter !== 'ALL') {
        const assignedTeacher = getTeacherForClass(c.className);
        if (assignedTeacher !== teacherFilter) return false;
      }
      return true;
    });
  }, [classList, levelFilter, teacherFilter]);

  useEffect(() => {
    if (filteredClassList.length > 0) {
      const isCurrentInFiltered = filteredClassList.some(c => c.className === selectedClass);
      if (!isCurrentInFiltered) {
        setSelectedClass(filteredClassList[0].className);
      }
    }
  }, [filteredClassList, selectedClass, setSelectedClass]);

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
      setTimeSlot(existing.timeSlot || "08:00 - 09:00");
      setTopic(existing.topic || "ألعاب القوى والتربية البدنية");
      setSessionNumber(existing.sessionNumber || "الحصة 1");
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
      if (!sessionNumber) setSessionNumber("الحصة 1");
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
      setSessionNumber(existing.sessionNumber || "الحصة 1");
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
      const freshMap: Record<string, AttendanceRecord> = {};
      students.forEach(s => {
        freshMap[s.numeroEleve] = { studentNumber: s.numeroEleve, status: 'present' };
      });
      setRecords(freshMap);
    }
  };

  // Change Session Number Handler
  const handleSessionNumberChange = (newSessionNumber: string) => {
    setSessionNumber(newSessionNumber);
    const existing = previousSessions.find(
      s => s.className === selectedClass && s.sessionNumber === newSessionNumber
    );
    if (existing) {
      setSessionId(existing.id);
      setDate(existing.date);
      setTimeSlot(existing.timeSlot || "08:00 - 09:00");
      if (existing.topic) setTopic(existing.topic);
      const recMap: Record<string, AttendanceRecord> = {};
      (existing.records || []).forEach(r => { recMap[r.studentNumber] = r; });
      students.forEach(s => {
        if (!recMap[s.numeroEleve]) {
          recMap[s.numeroEleve] = { studentNumber: s.numeroEleve, status: 'present' };
        }
      });
      setRecords(recMap);
    } else {
      const freshId = `sess_${selectedClass.replace(/\s+/g, '_')}_${newSessionNumber.replace(/\s+/g, '_')}_${date}_${Date.now()}`;
      setSessionId(freshId);
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

  // Save current session to DB and Cloud manually
  const handleSaveSession = async (isAuto = false) => {
    if (!selectedClass || students.length === 0) {
      setNotification({ message: "يرجى تحديد قسم به تلاميذ أولاً.", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsSaving(true);
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

    try {
      await saveAttendanceSession(sessionObj);
      const updated = await getAttendanceSessions(selectedClass);
      setPreviousSessions(updated);

      setNotification({
        message: `تم حفظ ورقة غياب حصة ${date} (${timeSlot}) ومزامنتها محلياً وسحابياً بنجاح! 💾☁️`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      console.error('Save failed', err);
      setNotification({ message: "حدث خطأ أثناء حفظ ورقة الحصة", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete session handler (opens custom confirmation modal)
  const handleDeleteSession = (sess: AttendanceSession) => {
    setSessionToDelete(sess);
  };

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeletingSession(true);
    try {
      await deleteAttendanceSession(selectedClass, sessionToDelete.id);
      
      // Update local state immediately
      setPreviousSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));

      // If the currently open form was using the deleted session, reset to fresh ID
      if (sessionId === sessionToDelete.id) {
        const freshId = `sess_${selectedClass.replace(/\s+/g, '_')}_${date}_${Date.now()}`;
        setSessionId(freshId);
        const freshMap: Record<string, AttendanceRecord> = {};
        students.forEach(s => {
          freshMap[s.numeroEleve] = { studentNumber: s.numeroEleve, status: 'present' };
        });
        setRecords(freshMap);
      }

      setNotification({
        message: `تم حذف ورقة غياب حصة ${sessionToDelete.date} (${sessionToDelete.timeSlot || ''}) بنجاح. 🗑️`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3500);
      setSessionToDelete(null);
    } catch (err) {
      console.error('Failed to delete session:', err);
      setNotification({ message: "حدث خطأ أثناء حذف ورقة الحصة", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsDeletingSession(false);
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
  
  // Compute cumulative stats for currently displayed student in Roll Call
  const currentRollStudentStats = useMemo(() => {
    if (!currentRollStudent) return { present: 0, absent: 0, late: 0, noKit: 0, justified: 0 };
    let present = 0, absent = 0, late = 0, noKit = 0, justified = 0;
    
    previousSessions.forEach(sess => {
      const rec = sess.records.find(r => r.studentNumber === currentRollStudent.numeroEleve);
      if (rec) {
        if (rec.status === 'present') present++;
        if (rec.status === 'absent') absent++;
        if (rec.status === 'late') late++;
        if (rec.status === 'no-kit') noKit++;
        if (rec.status === 'justified') justified++;
      }
    });

    const activeRec = records[currentRollStudent.numeroEleve];
    if (activeRec) {
      if (activeRec.status === 'present') present++;
      if (activeRec.status === 'absent') absent++;
      if (activeRec.status === 'late') late++;
      if (activeRec.status === 'no-kit') noKit++;
      if (activeRec.status === 'justified') justified++;
    }

    return { present, absent, late, noKit, justified };
  }, [currentRollStudent, previousSessions, records]);

  const handleRollCallAnswer = async (status: AttendanceStatus) => {
    if (!currentRollStudent) return;
    handleStatusChange(currentRollStudent.numeroEleve, status);
    if (rollCallIndex < students.length - 1) {
      setRollCallIndex(rollCallIndex + 1);
    } else {
      setIsRollCallModalOpen(false);
      // Explicit manual save & cloud sync upon completing roll call
      await handleSaveSession(false);
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

        {/* Top Controls: Teacher, Level, Class Select & Side-by-Side Actions */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Teacher Filter Dropdown */}
          {teacherProfiles.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-600">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ps-1.5">الأستاذ:</span>
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="bg-white dark:bg-gray-800 border-none font-bold text-xs text-gray-900 dark:text-white rounded-xl px-2.5 py-1.5 focus:ring-0 shadow-xs cursor-pointer w-full sm:w-auto"
              >
                <option value="ALL">جميع الأساتذة</option>
                {teacherProfiles.map(tp => (
                  <option key={tp.id} value={tp.name}>{tp.name}</option>
                ))}
              </select>
            </div>
          )}

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
                className="bg-white dark:bg-gray-800 border-none font-bold text-xs text-gray-900 dark:text-white rounded-xl px-2.5 py-1.5 focus:ring-0 shadow-xs cursor-pointer w-full sm:w-auto"
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
              className="bg-white dark:bg-gray-800 border-none font-bold text-xs text-gray-900 dark:text-white rounded-xl px-2.5 py-1.5 focus:ring-0 shadow-xs cursor-pointer w-full sm:w-auto"
            >
              {filteredClassList.map(cls => (
                <option key={cls.className} value={cls.className}>
                  {cls.className} ({cls.studentCount} تلميذ)
                </option>
              ))}
            </select>
          </div>

          {/* Side-by-side Action Buttons: Add Student & Roll Call */}
          <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setStudentToEdit(null);
                setIsAddEditStudentOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
              title="إضافة تلميذ جديد للقسم الحالية"
            >
              <UserPlusIcon className="w-4 h-4 shrink-0" />
              <span>إضافة تلميذ</span>
            </button>

            <button
              type="button"
              onClick={startRollCall}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
              title="بدء المناداة السريعة تلميذاً تلو الآخر"
            >
              <span>📢</span>
              <span>بدء المناداة</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGroupReportModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
              title="إنشاء تقرير إداري جماعي وإرساله بالواتساب أو كصورة للإدارة"
            >
              <UserGroupIcon className="w-4 h-4 shrink-0" />
              <span>تقرير جماعي للإدارة (WhatsApp / صورة)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveSession(false)}
              disabled={isSaving}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black text-white shadow-lg shadow-emerald-600/25 active:scale-95 transition cursor-pointer ${
                isSaving ? 'bg-emerald-700 opacity-80 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
              title="حفظ ورقة حضور الحصة يدوياً في السجل وقاعدة البيانات السحابية"
            >
              <CheckCircleIcon className={`w-4 h-4 text-white ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'جاري الحفظ والمزامنة...' : '💾 حفظ ورقة الحضور'}</span>
            </button>
          </div>
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
            <select
              value={sessionNumber}
              onChange={(e) => handleSessionNumberChange(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {SESSIONS_10.map(sNum => (
                <option key={sNum} value={sNum}>
                  {sNum}
                </option>
              ))}
              {!SESSIONS_10.includes(sessionNumber) && sessionNumber && (
                <option value={sessionNumber}>{sessionNumber}</option>
              )}
            </select>
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
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {COMMON_TIME_SLOTS.map(slot => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
              {!COMMON_TIME_SLOTS.includes(timeSlot) && timeSlot && (
                <option value={timeSlot}>{timeSlot}</option>
              )}
            </select>
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
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'table'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span>📋 ورقة الحضور</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {students.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('textbook')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'textbook'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span>📖 دفتر النصوص</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span>🏥 فضاء التقارير والحالات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cumulative')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cumulative'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span>📊 المواظبة التراكمية</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {previousSessions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span>🗄️ سجل الحصص</span>
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'table' && (
            <>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 transition cursor-pointer"
              >
                تحديد الكل حاضر
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
            </>
          )}
          {activeTab === 'cumulative' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportAllSportsActivity}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100 transition flex items-center gap-1.5 cursor-pointer"
                title="تصدير سجل الأنشطة والغيابات لجميع الحصص الدراسية"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                <span>تصدير سجل الأنشطة</span>
              </button>
              <button
                type="button"
                onClick={handleExportCumulative}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                <span>تصدير التقرير التراكمي</span>
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
                  <th className="p-3 text-center w-36">التقارير والحالات</th>
                  <th className="p-3 w-48">ملاحظات إضافية</th>
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

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForReport(s);
                            setIsReportModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-[11px] font-bold hover:bg-teal-100 dark:hover:bg-teal-900/60 flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-2xs active:scale-95 transition"
                          title="تسجيل تقرير تربوي، إعفاء طبي، أو ملاحظة سلوك للتلميذ"
                        >
                          <DocumentTextIcon className="w-3.5 h-3.5" />
                          <span>📝 تقرير / حالة</span>
                        </button>
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
                    className={`p-3.5 flex flex-col gap-3 transition ${
                      currentStatus === 'absent' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    {/* Top Section: Full Student Name and Avatar */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-xs font-black text-gray-400 shrink-0">#{idx + 1}</span>
                        <StudentAvatar
                          photoUrl={s.photoUrl}
                          nomEleve={s.nomEleve}
                          sexe={s.sexe}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-gray-950 dark:text-white text-sm break-words leading-tight">
                            {s.nomEleve}
                          </div>
                          <div className="text-[10px] font-mono text-gray-400 flex items-center gap-2 mt-1 flex-wrap">
                            <span>مسار: {s.numeroEleve}</span>
                            <span className={`px-1.5 py-0.2 rounded-xs text-[9px] font-bold ${
                              s.sexe === 'F' ? 'bg-pink-100/80 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300' : 'bg-blue-100/80 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                            }`}>
                              {s.sexe === 'F' ? 'أنثى' : 'ذكر'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Student Edit & Delete Actions */}
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStudentToEdit(s);
                            setIsAddEditStudentOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition"
                          title="تعديل بيانات التلميذ"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(s.numeroEleve, s.nomEleve)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition"
                          title="مسح التلميذ"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Section: Attendance Status Buttons & Action Triggers */}
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700/50 flex-wrap sm:flex-nowrap">
                      {/* 5 Status Buttons */}
                      <div className="flex items-center gap-1.5 flex-1 justify-between">
                        {(['present', 'absent', 'late', 'justified', 'no-kit'] as const).map(status => {
                          const statusDetails = {
                            present: { key: 'ح', name: 'حاضر', color: 'bg-emerald-600 text-white border-emerald-600 shadow-xs' },
                            absent: { key: 'غ', name: 'غائب', color: 'bg-rose-600 text-white border-rose-600 shadow-xs' },
                            late: { key: 'ت', name: 'تأخر', color: 'bg-amber-500 text-white border-amber-500 shadow-xs' },
                            justified: { key: 'م', name: 'مبرر', color: 'bg-blue-600 text-white border-blue-600 shadow-xs' },
                            'no-kit': { key: 'ب', name: 'بذلة', color: 'bg-purple-600 text-white border-purple-600 shadow-xs' },
                          };
                          const isActive = currentStatus === status;
                          const detail = statusDetails[status];

                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusChange(s.numeroEleve, status)}
                              className={`flex-1 h-8 rounded-xl flex items-center justify-center text-xs font-black transition border active:scale-95 ${
                                isActive 
                                  ? detail.color 
                                  : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100'
                              }`}
                              title={detail.name}
                            >
                              <span>{detail.key}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Report & Note buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForReport(s);
                            setIsReportModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-[10px] font-extrabold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                          title="تقرير / حالة التلميذ"
                        >
                          <span>📝 تقرير</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedNotes(prev => ({ ...prev, [s.numeroEleve]: !prev[s.numeroEleve] }))}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center border transition active:scale-95 ${
                            rec.note 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300' 
                              : 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-gray-700/50 dark:border-gray-600'
                          }`}
                          title="إضافة ملاحظة"
                        >
                          <DocumentTextIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Lower Row: Expandable note text-input */}
                    {isNoteOpen && (
                      <div className="relative flex gap-2 items-center pt-1">
                        <input
                          type="text"
                          value={rec.note || ''}
                          onChange={(e) => handleNoteChange(s.numeroEleve, e.target.value)}
                          placeholder="السبب أو الملاحظة..."
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500/50 font-medium"
                        />
                        {rec.note && (
                          <button
                            type="button"
                            onClick={() => handleNoteChange(s.numeroEleve, '')}
                            className="p-1 rounded-full text-gray-400 hover:text-rose-600 shrink-0"
                            title="مسح الملاحظة"
                          >
                            <XMarkIcon className="w-4 h-4" />
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

      {/* Tab 2: Textbook Screen (دفتر النصوص الرياضي) */}
      {activeTab === 'textbook' && (
        <div className="rounded-3xl overflow-hidden bg-white dark:bg-gray-800 p-2 sm:p-4 border border-gray-100 dark:border-gray-700">
          <TextbookScreen selectedClass={selectedClass} setSelectedClass={setSelectedClass} />
        </div>
      )}

      {/* Tab 3: Pedagogical Reports Space (فضاء التقارير والحالات التربوية) */}
      {activeTab === 'reports' && (
        <div className="rounded-3xl overflow-hidden bg-white dark:bg-gray-800 p-2 sm:p-4 border border-gray-100 dark:border-gray-700">
          <PedagogicalReportsView selectedClass={selectedClass} students={students} />
        </div>
      )}

      {/* Tab 4: Cumulative Attendance Report Across All Sessions */}
      {activeTab === 'cumulative' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-gray-50/50 dark:bg-gray-800/40">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                تقرير المواظبة والغيابات التراكمي للقسم
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                مجموع الحصص المنجزة: <strong>{previousSessions.length} حصة</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportSessionsModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-indigo-700 transition cursor-pointer"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                <span>استيراد سجل الحصص</span>
              </button>
              <button
                type="button"
                onClick={handleExportCumulative}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-emerald-700 transition cursor-pointer"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>تصدير التقرير التراكمي (Excel)</span>
              </button>
            </div>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-gray-950 dark:text-white text-xs break-words">{s.nomEleve}</span>
                            {abs >= 5 ? (
                              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" title="غياب مقلق ومتكرر" />
                            ) : abs >= 3 ? (
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="تنبيه مواظبة" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="مواظب بانتظام" />
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-gray-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
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

      {/* Tab 5: Session History */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 gap-3">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <span>🗄️ سجل الحصص السابقة لقسم {selectedClass}</span>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-xl">
                  {previousSessions.length} حصص مسجلة
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                استعراض ورقة أي حصة وتعديلها أو تصديرها واستيراد سجلات الحصص والأنشطة
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportSessionsModalOpen(true)}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                <span>📥 استيراد سجل الحصص (Excel)</span>
              </button>

              <button
                type="button"
                onClick={handleExportAllSportsActivity}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>📤 تصدير تقرير الأنشطة</span>
              </button>
            </div>
          </div>

          {previousSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-3">
              <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
              <div>
                <p className="font-bold text-gray-700 dark:text-gray-300">لا توجد حصص مسجلة لهذا القسم بعد.</p>
                <p className="text-xs text-gray-400 mt-1">سجل أول حصة اليوم أو استورد سجل الحصص السابقة من ملف Excel.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportSessionsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                <span>استيراد سجل الحصص من ملف Excel / CSV</span>
              </button>
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
                      {sess.sessionNumber && (
                        <span className="text-xs text-indigo-500 font-bold mr-auto">
                          ({sess.sessionNumber})
                        </span>
                      )}
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
                      className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
                    >
                      فتح وتعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => exportSessionAttendanceToExcel(sess, students)}
                      className="p-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 cursor-pointer"
                      title="تصدير الحصة Excel"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(sess)}
                      className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
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

              {/* Student Cumulative Attendance Stats */}
              <div className="grid grid-cols-4 gap-2 w-full bg-gray-50 dark:bg-gray-750 p-2.5 rounded-2xl border border-gray-150 dark:border-gray-700 text-center">
                <div className="p-1">
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{currentRollStudentStats.present}</div>
                  <div className="text-[10px] font-bold text-gray-500">حضور</div>
                </div>
                <div className="p-1">
                  <div className="text-sm font-black text-rose-600 dark:text-rose-400">{currentRollStudentStats.absent}</div>
                  <div className="text-[10px] font-bold text-gray-500">غياب</div>
                </div>
                <div className="p-1">
                  <div className="text-sm font-black text-amber-500 dark:text-amber-400">{currentRollStudentStats.late}</div>
                  <div className="text-[10px] font-bold text-gray-500">تأخر</div>
                </div>
                <div className="p-1">
                  <div className="text-sm font-black text-purple-600 dark:text-purple-400">{currentRollStudentStats.noKit}</div>
                  <div className="text-[10px] font-bold text-gray-500">بدون بذلة</div>
                </div>
              </div>

              {/* Add Pedagogical / Administrative Report Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForReport(currentRollStudent);
                  setIsReportModalOpen(true);
                }}
                className="w-full py-2 px-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs hover:bg-teal-100 dark:hover:bg-teal-900/60 transition cursor-pointer active:scale-95"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>📝 تسجيل تقرير / حالة خاصة للإدارة</span>
              </button>
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
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold disabled:opacity-30 cursor-pointer"
              >
                السابق
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsRollCallModalOpen(false);
                  await handleSaveSession(false);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 transition flex items-center gap-1"
                title="إنهاء المناداة وحفظ الورقة مباشرة"
              >
                <span>💾 إنهاء وحفظ</span>
              </button>

              <button
                type="button"
                disabled={rollCallIndex === students.length - 1}
                onClick={() => setRollCallIndex(rollCallIndex + 1)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold disabled:opacity-30 cursor-pointer"
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
          onSuccess={async (newStudent) => {
            const freshStudents = await getStudentList(selectedClass);
            setStudents(freshStudents);
            
            // Ensure newly added student gets default present status in records map
            setRecords(prev => {
              const updatedRecords = { ...prev };
              freshStudents.forEach(s => {
                if (!updatedRecords[s.numeroEleve]) {
                  updatedRecords[s.numeroEleve] = { studentNumber: s.numeroEleve, status: 'present' };
                }
              });
              return updatedRecords;
            });

            setNotification({
              message: studentToEdit 
                ? `تم تحديث بيانات التلميذ بنجاح.` 
                : `تمت إضافة التلميذ ${newStudent?.nomEleve || ''} للائحة بنجاح!`,
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
      {/* Student Pedagogical Report Modal */}
      {isReportModalOpen && selectedStudentForReport && (
        <StudentReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          student={selectedStudentForReport}
          className={selectedClass}
        />
      )}

      {/* Group Administrative Report Modal */}
      {isGroupReportModalOpen && (
        <GroupReportModal
          isOpen={isGroupReportModalOpen}
          onClose={() => setIsGroupReportModalOpen(false)}
          className={selectedClass}
          students={students}
          currentRecords={records}
          previousSessions={previousSessions}
          sessionDate={date}
          sessionTopic={topic}
        />
      )}

      {/* Import Sessions Modal */}
      {isImportSessionsModalOpen && (
        <ImportSessionsModal
          isOpen={isImportSessionsModalOpen}
          onClose={() => setIsImportSessionsModalOpen(false)}
          currentClass={selectedClass}
          onSuccess={async (importedCount) => {
            const fresh = await getAttendanceSessions(selectedClass);
            setPreviousSessions(fresh);
            setNotification({
              message: `تم بنجاح استيراد ${importedCount} حصة رياضية وحفظها في قاعدة البيانات المحلية والسحابية! 📥✅`,
              type: 'success'
            });
            setTimeout(() => setNotification(null), 4000);
          }}
        />
      )}

      {/* Custom Delete Session Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-rose-150 dark:border-rose-900/60 text-right">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-2xl">
                <TrashIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  حذف ورقة الحصة الرياضية
                </h3>
                <p className="text-xs text-gray-400">
                  تأكيد الحذف النهائي من السجل المحلي والسحابي
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-gray-500">القسم:</span>
                <span className="text-indigo-600 font-black">{sessionToDelete.className}</span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span className="text-gray-500">تاريخ الحصة:</span>
                <span className="font-mono text-gray-900 dark:text-white">{sessionToDelete.date} ({sessionToDelete.timeSlot || 'الحصة العادية'})</span>
              </div>
              {sessionToDelete.topic && (
                <div className="flex justify-between items-center font-bold">
                  <span className="text-gray-500">موضوع النشاط:</span>
                  <span className="text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{sessionToDelete.topic}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-bold pt-1 border-t border-gray-200 dark:border-gray-700 text-[11px]">
                <span className="text-emerald-600 font-black">حاضر: {sessionToDelete.summary?.present ?? 0}</span>
                <span className="text-rose-600 font-black">غائب: {sessionToDelete.summary?.absent ?? 0}</span>
                <span className="text-amber-600 font-black">تأخر: {sessionToDelete.summary?.late ?? 0}</span>
              </div>
            </div>

            <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
              هل أنت متأكد من حذف هذه الحصة نهائياً؟ لن تتمكن من استرجاع بياناتها إلا بإعادة إدخالها أو استيرادها.
            </p>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingSession}
                onClick={() => setSessionToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={isDeletingSession}
                onClick={handleConfirmDeleteSession}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                {isDeletingSession ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    <span>جارٍ الحذف...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4" />
                    <span>تأكيد الحذف النهائي</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
