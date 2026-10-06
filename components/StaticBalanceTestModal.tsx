import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { StudentIdentity, PhysicalTests } from '../types';
import { getStudentList, getPhysicalTests, savePhysicalTests, getAllClasses } from '../utils/db';
import { 
  XMarkIcon, 
  PlayIcon, 
  PauseIcon, 
  ArrowPathIcon, 
  CheckCircleIcon, 
  TrophyIcon, 
  TrashIcon, 
  PencilSquareIcon 
} from './Icons';
import { StudentAvatar } from './StudentAvatar';
import { startBluetoothKeepAlive, stopBluetoothKeepAlive } from '../utils/audioHelper';

interface StaticBalanceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass: string;
  classList?: (string | any)[];
  onDataSaved?: () => void;
}

export interface BalanceRunner {
  laneIndex: number;
  studentNumber: string;
  recordedTime?: number; // seconds e.g. 24.50
  isFinished: boolean;
  arrivalOrder?: number;
}

const normalizeClassNames = (list?: (string | any)[]): string[] => {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'className' in item) return String(item.className);
    return '';
  }).filter(Boolean);
};

export const StaticBalanceTestModal: React.FC<StaticBalanceTestModalProps> = ({
  isOpen,
  onClose,
  initialClass,
  classList = [],
  onDataSaved,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [classes, setClasses] = useState<string[]>(() => normalizeClassNames(classList));
  
  const [laneCount, setLaneCount] = useState<number>(4);
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [physicalResults, setPhysicalResults] = useState<PhysicalTests[]>([]);

  // Batch Save State: Result is saved ONLY when clicking the "حفظ النتائج" button
  const [isBatchSaved, setIsBatchSaved] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Edit states in Arrival list
  const [editingLaneIndex, setEditingLaneIndex] = useState<number | null>(null);
  const [tempEditTime, setTempEditTime] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Results Table Edit & Delete Confirmation States
  const [studentToDelete, setStudentToDelete] = useState<{ numeroEleve: string; nomEleve: string } | null>(null);
  const [tableStudentToEdit, setTableStudentToEdit] = useState<{ numeroEleve: string; nomEleve: string; currentTime: number } | null>(null);
  const [tableEditTimeInput, setTableEditTimeInput] = useState<string>('');

  // Selected runners state for current heat (starts with clean unassigned lanes)
  const [selectedRunners, setSelectedRunners] = useState<BalanceRunner[]>(() => {
    const initialRunners: BalanceRunner[] = [];
    for (let i = 1; i <= 4; i++) {
      initialRunners.push({
        laneIndex: i,
        studentNumber: '',
        isFinished: false
      });
    }
    return initialRunners;
  });

  // Adjust runners count dynamically when laneCount changes
  useEffect(() => {
    setSelectedRunners(prev => {
      const currentMap = new Map<number, BalanceRunner>(prev.map(r => [r.laneIndex, r]));
      const nextRunners: BalanceRunner[] = [];

      for (let i = 1; i <= laneCount; i++) {
        const existing = currentMap.get(i);
        if (existing) {
          nextRunners.push(existing);
        } else {
          nextRunners.push({
            laneIndex: i,
            studentNumber: '',
            isFinished: false
          });
        }
      }
      return nextRunners;
    });
  }, [laneCount]);

  // Timer & Audio
  const [testState, setTestState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Helper for audio feedback
  const playBeep = (freq = 880, duration = 0.15, type: OscillatorType = 'sine') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  };

  const showFeedback = (msg: string) => {
    setSaveFeedback(msg);
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // Load Classes and student data
  const loadClassData = async (className: string) => {
    if (!className) return;
    try {
      const allCls = await getAllClasses();
      setClasses(allCls.map(c => c.className));

      const studentList = await getStudentList(className);
      const sorted = (studentList || []).map((s, idx) => ({
        ...s,
        numeroEleve: String(s.numeroEleve ?? ''),
        orderIndex: s.orderIndex || idx + 1
      }));
      setStudents(sorted);

      const phys = await getPhysicalTests(className);
      const sanitized = (phys || []).map(p => ({
        ...p,
        numeroEleve: String(p.numeroEleve ?? '')
      }));
      setPhysicalResults(sanitized);
    } catch (err) {
      console.error('Error loading class data for balance test:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadClassData(selectedClass || initialClass);
      startBluetoothKeepAlive();
    } else {
      stopBluetoothKeepAlive();
    }
  }, [isOpen, selectedClass, initialClass]);

  // Stopwatch animation loop
  const updateTimer = () => {
    setElapsedTime(Date.now() - startTimeRef.current);
    requestRef.current = requestAnimationFrame(updateTimer);
  };

  const startTimer = () => {
    if (testState === 'running') return;
    if (testState === 'idle') {
      startTimeRef.current = Date.now();
    } else if (testState === 'paused') {
      startTimeRef.current = Date.now() - elapsedTime;
    }
    setTestState('running');
    playBeep(1760, 0.2, 'square');
    requestRef.current = requestAnimationFrame(updateTimer);
  };

  const pauseTimer = () => {
    if (testState !== 'running') return;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setTestState('paused');
    playBeep(587.33, 0.15);
  };

  const resetTimer = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setTestState('idle');
    setElapsedTime(0);
    setIsBatchSaved(false);
    setHasUnsavedChanges(false);
    setSelectedRunners(prev => prev.map(r => ({
      ...r,
      recordedTime: undefined,
      isFinished: false,
      arrivalOrder: undefined
    })));
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Helper for rank name (الأول 🥇، الثاني 🥈...)
  const getArabicRankName = (orderIndex: number) => {
    const ranks = [
      'الأول 🥇',
      'الثاني 🥈',
      'الثالث 🥉',
      'الرابع 🎖️',
      'الخامس 🏅',
      'السادس 🎗️',
      'السابع 🎖️',
      'الثامن 🏅',
      'التاسع 🎖️',
      'العاشر 🏅',
      'الحادي عشر 🎖️',
      'الثاني عشر 🏅'
    ];
    return ranks[orderIndex] || `المركز ${orderIndex + 1}`;
  };

  // Tested & untested students in class
  const testedStudents = useMemo(() => {
    return students
      .map(s => {
        const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
        const val = res?.equilibreStatique;
        return {
          student: s,
          prevTime: val !== undefined && val !== null && val > 0 ? Number(val) : undefined
        };
      })
      .filter(item => item.prevTime !== undefined);
  }, [students, physicalResults]);

  const untestedStudents = useMemo(() => {
    return students.filter(s => {
      const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
      const val = res?.equilibreStatique;
      return val === undefined || val === null || val <= 0;
    });
  }, [students, physicalResults]);

  // Format student badge
  const getStudentNumberDisplay = (student: StudentIdentity) => {
    return student.orderIndex ? String(student.orderIndex) : String(student.numeroEleve);
  };

  // EXPLICIT SAVE BUTTON HANDLER: Saves all finished runners of the current heat
  const handleSaveBatchResults = async () => {
    const finishedRunners = selectedRunners.filter(
      r => r.isFinished && r.recordedTime !== undefined && r.recordedTime > 0 && !!r.studentNumber
    );

    if (finishedRunners.length === 0) {
      showFeedback('لا توجد نتائج مكتملة لحفظها في هذا الفوج.');
      return;
    }

    const currentPhys = [...physicalResults];

    finishedRunners.forEach(runner => {
      const studentObj = students.find(s => String(s.numeroEleve) === String(runner.studentNumber));
      if (!studentObj) return;

      const existingIdx = currentPhys.findIndex(p => String(p.numeroEleve) === String(runner.studentNumber));

      const updatedItem: PhysicalTests = {
        ...(existingIdx >= 0 ? currentPhys[existingIdx] : {}),
        numeroEleve: String(runner.studentNumber),
        nomEleve: studentObj.nomEleve,
        sexe: studentObj.sexe,
        equilibreStatique: runner.recordedTime,
        date: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        currentPhys[existingIdx] = updatedItem;
      } else {
        currentPhys.push(updatedItem);
      }
    });

    setPhysicalResults(currentPhys);
    await savePhysicalTests(selectedClass, currentPhys);
    window.dispatchEvent(new CustomEvent('dbUpdated'));
    if (onDataSaved) onDataSaved();
    setIsBatchSaved(true);
    setHasUnsavedChanges(false);
    playBeep(1200, 0.25, 'triangle');
    showFeedback(`✓ تم بنجاح حفظ نتائج ${finishedRunners.length} تلميذ في السجل العام!`);
  };

  // Delete result from DB
  const handleDeleteResult = async (numeroEleve: string) => {
    const updatedPhys = physicalResults.map(p => {
      if (String(p.numeroEleve) === String(numeroEleve)) {
        const copy: any = { ...p };
        delete copy.equilibreStatique;
        return copy as PhysicalTests;
      }
      return p;
    });
    setPhysicalResults(updatedPhys);
    await savePhysicalTests(selectedClass, updatedPhys);
    window.dispatchEvent(new CustomEvent('dbUpdated'));
    if (onDataSaved) onDataSaved();
  };

  // Confirm delete handler from modal
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    const { numeroEleve, nomEleve } = studentToDelete;
    await handleDeleteResult(numeroEleve);
    setStudentToDelete(null);
    showFeedback(`تم مسح نتيجة التلميذ «${nomEleve}» بنجاح.`);
  };

  // Save edited time from table
  const handleSaveTableEditTime = async () => {
    if (!tableStudentToEdit) return;
    const parsed = parseFloat(tableEditTimeInput);
    if (isNaN(parsed) || parsed <= 0) {
      showFeedback('يرجى إدخال زمن صحيح (مثال: 25.5)');
      return;
    }
    const timeSec = Number(parsed.toFixed(2));
    
    const studentObj = students.find(s => String(s.numeroEleve) === String(tableStudentToEdit.numeroEleve));
    const currentPhys = [...physicalResults];
    const existingIdx = currentPhys.findIndex(p => String(p.numeroEleve) === String(tableStudentToEdit.numeroEleve));

    const updatedItem: PhysicalTests = {
      ...(existingIdx >= 0 ? currentPhys[existingIdx] : {}),
      numeroEleve: String(tableStudentToEdit.numeroEleve),
      nomEleve: tableStudentToEdit.nomEleve,
      sexe: studentObj?.sexe,
      equilibreStatique: timeSec,
      date: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      currentPhys[existingIdx] = updatedItem;
    } else {
      currentPhys.push(updatedItem);
    }

    setPhysicalResults(currentPhys);
    await savePhysicalTests(selectedClass, currentPhys);
    window.dispatchEvent(new CustomEvent('dbUpdated'));
    if (onDataSaved) onDataSaved();
    setTableStudentToEdit(null);
    showFeedback(`تم تعديل نتيجة «${tableStudentToEdit.nomEleve}» إلى ${timeSec}ث بنجاح.`);
  };

  // Automatic Ranking Calculation for current heat
  const rankedRunners = useMemo(() => {
    const finished = selectedRunners
      .filter(r => r.isFinished && r.recordedTime !== undefined && r.recordedTime > 0)
      .slice()
      .sort((a, b) => (a.recordedTime || 0) - (b.recordedTime || 0));

    return finished.map((runner, index) => {
      const student = students.find(s => String(s.numeroEleve) === String(runner.studentNumber));

      return {
        ...runner,
        rankOrder: index + 1,
        rankTitle: getArabicRankName(index),
        student
      };
    });
  }, [selectedRunners, students]);

  // How many runners have finished so far
  const finishedCount = rankedRunners.length;
  const nextFinisherRankTitle = getArabicRankName(finishedCount);

  // Single-button fall/finish recording logic (WITHOUT auto-saving to DB)
  const recordNextFinisher = () => {
    if (testState === 'idle') {
      startTimer();
      return;
    }

    const timeInSec = Number((elapsedTime / 1000).toFixed(2));
    playBeep(1318.5, 0.15, 'sine');

    // Find next unfinished runner in lane order
    let targetIdx = selectedRunners.findIndex(r => !r.isFinished);

    if (targetIdx === -1) {
      const newLaneIndex = selectedRunners.length + 1;
      const newRunner: BalanceRunner = {
        laneIndex: newLaneIndex,
        studentNumber: '',
        recordedTime: timeInSec,
        isFinished: true,
        arrivalOrder: finishedCount + 1
      };
      setSelectedRunners(prev => [...prev, newRunner]);
      setLaneCount(prev => Math.max(prev, newLaneIndex));
      setHasUnsavedChanges(true);
      setIsBatchSaved(false);
      showFeedback(`تم تسجيل سقوط متسابق #${newLaneIndex}: ${timeInSec}ث (اضغط حفظ لتثبيتها)`);
    } else {
      const newArrivalOrder = finishedCount + 1;
      const updated = selectedRunners.map((r, idx) =>
        idx === targetIdx ? { ...r, recordedTime: timeInSec, isFinished: true, arrivalOrder: newArrivalOrder } : r
      );
      setSelectedRunners(updated);
      setHasUnsavedChanges(true);
      setIsBatchSaved(false);
      showFeedback(`تم تحديد ${getArabicRankName(newArrivalOrder - 1)}: ${timeInSec}ث (بانتظار الحفظ 💾)`);

      if (updated.every(r => r.isFinished)) {
        pauseTimer();
      }
    }
  };

  // Click on a specific lane tile to record arrival or cancel
  const handleLaneTileClick = (laneIndex: number) => {
    if (testState !== 'running' && testState !== 'paused') return;

    const runner = selectedRunners.find(r => r.laneIndex === laneIndex);
    if (!runner) return;

    if (!runner.isFinished) {
      const timeInSec = Number((elapsedTime / 1000).toFixed(2));
      playBeep(1318.5, 0.15, 'sine');
      const newArrivalOrder = finishedCount + 1;

      const updated = selectedRunners.map(r =>
        r.laneIndex === laneIndex ? { ...r, recordedTime: timeInSec, isFinished: true, arrivalOrder: newArrivalOrder } : r
      );
      setSelectedRunners(updated);
      setHasUnsavedChanges(true);
      setIsBatchSaved(false);
      showFeedback(`تم تسجيل سقوط المتسابق #${laneIndex}: ${timeInSec}ث`);

      if (updated.every(r => r.isFinished)) {
        pauseTimer();
      }
    } else {
      setSelectedRunners(prev => prev.map(r =>
        r.laneIndex === laneIndex ? { ...r, recordedTime: undefined, isFinished: false, arrivalOrder: undefined } : r
      ));
      setHasUnsavedChanges(true);
      setIsBatchSaved(false);
      showFeedback(`تم إلغاء توقيت المتسابق #${laneIndex}`);
    }
  };

  // Manual student assignment to a specific lane post-fall
  const handleAssignStudentToLane = (laneIndex: number, studentNumber: string) => {
    setSelectedRunners(prev => prev.map(r => {
      if (r.laneIndex === laneIndex) {
        return { ...r, studentNumber };
      }
      if (studentNumber && String(r.studentNumber) === String(studentNumber) && r.laneIndex !== laneIndex) {
        return { ...r, studentNumber: '' };
      }
      return r;
    }));
    setHasUnsavedChanges(true);
    setIsBatchSaved(false);
  };

  // Save edited time in arrival list
  const handleSaveEditedTime = (laneIndex: number) => {
    const parsed = parseFloat(tempEditTime);
    if (isNaN(parsed) || parsed <= 0) {
      showFeedback('يرجى إدخال زمن صحيح');
      return;
    }
    const val = Number(parsed.toFixed(2));
    setSelectedRunners(prev => prev.map(r =>
      r.laneIndex === laneIndex ? { ...r, recordedTime: val } : r
    ));
    setEditingLaneIndex(null);
    setTempEditTime('');
    setHasUnsavedChanges(true);
    setIsBatchSaved(false);
    showFeedback('تم تعديل الزمن بنجاح.');
  };

  const handleStartEditTime = (laneIndex: number, currTime?: number) => {
    setEditingLaneIndex(laneIndex);
    setTempEditTime(currTime !== undefined ? String(currTime) : '');
  };

  // Swap ranks between two finishers
  const handleSwapRanks = (idxA: number, idxB: number) => {
    if (idxA < 0 || idxA >= rankedRunners.length || idxB < 0 || idxB >= rankedRunners.length) return;

    const runnerA = rankedRunners[idxA];
    const runnerB = rankedRunners[idxB];

    setSelectedRunners(prev => prev.map(r => {
      if (r.laneIndex === runnerA.laneIndex) {
        return { ...r, recordedTime: runnerB.recordedTime };
      }
      if (r.laneIndex === runnerB.laneIndex) {
        return { ...r, recordedTime: runnerA.recordedTime };
      }
      return r;
    }));

    setHasUnsavedChanges(true);
    setIsBatchSaved(false);
    showFeedback(`تم تبديل مراكز ${runnerA.rankTitle} و ${runnerB.rankTitle}`);
  };

  // Prepare next run with clean unassigned lanes for manual post-fall assignment
  const handlePrepareNextHeat = () => {
    resetTimer();
    setSelectedRunners(prev => prev.map(r => ({
      ...r,
      studentNumber: '',
      recordedTime: undefined,
      isFinished: false,
      arrivalOrder: undefined
    })));
    setIsBatchSaved(false);
    setHasUnsavedChanges(false);
    showFeedback('تم تجهيز الفوج التالي - الميقاتي والتعيين اليدوي جاهز');
  };

  // Overall completed results in class
  const completedResults = useMemo(() => {
    return students
      .map(s => {
        const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
        const val = res?.equilibreStatique;
        return {
          student: s,
          timeSec: val as number | undefined
        };
      })
      .filter(item => item.timeSec !== undefined && item.timeSec > 0)
      .sort((a, b) => (b.timeSec || 0) - (a.timeSec || 0)); // Higher balance time is better
  }, [students, physicalResults]);

  if (!isOpen) return null;

  const formattedSeconds = (elapsedTime / 1000).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* Top Header - Ultra Slim & Simple Title */}
        <div className="px-3 py-1.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black flex items-center gap-1">
              <span>⚖️</span>
              <span>اختبار التوازن الثابت (Flamant Rose)</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            title="إغلاق النافذة"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Save / Action Feedback Toast */}
        {saveFeedback && (
          <div className="bg-emerald-600 text-white text-xs font-black py-1 px-4 text-center shadow-lg transition-all animate-bounce flex items-center justify-center gap-2">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* Compact Single-Row: Class Dropdown & Status */}
        <div className="px-3 sm:px-4 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* لائحة القسم */}
            <div className="flex items-center gap-1">
              <label className="font-bold text-gray-700 dark:text-gray-300 shrink-0">القسم:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={testState !== 'idle'}
                className="px-2 py-1 font-bold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 cursor-pointer text-gray-900 dark:text-white shadow-2xs text-xs"
              >
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">
            اختبار الثبات والتوازن على قدم واحدة
          </div>
        </div>

        {/* Modal Scrollable Body: DIRECT STOPWATCH & LIVE ARRIVAL RECORDING */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-5 flex-grow custom-scrollbar">

          {/* ========================================================= */}
          {/* STOPWATCH & LIVE RECORDING                                */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 text-white rounded-3xl shadow-xl border border-gray-700 relative overflow-hidden space-y-2.5">
            <div className="text-[11px] font-black text-teal-400 uppercase tracking-widest text-center">
              عداد وقت اختبار التوازن الثابت (ثواني)
            </div>

            {/* Giant Digital Stopwatch */}
            <div className="text-4xl xs:text-5xl sm:text-6xl font-mono font-black tracking-wider text-teal-400 drop-shadow-md my-0.5">
              {formattedSeconds} <span className="text-lg sm:text-xl font-bold text-gray-400">ثانية</span>
            </div>

            {/* DYNAMIC FINISHER TAP BUTTON (بشكل مطول وعرض أقصر) */}
            <div className="w-full flex justify-center px-1 my-1">
              <button
                type="button"
                onClick={recordNextFinisher}
                className="w-40 sm:w-44 py-6 px-3 bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-gray-950 font-black rounded-3xl shadow-xl shadow-amber-500/30 border-2 border-amber-200 transition-all transform active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-2 text-center min-h-[135px]"
              >
                <span className="text-3xl animate-bounce">🛑</span>
                <div className="text-xs sm:text-sm font-black text-gray-950 leading-tight">
                  {testState === 'idle'
                    ? 'انقر للبدء 🚀'
                    : `تسجيل اختلال التوازن:\nالمركز ${nextFinisherRankTitle}`}
                </div>
                <div className="flex items-center gap-1 bg-gray-950 text-amber-300 px-2.5 py-1 rounded-xl text-xs font-mono font-black border border-amber-400/50 shadow-inner">
                  <span>⏱️ {formattedSeconds} ث</span>
                </div>
              </button>
            </div>

            {/* Stopwatch control buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-md pt-2">
              {testState === 'idle' && (
                <button
                  onClick={startTimer}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg transition transform active:scale-95 cursor-pointer text-sm"
                >
                  <PlayIcon className="w-5 h-5 fill-current" />
                  <span>بدء الاختبار 🚀</span>
                </button>
              )}

              {testState === 'running' && (
                <button
                  onClick={pauseTimer}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-black rounded-2xl shadow-lg transition transform active:scale-95 cursor-pointer text-sm"
                >
                  <PauseIcon className="w-5 h-5" />
                  <span>إيقاف مؤقت ⏸️</span>
                </button>
              )}

              {testState === 'paused' && (
                <button
                  onClick={startTimer}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg transition transform active:scale-95 cursor-pointer text-sm"
                >
                  <PlayIcon className="w-5 h-5 fill-current" />
                  <span>متابعة ▶️</span>
                </button>
              )}

              <button
                onClick={resetTimer}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-2xl border border-gray-700 transition cursor-pointer text-xs sm:text-sm"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>تصفير 🔄</span>
              </button>

              <button
                onClick={handlePrepareNextHeat}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl shadow-lg transition cursor-pointer text-xs sm:text-sm"
              >
                <span>الفوج التالي ⏩</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 3: ترتيب الواصلين وزر الحفظ الصريح                 */}
          {/* ========================================================= */}
          {rankedRunners.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-lg p-3 sm:p-5 space-y-3">
              
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                  <TrophyIcon className="w-4 h-4 text-teal-500" />
                  <span>ترتيب المسجلين (اختلال التوازن):</span>
                </h4>

                {/* Status Badge */}
                {isBatchSaved ? (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black rounded-xl border border-emerald-300 flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم حفظ نتائج هذا الفوج ✓</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl">
                    المسجلون: {finishedCount}
                  </span>
                )}
              </div>

              {/* FINISHERS CARDS */}
              <div className="space-y-3">
                {rankedRunners.map((runner, index) => {
                  const isEditing = editingLaneIndex === runner.laneIndex;

                  return (
                    <div
                      key={runner.laneIndex}
                      className={`p-3.5 rounded-2xl border-2 transition-all shadow-sm ${
                        index === 0
                          ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600'
                          : index === 1
                          ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-600'
                          : index === 2
                          ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        
                        {/* Rank Medal & Identity */}
                        <div className="flex items-center gap-3">
                          <div className={`px-2.5 py-1.5 rounded-2xl font-black text-sm flex flex-col items-center justify-center min-w-[65px] shadow-xs ${
                            index === 0
                              ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                              : index === 1
                              ? 'bg-gray-400 text-white ring-2 ring-gray-300'
                              : index === 2
                              ? 'bg-amber-700 text-white ring-2 ring-amber-600'
                              : 'bg-gray-700 text-white'
                          }`}>
                            <span className="text-base">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎖️'}</span>
                            <span className="text-[11px]">{runner.rankTitle}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {runner.student && (
                              <StudentAvatar
                                photoUrl={runner.student.photoUrl}
                                nomEleve={runner.student.nomEleve}
                                sexe={runner.student.sexe}
                                size="sm"
                              />
                            )}
                            <div>
                              <div className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                                {runner.student ? runner.student.nomEleve : `مشارك المقعد #${runner.laneIndex}`}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                <span className="font-bold">المقعد: #{runner.laneIndex}</span>
                                {runner.student?.orderIndex && (
                                  <span>• الترتيب: #{runner.student.orderIndex}</span>
                                )}
                                {isBatchSaved ? (
                                  <span className="text-emerald-600 font-bold">✓ بالسجل</span>
                                ) : (
                                  <span className="text-amber-600 font-bold">⏳ في انتظار الحفظ</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recorded Time & Edit Controls */}
                        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-700 p-1.5 rounded-xl border border-teal-400 shadow-sm">
                              <input
                                type="number"
                                step="0.01"
                                value={tempEditTime}
                                onChange={(e) => setTempEditTime(e.target.value)}
                                placeholder="24.50"
                                className="w-20 px-2 py-1 text-xs font-mono font-black border border-gray-300 dark:border-gray-600 rounded-lg text-center"
                              />
                              <span className="text-xs font-bold">ث</span>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedTime(runner.laneIndex)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                              >
                                تأكيد ✔️
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLaneIndex(null)}
                                className="px-1.5 py-1 text-gray-500 text-xs hover:text-gray-700"
                              >
                                إلغاء ✖️
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-2 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">الزمن:</span>
                              <span className="text-base sm:text-lg font-mono font-black text-emerald-900 dark:text-emerald-100">
                                {runner.recordedTime?.toFixed(2)} ث
                              </span>
                            </div>
                          )}

                          {/* REORDER / SWAP BUTTONS */}
                          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg border border-gray-300 dark:border-gray-600">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleSwapRanks(index, index - 1)}
                              title="تبديل مع المركز السابق للأعلى"
                              className="p-1 rounded hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-30 cursor-pointer text-xs"
                            >
                              ⬆️
                            </button>
                            <button
                              type="button"
                              disabled={index === rankedRunners.length - 1}
                              onClick={() => handleSwapRanks(index, index + 1)}
                              title="تبديل مع المركز التالي للأسفل"
                              className="p-1 rounded hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-30 cursor-pointer text-xs"
                            >
                              ⬇️
                            </button>
                          </div>

                          {/* Edit Time Button */}
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => handleStartEditTime(runner.laneIndex, runner.recordedTime)}
                              className="p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg transition"
                              title="تعديل التوقيت يدوياً"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Runner Time */}
                          <button
                            type="button"
                            onClick={() => handleLaneTileClick(runner.laneIndex)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                            title="إلغاء توقيت هذا المتسابق"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>

                      </div>

                      {/* Dynamic Manual Student Assignment Box */}
                      {!runner.studentNumber ? (
                        <div className="mt-2.5 p-2.5 bg-amber-50/90 dark:bg-amber-950/40 rounded-xl border border-dashed border-amber-300 dark:border-amber-700">
                          <select
                            value={runner.studentNumber}
                            onChange={(e) => handleAssignStudentToLane(runner.laneIndex, e.target.value)}
                            className="w-full text-xs font-bold py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-amber-400 dark:border-amber-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-2xs"
                          >
                            <option value="">-- 👤 اختر التلميذ صاحب هذا التوقيت ({runner.rankTitle}) --</option>
                            <optgroup label={`🟢 تلاميذ لم يجتازوا بعد (${untestedStudents.length})`}>
                              {untestedStudents.map(st => {
                                const assignedOther = selectedRunners.find(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(st.numeroEleve));
                                return (
                                  <option key={st.numeroEleve} value={st.numeroEleve} disabled={!!assignedOther}>
                                    #{getStudentNumberDisplay(st)} - {st.nomEleve} ({st.sexe === 'F' ? 'أنثى' : 'ذكر'}) {assignedOther ? '⚠️ (محدد في مركز آخر)' : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                            <optgroup label={`⚪ تلاميذ اجتازوا سابقاً (${testedStudents.length})`}>
                              {testedStudents.map(({ student: st, prevTime }) => {
                                const assignedOther = selectedRunners.find(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(st.numeroEleve));
                                return (
                                  <option key={st.numeroEleve} value={st.numeroEleve} disabled={!!assignedOther}>
                                    #{getStudentNumberDisplay(st)} - {st.nomEleve} ({st.sexe === 'F' ? 'أنثى' : 'ذكر'}) - (سابقاً: {prevTime}ث) {assignedOther ? '⚠️ (محدد في مركز آخر)' : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          </select>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-gray-200/80 dark:border-gray-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center gap-1">
                              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>التلميذ:</span>
                            </span>
                            <span className="font-black text-gray-900 dark:text-white">
                              #{getStudentNumberDisplay(runner.student!)} - {runner.student!.nomEleve} ({runner.student!.sexe === 'F' ? 'أنثى' : 'ذكر'})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={runner.studentNumber}
                              onChange={(e) => handleAssignStudentToLane(runner.laneIndex, e.target.value)}
                              className="text-xs font-bold py-1 px-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 cursor-pointer"
                            >
                              <option value="">-- تغيير التلميذ --</option>
                              <optgroup label={`🟢 تلاميذ لم يجتازوا بعد (${untestedStudents.length})`}>
                                {untestedStudents.map(st => (
                                  <option key={st.numeroEleve} value={st.numeroEleve}>
                                    #{getStudentNumberDisplay(st)} - {st.nomEleve} ({st.sexe === 'F' ? 'أنثى' : 'ذكر'})
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label={`⚪ تلاميذ اجتازوا سابقاً (${testedStudents.length})`}>
                                {testedStudents.map(({ student: st, prevTime }) => (
                                  <option key={st.numeroEleve} value={st.numeroEleve}>
                                    #{getStudentNumberDisplay(st)} - {st.nomEleve} (سابقاً: {prevTime}ث)
                                  </option>
                                ))}
                              </optgroup>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleAssignStudentToLane(runner.laneIndex, '')}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-[11px] font-bold cursor-pointer"
                              title="إلغاء تعيين التلميذ لهذا المركز"
                            >
                              إلغاء ✖️
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* DEDICATED SAVE AND NEXT BUTTONS */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveBatchResults}
                  disabled={rankedRunners.filter(r => !!r.studentNumber).length === 0}
                  className={`px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl shadow-md transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                    rankedRunners.filter(r => !!r.studentNumber).length > 0 && !isBatchSaved
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                      : rankedRunners.filter(r => !!r.studentNumber).length > 0 && isBatchSaved
                      ? 'bg-emerald-700 text-white opacity-90'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed opacity-60'
                  }`}
                  title="حفظ نتائج هذا الفوج بالسجل"
                >
                  <span>💾</span>
                  <span>
                    {isBatchSaved 
                      ? '✓ تم حفظ نتائج الفوج' 
                      : rankedRunners.filter(r => !!r.studentNumber).length > 0 
                      ? `حفظ نتائج الفوج (${rankedRunners.filter(r => !!r.studentNumber).length} تلميذ)` 
                      : 'حفظ النتائج 💾'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePrepareNextHeat}
                  className="px-4 py-2.5 text-xs sm:text-sm font-black bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>الفوج التالي ⏩</span>
                </button>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 4: جدول النتائج الإجمالية للقسم                      */}
          {/* ========================================================= */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-md p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                <TrophyIcon className="w-4 h-4 text-teal-600" />
                <span>نتائج القسم في اختبار التوازن الثابت ({completedResults.length} تلميذ/ة مسجل):</span>
              </h4>
            </div>

            {completedResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed">
                لم يتم تسجيل أي زمن لاختبار التوازن في هذا القسم بعد.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-black border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="p-2.5 w-12">#</th>
                      <th className="p-2.5 text-right">الاسم الكامل</th>
                      <th className="p-2.5 w-16">الجنس</th>
                      <th className="p-2.5 w-28">زمن الثبات (ث)</th>
                      <th className="p-2.5 w-14">تعديل</th>
                      <th className="p-2.5 w-14">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800 font-bold">
                    {completedResults.map(({ student, timeSec }, idx) => (
                      <tr key={student.numeroEleve} className="hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition-colors">
                        <td className="p-2 text-gray-500">
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                        </td>
                        <td className="p-2 text-right text-gray-900 dark:text-white flex items-center gap-2">
                          <StudentAvatar
                            photoUrl={student.photoUrl}
                            nomEleve={student.nomEleve}
                            sexe={student.sexe}
                            size="sm"
                          />
                          <span>{student.nomEleve}</span>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            student.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {student.sexe === 'F' ? 'أنثى' : 'ذكر'}
                          </span>
                        </td>
                        <td className="p-2 font-mono font-black text-teal-700 dark:text-teal-400 text-sm">
                          {timeSec?.toFixed(2)} ث
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTableStudentToEdit({ numeroEleve: student.numeroEleve, nomEleve: student.nomEleve, currentTime: timeSec || 0 });
                              setTableEditTimeInput(timeSec !== undefined ? String(timeSec) : '');
                            }}
                            className="p-1 hover:bg-teal-100 dark:hover:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-lg transition cursor-pointer"
                            title="تعديل هذا التوقيت"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => setStudentToDelete({ numeroEleve: student.numeroEleve, nomEleve: student.nomEleve })}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 rounded-lg transition cursor-pointer"
                            title="مسح هذا التوقيت"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Modal Simple Bottom Bar */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
            مجموع التلاميذ الذين اجتازوا الاختبار: {completedResults.length} من {students.length}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>

      {/* نافذة تأكيد مسح نتيجة الاختبار */}
      {studentToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-gray-200 dark:border-gray-700 text-right">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <TrashIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-2">
              تأكيد مسح نتيجة الاختبار
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              هل أنت متأكد من رغبتك في مسح نتيجة التلميذ «<strong className="text-gray-900 dark:text-white font-bold">{studentToDelete.nomEleve}</strong>» من اختبار التوازن الثابت؟
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <TrashIcon className="w-4 h-4" />
                <span>نعم، مسح النتيجة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل نتيجة الاختبار في الجدول */}
      {tableStudentToEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-gray-200 dark:border-gray-700 text-right">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
              <PencilSquareIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              تعديل زمن التوازن الثابت
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              التلميذ: <strong className="text-gray-900 dark:text-white font-bold">{tableStudentToEdit.nomEleve}</strong>
            </p>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  الزمن المسجل (ثانية):
                </label>
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  value={tableEditTimeInput}
                  onChange={(e) => setTableEditTimeInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-mono font-black text-lg text-center text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  placeholder="24.50"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTableStudentToEdit(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveTableEditTime}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>حفظ التعديل ✔️</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
