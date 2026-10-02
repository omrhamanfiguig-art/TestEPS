import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StudentIdentity, PhysicalTests } from '../types';
import { getStudentList, getPhysicalTests, savePhysicalTests, getAllClasses } from '../utils/db';
import { 
  XMarkIcon, 
  PlayIcon, 
  PauseIcon,
  ArrowPathIcon, 
  CheckCircleIcon, 
  UserGroupIcon, 
  ChevronRightIcon, 
  TrashIcon, 
  TrophyIcon,
  SparklesIcon
} from './Icons';
import { StudentAvatar } from './StudentAvatar';
import { 
  calculateScore, 
  formatSecondsToMinSec,
  SPEED_SCALE_30M,
  SPEED_SCALE_60M,
  SPEED_SCALE_80M,
  ENDURANCE_SCALE_1000M
} from '../utils/ScoringConstants';
import { startBluetoothKeepAlive, stopBluetoothKeepAlive } from '../utils/audioHelper';

export type RaceTestType = 'speed' | 'speed-60' | 'speed-80' | 'endurance' | 'relay';

interface Sprint30mTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass: string;
  classList?: (string | any)[];
  onDataSaved?: () => void;
  testType?: RaceTestType;
}

interface SelectedRunner {
  laneIndex: number; // 1..8
  studentNumber: string;
  recordedTime?: number; // seconds with 2 decimal places e.g. 4.35, or seconds for endurance e.g. 205.4
  isFinished: boolean;
}

const normalizeClassNames = (list?: (string | any)[]): string[] => {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'className' in item) return String(item.className);
    return '';
  }).filter(Boolean);
};

