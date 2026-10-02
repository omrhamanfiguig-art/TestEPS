import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { StudentIdentity, PhysicalTests } from '../types';
import { getStudentList, getPhysicalTests, savePhysicalTests, getAllClasses } from '../utils/db';
import { 
  XMarkIcon, 
  PlayIcon, 
  PauseIcon,
  ArrowPathIcon, 
  CheckCircleIcon, 
  UserGroupIcon, 
  TrophyIcon,
  SparklesIcon,
  ChevronRightIcon,
  TrashIcon
} from './Icons';
import { StudentAvatar } from './StudentAvatar';

interface StaticBalanceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass: string;
  onDataSaved?: () => void;
}

interface BalanceRunner {
  laneIndex: number;
  studentNumber: string;
  recordedTime?: number; // seconds
  isFinished: boolean;
}

export const StaticBalanceTestModal: React.FC<StaticBalanceTestModalProps> = ({
  isOpen,
  onClose,
  initialClass,
  onDataSaved,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [physicalResults, setPhysicalResults] = useState<PhysicalTests[]>([]);
  
  const [testState, setTestState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0); // in milliseconds
  const startTimeRef = useRef<number>(0);
  const [participantCount, setParticipantCount] = useState<number>(4);

  // Selected Participants array
  const [selectedParticipants, setSelectedParticipants] = useState<BalanceRunner[]>([
    { laneIndex: 1, studentNumber: '', isFinished: false },
    { laneIndex: 2, studentNumber: '', isFinished: false },
    { laneIndex: 3, studentNumber: '', isFinished: false },
    { laneIndex: 4, studentNumber: '', isFinished: false },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadClasses();
      const cls = selectedClass || initialClass;
      if (cls) {
        loadClassData(cls);
      }
      resetTimer();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedClass) {
      loadClassData(selectedClass);
      resetTimer();
    }
  }, [selectedClass]);

  // Sync participant slots count when participantCount changes
  useEffect(() => {
    setSelectedParticipants(prev => {
      const newRunners: BalanceRunner[] = [];
      for (let i = 1; i <= participantCount; i++) {
        const existing = prev.find(r => r.laneIndex === i);
        if (existing) {
          newRunners.push(existing);
        } else {
          newRunners.push({
            laneIndex: i,
            studentNumber: '',
            isFinished: false
          });
        }
      }
      return newRunners;
    });
  }, [participantCount]);

  const loadClasses = async () => {
    try {
      const clsList = await getAllClasses();
      setClasses(clsList.map(c => c.className));
    } catch (e) {
      console.error('Error loading classes:', e);
    }
  };

  const loadClassData = async (clsName: string) => {
    if (!clsName) return;
    try {
      const rawStudents = await getStudentList(clsName);
      const rawPhys = await getPhysicalTests(clsName);

      const normalizedStudents: StudentIdentity[] = (rawStudents || []).map((s, idx) => ({
        ...s,
        numeroEleve: String(s.numeroEleve || (idx + 1))
      }));
      const normalizedPhys: PhysicalTests[] = (rawPhys || []).map(p => ({
        ...p,
        numeroEleve: String(p.numeroEleve)
      }));

      setStudents(normalizedStudents);
      setPhysicalResults(normalizedPhys);

      // Auto-populate untested batch if empty
      setSelectedParticipants(prev => {
        const untested = normalizedStudents.filter(s => {
          const res = normalizedPhys.find(r => String(r.numeroEleve) === String(s.numeroEleve));
          const val = res?.equilibreStatique;
          return val === undefined || val === null || val <= 0;
        });
        const pool = untested.length > 0 ? untested : normalizedStudents;

        return prev.map((runner, index) => {
          if (runner.studentNumber && normalizedStudents.some(s => String(s.numeroEleve) === String(runner.studentNumber))) {
            return runner;
          }
          const candidate = pool[index];
          return {
            ...runner,
            studentNumber: candidate ? String(candidate.numeroEleve) : '',
            recordedTime: undefined,
            isFinished: false
          };
        });
      });
    } catch (err) {
      console.error('Error loading class data for balance test:', err);
    }
  };

  // Stopwatch timer loop
  useEffect(() => {
    if (testState === 'running') {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 16);
      return () => clearInterval(interval);
    }
  }, [testState]);

  const getStudentNumberDisplay = (s: StudentIdentity) => {
    if (s.orderIndex) return String(s.orderIndex);
    const idx = students.findIndex(st => String(st.numeroEleve) === String(s.numeroEleve));
    return idx >= 0 ? String(idx + 1) : '?';
  };

  const getArabicRankName = (index: number) => {
    const ranks = [
      'الأول 🥇',
      'الثاني 🥈',
      'الثالث 🥉',
      'الرابع 🎖️',
      'الخامس 🏅',
      'السادس',
      'السابع',
      'الثامن',
      'التاسع',
      'العاشر'
    ];
    return ranks[index] || `المركز ${index + 1}`;
  };

  const startTimer = () => {
    startTimeRef.current = Date.now() - elapsedTime;
    setTestState('running');
  };

  const pauseTimer = () => {
    setTestState('paused');
  };

  const resetTimer = () => {
    setTestState('idle');
    setElapsedTime(0);
    setSelectedParticipants(prev => prev.map(r => ({ ...r, recordedTime: undefined, isFinished: false })));
  };

  // Next unfinished runner slot index
  const nextUnfinishedIndex = useMemo(() => {
    return selectedParticipants.findIndex(r => !r.isFinished);
  }, [selectedParticipants]);

  // Single consecutive fall / finish recording button (مثل ميقات السرعة)
  const recordNextFall = async () => {
    if (testState === 'idle') {
      startTimer();
      return;
    }

    const targetIdx = selectedParticipants.findIndex(r => !r.isFinished);
    const timeInSec = Number((elapsedTime / 1000).toFixed(1));

    if (targetIdx === -1) {
      // Auto expand slots if more participants fall
      const newLaneIndex = selectedParticipants.length + 1;
      const newRunner: BalanceRunner = {
        laneIndex: newLaneIndex,
        studentNumber: '',
        recordedTime: timeInSec,
        isFinished: true
      };
      setSelectedParticipants(prev => [...prev, newRunner]);
      setParticipantCount(prev => Math.max(prev, newLaneIndex));
    } else {
      const runner = selectedParticipants[targetIdx];
      const updated = selectedParticipants.map((r, idx) =>
        idx === targetIdx ? { ...r, recordedTime: timeInSec, isFinished: true } : r
      );
      setSelectedParticipants(updated);

      if (runner.studentNumber) {
        await saveBalanceResult(String(runner.studentNumber), timeInSec);
      }

      if (updated.every(r => r.isFinished)) {
        setTestState('paused');
      }
    }
  };

  const handleRunnerTileClick = async (laneIndex: number) => {
    if (testState !== 'running' && testState !== 'paused') return;

    const runner = selectedParticipants.find(r => r.laneIndex === laneIndex);
    if (!runner) return;

    if (!runner.isFinished) {
      const timeInSec = Number((elapsedTime / 1000).toFixed(1));
      const updated = selectedParticipants.map(r => r.laneIndex === laneIndex ? { ...r, recordedTime: timeInSec, isFinished: true } : r);
      setSelectedParticipants(updated);

      if (runner.studentNumber) {
        await saveBalanceResult(String(runner.studentNumber), timeInSec);
      }

      if (updated.every(r => r.isFinished)) {
        setTestState('paused');
      }
    } else {
      setSelectedParticipants(prev => prev.map(r => r.laneIndex === laneIndex ? { ...r, recordedTime: undefined, isFinished: false } : r));
      if (runner.studentNumber) {
        await handleDeleteResult(String(runner.studentNumber));
      }
    }
  };

  const handleAssignStudentToLane = async (laneIndex: number, studentNumber: string) => {
    const runner = selectedParticipants.find(r => r.laneIndex === laneIndex);
    if (!runner) return;

    const oldStudentNumber = runner.studentNumber;

    setSelectedParticipants(prev => prev.map(r => {
      if (r.laneIndex === laneIndex) {
        return { ...r, studentNumber };
      }
      if (studentNumber && String(r.studentNumber) === String(studentNumber) && r.laneIndex !== laneIndex) {
        return { ...r, studentNumber: '' };
      }
      return r;
    }));

    if (runner.isFinished && runner.recordedTime !== undefined) {
      if (oldStudentNumber && String(oldStudentNumber) !== String(studentNumber)) {
        await handleDeleteResult(String(oldStudentNumber));
      }
      if (studentNumber) {
        await saveBalanceResult(String(studentNumber), runner.recordedTime);
      }
    }
  };

  const saveBalanceResult = async (studentNum: string, value: number) => {
    const student = students.find(s => String(s.numeroEleve) === String(studentNum));
    if (!student) return;

    const currentPhys = [...physicalResults];
    const existingIdx = currentPhys.findIndex(p => String(p.numeroEleve) === String(studentNum));
    
    const updatedItem: PhysicalTests = {
      ...(existingIdx >= 0 ? currentPhys[existingIdx] : {}),
      numeroEleve: String(studentNum),
      nomEleve: student.nomEleve,
      sexe: student.sexe,
      equilibreStatique: value,
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
  };

  const handleDeleteResult = async (studentNum: string) => {
    const updatedPhys = physicalResults.map(p => {
      if (String(p.numeroEleve) === String(studentNum)) {
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

  const clearLaneStudents = () => {
    setSelectedParticipants(prev => prev.map(r => ({
      ...r,
      studentNumber: '',
      recordedTime: undefined,
      isFinished: false
    })));
  };

  // Completed balance results for summary table
  const completedResults = useMemo(() => {
    return students
      .map(s => {
        const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
        return {
          student: s,
          timeSec: res?.equilibreStatique
        };
      })
      .filter(item => item.timeSec !== undefined && item.timeSec > 0)
      .sort((a, b) => (b.timeSec || 0) - (a.timeSec || 0)); // Higher balance time is better
  }, [students, physicalResults]);

  if (!isOpen) return null;

  const formattedSeconds = (elapsedTime / 1000).toFixed(1);
  const activeSelected = selectedParticipants.filter(r => !!r.studentNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <TrophyIcon className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black">اختبار التوازن الثابت (متعدد المشاركين - ميقاتي جماعي)</h2>
              <p className="text-xs text-indigo-100/90 font-medium">تسجيل توقيت اختلال التوازن (السقوط) لعدة تلاميذ بضغطة زر متتالية مثل ميقات السرعة</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-grow custom-scrollbar">
          
          {/* Top Options Bar */}
          <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-200/80 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Class Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 shrink-0">
                  القسم:
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={testState !== 'idle'}
                  className="px-3 py-2 text-xs sm:text-sm font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 cursor-pointer"
                >
                  {classes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Participant Count Selector */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">عدد المشاركين في الجلسة:</span>
                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-300 dark:border-gray-600 gap-0.5">
                  {([2, 3, 4, 6, 8, 10] as const).map(num => (
                    <button
                      key={num}
                      disabled={testState !== 'idle'}
                      onClick={() => setParticipantCount(num)}
                      className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                        participantCount === num
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 cursor-pointer'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearLaneStudents}
                  className="px-3 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl border border-gray-300 dark:border-gray-600 transition cursor-pointer"
                  title="تفريغ الأسماء لتسجيل السقوط بالترتيب"
                >
                  🧹 تفريغ الأسماء
                </button>
              </div>
            </div>
          </div>

          {/* Main Stopwatch Header */}
          <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-white rounded-3xl shadow-xl border border-gray-700 relative overflow-hidden">
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">
              عداد وقت اختبار التوازن الثابت (ثواني)
            </div>

            <div className="text-4xl xs:text-5xl sm:text-7xl font-mono font-black tracking-wider text-indigo-400 drop-shadow-md my-2">
              {formattedSeconds} <span className="text-xl sm:text-2xl font-bold text-gray-400">ثانية</span>
            </div>

            {/* SINGLE FALL RECORDING BUTTON (زر تسجيل السقوط المتتالي) */}
            <div className="w-full max-w-2xl mx-auto my-3 px-1">
              <button
                type="button"
                onClick={recordNextFall}
                className="w-full inline-flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-white font-black rounded-3xl shadow-2xl shadow-amber-500/40 border-2 border-amber-300 transition-all transform active:scale-95 cursor-pointer text-base sm:text-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl animate-bounce">🛑</span>
                  <div className="text-right">
                    <div className="text-[11px] font-black text-amber-100 uppercase tracking-wide">
                      زر تسجيل سقوط المتسابق (فقدان التوازن):
                    </div>
                    <div className="text-sm sm:text-xl font-black text-white mt-0.5">
                      {testState === 'idle'
                        ? 'انقر هنا لبدء اختبار التوازن والانطلاق 🚀'
                        : nextUnfinishedIndex !== -1
                        ? `تسجيل سقوط: ${getArabicRankName(nextUnfinishedIndex)}`
                        : `تسجيل سقوط متسابق جديد (#${selectedParticipants.length + 1})`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-gray-950 text-indigo-300 px-3 py-1.5 rounded-2xl text-xs sm:text-sm font-mono font-black border border-indigo-400/50 shadow-inner">
                    {formattedSeconds}ث
                  </span>
                  <span className="text-[11px] sm:text-xs font-black bg-rose-950 text-rose-100 px-2.5 py-1.5 rounded-xl shadow-xs">
                    سقط 🛑
                  </span>
                </div>
              </button>
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-2.5 sm:gap-4 mt-2 flex-wrap justify-center w-full">
              {testState === 'idle' && (
                <button
                  onClick={startTimer}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer text-sm sm:text-base"
                >
                  <PlayIcon className="w-6 h-6 fill-current" />
                  <span>بدء الاختبار 🚀</span>
                </button>
              )}

              {testState === 'running' && (
                <button
                  onClick={pauseTimer}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-500 hover:bg-amber-400 text-white font-black rounded-2xl shadow-lg shadow-amber-500/30 transition transform active:scale-95 cursor-pointer text-sm sm:text-base"
                >
                  <PauseIcon className="w-6 h-6" />
                  <span>إيقاف مؤقت ⏸️</span>
                </button>
              )}

              {testState === 'paused' && (
                <button
                  onClick={startTimer}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer text-sm sm:text-base"
                >
                  <PlayIcon className="w-6 h-6 fill-current" />
                  <span>متابعة ▶️</span>
                </button>
              )}

              <button
                onClick={resetTimer}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-2xl transition transform active:scale-95 cursor-pointer text-xs sm:text-sm"
              >
                <ArrowPathIcon className="w-5 h-5" />
                <span>تصفير 🔄</span>
              </button>
            </div>
          </div>

          {/* PARTICIPANT CARDS GRID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>مخطط مشاركي اختبار التوازن ({selectedParticipants.length} مقاعد):</span>
              </h3>
              <span className="text-xs font-bold px-3 py-1.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 rounded-xl border border-indigo-300 dark:border-indigo-800">
                المحددون: {activeSelected.length} / {selectedParticipants.length}
              </span>
            </div>

            <div className={`grid grid-cols-1 ${selectedParticipants.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} ${selectedParticipants.length === 4 ? 'lg:grid-cols-4' : ''} gap-4`}>
              {selectedParticipants.map(runner => {
                const student = students.find(s => String(s.numeroEleve) === String(runner.studentNumber));
                const untestedStudents = students.filter(s => {
                  const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
                  const val = res?.equilibreStatique;
                  return val === undefined || val === null || val <= 0;
                });
                const testedStudents = students.filter(s => {
                  const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
                  const val = res?.equilibreStatique;
                  return val !== undefined && val !== null && val > 0;
                });

                return (
                  <div
                    key={runner.laneIndex}
                    className={`relative flex flex-col justify-between p-5 rounded-3xl border-2 text-right transition-all shadow-lg select-none min-h-[200px] ${
                      runner.isFinished
                        ? 'bg-gradient-to-b from-rose-500/10 to-rose-700/10 dark:from-rose-950/40 dark:to-rose-900/30 border-rose-500 dark:border-rose-500 shadow-rose-600/15'
                        : 'bg-white dark:bg-gray-800 border-indigo-500 dark:border-indigo-500 shadow-indigo-500/10'
                    }`}
                  >
                    {/* Top Bar inside card */}
                    <div className="flex items-center justify-between w-full pb-2 border-b border-gray-200 dark:border-gray-700">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                        runner.isFinished 
                          ? 'bg-rose-600 text-white' 
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                      }`}>
                        {getArabicRankName(runner.laneIndex - 1)}
                      </span>

                      {student ? (
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                          student.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {student.sexe === 'F' ? 'أنثى' : 'ذكر'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-bold">
                          {runner.isFinished ? '⚠️ اختل التوازن' : 'مقعد شاغر'}
                        </span>
                      )}
                    </div>

                    {/* Main Student Name & Status */}
                    <div className="my-2">
                      <div className="text-base sm:text-lg font-black truncate text-gray-900 dark:text-white">
                        {student ? student.nomEleve : `مشارك المقعد #${runner.laneIndex}`}
                      </div>
                      {!student && (
                        <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {runner.isFinished ? '⚠️ يرجى اختيار التلميذ لهذا المقعد أدناه:' : 'جاهز - سجل السقوط واختار الاسم لاحقاً 🏁'}
                        </div>
                      )}
                    </div>

                    {/* Recorded Time Display or Click to Finish Button */}
                    {runner.isFinished ? (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/60 p-2.5 rounded-2xl border border-rose-200 dark:border-rose-800">
                          <div>
                            <div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase">زمن الثبات قبل السقوط</div>
                            <div className="text-2xl font-mono font-black text-rose-800 dark:text-rose-200">
                              🛑 {runner.recordedTime?.toFixed(1)} ثانية
                            </div>
                          </div>
                          <div className="text-left flex flex-col items-end gap-1">
                            <button
                              onClick={() => handleRunnerTileClick(runner.laneIndex)}
                              className="text-[11px] font-bold text-red-600 dark:text-red-400 underline hover:no-underline cursor-pointer"
                            >
                              إلغاء التوقيت 🔄
                            </button>
                          </div>
                        </div>

                        {/* Student selection dropdown (without Massar numbers) */}
                        <div className="p-2.5 rounded-2xl border bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600">
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                            <span>{student ? '👤 تلميذ هذا المقعد:' : '👉 اختر تلميذ هذا التوقيت:'}</span>
                            {student && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✅ تم الحفظ</span>
                            )}
                          </label>
                          <select
                            value={runner.studentNumber}
                            onChange={(e) => handleAssignStudentToLane(runner.laneIndex, e.target.value)}
                            className="w-full text-xs font-bold py-2 px-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-indigo-500 cursor-pointer"
                          >
                            <option value="">-- اضغط لاختيار تلميذ المقعد #{runner.laneIndex} --</option>
                            {untestedStudents.length > 0 && (
                              <optgroup label={`⭐ تلاميذ لم يختبروا بعد (${untestedStudents.length})`}>
                                {untestedStudents.map(s => {
                                  const isAssigned = selectedParticipants.some(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(s.numeroEleve));
                                  return (
                                    <option key={s.numeroEleve} value={s.numeroEleve} disabled={isAssigned}>
                                      #{getStudentNumberDisplay(s)} - {s.nomEleve} ({s.sexe === 'F' ? 'أنثى' : 'ذكر'}) {isAssigned ? '(بمقعد آخر)' : ''}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                            {testedStudents.length > 0 && (
                              <optgroup label={`🔄 تلاميذ سبق اختبارهم (${testedStudents.length})`}>
                                {testedStudents.map(s => {
                                  const isAssigned = selectedParticipants.some(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(s.numeroEleve));
                                  const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
                                  return (
                                    <option key={s.numeroEleve} value={s.numeroEleve} disabled={isAssigned}>
                                      #{getStudentNumberDisplay(s)} - {s.nomEleve} ({s.sexe === 'F' ? 'أنثى' : 'ذكر'}) [سابقاً: {res?.equilibreStatique}ث] {isAssigned ? '(بمقعد آخر)' : ''}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        {/* Idle pre-assignment dropdown */}
                        {testState === 'idle' && (
                          <div className="mb-2">
                            <select
                              value={runner.studentNumber}
                              onChange={(e) => handleAssignStudentToLane(runner.laneIndex, e.target.value)}
                              className="w-full text-xs font-bold py-1.5 px-2 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white cursor-pointer"
                            >
                              <option value="">-- اضغط لتعيين تلميذ مسبقاً (اختياري) --</option>
                              {untestedStudents.map(s => {
                                const isAssigned = selectedParticipants.some(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(s.numeroEleve));
                                return (
                                  <option key={s.numeroEleve} value={s.numeroEleve} disabled={isAssigned}>
                                    #{getStudentNumberDisplay(s)} - {s.nomEleve} {isAssigned ? '(بمقعد آخر)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            if (testState === 'idle') {
                              startTimer();
                            } else {
                              handleRunnerTileClick(runner.laneIndex);
                            }
                          }}
                          className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl flex items-center justify-between transition cursor-pointer shadow-md active:scale-95"
                        >
                          <span className="text-xs sm:text-sm">
                            {testState === 'idle' ? 'ابدأ الاختبار 🚀' : 'اضغط عند سقوط التلميذ 🛑'}
                          </span>
                          <CheckCircleIcon className="w-5 h-5 animate-pulse" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results Table Section */}
          <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-indigo-500" />
                <span>جدول نتائج اختبار التوازن الثابت بالقسم ({completedResults.length} تلميذ/ة):</span>
              </h3>
            </div>

            {completedResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed">
                لم يتم تسجيل أي زمن في اختبار التوازن لهذا القسم بعد.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="p-2.5 w-12">#</th>
                      <th className="p-2.5 text-right">الاسم والنسب</th>
                      <th className="p-2.5 w-16">الجنس</th>
                      <th className="p-2.5 w-32">زمن الثبات (ثانية)</th>
                      <th className="p-2.5 w-16">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {completedResults.map(({ student, timeSec }, idx) => (
                      <tr key={student.numeroEleve} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                        <td className="p-2 font-bold text-gray-600 dark:text-gray-400">
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                        </td>
                        <td className="p-2 text-right font-bold text-gray-900 dark:text-white">
                          {student.nomEleve}
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${student.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
                            {student.sexe === 'F' ? 'أنثى' : 'ذكر'}
                          </span>
                        </td>
                        <td className="p-2 font-mono font-black text-indigo-700 dark:text-indigo-400 text-sm">
                          {timeSec} ث
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => handleDeleteResult(student.numeroEleve)}
                            title="حذف هذا الزمن"
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 rounded-lg transition"
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

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