export const Sprint30mTestModal: React.FC<Sprint30mTestModalProps> = ({
  isOpen,
  onClose,
  initialClass,
  classList = [],
  onDataSaved,
  testType = 'speed'
}) => {
  const [currentTestType, setCurrentTestType] = useState<RaceTestType>(testType);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [classes, setClasses] = useState<string[]>(() => normalizeClassNames(classList));
  const [laneCount, setLaneCount] = useState<number>(() => (testType === 'relay' || testType === 'endurance' ? 4 : 3));
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [physicalResults, setPhysicalResults] = useState<PhysicalTests[]>([]);

  useEffect(() => {
    if (testType) {
      setCurrentTestType(testType);
    }
  }, [testType]);

  useEffect(() => {
    if (currentTestType === 'relay') {
      setLaneCount(4);
    }
  }, [currentTestType]);

  // Race metadata config
  const raceConfig = useMemo(() => {
    switch (currentTestType) {
      case 'speed-60':
        return {
          title: 'اختبار الجري السريع (60 م)',
          subtitle: 'تحديد توقيت كل متسابق وحساب النقطة آلياً',
          counterLabel: 'عداد وقت سباق السرعة 60م (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesse60m' as const,
          distanceMeters: 60,
          scale: SPEED_SCALE_60M,
          scoreField: 'scoreVitesse' as const,
          isMinutes: false
        };
      case 'speed-80':
        return {
          title: 'اختبار الجري السريع (80 م)',
          subtitle: 'تحديد توقيت كل متسابق وحساب النقطة آلياً',
          counterLabel: 'عداد وقت سباق السرعة 80م (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesse80m' as const,
          distanceMeters: 80,
          scale: SPEED_SCALE_80M,
          scoreField: 'scoreVitesse' as const,
          isMinutes: false
        };
      case 'endurance':
        return {
          title: 'اختبار سباق السرعة المتوسطة (التحمل 1000م / 600م)',
          subtitle: 'تحديد توقيت كل متسابق بالدقائق والثواني وحساب النقطة آلياً',
          counterLabel: 'عداد وقت سباق السرعة المتوسطة (دقائق : ثواني)',
          unitLabel: 'دقيقة',
          field: 'enduranceTemps' as const,
          distanceMeters: 1000,
          scale: ENDURANCE_SCALE_1000M,
          scoreField: 'scoreEndurance' as const,
          isMinutes: true
        };
      case 'relay':
        return {
          title: 'اختبار سباق التتابع (Relay Race)',
          subtitle: 'تسجيل التوقيت المتتالي لتمرير العصا / وصول المتسابقين الأربعة وصلاحية اختيارهم بالترتيب',
          counterLabel: 'عداد وقت سباق التتابع (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesseRelay' as const,
          distanceMeters: 400,
          scale: SPEED_SCALE_30M,
          scoreField: 'scoreRelay' as const,
          isMinutes: false
        };
      case 'speed':
      default:
        return {
          title: 'اختبار الجري السريع (30 م)',
          subtitle: 'تسجيل التوقيت لكل متسابق والتقويم التلقائي',
          counterLabel: 'عداد وقت سباق السرعة (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesse30m' as const,
          distanceMeters: 30,
          scale: SPEED_SCALE_30M,
          scoreField: 'scoreVitesse' as const,
          isMinutes: false
        };
    }
  }, [currentTestType]);
  
  // Selected Runners for current race (array of length laneCount)
  const [selectedRunners, setSelectedRunners] = useState<SelectedRunner[]>([
    { laneIndex: 1, studentNumber: '', isFinished: false },
    { laneIndex: 2, studentNumber: '', isFinished: false },
    { laneIndex: 3, studentNumber: '', isFinished: false },
  ]);

  // Stopwatch state
  const [testState, setTestState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0); // in milliseconds
  const startTimeRef = useRef<number>(0);

  // Audio Context for beeps
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = (freq = 880, duration = 0.15, type: OscillatorType = 'sine') => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'running') {
        audioCtxRef.current.resume();
      }
      if (!audioCtxRef.current) return;

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.9, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  };

  // Load class list dropdown
  useEffect(() => {
    const updateClasses = async () => {
      let names = normalizeClassNames(classList);
      if (names.length === 0) {
        try {
          const clsList = await getAllClasses();
          names = clsList.map(c => c.className);
        } catch (e) {
          console.error('Error fetching classes:', e);
        }
      }
      setClasses(names);

      // Verify or auto-select selectedClass
      setSelectedClass(prev => {
        if (prev && names.includes(prev)) return prev;
        if (initialClass && names.includes(initialClass)) return initialClass;
        return names.length > 0 ? names[0] : '';
      });
    };
    updateClasses();
  }, [classList, initialClass]);

  // Load class students and test results
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

      // Automatically assign first batch of untested students if lanes are currently empty
      setSelectedRunners(prev => {
        const untested = normalizedStudents.filter(s => {
          const res = normalizedPhys.find(r => String(r.numeroEleve) === String(s.numeroEleve));
          const val = (res as any)?.[raceConfig.field];
          return val === undefined || val === null || val <= 0;
        });
        const pool = untested.length > 0 ? untested : normalizedStudents;

        return prev.map((runner, index) => {
          // If runner already has a valid student in this class, keep it
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
      console.error('Error loading class data for race test:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
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

  // Listen to DB updates so changes in other screens update immediately
  useEffect(() => {
    const handleDbUpdate = () => {
      if (selectedClass) {
        loadClassData(selectedClass);
      }
    };
    window.addEventListener('dbUpdated', handleDbUpdate);
    return () => window.removeEventListener('dbUpdated', handleDbUpdate);
  }, [selectedClass]);

  // Sync selected runners array length when laneCount changes
  useEffect(() => {
    setSelectedRunners(prev => {
      const newRunners: SelectedRunner[] = [];
      const untested = students.filter(s => {
        const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
        const val = (res as any)?.[raceConfig.field];
        return val === undefined || val === null || val <= 0;
      });
      const pool = untested.length > 0 ? untested : students;

      for (let i = 1; i <= laneCount; i++) {
        const existing = prev.find(r => r.laneIndex === i);
        if (existing) {
          newRunners.push(existing);
        } else {
          // Pick a student from pool not already used in previous lanes
          const candidate = pool.find(s => !newRunners.some(r => String(r.studentNumber) === String(s.numeroEleve)));
          newRunners.push({
            laneIndex: i,
            studentNumber: candidate ? String(candidate.numeroEleve) : '',
            isFinished: false
          });
        }
      }
      return newRunners;
    });
  }, [laneCount, students, raceConfig.field]);

  // Stopwatch timer loop
  useEffect(() => {
    if (testState === 'running') {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 16); // ~60fps smooth timer
      return () => clearInterval(interval);
    }
  }, [testState]);

  const getStudentNumberDisplay = (s: StudentIdentity) => {
    if (s.orderIndex) return String(s.orderIndex);
    const idx = students.findIndex(st => String(st.numeroEleve) === String(s.numeroEleve));
    return idx >= 0 ? String(idx + 1) : '?';
  };

  const [idleViewMode, setIdleViewMode] = useState<'lanes' | 'grid'>('lanes');

  // Untested and tested student groups for high efficiency
  const { untestedStudents, testedStudents } = useMemo(() => {
    const untested: StudentIdentity[] = [];
    const tested: { student: StudentIdentity; prevTime?: number }[] = [];

    students.forEach(s => {
      const res = physicalResults.find(p => String(p.numeroEleve) === String(s.numeroEleve));
      const val = (res as any)?.[raceConfig.field];
      if (val !== undefined && val > 0) {
        tested.push({ student: s, prevTime: val });
      } else {
        untested.push(s);
      }
    });

    return { untestedStudents: untested, testedStudents: tested };
  }, [students, physicalResults, raceConfig.field]);

  // Toggle student selection in the grid (during idle mode)
  const handleToggleStudentSelection = (studentNum: string) => {
    if (testState !== 'idle') return;

    // Check if already selected
    const existingIndex = selectedRunners.findIndex(r => String(r.studentNumber) === String(studentNum));

    if (existingIndex >= 0) {
      // Remove student
      setSelectedRunners(prev => prev.map((r, idx) => idx === existingIndex ? { ...r, studentNumber: '', recordedTime: undefined, isFinished: false } : r));
    } else {
      // Find first empty slot
      const emptyIndex = selectedRunners.findIndex(r => !r.studentNumber);
      if (emptyIndex >= 0) {
        setSelectedRunners(prev => prev.map((r, idx) => idx === emptyIndex ? { ...r, studentNumber: String(studentNum), recordedTime: undefined, isFinished: false } : r));
      } else {
        // Replace last slot if all slots full
        setSelectedRunners(prev => prev.map((r, idx) => idx === laneCount - 1 ? { ...r, studentNumber: String(studentNum), recordedTime: undefined, isFinished: false } : r));
      }
    }
  };

  // Auto populate next untested batch of students
  const autoPopulateNextBatch = () => {
    const untested = students.filter(s => {
      const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
      const val = (res as any)?.[raceConfig.field];
      return val === undefined || val === null || val <= 0;
    });

    const pool = untested.length > 0 ? untested : students;

    setSelectedRunners(prev => {
      return prev.map((runner, index) => {
        const candidate = pool[index];
        return {
          ...runner,
          studentNumber: candidate ? String(candidate.numeroEleve) : '',
          recordedTime: undefined,
          isFinished: false
        };
      });
    });
  };

  // Helper for rank labels (الأول، الثاني، الثالث...)
  const getArabicRankName = (index: number) => {
    if (currentTestType === 'relay') {
      const relayPositions = [
        'المتسابق الأول (الانطلاق) 🏃‍♂️',
        'المتسابق الثاني (التمرير 1) 🏃‍♂️',
        'المتسابق الثالث (التمرير 2) 🏃‍♂️',
        'المتسابق الرابع (الوصول 🏁)',
      ];
      return relayPositions[index] || `المتسابق ${index + 1}`;
    }
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

  // Index of the next unfinished runner slot
  const nextUnfinishedIndex = useMemo(() => {
    return selectedRunners.findIndex(r => !r.isFinished);
  }, [selectedRunners]);

  // Single-button finisher recording logic (تسجيل الوصول المتتالي للسباق بضغطة زر واحدة)
  const recordNextFinisher = async () => {
    if (testState === 'idle') {
      startTimer();
      return;
    }

    let targetIdx = selectedRunners.findIndex(r => !r.isFinished);
    const timeInSec = Number((elapsedTime / 1000).toFixed(2));
    playBeep(1318.5, 0.15, 'sine');

    if (targetIdx === -1) {
      // Auto expand lanes if more finishers arrive than pre-allocated slots
      const newLaneIndex = selectedRunners.length + 1;
      const newRunner: SelectedRunner = {
        laneIndex: newLaneIndex,
        studentNumber: '',
        recordedTime: timeInSec,
        isFinished: true
      };
      setSelectedRunners(prev => [...prev, newRunner]);
      setLaneCount(prev => Math.max(prev, newLaneIndex));
    } else {
      const runner = selectedRunners[targetIdx];
      const updated = selectedRunners.map((r, idx) =>
        idx === targetIdx ? { ...r, recordedTime: timeInSec, isFinished: true } : r
      );
      setSelectedRunners(updated);

      if (runner.studentNumber) {
        await saveRaceTime(String(runner.studentNumber), timeInSec);
      }

      if (updated.every(r => r.isFinished)) {
        setTestState('paused');
      }
    }
  };

  // Clear lane runners so teacher can run first and assign after the race
  const clearLaneStudents = () => {
    setSelectedRunners(prev => prev.map(r => ({
      ...r,
      studentNumber: '',
      recordedTime: undefined,
      isFinished: false
    })));
  };

  // Start timer
  const startTimer = () => {
    startBluetoothKeepAlive(audioCtxRef.current);
    playBeep(1046.5, 0.3, 'square');
    startTimeRef.current = Date.now() - elapsedTime;
    setTestState('running');
  };

  // Pause timer
  const pauseTimer = () => {
    playBeep(440, 0.1);
    setTestState('paused');
  };

  // Reset timer
  const resetTimer = () => {
    stopBluetoothKeepAlive();
    setTestState('idle');
    setElapsedTime(0);
    setSelectedRunners(prev => prev.map(r => ({ ...r, recordedTime: undefined, isFinished: false })));
  };

  // Record finish time for a runner tile when clicked
  const handleRunnerTileClick = async (laneIndex: number) => {
    if (testState !== 'running' && testState !== 'paused') return;

    const runner = selectedRunners.find(r => r.laneIndex === laneIndex);
    if (!runner) return;

    if (!runner.isFinished) {
      // Record time in seconds (with 2 decimal places)
      const timeInSec = Number((elapsedTime / 1000).toFixed(2));
      playBeep(1318.5, 0.15, 'sine');

      const updated = selectedRunners.map(r => r.laneIndex === laneIndex ? { ...r, recordedTime: timeInSec, isFinished: true } : r);
      setSelectedRunners(updated);

      if (runner.studentNumber) {
        await saveRaceTime(String(runner.studentNumber), timeInSec);
      }

      // If all lanes have finished, pause automatically
      if (updated.every(r => r.isFinished)) {
        setTestState('paused');
      }
    } else {
      // Undo recorded time
      playBeep(440, 0.1);
      setSelectedRunners(prev => prev.map(r => r.laneIndex === laneIndex ? { ...r, recordedTime: undefined, isFinished: false } : r));
      if (runner.studentNumber) {
        await handleDeleteResult(String(runner.studentNumber));
      }
    }
  };

  // Assign or change student for a specific lane (before, during, or after race)
  const handleAssignStudentToLane = async (laneIndex: number, studentNumber: string) => {
    const runner = selectedRunners.find(r => r.laneIndex === laneIndex);
    if (!runner) return;

    const oldStudentNumber = runner.studentNumber;

    setSelectedRunners(prev => prev.map(r => {
      if (r.laneIndex === laneIndex) {
        return { ...r, studentNumber };
      }
      // If student was picked in another lane, clear from that lane
      if (studentNumber && String(r.studentNumber) === String(studentNumber) && r.laneIndex !== laneIndex) {
        return { ...r, studentNumber: '' };
      }
      return r;
    }));

    // If a time was already recorded in this lane, update IndexedDB
    if (runner.isFinished && runner.recordedTime !== undefined) {
      if (oldStudentNumber && String(oldStudentNumber) !== String(studentNumber)) {
        await handleDeleteResult(String(oldStudentNumber));
      }
      if (studentNumber) {
        await saveRaceTime(String(studentNumber), runner.recordedTime);
      }
    }
  };

  // Save student race time to IndexedDB and compute mark
  const saveRaceTime = async (numeroEleve: string, timeSec: number) => {
    const studentObj = students.find(s => String(s.numeroEleve) === String(numeroEleve));
    if (!studentObj) return;

    const currentPhys = [...physicalResults];
    const existingIdx = currentPhys.findIndex(p => String(p.numeroEleve) === String(numeroEleve));

    const mark = calculateScore(timeSec, raceConfig.scale, studentObj.sexe || 'M', true);

    const updatedItem: any = {
      ...(existingIdx >= 0 ? currentPhys[existingIdx] : {}),
      numeroEleve: String(numeroEleve),
      nomEleve: studentObj.nomEleve,
      sexe: studentObj.sexe,
      [raceConfig.field]: timeSec,
      [raceConfig.scoreField]: mark,
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

  // Prepare next run
  const prepareNextRun = () => {
    resetTimer();
    autoPopulateNextBatch();
  };

  // Delete student race result from DB
  const handleDeleteResult = async (numeroEleve: string) => {
    const updatedPhys = physicalResults.map(p => {
      if (String(p.numeroEleve) === String(numeroEleve)) {
        const copy: any = { ...p };
        delete copy[raceConfig.field];
        return copy as PhysicalTests;
      }
      return p;
    });
    setPhysicalResults(updatedPhys);
    await savePhysicalTests(selectedClass, updatedPhys);
    window.dispatchEvent(new CustomEvent('dbUpdated'));
    if (onDataSaved) onDataSaved();
  };

  // Filtered & sorted completed results
  const completedResults = useMemo(() => {
    return students
      .map(s => {
        const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
        const val = (res as any)?.[raceConfig.field];
        const score = (res as any)?.[raceConfig.scoreField];
        return {
          student: s,
          timeSec: val as number | undefined,
          score: score as number | undefined
        };
      })
      .filter(item => item.timeSec !== undefined && item.timeSec > 0)
      .sort((a, b) => (a.timeSec || 0) - (b.timeSec || 0));
  }, [students, physicalResults, raceConfig.field, raceConfig.scoreField]);

  if (!isOpen) return null;

  const formattedSeconds = (elapsedTime / 1000).toFixed(2);
  const activeSelectedRunners = selectedRunners.filter(r => !!r.studentNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <TrophyIcon className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black">{raceConfig.title}</h2>
              <p className="text-xs text-amber-100/90 font-medium">{raceConfig.subtitle}</p>
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
            {/* Row 1: Race Type Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/60 dark:border-gray-700/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">نوع السباق:</span>
                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-300 dark:border-gray-600 gap-1 flex-wrap">
                  <button
                    type="button"
                    disabled={testState !== 'idle'}
                    onClick={() => setCurrentTestType('speed')}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                      currentTestType === 'speed'
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'
                    }`}
                  >
                    ⚡ 30 م (سرعة)
                  </button>
                  <button
                    type="button"
                    disabled={testState !== 'idle'}
                    onClick={() => setCurrentTestType('speed-60')}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                      currentTestType === 'speed-60'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'
                    }`}
                  >
                    ⚡ 60 م (سرعة)
                  </button>
                  <button
                    type="button"
                    disabled={testState !== 'idle'}
                    onClick={() => setCurrentTestType('speed-80')}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                      currentTestType === 'speed-80'
                        ? 'bg-orange-700 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'
                    }`}
                  >
                    ⚡ 80 م (سرعة)
                  </button>
                  <button
                    type="button"
                    disabled={testState !== 'idle'}
                    onClick={() => setCurrentTestType('endurance')}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                      currentTestType === 'endurance'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'
                    }`}
                  >
                    🏃‍♂️ السرعة المتوسطة (التحمل بالدقائق ⏱️)
                  </button>
                </div>
              </div>

              {testState === 'idle' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={clearLaneStudents}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-300 dark:border-gray-600 transition cursor-pointer shadow-2xs"
                    title="إفراغ الممرات للبدء مباشرة وتحديد المتسابقين بعد خط الوصول"
                  >
                    <span>🧹 ممرات فارغة</span>
                  </button>
                </div>
              )}
            </div>

            {/* Row 2: Class & Lane Size Selectors */}
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
                  className="px-3 py-2 text-xs sm:text-sm font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                >
                  {classes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Race Size Selector & Clear Names Button */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">عدد منافذ/ممرات السباق:</span>
                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-300 dark:border-gray-600 gap-0.5">
                  {([2, 3, 4, 6, 8] as const).map(num => (
                    <button
                      key={num}
                      disabled={testState !== 'idle'}
                      onClick={() => setLaneCount(num)}
                      className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all ${
                        laneCount === num
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'
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
                  title="تفريغ أسماء المتسابقين للبدء بتسجيل الوصول المباشر بالترتيب (الأول، الثاني، الثالث...)"
                >
                  🧹 تفريغ الأسماء
                </button>
              </div>
            </div>
          </div>

          {/* Main Stopwatch Header */}
          <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-white rounded-3xl shadow-xl border border-gray-700 relative overflow-hidden">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">
              {raceConfig.counterLabel}
            </div>

            {raceConfig.isMinutes ? (
              <div className="flex items-baseline justify-center font-mono font-black text-amber-400 drop-shadow-md my-2 flex-wrap text-center">
                <span className="text-4xl xs:text-5xl sm:text-7xl tracking-wider">
                  {Math.floor(elapsedTime / 60000).toString().padStart(2, '0')}:{Math.floor((elapsedTime % 60000) / 1000).toString().padStart(2, '0')}
                </span>
                <span className="text-xl xs:text-2xl sm:text-3xl text-amber-200/80 ms-1 font-mono">
                  .{Math.floor((elapsedTime % 1000) / 10).toString().padStart(2, '0')}
                </span>
                <span className="text-base xs:text-xl sm:text-2xl text-amber-100 font-sans font-bold ms-2">دقيقة</span>
              </div>
            ) : (
              <div className="text-4xl xs:text-5xl sm:text-7xl font-mono font-black tracking-wider text-amber-400 drop-shadow-md my-2">
                {formattedSeconds} <span className="text-xl sm:text-2xl font-bold text-gray-400">ثانية</span>
              </div>
            )}

            {/* SINGLE FINISH BUTTON (الزر الفريد لتسجيل الوصول المتتالي: الأول، الثاني، الثالث...) */}
            <div className="w-full max-w-2xl mx-auto my-3 px-1">
              <button
                type="button"
                onClick={recordNextFinisher}
                className="w-full inline-flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-gray-950 font-black rounded-3xl shadow-2xl shadow-amber-500/40 border-2 border-amber-200 transition-all transform active:scale-95 cursor-pointer text-base sm:text-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl animate-bounce">⏱️</span>
                  <div className="text-right">
                    <div className="text-[11px] font-black text-amber-950/80 uppercase tracking-wide">
                      زر تسجيل الوصول المتتالي:
                    </div>
                    <div className="text-sm sm:text-xl font-black text-gray-950 mt-0.5">
                      {testState === 'idle'
                        ? 'انقر هنا للبدء والانطلاق 🚀'
                        : nextUnfinishedIndex !== -1
                        ? `تسجيل وصول المتسابق: ${getArabicRankName(nextUnfinishedIndex)}`
                        : `تسجيل وصول متسابق جديد (#${selectedRunners.length + 1})`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-gray-950 text-amber-300 px-3 py-1.5 rounded-2xl text-xs sm:text-sm font-mono font-black border border-amber-400/50 shadow-inner">
                    {formattedSeconds}ث
                  </span>
                  <span className="text-[11px] sm:text-xs font-black bg-amber-950 text-amber-100 px-2.5 py-1.5 rounded-xl shadow-xs">
                    تسجيل ⚡
                  </span>
                </div>
              </button>
            </div>

            {/* Selected Runners / Lanes inside Live Timer Window */}
            {selectedRunners.length > 0 && (
              <div className="w-full max-w-3xl my-3 p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                <div className="text-xs font-bold text-amber-300 text-center mb-2.5 flex items-center justify-center gap-1.5 flex-wrap">
                  <UserGroupIcon className="w-4 h-4 text-amber-400" />
                  <span>نتائج ممارسي/متسابقي السباق (الوصول بالترتيب: الأول، الثاني، الثالث...):</span>
                </div>
                <div className={`grid grid-cols-2 ${selectedRunners.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} ${selectedRunners.length === 4 ? 'md:grid-cols-4' : ''} gap-3`}>
                  {selectedRunners.map((runner) => {
                    const student = students.find(s => String(s.numeroEleve) === String(runner.studentNumber));

                    return (
                      <div key={runner.laneIndex} className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            if (testState === 'idle') {
                              startTimer();
                            } else {
                              handleRunnerTileClick(runner.laneIndex);
                            }
                          }}
                          className={`w-full flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all transform active:scale-95 cursor-pointer shadow-md text-center ${
                            runner.isFinished
                              ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/30 ring-2 ring-emerald-400'
                              : testState === 'running'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-100 hover:bg-amber-500/30 animate-pulse'
                              : 'bg-white/10 border-white/20 text-gray-200 hover:bg-white/20 hover:border-amber-400'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full text-[11px] font-mono font-bold text-amber-300 mb-1">
                            <span className="font-black text-amber-200 truncate">
                              {getArabicRankName(runner.laneIndex - 1)}
                            </span>
                            {student?.orderIndex && (
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] shrink-0">#{student.orderIndex}</span>
                            )}
                          </div>

                          <div className="flex items-center justify-center gap-1.5 my-1">
                            {student && (
                              <StudentAvatar
                                photoUrl={student.photoUrl}
                                nomEleve={student.nomEleve}
                                sexe={student.sexe}
                                size="xs"
                              />
                            )}
                            <div className="text-sm font-black text-white truncate max-w-[120px]">
                              {student ? student.nomEleve : `المتسابق (${getArabicRankName(runner.laneIndex - 1)})`}
                            </div>
                          </div>

                          {/* Quick student picker dropdown for idle mode, pause, or when runner finished */}
                          {students.length > 0 && (testState === 'idle' || testState === 'paused' || runner.isFinished) && (
                            <div className="w-full mt-1.5" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={runner.studentNumber}
                                onChange={(e) => handleAssignStudentToLane(runner.laneIndex, e.target.value)}
                                className={`w-full text-[11px] font-bold py-1.5 px-1 rounded-xl text-center cursor-pointer focus:outline-none transition-all ${
                                  runner.studentNumber
                                    ? 'bg-gray-900/90 text-amber-200 border border-amber-500/40'
                                    : runner.isFinished
                                    ? 'bg-amber-400 text-gray-950 font-black border-2 border-amber-300 animate-pulse shadow-sm'
                                    : 'bg-gray-900/80 text-gray-300 border border-white/20'
                                }`}
                              >
                                <option value="">
                                  {runner.isFinished ? `👉 اختر التلميذ (${getArabicRankName(runner.laneIndex - 1)})` : '-- اختر تلميذاً --'}
                                </option>
                                {untestedStudents.length > 0 && (
                                  <optgroup label={`⭐ لم يختبروا بعد (${untestedStudents.length})`}>
                                    {untestedStudents.map(s => {
                                      const isAssigned = selectedRunners.some(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(s.numeroEleve));
                                      const numDisplay = getStudentNumberDisplay(s);
                                      return (
                                        <option key={s.numeroEleve} value={s.numeroEleve} disabled={isAssigned}>
                                          #{numDisplay} - {s.nomEleve} {isAssigned ? '(مسند لمركز آخر)' : ''}
                                        </option>
                                      );
                                    })}
                                  </optgroup>
                                )}
                                {testedStudents.length > 0 && (
                                  <optgroup label={`🔄 سبق اختبارهم (${testedStudents.length})`}>
                                    {testedStudents.map(({ student: s, prevTime }) => {
                                      const isAssigned = selectedRunners.some(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(s.numeroEleve));
                                      const numDisplay = getStudentNumberDisplay(s);
                                      return (
                                        <option key={s.numeroEleve} value={s.numeroEleve} disabled={isAssigned}>
                                          #{numDisplay} - {s.nomEleve} ({raceConfig.isMinutes ? `${formatSecondsToMinSec(prevTime)} د` : `${prevTime}ث`}) {isAssigned ? '(مسند لمركز آخر)' : ''}
                                        </option>
                                      );
                                    })}
                                  </optgroup>
                                )}
                              </select>
                            </div>
                          )}

                          <div className="mt-1 pt-1 border-t border-white/20 w-full text-center">
                            {runner.isFinished ? (
                              <div className="text-base font-mono font-black text-white">
                                ⚡ {raceConfig.isMinutes ? `${formatSecondsToMinSec(runner.recordedTime)} د` : `${runner.recordedTime?.toFixed(2)} ث`}
                              </div>
                            ) : testState === 'running' ? (
                              <div className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1">
                                <span>انقر للتسجيل</span>
                                <CheckCircleIcon className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="text-[11px] text-emerald-300 font-bold flex items-center justify-center gap-1">
                                <PlayIcon className="w-3.5 h-3.5 fill-current" />
                                <span>انقر للانطلاق 🚀</span>
                              </div>
                            )}
                          </div>
                        </button>
                        
                        {/* Tooltip on hover */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 text-xs font-black bg-gray-900 text-white px-3 py-1 rounded-xl shadow-xl whitespace-nowrap z-50 border border-gray-700">
                          {runner.isFinished 
                            ? `الزمن: ${raceConfig.isMinutes ? `${formatSecondsToMinSec(runner.recordedTime)} د` : `${runner.recordedTime}ث`} (اضغط للإلغاء)` 
                            : testState === 'idle'
                            ? 'انقر لبدء السباق والانطلاق'
                            : `تسجيل توقيت ${student ? student.nomEleve : `الممر #${runner.laneIndex}`}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main Action Buttons (Optimized for Mobile with Clear Labels and Touch Targets) */}
            <div className="flex items-center gap-2.5 sm:gap-4 mt-2 flex-wrap justify-center w-full">
              {testState === 'idle' && (
                <button
                  onClick={startTimer}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer text-sm sm:text-base"
                >
                  <PlayIcon className="w-6 h-6 fill-current" />
                  <span>بدء الانطلاق 🚀</span>
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
                <span className="hidden xs:inline">تصفير 🔄</span>
              </button>

              <button
                onClick={prepareNextRun}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95 cursor-pointer text-xs sm:text-sm"
              >
                <span>الفوج التالي ⏩</span>
                <ChevronRightIcon className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>

          {/* DYNAMIC VIEW: SELECTION GRID (WHEN IDLE) VS ACTIVE RUNNER CARDS (WHEN RUNNING/PAUSED/FINISHED) */}

          {(() => {
            const hasFinishedRunners = selectedRunners.some(r => r.isFinished);
            const hasUnassignedFinished = selectedRunners.some(r => r.isFinished && !r.studentNumber);
            const showLanesView = testState !== 'idle' || hasFinishedRunners || idleViewMode === 'lanes';

            return (
              <div className="space-y-4">
                {/* View Mode Toggle & Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                      <UserGroupIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span>
                        {showLanesView
                          ? `مخطط ممرات السباق (${laneCount} ممرات) - تسجيل الوصول وتحديد الأسماء:`
                          : `شبكة جميع تلاميذ القسم (${students.length} تلميذ):`}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {showLanesView
                        ? 'اضغط على الممر فور وصول التلميذ لتسجيل توقيته، ثم اختر اسمه من القائمة المنسدلة لحفظ النتيجة في سجله.'
                        : 'انقر على أسماء التلاميذ لتعيينهم في الممرات، أو انتقل لمخطط الممرات للانطلاق فوراً.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* View switcher when idle and no recorded race yet */}
                    {testState === 'idle' && !hasFinishedRunners && (
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-2xl border border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => setIdleViewMode('lanes')}
                          className={`px-3 py-1.5 text-xs font-black rounded-xl transition cursor-pointer ${
                            idleViewMode === 'lanes'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          🏁 مخطط الممرات
                        </button>
                        <button
                          onClick={() => setIdleViewMode('grid')}
                          className={`px-3 py-1.5 text-xs font-black rounded-xl transition cursor-pointer ${
                            idleViewMode === 'grid'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          👥 شبكة القسم ({students.length})
                        </button>
                      </div>
                    )}

                    <span className="text-xs font-bold px-3 py-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-300 dark:border-amber-800">
                      المحددون: {activeSelectedRunners.length} / {laneCount}
                    </span>
                  </div>
                </div>

                {/* Banner when race is finished or paused */}
                {hasFinishedRunners && (
                  <div className={`p-4 rounded-2xl border text-right transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    hasUnassignedFinished
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-100 shadow-md'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-100 shadow-md'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{hasUnassignedFinished ? '⚠️' : '🎉'}</span>
                      <div>
                        <div className="text-sm font-black">
                          {hasUnassignedFinished
                            ? '🏁 انتهى السباق! يرجى اختيار اسم المتسابق لكل ممر بالأسفل لحفظ التوقيت في سجله:'
                            : '🎉 تم حفظ أزمنة جميع الممرات في سجلات التلاميذ بنجاح!'}
                        </div>
                        <div className="text-xs opacity-90 mt-0.5">
                          {hasUnassignedFinished
                            ? 'اختر التلميذ المقابل للممر من القائمة المنسدلة وسيتم ربط التوقيت والسرعة فوراً بقاعدة البيانات.'
                            : 'يمكنك النقر على "السباق التالي ⏩" للانتقال تلقائياً للدفعة التالية وتصفير العداد.'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={prepareNextRun}
                        className="px-4 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>السباق التالي ⏩</span>
                      </button>
                      <button
                        onClick={clearLaneStudents}
                        className="px-3 py-2 text-xs font-bold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-300 dark:border-gray-600 transition cursor-pointer"
                        title="إفراغ الممرات لبدء سباق جديد بدون أسماء مسبقة"
                      >
                        <span>🧹 ممرات فارغة</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* MAIN CONTENT: LANES CARDS OR STUDENT GRID */}
                {showLanesView ? (
                  /* ACTIVE RUNNERS / LANES CARDS */
                  <div className={`grid grid-cols-1 ${selectedRunners.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} ${selectedRunners.length === 4 ? 'lg:grid-cols-4' : ''} gap-4`}>
                    {selectedRunners.map(runner => {
                      const student = students.find(s => String(s.numeroEleve) === String(runner.studentNumber));
                      const speedKmH = runner.recordedTime ? ((raceConfig.distanceMeters / runner.recordedTime) * 3.6).toFixed(1) : null;
                      const runnerScore = (student && runner.recordedTime !== undefined)
                        ? calculateScore(runner.recordedTime, raceConfig.scale, student.sexe || 'M', true)
                        : undefined;

                      return (
                        <div
                          key={runner.laneIndex}
                          className={`relative flex flex-col justify-between p-5 rounded-3xl border-2 text-right transition-all shadow-lg select-none min-h-[200px] ${
                            runner.isFinished
                              ? 'bg-gradient-to-b from-emerald-500/10 to-emerald-700/10 dark:from-emerald-950/40 dark:to-emerald-900/30 border-emerald-500 dark:border-emerald-500 shadow-emerald-600/15'
                              : 'bg-white dark:bg-gray-800 border-amber-500 dark:border-amber-500 shadow-amber-500/10'
                          }`}
                        >
                          {/* Top Bar inside card */}
                          <div className="flex items-center justify-between w-full pb-2 border-b border-gray-200 dark:border-gray-700">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                              runner.isFinished 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}>
                              الممر #{runner.laneIndex}
                            </span>

                            {student ? (
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                student.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              }`}>
                                {student.sexe === 'F' ? 'أنثى' : 'ذكر'}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400 font-bold">
                                {runner.isFinished ? '⚠️ غير محدد' : 'ممر شاغر'}
                              </span>
                            )}
                          </div>

                          {/* Main Student Name & Status */}
                          <div className="my-2">
                            <div className="text-base sm:text-lg font-black truncate text-gray-900 dark:text-white">
                              {student ? student.nomEleve : `متسابق الممر #${runner.laneIndex}`}
                            </div>
                            {!student && (
                              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                {runner.isFinished ? '⚠️ يرجى اختيار التلميذ لهذا الممر أدناه:' : 'جاهز - يمكنك الانطلاق واختيار الاسم بعد الوصول 🏁'}
                              </div>
                            )}
                          </div>

                          {/* Recorded Time Display or Click to Finish Button */}
                          {runner.isFinished ? (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-3">
                              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                                <div>
                                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">الزمن المسجل</div>
                                  <div className="text-2xl font-mono font-black text-emerald-800 dark:text-emerald-200">
                                    ⚡ {raceConfig.isMinutes ? `${formatSecondsToMinSec(runner.recordedTime)} دقيقة` : `${runner.recordedTime?.toFixed(2)} ثانية`}
                                  </div>
                                  {runnerScore !== undefined && (
                                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                                      النقطة المستحقة: <span className="font-black text-sm">{runnerScore} / 20</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-left flex flex-col items-end gap-1">
                                  <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-white/70 dark:bg-emerald-900/60 px-2 py-0.5 rounded-lg">
                                    {speedKmH} كم/س
                                  </span>
                                  <button
                                    onClick={() => handleRunnerTileClick(runner.laneIndex)}
                                    className="text-[11px] font-bold text-red-600 dark:text-red-400 underline hover:no-underline cursor-pointer"
                                  >
                                    إلغاء التوقيت 🔄
                                  </button>
                                </div>
                              </div>

                              {/* Student selection dropdown for this lane/time */}
                              <div className={`p-2.5 rounded-2xl border transition-all ${
                                runner.studentNumber 
                                  ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                  : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/40'
                              }`}>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                                  <span>{student ? '👤 تلميذ هذا الممر:' : '👉 اختر تلميذ هذا التوقيت:'}</span>
                                  {student && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✅ تم الحفظ في السجل</span>
                                  )}
                                </label>
                                <select
                                  value={runner.studentNumber}
                                  onChange={(e) => handleAssignStudentToLane(runner.laneIndex, e.target.value)}
                                  className={`w-full text-xs font-bold py-2 px-3 rounded-xl border transition-all cursor-pointer ${
                                    runner.studentNumber
                                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-emerald-500 ring-2 ring-emerald-500/20'
                                      : 'bg-amber-100 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 border-amber-400 ring-2 ring-amber-400/50 font-black animate-pulse'
                                  }`}
                                >
                                  <option value="">-- اضغط لاختيار تلميذ {currentTestType === 'relay' ? 'لهذا المركز' : `الممر #${runner.laneIndex}`} لهذا التوقيت --</option>
                                  {untestedStudents.length > 0 && (
                                    <optgroup label={`⭐ تلاميذ لم يختبروا بعد (${untestedStudents.length})`}>
                                      {untestedStudents.map(s => {
                                        const isAssigned = selectedRunners.some(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(s.numeroEleve));
                                        return (
                                          <option key={s.numeroEleve} value={s.numeroEleve} disabled={isAssigned}>
                                            #{getStudentNumberDisplay(s)} - {s.nomEleve} ({s.sexe === 'F' ? 'أنثى' : 'ذكر'}) {isAssigned ? '(بمركز آخر)' : ''}
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  )}
                                  {testedStudents.length > 0 && (
                                    <optgroup label={`🔄 تلاميذ سبق اختبارهم (${testedStudents.length})`}>
                                      {testedStudents.map(({ student: s, prevTime }) => {
                                        const isAssigned = selectedRunners.some(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(s.numeroEleve));
                                        return (
                                          <option key={s.numeroEleve} value={s.numeroEleve} disabled={isAssigned}>
                                            #{getStudentNumberDisplay(s)} - {s.nomEleve} ({s.sexe === 'F' ? 'أنثى' : 'ذكر'}) [سابقاً: {prevTime}ث] {isAssigned ? '(بمركز آخر)' : ''}
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
                              {/* Idle / Running pre-race assignment dropdown */}
                              {testState === 'idle' && (
                                <div className="mb-2">
                                  <select
                                    value={runner.studentNumber}
                                    onChange={(e) => handleAssignStudentToLane(runner.laneIndex, e.target.value)}
                                    className="w-full text-xs font-bold py-1.5 px-2 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white cursor-pointer"
                                  >
                                    <option value="">-- اضغط لتعيين تلميذ مسبقاً (اختياري) --</option>
                                    {untestedStudents.map(s => {
                                      const isAssigned = selectedRunners.some(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(s.numeroEleve));
                                      return (
                                        <option key={s.numeroEleve} value={s.numeroEleve} disabled={isAssigned}>
                                          #{getStudentNumberDisplay(s)} - {s.nomEleve} {isAssigned ? '(بمركز آخر)' : ''}
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
                                className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl flex items-center justify-between transition cursor-pointer shadow-md active:scale-95"
                              >
                                <span className="text-xs sm:text-sm">
                                  {testState === 'idle' ? 'بدء السباق 🚀' : 'اضغط للتسجيل عند الوصول 🏁'}
                                </span>
                                <CheckCircleIcon className="w-6 h-6 animate-pulse" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* FULL STUDENT GRID FOR CLASS SELECTION */
                  <div>
                    {students.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/60 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                        <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <h4 className="text-base font-black text-gray-800 dark:text-gray-200 mb-1">
                          لا توجد أسماء تلاميذ في القسم المحدد ({selectedClass || 'لا يوجد'})
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                          يرجى اختيار قسم آخر يتضمن تلاميذ من القائمة أعلاه، أو إضافة لائحة التلاميذ لهذا القسم أولاً.
                        </p>
                        {classes.length > 1 && (
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">أقسام متوفرة:</span>
                            {classes.filter(c => c !== selectedClass).map(cls => (
                              <button
                                key={cls}
                                onClick={() => setSelectedClass(cls)}
                                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition"
                              >
                                الانتقال لقسم {cls}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {students.map((student, idx) => {
                          const selectedIdx = selectedRunners.findIndex(r => String(r.studentNumber) === String(student.numeroEleve));
                          const isSelected = selectedIdx >= 0;
                          const prevResult = physicalResults.find(r => String(r.numeroEleve) === String(student.numeroEleve));
                          const prevVal = (prevResult as any)?.[raceConfig.field];
                          const hasPrevTime = prevVal !== undefined && prevVal > 0;

                          return (
                            <button
                              key={student.numeroEleve}
                              onClick={() => handleToggleStudentSelection(student.numeroEleve)}
                              className={`relative flex flex-col p-3 rounded-2xl border text-right transition-all transform active:scale-95 cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500 shadow-md ring-2 ring-amber-500'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-xs'
                              }`}
                            >
                              {/* Selected Badge */}
                              {isSelected && (
                                <div className="absolute top-2 left-2 bg-amber-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                                  ممر #{selectedIdx + 1}
                                </div>
                              )}

                              {/* Student Number & Gender */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500">
                                  #{student.orderIndex || idx + 1}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${student.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
                                  {student.sexe === 'F' ? 'أنثى' : 'ذكر'}
                                </span>
                              </div>

                              {/* Name */}
                              <div className="font-extrabold text-xs text-gray-900 dark:text-white truncate mb-1">
                                {student.nomEleve}
                              </div>

                              {/* Previous result tag */}
                              {hasPrevTime && (
                                <div className="mt-2 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md self-start border border-emerald-200 dark:border-emerald-800">
                                  ⚡ {raceConfig.isMinutes ? `${formatSecondsToMinSec(prevVal)} د` : `${prevVal?.toFixed(2)} ث`}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Results Table Section */}
          <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-amber-500" />
                <span>جدول نتائج {raceConfig.title} بالقسم ({completedResults.length} تلميذ/ة):</span>
              </h3>
            </div>

            {completedResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed">
                لم يتم تسجيل أي زمن في {raceConfig.title} لهذا القسم بعد.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="p-2.5 w-12">#</th>
                      <th className="p-2.5 text-right">الاسم والنسب</th>
                      <th className="p-2.5 w-16">الجنس</th>
                      <th className="p-2.5 w-32">{raceConfig.isMinutes ? 'الزمن (دقيقة : ثانية)' : 'الزمن (ثانية)'}</th>
                      <th className="p-2.5 w-24">السرعة (كم/س)</th>
                      <th className="p-2.5 w-24">النقطة (/20)</th>
                      <th className="p-2.5 w-16">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {completedResults.map(({ student, timeSec, score }, idx) => {
                      const speedKmH = timeSec ? ((raceConfig.distanceMeters / timeSec) * 3.6).toFixed(1) : '-';

                      return (
                        <tr key={student.numeroEleve} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors">
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
                          <td className="p-2 font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                            {raceConfig.isMinutes ? `${formatSecondsToMinSec(timeSec || 0)} د` : `${timeSec?.toFixed(2)} ث`}
                          </td>
                          <td className="p-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {speedKmH} كم/س
                          </td>
                          <td className="p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {score !== undefined ? `${score} / 20` : '-'}
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => handleDeleteResult(student.numeroEleve)}
                              title="حذف هذا الرقم"
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 rounded-lg transition"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
