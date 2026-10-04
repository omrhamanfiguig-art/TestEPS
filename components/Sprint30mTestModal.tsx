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
  SparklesIcon,
  PencilSquareIcon,
  ChevronDownIcon
} from './Icons';
import { StudentAvatar } from './StudentAvatar';
import { 
  calculateScore, 
  formatSecondsToMinSec,
  SPEED_SCALE_30M, 
  SPEED_SCALE_60M, 
  SPEED_SCALE_80M, 
  SPEED_SCALE_100M, 
  ENDURANCE_SCALE_1000M 
} from '../utils/ScoringConstants';
import { startBluetoothKeepAlive, stopBluetoothKeepAlive } from '../utils/audioHelper';

export type RaceTestType = 'speed' | 'speed-60' | 'speed-80' | 'speed-100' | 'endurance' | 'relay';

interface Sprint30mTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass: string;
  classList?: (string | any)[];
  onDataSaved?: () => void;
  testType?: RaceTestType;
}

export interface SelectedRunner {
  laneIndex: number; // 1, 2, 3, 4 ...
  studentNumber: string;
  recordedTime?: number; // seconds with 2 decimal places e.g. 4.35
  isFinished: boolean;
  arrivalOrder?: number; // 1 = الأول, 2 = الثاني, 3 = الثالث, 4 = الرابع
  observerId?: 1 | 2; // رقم المراقب/الأستاذ المسند له (1 أو 2)
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
  // Two main sections requested: لجنة الانطلاق (Start Committee) & لجنة الوصول (Finish Committee)
  const [activeSection, setActiveSection] = useState<'start_committee' | 'finish_committee'>('start_committee');

  const [currentTestType, setCurrentTestType] = useState<RaceTestType>(testType);
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [classes, setClasses] = useState<string[]>(() => normalizeClassNames(classList));
  
  // Lane count: either 2, 3, or 4 runners (default 3 or 4)
  const [laneCount, setLaneCount] = useState<number>(() => (testType === 'relay' || testType === 'endurance' ? 4 : 3));
  
  // Observers Configuration (لجنة الانطلاق والوصول: مراقب واحد أو مراقبان)
  const [observerCount, setObserverCount] = useState<1 | 2>(1);
  const [observer1Name, setObserver1Name] = useState<string>('الأستاذ 1');
  const [observer2Name, setObserver2Name] = useState<string>('الأستاذ 2');
  const [finishViewTab, setFinishViewTab] = useState<'both' | 'obs1' | 'obs2'>('both');

  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [physicalResults, setPhysicalResults] = useState<PhysicalTests[]>([]);

  // Search & filter state in Start Committee
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNTESTED' | 'TESTED'>('UNTESTED');

  // Edit states in Finish Committee (مع إمكانية التعديل)
  const [editingLaneIndex, setEditingLaneIndex] = useState<number | null>(null);
  const [tempEditTime, setTempEditTime] = useState<string>('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Results Table Edit & Delete Confirmation States
  const [studentToDelete, setStudentToDelete] = useState<{ numeroEleve: string; nomEleve: string } | null>(null);
  const [tableStudentToEdit, setTableStudentToEdit] = useState<{ numeroEleve: string; nomEleve: string; currentTime: number } | null>(null);
  const [tableEditTimeInput, setTableEditTimeInput] = useState<string>('');

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
          subtitle: 'تحديد متسابقي الفوج آلياً وقياس وصول المتسابقين بدقة وحساب النقطة',
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
          subtitle: 'تحديد متسابقي الفوج آلياً وقياس وصول المتسابقين بدقة وحساب النقطة',
          counterLabel: 'عداد وقت سباق السرعة 80م (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesse80m' as const,
          distanceMeters: 80,
          scale: SPEED_SCALE_80M,
          scoreField: 'scoreVitesse' as const,
          isMinutes: false
        };
      case 'speed-100':
        return {
          title: 'اختبار الجري السريع (100 م)',
          subtitle: 'تحديد متسابقي الفوج آلياً وقياس وصول المتسابقين بدقة وحساب النقطة',
          counterLabel: 'عداد وقت سباق السرعة 100م (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesse100m' as const,
          distanceMeters: 100,
          scale: SPEED_SCALE_100M,
          scoreField: 'scoreVitesse' as const,
          isMinutes: false
        };
      case 'endurance':
        return {
          title: 'اختبار سباق السرعة المتوسطة (التحمل 1000م / 600م)',
          subtitle: 'تحديد التوقيت بالدقائق والثواني وترتيب الواصلين تلقائياً',
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
          title: 'اختبار سباق التتابع (Relay Race 4x100m)',
          subtitle: 'تحديد المتسابقين الأربعة ولائحة ترتيب الوصول وحساب التوقيت',
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
          subtitle: 'لجنة الانطلاق لتحديد المتسابقين ولجنة الوصول للتحديد التلقائي للمراكز',
          counterLabel: 'عداد وقت سباق السرعة 30م (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesse30m' as const,
          distanceMeters: 30,
          scale: SPEED_SCALE_30M,
          scoreField: 'scoreVitesse' as const,
          isMinutes: false
        };
    }
  }, [currentTestType]);

  // Selected Runners for current race heat
  const [selectedRunners, setSelectedRunners] = useState<SelectedRunner[]>([
    { laneIndex: 1, studentNumber: '', isFinished: false, observerId: 1 },
    { laneIndex: 2, studentNumber: '', isFinished: false, observerId: 1 },
    { laneIndex: 3, studentNumber: '', isFinished: false, observerId: 2 },
  ]);

  // Stopwatch state
  const [testState, setTestState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  // Audio Context for beeps & whistle
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

  const playStartWhistle = () => {
    // Sharp start whistle sound
    playBeep(1200, 0.25, 'triangle');
    setTimeout(() => playBeep(1500, 0.35, 'square'), 80);
  };

  // Load classes
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

      setSelectedClass(prev => {
        if (prev && names.includes(prev)) return prev;
        if (initialClass && names.includes(initialClass)) return initialClass;
        return names.length > 0 ? names[0] : '';
      });
    };
    updateClasses();
  }, [classList, initialClass]);

  // Load class students & results
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

      // Populate initial heat if empty
      setSelectedRunners(prev => {
        const untested = normalizedStudents.filter(s => {
          const res = normalizedPhys.find(r => String(r.numeroEleve) === String(s.numeroEleve));
          const val = (res as any)?.[raceConfig.field];
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
            isFinished: false,
            arrivalOrder: undefined
          };
        });
      });
    } catch (err) {
      console.error('Error loading class data for race:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const cls = selectedClass || initialClass;
      if (cls) loadClassData(cls);
      resetTimer();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedClass) {
      loadClassData(selectedClass);
      resetTimer();
    }
  }, [selectedClass]);

  useEffect(() => {
    const handleDbUpdate = () => {
      if (selectedClass) loadClassData(selectedClass);
    };
    window.addEventListener('dbUpdated', handleDbUpdate);
    return () => window.removeEventListener('dbUpdated', handleDbUpdate);
  }, [selectedClass]);

  // Adjust lanes when laneCount changes
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
        const defaultObs: 1 | 2 = (laneCount <= 2) ? (i === 1 ? 1 : 2) : (i <= Math.ceil(laneCount / 2) ? 1 : 2);
        if (existing) {
          newRunners.push({
            ...existing,
            observerId: existing.observerId || defaultObs
          });
        } else {
          const candidate = pool.find(s => !newRunners.some(r => String(r.studentNumber) === String(s.numeroEleve)));
          newRunners.push({
            laneIndex: i,
            studentNumber: candidate ? String(candidate.numeroEleve) : '',
            isFinished: false,
            arrivalOrder: undefined,
            observerId: defaultObs
          });
        }
      }
      return newRunners;
    });
  }, [laneCount, students, raceConfig.field]);

  // Timer interval loop
  useEffect(() => {
    if (testState === 'running') {
      const interval = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 16);
      return () => clearInterval(interval);
    }
  }, [testState]);

  // Grouped tested & untested students
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

  // Helper for rank name
  const getArabicRankName = (orderIndex: number) => {
    const ranks = [
      'الأول 🥇',
      'الثاني 🥈',
      'الثالث 🥉',
      'الرابع 🎖️',
      'الخامس 🏅',
      'السادس',
      'السابع',
      'الثامن'
    ];
    return ranks[orderIndex] || `المركز ${orderIndex + 1}`;
  };

  const getStudentNumberDisplay = (s: StudentIdentity) => {
    if (s.orderIndex) return String(s.orderIndex);
    const idx = students.findIndex(st => String(st.numeroEleve) === String(s.numeroEleve));
    return idx >= 0 ? String(idx + 1) : '?';
  };

  // Helper for quick feedback toast
  const showFeedback = (msg: string) => {
    setSaveFeedback(msg);
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // Start timer & audio
  const startTimer = () => {
    startBluetoothKeepAlive(audioCtxRef.current);
    playStartWhistle();
    startTimeRef.current = Date.now() - elapsedTime;
    setTestState('running');
  };

  // Launch race from Start Committee: starts timer & switches automatically to Finish Committee
  const handleLaunchFromStartCommittee = () => {
    startTimer();
    setActiveSection('finish_committee');
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
    setEditingLaneIndex(null);
    setSelectedRunners(prev => prev.map(r => ({ 
      ...r, 
      recordedTime: undefined, 
      isFinished: false,
      arrivalOrder: undefined 
    })));
  };

  // Save race time to db
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

  // Delete result from DB
  const handleDeleteResult = async (numeroEleve: string) => {
    const updatedPhys = physicalResults.map(p => {
      if (String(p.numeroEleve) === String(numeroEleve)) {
        const copy: any = { ...p };
        delete copy[raceConfig.field];
        delete copy[raceConfig.scoreField];
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

  // Save edited time from results table
  const handleSaveTableEditTime = async () => {
    if (!tableStudentToEdit) return;
    const parsed = parseFloat(tableEditTimeInput);
    if (isNaN(parsed) || parsed <= 0) {
      showFeedback('يرجى إدخال زمن صحيح بالثواني (مثال: 4.25)');
      return;
    }
    const timeSec = Number(parsed.toFixed(2));
    await saveRaceTime(tableStudentToEdit.numeroEleve, timeSec);
    setTableStudentToEdit(null);
    showFeedback(`تم تعديل نتيجة «${tableStudentToEdit.nomEleve}» إلى ${timeSec}ث بنجاح.`);
  };

  // Automatic Ranking Calculation:
  // Sorts runners who have finished by their recorded time (fastest first)
  // Automatically sets arrivalOrder (1 = الأول, 2 = الثاني, 3 = الثالث, 4 = الرابع)
  const rankedRunners = useMemo(() => {
    const finished = selectedRunners
      .filter(r => r.isFinished && r.recordedTime !== undefined && r.recordedTime > 0)
      .slice()
      .sort((a, b) => (a.recordedTime || 0) - (b.recordedTime || 0));

    return finished.map((runner, index) => {
      const student = students.find(s => String(s.numeroEleve) === String(runner.studentNumber));
      const speedKmH = runner.recordedTime ? ((raceConfig.distanceMeters / runner.recordedTime) * 3.6).toFixed(1) : null;
      const score = (student && runner.recordedTime !== undefined)
        ? calculateScore(runner.recordedTime, raceConfig.scale, student.sexe || 'M', true)
        : undefined;

      return {
        ...runner,
        rankOrder: index + 1,
        rankTitle: getArabicRankName(index),
        student,
        speedKmH,
        score
      };
    });
  }, [selectedRunners, students, raceConfig]);

  // How many runners have finished so far
  const finishedCount = rankedRunners.length;
  const nextFinisherRankTitle = getArabicRankName(finishedCount);

  // Single-button finisher recording logic (تسجيل الوصول المتتالي للسباق: الأول، ثم الثاني، ثم الثالث...)
  const recordNextFinisher = async () => {
    if (testState === 'idle') {
      startTimer();
      return;
    }

    const timeInSec = Number((elapsedTime / 1000).toFixed(2));
    playBeep(1318.5, 0.15, 'sine');

    // Find next unfinished runner in lane order
    let targetIdx = selectedRunners.findIndex(r => !r.isFinished);

    if (targetIdx === -1) {
      // Auto expand lane if more finishers arrived
      const newLaneIndex = selectedRunners.length + 1;
      const newRunner: SelectedRunner = {
        laneIndex: newLaneIndex,
        studentNumber: '',
        recordedTime: timeInSec,
        isFinished: true,
        arrivalOrder: finishedCount + 1
      };
      setSelectedRunners(prev => [...prev, newRunner]);
      setLaneCount(prev => Math.max(prev, newLaneIndex));
      showFeedback(`تم تسجيل وصول متسابق جديد #${newLaneIndex} بتوقيت ${timeInSec}ث`);
    } else {
      const runner = selectedRunners[targetIdx];
      const newArrivalOrder = finishedCount + 1;
      
      const updated = selectedRunners.map((r, idx) =>
        idx === targetIdx ? { ...r, recordedTime: timeInSec, isFinished: true, arrivalOrder: newArrivalOrder } : r
      );
      setSelectedRunners(updated);

      if (runner.studentNumber) {
        await saveRaceTime(String(runner.studentNumber), timeInSec);
      }

      showFeedback(`تم تحديد ${getArabicRankName(newArrivalOrder - 1)} تلقائياً: ${timeInSec}ث`);

      if (updated.every(r => r.isFinished)) {
        setTestState('paused');
      }
    }
  };

  // Toggle runner observer assignment between 1 and 2
  const handleToggleRunnerObserver = (laneIndex: number) => {
    setSelectedRunners(prev => prev.map(r => {
      if (r.laneIndex === laneIndex) {
        const nextObs: 1 | 2 = (r.observerId || 1) === 1 ? 2 : 1;
        return { ...r, observerId: nextObs };
      }
      return r;
    }));
  };

  // Equal split assignment for observers
  const handleEqualSplitObservers = () => {
    setSelectedRunners(prev => prev.map((r, idx) => ({
      ...r,
      observerId: (idx < Math.ceil(prev.length / 2)) ? 1 : 2
    })));
    showFeedback('تم توزيع المتسابقين بالتساوي بين المراقبين');
  };

  // Dedicated finisher recording logic for dual observers
  const recordNextFinisherForObserver = async (targetObserverId: 1 | 2) => {
    if (testState === 'idle') {
      startTimer();
      return;
    }

    const timeInSec = Number((elapsedTime / 1000).toFixed(2));
    playBeep(targetObserverId === 1 ? 1318.5 : 1568, 0.15, 'sine');

    // Find next unfinished runner assigned to this observer
    const targetIdx = selectedRunners.findIndex(r => !r.isFinished && (r.observerId || 1) === targetObserverId);

    if (targetIdx !== -1) {
      const runner = selectedRunners[targetIdx];
      const newArrivalOrder = finishedCount + 1;

      const updated = selectedRunners.map((r, idx) =>
        idx === targetIdx ? { ...r, recordedTime: timeInSec, isFinished: true, arrivalOrder: newArrivalOrder } : r
      );
      setSelectedRunners(updated);

      if (runner.studentNumber) {
        await saveRaceTime(String(runner.studentNumber), timeInSec);
      }

      showFeedback(`تم تسجيل وصول متسابق (${targetObserverId === 1 ? observer1Name : observer2Name}): ${timeInSec}ث`);

      if (updated.every(r => r.isFinished)) {
        setTestState('paused');
      }
    } else {
      showFeedback(`جميع متسابقي ${targetObserverId === 1 ? observer1Name : observer2Name} وصلوا بالفعل!`);
    }
  };

  // Click on a specific lane tile to record arrival or cancel
  const handleLaneTileClick = async (laneIndex: number) => {
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

      if (runner.studentNumber) {
        await saveRaceTime(String(runner.studentNumber), timeInSec);
      }

      showFeedback(`تم تسجيل وصول الممر #${laneIndex} (${getArabicRankName(newArrivalOrder - 1)})`);

      if (updated.every(r => r.isFinished)) {
        setTestState('paused');
      }
    } else {
      // Undo recorded time
      playBeep(440, 0.1);
      setSelectedRunners(prev => prev.map(r => r.laneIndex === laneIndex ? { ...r, recordedTime: undefined, isFinished: false, arrivalOrder: undefined } : r));
      if (runner.studentNumber) {
        await handleDeleteResult(String(runner.studentNumber));
      }
      showFeedback(`تم إلغاء توقيت الممر #${laneIndex}`);
    }
  };

  // Assign or change student for a lane (Start Committee or Finish Committee)
  const handleAssignStudentToLane = async (laneIndex: number, studentNumber: string) => {
    const runner = selectedRunners.find(r => r.laneIndex === laneIndex);
    if (!runner) return;

    const oldStudentNumber = runner.studentNumber;

    setSelectedRunners(prev => prev.map(r => {
      if (r.laneIndex === laneIndex) {
        return { ...r, studentNumber };
      }
      // If student was picked in another lane, clear from other lane
      if (studentNumber && String(r.studentNumber) === String(studentNumber) && r.laneIndex !== laneIndex) {
        return { ...r, studentNumber: '' };
      }
      return r;
    }));

    // If time was recorded, persist changes
    if (runner.isFinished && runner.recordedTime !== undefined) {
      if (oldStudentNumber && String(oldStudentNumber) !== String(studentNumber)) {
        await handleDeleteResult(String(oldStudentNumber));
      }
      if (studentNumber) {
        await saveRaceTime(String(studentNumber), runner.recordedTime);
      }
      showFeedback(`تم تحديث التلميذ وتثبيت نتيجته بنجاح`);
    }
  };

  // EDIT FUNCTIONALITY (مع إمكانية التعديل):
  // 1. Swap ranks between two finished positions (e.g. swap 1st and 2nd)
  const handleSwapRanks = async (rankAIndex: number, rankBIndex: number) => {
    if (rankAIndex < 0 || rankBIndex < 0 || rankAIndex >= rankedRunners.length || rankBIndex >= rankedRunners.length) {
      return;
    }

    const runnerA = rankedRunners[rankAIndex];
    const runnerB = rankedRunners[rankBIndex];

    const timeA = runnerA.recordedTime;
    const timeB = runnerB.recordedTime;

    if (timeA === undefined || timeB === undefined) return;

    // Swap their recorded times so their ranks flip
    setSelectedRunners(prev => prev.map(r => {
      if (r.laneIndex === runnerA.laneIndex) {
        return { ...r, recordedTime: timeB };
      }
      if (r.laneIndex === runnerB.laneIndex) {
        return { ...r, recordedTime: timeA };
      }
      return r;
    }));

    // Re-save both students with swapped times
    if (runnerA.studentNumber) {
      await saveRaceTime(String(runnerA.studentNumber), timeB);
    }
    if (runnerB.studentNumber) {
      await saveRaceTime(String(runnerB.studentNumber), timeA);
    }

    playBeep(880, 0.1);
    showFeedback(`تم تبديل المركزين بنجاح (${runnerA.rankTitle} ⇋ ${runnerB.rankTitle})`);
  };

  // 2. Edit recorded time manually for a specific lane
  const handleStartEditTime = (laneIndex: number, currentTime?: number) => {
    setEditingLaneIndex(laneIndex);
    setTempEditTime(currentTime !== undefined ? String(currentTime) : '');
  };

  const handleSaveEditedTime = async (laneIndex: number) => {
    const parsedTime = parseFloat(tempEditTime);
    if (isNaN(parsedTime) || parsedTime <= 0) {
      showFeedback('يرجى إدخال زمن صحيح بالثواني (مثال: 4.35)');
      return;
    }

    const runner = selectedRunners.find(r => r.laneIndex === laneIndex);
    if (!runner) return;

    const roundedTime = Number(parsedTime.toFixed(2));

    setSelectedRunners(prev => prev.map(r =>
      r.laneIndex === laneIndex ? { ...r, recordedTime: roundedTime, isFinished: true } : r
    ));

    if (runner.studentNumber) {
      await saveRaceTime(String(runner.studentNumber), roundedTime);
    }

    setEditingLaneIndex(null);
    playBeep(980, 0.1);
    showFeedback(`تم حفظ التوقيت المعدل (${roundedTime} ثانية) بنجاح`);
  };

  // 3. Auto-populate next untested batch of students (2, 3, or 4)
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
          isFinished: false,
          arrivalOrder: undefined
        };
      });
    });

    showFeedback(`تم تحديد الفوج التالي (${laneCount} متسابقين) تلقائياً`);
  };

  // Prepare next run & switch back to Start Committee for review
  const handlePrepareNextHeat = () => {
    resetTimer();
    autoPopulateNextBatch();
    setActiveSection('start_committee');
  };

  // Add a specific student to the first empty lane slot in the list
  const handleAddStudentToFirstEmptyLane = (studentNumber: string) => {
    // If student already selected, remove them
    const existingIndex = selectedRunners.findIndex(r => String(r.studentNumber) === String(studentNumber));
    if (existingIndex >= 0) {
      setSelectedRunners(prev => prev.map((r, idx) => idx === existingIndex ? { ...r, studentNumber: '' } : r));
      showFeedback('تمت إزالة التلميذ من اللائحة');
      return;
    }

    // Find first empty slot
    const emptyIndex = selectedRunners.findIndex(r => !r.studentNumber);
    if (emptyIndex >= 0) {
      setSelectedRunners(prev => prev.map((r, idx) => idx === emptyIndex ? { ...r, studentNumber: String(studentNumber) } : r));
      showFeedback(`تمت إضافة التلميذ للممر #${emptyIndex + 1}`);
    } else {
      // Replace last slot if all full
      setSelectedRunners(prev => prev.map((r, idx) => idx === laneCount - 1 ? { ...r, studentNumber: String(studentNumber) } : r));
      showFeedback(`تم استبدال الممر #${laneCount}`);
    }
  };

  // Filtered class students list for Start Committee
  const filteredClassStudents = useMemo(() => {
    return students.filter(s => {
      // Search
      if (studentSearchQuery) {
        const q = studentSearchQuery.toLowerCase().trim();
        const matchName = s.nomEleve.toLowerCase().includes(q);
        const matchNum = String(s.numeroEleve).includes(q) || (s.orderIndex && String(s.orderIndex).includes(q));
        if (!matchName && !matchNum) return false;
      }
      // Gender
      if (genderFilter !== 'ALL' && s.sexe !== genderFilter) return false;
      // Status
      const isTested = testedStudents.some(t => String(t.student.numeroEleve) === String(s.numeroEleve));
      if (statusFilter === 'UNTESTED' && isTested) return false;
      if (statusFilter === 'TESTED' && !isTested) return false;

      return true;
    });
  }, [students, studentSearchQuery, genderFilter, statusFilter, testedStudents]);

  // Overall completed results in class
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
  const activeSelectedRunnersCount = selectedRunners.filter(r => !!r.studentNumber).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-2xl backdrop-blur-md">
              <TrophyIcon className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black">{raceConfig.title}</h2>
                <span className="text-[10px] font-bold bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-400/30">
                  {selectedClass || 'قسم'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-100/90 font-medium">
                نظام منقسم إلى شقين: لجنة الانطلاق 🚦 ولجنة الوصول 🏁
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="إغلاق النافذة"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Floating Save / Action Feedback Toast */}
        {saveFeedback && (
          <div className="bg-emerald-600 text-white text-xs font-black py-2 px-4 text-center shadow-lg transition-all animate-bounce flex items-center justify-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* Global Controls & Two Main Committee Tabs */}
        <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 space-y-3">
          
          {/* Top Options Bar (Test Type & Class) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            {/* Race distance selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-gray-600 dark:text-gray-300">مسافة السباق:</span>
              <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-300 dark:border-gray-600 gap-1">
                <button
                  type="button"
                  disabled={testState !== 'idle'}
                  onClick={() => setCurrentTestType('speed')}
                  className={`px-2.5 py-1 font-black rounded-lg transition cursor-pointer ${
                    currentTestType === 'speed' ? 'bg-orange-500 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  ⚡ 30م
                </button>
                <button
                  type="button"
                  disabled={testState !== 'idle'}
                  onClick={() => setCurrentTestType('speed-60')}
                  className={`px-2.5 py-1 font-black rounded-lg transition cursor-pointer ${
                    currentTestType === 'speed-60' ? 'bg-orange-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  ⚡ 60م
                </button>
                <button
                  type="button"
                  disabled={testState !== 'idle'}
                  onClick={() => setCurrentTestType('speed-80')}
                  className={`px-2.5 py-1 font-black rounded-lg transition cursor-pointer ${
                    currentTestType === 'speed-80' ? 'bg-orange-700 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  ⚡ 80م
                </button>
                <button
                  type="button"
                  disabled={testState !== 'idle'}
                  onClick={() => setCurrentTestType('speed-100')}
                  className={`px-2.5 py-1 font-black rounded-lg transition cursor-pointer ${
                    currentTestType === 'speed-100' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  ⚡ 100م
                </button>
                <button
                  type="button"
                  disabled={testState !== 'idle'}
                  onClick={() => setCurrentTestType('endurance')}
                  className={`px-2.5 py-1 font-black rounded-lg transition cursor-pointer ${
                    currentTestType === 'endurance' ? 'bg-red-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  🏃‍♂️ السرعة المتوسطة
                </button>
              </div>
            </div>

            {/* Class selector */}
            <div className="flex items-center gap-2">
              <label className="font-bold text-gray-600 dark:text-gray-300 shrink-0">القسم:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={testState !== 'idle'}
                className="px-3 py-1.5 font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500"
              >
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* TWO PRIMARY TABS REQUESTED: لجنة الانطلاق vs لجنة الوصول */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 p-1.5 bg-gray-200/80 dark:bg-gray-800/80 rounded-2xl border border-gray-300/80 dark:border-gray-600">
            {/* Tab 1: لجنة الانطلاق */}
            <button
              type="button"
              onClick={() => setActiveSection('start_committee')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                activeSection === 'start_committee'
                  ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60'
              }`}
            >
              <span className="text-lg">🚦</span>
              <div className="text-right">
                <div className="leading-tight">1. لجنة الانطلاق</div>
                <div className={`text-[10px] font-medium ${activeSection === 'start_committee' ? 'text-amber-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  تحديد المتسابقين ({activeSelectedRunnersCount} من {laneCount})
                </div>
              </div>
            </button>

            {/* Tab 2: لجنة الوصول */}
            <button
              type="button"
              onClick={() => setActiveSection('finish_committee')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer relative ${
                activeSection === 'finish_committee'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60'
              }`}
            >
              <span className="text-lg">🏁</span>
              <div className="text-right">
                <div className="leading-tight">2. لجنة الوصول</div>
                <div className={`text-[10px] font-medium ${activeSection === 'finish_committee' ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {testState === 'running' 
                    ? `السباق جارٍ ⏱️ (${formattedSeconds}ث)` 
                    : finishedCount > 0 
                    ? `تم وصول ${finishedCount} (الأول والثاني..)` 
                    : 'تحديد الأول والثاني تلقائياً'}
                </div>
              </div>

              {testState === 'running' && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-grow custom-scrollbar">

          {/* ========================================================= */}
          {/* SECTION 1: شق خاص بلجنة الانطلاق                           */}
          {/* يقوم بتحديد المتسابقين، إما متسابقين أو ثلاثة أو أربعة على شكل لائحة */}
          {/* ========================================================= */}
          {activeSection === 'start_committee' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Committee Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/40 rounded-3xl border-2 border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-md shrink-0">
                    <span className="text-2xl">🚦</span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                      شق لجنة الانطلاق (Comité de Départ)
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      حدد عدد المتسابقين في الفوج (2 متسابقين، 3، أو 4)، ثم عين أسماء المتسابقين في اللائحة أدناه للانطلاق.
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black border ${
                    activeSelectedRunnersCount === laneCount
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                  }`}>
                    {activeSelectedRunnersCount === laneCount ? '✅ اللائحة مكتملة وجاهزة' : `⚠️ محدد: ${activeSelectedRunnersCount} من ${laneCount}`}
                  </span>
                </div>
              </div>

              {/* Number of Runners Selector (إما متسابقين أو ثلاثة أو أربعة) */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs sm:text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>تحديد عدد المتسابقين في السباق:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">(المطلوب: إما 2 أو 3 أو 4)</span>
                    </label>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      اختر عدد الممرات المراد إطلاقها في الفوج الحالي لضبط اللائحة بدقة:
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={autoPopulateNextBatch}
                      className="px-3 py-1.5 text-xs font-black bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-800 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>⚡ تحديد الفوج التالي تلقائياً</span>
                    </button>
                  </div>
                </div>

                {/* 3 Prominent touch targets: 2 runners, 3 runners, 4 runners */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1">
                  <button
                    type="button"
                    disabled={testState !== 'idle'}
                    onClick={() => setLaneCount(2)}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer transform active:scale-95 ${
                      laneCount === 2
                        ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400'
                        : 'bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-xl sm:text-2xl">🏃‍♂️🏃‍♂️</div>
                    <div className="text-xs sm:text-sm font-black">متسابقان (2)</div>
                    <div className={`text-[10px] ${laneCount === 2 ? 'text-amber-100' : 'text-gray-400'}`}>سباق ثنائي</div>
                  </button>

                  <button
                    type="button"
                    disabled={testState !== 'idle'}
                    onClick={() => setLaneCount(3)}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer transform active:scale-95 ${
                      laneCount === 3
                        ? 'bg-amber-600 text-white border-amber-700 shadow-lg shadow-amber-600/25 ring-2 ring-amber-400'
                        : 'bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-xl sm:text-2xl">🏃‍♂️🏃‍♂️🏃‍♂️</div>
                    <div className="text-xs sm:text-sm font-black">ثلاثة متسابقين (3)</div>
                    <div className={`text-[10px] ${laneCount === 3 ? 'text-amber-100' : 'text-gray-400'}`}>سباق ثلاثي</div>
                  </button>

                  <button
                    type="button"
                    disabled={testState !== 'idle'}
                    onClick={() => setLaneCount(4)}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer transform active:scale-95 ${
                      laneCount === 4
                        ? 'bg-amber-700 text-white border-amber-800 shadow-lg shadow-amber-700/25 ring-2 ring-amber-400'
                        : 'bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-xl sm:text-2xl">🏃‍♂️🏃‍♂️🏃‍♂️🏃‍♂️</div>
                    <div className="text-xs sm:text-sm font-black">أربعة متسابقين (4)</div>
                    <div className={`text-[10px] ${laneCount === 4 ? 'text-amber-100' : 'text-gray-400'}`}>سباق رباعي كامل</div>
                  </button>
                </div>

                {/* OBSERVERS SYSTEM SELECTOR (لجنة المراقبة والوصول: مراقب واحد أو مراقبان) */}
                <div className="mt-4 pt-3.5 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs sm:text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                        <UserGroupIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>نظام المراقبين / الأساتذة في الوصول:</span>
                      </label>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        يمكن تعيين أستاذين لمراقبة السباق (مثلاً كل أستاذ يراقب متسابقين اثنين) أو أستاذ واحد:
                      </p>
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-2xl border border-gray-300 dark:border-gray-600 gap-1">
                      <button
                        type="button"
                        onClick={() => setObserverCount(1)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                          observerCount === 1
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                        }`}
                      >
                        <span>👤 مراقب واحد (1)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setObserverCount(2)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                          observerCount === 2
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                        }`}
                      >
                        <span>👥 مراقبان (2) (أستاذان)</span>
                      </button>
                    </div>
                  </div>

                  {/* Config for 2 observers */}
                  {observerCount === 2 && (
                    <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2.5 animate-in fade-in">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-bold text-indigo-900 dark:text-indigo-200 shrink-0">👤 المراقب الأول:</span>
                          <input
                            type="text"
                            value={observer1Name}
                            onChange={(e) => setObserver1Name(e.target.value)}
                            placeholder="الأستاذ 1"
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full sm:w-36 focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-bold text-teal-900 dark:text-teal-200 shrink-0">👥 المراقب الثاني:</span>
                          <input
                            type="text"
                            value={observer2Name}
                            onChange={(e) => setObserver2Name(e.target.value)}
                            placeholder="الأستاذ 2"
                            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full sm:w-36 focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={handleEqualSplitObservers}
                            className="px-2.5 py-1 font-bold text-xs bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer"
                            title="توزيع نصف المتسابقين للمراقب الأول والنصف الآخر للمراقب الثاني"
                          >
                            ⚖️ مناصفة (متسابقان لكل أستاذ)
                          </button>
                        </div>
                      </div>

                      {/* Summary of assigned runners per observer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div className="p-2 rounded-xl bg-indigo-100/70 dark:bg-indigo-900/40 text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span>👤</span>
                            <span>{observer1Name}:</span>
                          </span>
                          <span className="bg-indigo-200/80 dark:bg-indigo-800/80 px-2 py-0.5 rounded-md font-mono">
                            {selectedRunners.filter(r => (r.observerId || 1) === 1).length} متسابقين (ممرات: {selectedRunners.filter(r => (r.observerId || 1) === 1).map(r => `#${r.laneIndex}`).join('، ') || 'لا يوجد'})
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-teal-100/70 dark:bg-teal-900/40 text-[11px] font-bold text-teal-900 dark:text-teal-200 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span>👥</span>
                            <span>{observer2Name}:</span>
                          </span>
                          <span className="bg-teal-200/80 dark:bg-teal-800/80 px-2 py-0.5 rounded-md font-mono">
                            {selectedRunners.filter(r => (r.observerId || 1) === 2).length} متسابقين (ممرات: {selectedRunners.filter(r => (r.observerId || 1) === 2).map(r => `#${r.laneIndex}`).join('، ') || 'لا يوجد'})
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                        💡 يمكنك النقر على شارة المراقب في جدول الممرات أدناه لتبديل الأستاذ المراقب لأي متسابق بنقرة واحدة.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* HEAT RUNNERS LIST: لائحة متسابقي الفوج الحالي على شكل جدول/لائحة أنيقة */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-amber-600" />
                    <h4 className="text-sm font-black text-gray-900 dark:text-white">
                      لائحة المتسابقين المحددين للفوج الحالي ({selectedRunners.length} ممرات):
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-gray-500">
                    يمكن تغيير التلميذ في أي ممر عبر القائمة المنسدلة أو النقر على أسماء التلاميذ بالأسفل
                  </span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {selectedRunners.map((runner) => {
                    const student = students.find(s => String(s.numeroEleve) === String(runner.studentNumber));

                    return (
                      <div 
                        key={runner.laneIndex}
                        className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          student ? 'bg-white dark:bg-gray-800 hover:bg-amber-50/30' : 'bg-amber-50/40 dark:bg-amber-950/20'
                        }`}
                      >
                        {/* Lane & Student Identity */}
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-black text-xs shrink-0 shadow-xs">
                            الممر #{runner.laneIndex}
                          </span>

                          {student ? (
                            <StudentAvatar
                              photoUrl={student.photoUrl}
                              nomEleve={student.nomEleve}
                              sexe={student.sexe}
                              size="sm"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold shrink-0">
                              ?
                            </div>
                          )}

                          <div>
                            <div className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                              {student ? student.nomEleve : `ممر شاغر #${runner.laneIndex}`}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                              {student ? (
                                <>
                                  <span>الرقم: #{getStudentNumberDisplay(student)}</span>
                                  <span>•</span>
                                  <span className={student.sexe === 'F' ? 'text-pink-600 font-bold' : 'text-blue-600 font-bold'}>
                                    {student.sexe === 'F' ? 'أنثى' : 'ذكر'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-bold">
                                  يرجى اختيار تلميذ لهذا الممر
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dropdown Selector to assign/change student for this lane */}
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-between sm:justify-end">
                          
                          {/* Observer Assignment Badge / Switcher Button */}
                          {observerCount === 2 && (
                            <button
                              type="button"
                              onClick={() => handleToggleRunnerObserver(runner.laneIndex)}
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border shrink-0 ${
                                (runner.observerId || 1) === 1
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 shadow-xs'
                                  : 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700 hover:bg-teal-100 shadow-xs'
                              }`}
                              title="اضغط لتغيير الأستاذ / المراقب المسند له هذا المتسابق"
                            >
                              <span>{(runner.observerId || 1) === 1 ? '👤' : '👥'}</span>
                              <span className="font-extrabold">{(runner.observerId || 1) === 1 ? observer1Name : observer2Name}</span>
                              <span className="text-[10px] opacity-60">⮂</span>
                            </button>
                          )}

                          <select
                            value={runner.studentNumber}
                            onChange={(e) => handleAssignStudentToLane(runner.laneIndex, e.target.value)}
                            className="flex-1 sm:w-64 text-xs font-bold py-2 px-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="">-- اضغط لاختيار تلميذ للممر #{runner.laneIndex} --</option>
                            {untestedStudents.length > 0 && (
                              <optgroup label={`⭐ تلاميذ لم يختبروا بعد (${untestedStudents.length})`}>
                                {untestedStudents.map(s => {
                                  const isAssigned = selectedRunners.some(r => r.laneIndex !== runner.laneIndex && String(r.studentNumber) === String(s.numeroEleve));
                                  return (
                                    <option key={s.numeroEleve} value={s.numeroEleve} disabled={isAssigned}>
                                      #{getStudentNumberDisplay(s)} - {s.nomEleve} ({s.sexe === 'F' ? 'أنثى' : 'ذكر'}) {isAssigned ? '(مسند لممر آخر)' : ''}
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
                                      #{getStudentNumberDisplay(s)} - {s.nomEleve} ({s.sexe === 'F' ? 'أنثى' : 'ذكر'}) [{prevTime}ث] {isAssigned ? '(مسند لممر آخر)' : ''}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                          </select>

                          {runner.studentNumber && (
                            <button
                              type="button"
                              onClick={() => handleAssignStudentToLane(runner.laneIndex, '')}
                              title="إفراغ هذا الممر"
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Big Launch Button from Start Committee */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
                    جاهز؟ اضغط على زر إعطاء إشارة الانطلاق لبدء الميقاتي والانتقال الفوري إلى شاشة لجنة الوصول 🏁
                  </div>

                  <button
                    type="button"
                    onClick={handleLaunchFromStartCommittee}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 transition transform active:scale-95 cursor-pointer text-sm sm:text-base"
                  >
                    <PlayIcon className="w-5 h-5 fill-current" />
                    <span>🚀 إعطاء إشارة الانطلاق والانتقال للجنة الوصول 🏁</span>
                  </button>
                </div>
              </div>

              {/* CLASS STUDENTS DIRECT PICKER: شبكة تلاميذ القسم لاختيار أو استبدال المتسابقين بسهولة */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-amber-500" />
                      <span>لائحة تلاميذ القسم للاختيار السريع ({students.length} تلميذ):</span>
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      اضغط على أي تلميذ لتعيينه فوراً في أول ممر شاغر باللائحة أعلاه
                    </p>
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('UNTESTED')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        statusFilter === 'UNTESTED' ? 'bg-amber-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      لم يختبروا ({untestedStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('TESTED')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        statusFilter === 'TESTED' ? 'bg-amber-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      اجتازوا ({testedStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        statusFilter === 'ALL' ? 'bg-amber-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      الكل ({students.length})
                    </button>
                  </div>
                </div>

                {/* Search bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو رقم التلميذ..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full py-2 px-3 ps-8 text-xs font-bold bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                </div>

                {/* Grid of students */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar p-1">
                  {filteredClassStudents.map((student) => {
                    const laneIndex = selectedRunners.findIndex(r => String(r.studentNumber) === String(student.numeroEleve));
                    const isSelected = laneIndex >= 0;
                    const prevTest = testedStudents.find(t => String(t.student.numeroEleve) === String(student.numeroEleve));

                    return (
                      <button
                        key={student.numeroEleve}
                        type="button"
                        onClick={() => handleAddStudentToFirstEmptyLane(student.numeroEleve)}
                        className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer select-none transform active:scale-95 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-400 shadow-xs'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[10px] font-mono text-gray-400">
                            #{getStudentNumberDisplay(student)}
                          </span>
                          {isSelected ? (
                            <span className="bg-amber-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
                              ممر #{laneIndex + 1}
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold ${student.sexe === 'F' ? 'text-pink-600' : 'text-blue-600'}`}>
                              {student.sexe === 'F' ? 'أنثى' : 'ذكر'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 my-1">
                          <StudentAvatar
                            photoUrl={student.photoUrl}
                            nomEleve={student.nomEleve}
                            sexe={student.sexe}
                            size="xs"
                          />
                          <span className="text-xs font-extrabold text-gray-900 dark:text-white truncate">
                            {student.nomEleve}
                          </span>
                        </div>

                        <div className="text-[10px] text-gray-400 flex items-center justify-between w-full mt-1">
                          {prevTest ? (
                            <span className="text-emerald-600 font-bold">سبق: {prevTest.prevTime}ث</span>
                          ) : (
                            <span className="text-amber-600 font-bold">لم يختبر</span>
                          )}
                          <span className="text-amber-500 font-black">{isSelected ? '✓ محدد' : '+ تعيين'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 2: شق خاص بلجنة الوصول                             */}
          {/* وفي الوصول يتم تحديد الأول والثاني .. بشكل تلقائي. مع امكانية التعديل */}
          {/* ========================================================= */}
          {activeSection === 'finish_committee' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Committee Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-600/10 to-emerald-500/10 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-3xl border-2 border-emerald-300 dark:border-emerald-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shrink-0">
                    <span className="text-2xl">🏁</span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                      شق لجنة الوصول (Comité d'Arrivée)
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      تحديد المركز الأول والثاني والثالث تلقائياً فور الوصول، مع إمكانية تعديل المراكز أو التوقيت أو الأسماء.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSection('start_committee')}
                    className="px-3 py-1.5 text-xs font-black bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl border border-gray-300 dark:border-gray-600 shadow-xs transition"
                  >
                    <span>🚦 مراجعة لجنة الانطلاق</span>
                  </button>
                </div>
              </div>

              {/* LIVE DIGITAL STOPWATCH & CONTROLS */}
              <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 text-white rounded-3xl shadow-xl border border-gray-700 relative overflow-hidden">
                <div className="text-[11px] font-black text-amber-400 uppercase tracking-widest mb-1">
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

                {/* GIANT DYNAMIC FINISHER TAP BUTTON(S) */}
                {observerCount === 1 ? (
                  /* Single Observer Arrival Button */
                  <div className="w-full max-w-2xl mx-auto my-3 px-1">
                    <button
                      type="button"
                      onClick={recordNextFinisher}
                      className="w-full inline-flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-gray-950 font-black rounded-3xl shadow-2xl shadow-amber-500/40 border-2 border-amber-200 transition-all transform active:scale-95 cursor-pointer text-base sm:text-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl sm:text-4xl animate-bounce">🏁</span>
                        <div className="text-right">
                          <div className="text-[11px] font-black text-amber-950/80 uppercase tracking-wide">
                            زر تسجيل الوصول التلقائي:
                          </div>
                          <div className="text-sm sm:text-xl font-black text-gray-950 mt-0.5">
                            {testState === 'idle'
                              ? 'انقر هنا لإعطاء الانطلاق والبدء 🚀'
                              : finishedCount < laneCount
                              ? `تسجيل وصول: المركز ${nextFinisherRankTitle}`
                              : `تسجيل وصول متسابق إضافي (#${finishedCount + 1})`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-gray-950 text-amber-300 px-3 py-1.5 rounded-2xl text-xs sm:text-sm font-mono font-black border border-amber-400/50 shadow-inner">
                          {formattedSeconds}ث
                        </span>
                        <span className="text-[11px] sm:text-xs font-black bg-amber-950 text-amber-100 px-3 py-1.5 rounded-xl shadow-xs">
                          تسجيل ⚡
                        </span>
                      </div>
                    </button>
                  </div>
                ) : (
                  /* DUAL OBSERVERS ARRIVAL PANEL (أستاذان / مراقبان اثنان) */
                  <div className="w-full max-w-4xl mx-auto my-3 space-y-3 px-1">
                    
                    {/* View mode switcher tabs */}
                    <div className="flex items-center justify-center gap-1.5 bg-gray-900/80 p-1.5 rounded-2xl border border-gray-700/80 max-w-md mx-auto">
                      <button
                        type="button"
                        onClick={() => setFinishViewTab('both')}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          finishViewTab === 'both' ? 'bg-amber-500 text-gray-950 font-black shadow-xs' : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        <span>👥 المراقبان معاً</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinishViewTab('obs1')}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          finishViewTab === 'obs1' ? 'bg-indigo-600 text-white font-black shadow-xs' : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        <span>👤 {observer1Name} ({selectedRunners.filter(r => (r.observerId || 1) === 1).length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinishViewTab('obs2')}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          finishViewTab === 'obs2' ? 'bg-teal-600 text-white font-black shadow-xs' : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        <span>👥 {observer2Name} ({selectedRunners.filter(r => (r.observerId || 1) === 2).length})</span>
                      </button>
                    </div>

                    {/* Dual Cards Grid */}
                    <div className={`grid ${finishViewTab === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-3.5`}>
                      
                      {/* OBSERVER 1 ARRIVAL CARD */}
                      {(finishViewTab === 'both' || finishViewTab === 'obs1') && (
                        <div className="p-3.5 sm:p-4 bg-gradient-to-b from-indigo-950/80 to-slate-900/90 rounded-3xl border-2 border-indigo-500/50 shadow-xl flex flex-col justify-between gap-3">
                          <div className="flex items-center justify-between text-xs pb-1 border-b border-indigo-800/60">
                            <span className="font-black text-indigo-300 flex items-center gap-1.5 text-sm">
                              <span>👤</span>
                              <span>{observer1Name}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-900/80 text-indigo-200 font-bold text-[11px] border border-indigo-700">
                              وصل {selectedRunners.filter(r => (r.observerId || 1) === 1 && r.isFinished).length} من {selectedRunners.filter(r => (r.observerId || 1) === 1).length}
                            </span>
                          </div>

                          {/* Observer 1 Giant Arrival Button */}
                          <button
                            type="button"
                            onClick={() => recordNextFinisherForObserver(1)}
                            className="w-full inline-flex items-center justify-between p-3.5 sm:p-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/30 border border-indigo-400/40 transition-all transform active:scale-95 cursor-pointer text-sm sm:text-base"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl animate-pulse">⏱️</span>
                              <div className="text-right">
                                <div className="text-[10px] font-black text-indigo-200 uppercase tracking-wide">
                                  تسجيل وصول: {observer1Name}
                                </div>
                                <div className="text-xs sm:text-sm font-black">
                                  {testState === 'idle'
                                    ? 'انقر لبدء الانطلاق 🚀'
                                    : selectedRunners.filter(r => (r.observerId || 1) === 1 && !r.isFinished).length > 0
                                    ? `تسجيل وصول متسابق #${selectedRunners.filter(r => (r.observerId || 1) === 1 && r.isFinished).length + 1}`
                                    : `✅ اكتمل وصول متسابقي ${observer1Name}`}
                                </div>
                              </div>
                            </div>
                            <span className="bg-black/40 text-amber-300 px-2.5 py-1 rounded-xl text-xs font-mono font-black border border-amber-400/30">
                              {formattedSeconds}ث
                            </span>
                          </button>

                          {/* Observer 1 Lanes Mini List */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {selectedRunners.filter(r => (r.observerId || 1) === 1).map(runner => {
                              const s = students.find(st => String(st.numeroEleve) === String(runner.studentNumber));
                              return (
                                <button
                                  key={runner.laneIndex}
                                  type="button"
                                  onClick={() => handleLaneTileClick(runner.laneIndex)}
                                  className={`p-2 rounded-xl text-center text-xs border transition cursor-pointer flex flex-col justify-between ${
                                    runner.isFinished
                                      ? 'bg-indigo-600/80 text-white border-indigo-400 shadow-xs'
                                      : testState === 'running'
                                      ? 'bg-indigo-950/60 text-indigo-200 border-indigo-500/50 hover:bg-indigo-900/60'
                                      : 'bg-gray-800/80 text-gray-300 border-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold text-[10px] opacity-80">
                                    <span>الممر #{runner.laneIndex}</span>
                                    {runner.isFinished && runner.recordedTime && <span>{runner.recordedTime.toFixed(2)}ث</span>}
                                  </div>
                                  <div className="font-extrabold truncate py-1 text-xs">{s ? s.nomEleve : `متسابق #${runner.laneIndex}`}</div>
                                  <div className="text-[9px] opacity-75">{runner.isFinished ? '✅ وصل (إلغاء)' : 'انقر للتسجيل'}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* OBSERVER 2 ARRIVAL CARD */}
                      {(finishViewTab === 'both' || finishViewTab === 'obs2') && (
                        <div className="p-3.5 sm:p-4 bg-gradient-to-b from-teal-950/80 to-slate-900/90 rounded-3xl border-2 border-teal-500/50 shadow-xl flex flex-col justify-between gap-3">
                          <div className="flex items-center justify-between text-xs pb-1 border-b border-teal-800/60">
                            <span className="font-black text-teal-300 flex items-center gap-1.5 text-sm">
                              <span>👥</span>
                              <span>{observer2Name}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-teal-900/80 text-teal-200 font-bold text-[11px] border border-teal-700">
                              وصل {selectedRunners.filter(r => (r.observerId || 1) === 2 && r.isFinished).length} من {selectedRunners.filter(r => (r.observerId || 1) === 2).length}
                            </span>
                          </div>

                          {/* Observer 2 Giant Arrival Button */}
                          <button
                            type="button"
                            onClick={() => recordNextFinisherForObserver(2)}
                            className="w-full inline-flex items-center justify-between p-3.5 sm:p-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-teal-600/30 border border-teal-400/40 transition-all transform active:scale-95 cursor-pointer text-sm sm:text-base"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl animate-pulse">⏱️</span>
                              <div className="text-right">
                                <div className="text-[10px] font-black text-teal-200 uppercase tracking-wide">
                                  تسجيل وصول: {observer2Name}
                                </div>
                                <div className="text-xs sm:text-sm font-black">
                                  {testState === 'idle'
                                    ? 'انقر لبدء الانطلاق 🚀'
                                    : selectedRunners.filter(r => (r.observerId || 1) === 2 && !r.isFinished).length > 0
                                    ? `تسجيل وصول متسابق #${selectedRunners.filter(r => (r.observerId || 1) === 2 && r.isFinished).length + 1}`
                                    : `✅ اكتمل وصول متسابقي ${observer2Name}`}
                                </div>
                              </div>
                            </div>
                            <span className="bg-black/40 text-amber-300 px-2.5 py-1 rounded-xl text-xs font-mono font-black border border-amber-400/30">
                              {formattedSeconds}ث
                            </span>
                          </button>

                          {/* Observer 2 Lanes Mini List */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {selectedRunners.filter(r => (r.observerId || 1) === 2).map(runner => {
                              const s = students.find(st => String(st.numeroEleve) === String(runner.studentNumber));
                              return (
                                <button
                                  key={runner.laneIndex}
                                  type="button"
                                  onClick={() => handleLaneTileClick(runner.laneIndex)}
                                  className={`p-2 rounded-xl text-center text-xs border transition cursor-pointer flex flex-col justify-between ${
                                    runner.isFinished
                                      ? 'bg-teal-600/80 text-white border-teal-400 shadow-xs'
                                      : testState === 'running'
                                      ? 'bg-teal-950/60 text-teal-200 border-teal-500/50 hover:bg-teal-900/60'
                                      : 'bg-gray-800/80 text-gray-300 border-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold text-[10px] opacity-80">
                                    <span>الممر #{runner.laneIndex}</span>
                                    {runner.isFinished && runner.recordedTime && <span>{runner.recordedTime.toFixed(2)}ث</span>}
                                  </div>
                                  <div className="font-extrabold truncate py-1 text-xs">{s ? s.nomEleve : `متسابق #${runner.laneIndex}`}</div>
                                  <div className="text-[9px] opacity-75">{runner.isFinished ? '✅ وصل (إلغاء)' : 'انقر للتسجيل'}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* Live Stopwatch Controls */}
                <div className="flex items-center gap-2.5 sm:gap-4 mt-2 flex-wrap justify-center w-full">
                  {testState === 'idle' && (
                    <button
                      onClick={startTimer}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg transition transform active:scale-95 cursor-pointer text-sm"
                    >
                      <PlayIcon className="w-5 h-5 fill-current" />
                      <span>بدء الانطلاق 🚀</span>
                    </button>
                  )}

                  {testState === 'running' && (
                    <button
                      onClick={pauseTimer}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-black rounded-2xl shadow-lg transition transform active:scale-95 cursor-pointer text-sm"
                    >
                      <PauseIcon className="w-5 h-5" />
                      <span>إيقاف مؤقت ⏸️</span>
                    </button>
                  )}

                  {testState === 'paused' && (
                    <button
                      onClick={startTimer}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg transition transform active:scale-95 cursor-pointer text-sm"
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
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg transition cursor-pointer text-xs sm:text-sm"
                  >
                    <span>الفوج التالي ⏩</span>
                  </button>
                </div>
              </div>

              {/* AUTOMATIC ARRIVAL RESULTS & EDIT PANEL:
                  وفي الوصول يتم تحديد الأول والثاني .. بشكل تلقائي. مع امكانية التعديل */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-5 space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h4 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <TrophyIcon className="w-5 h-5 text-amber-500" />
                      <span>ترتيب الواصلين تلقائياً (الأول، الثاني، الثالث...) - مع إمكانية التعديل:</span>
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      يتم ترتيب المتسابقين فوراً حسب أسرع توقيت. يمكنك تبديل المراكز ⬆️ ⬇️ أو تعديل التوقيت أو تغيير التلميذ.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black rounded-xl border border-emerald-200 dark:border-emerald-800">
                      الواصلون: {rankedRunners.length} من {laneCount}
                    </span>
                  </div>
                </div>

                {/* NO FINISHERS YET */}
                {rankedRunners.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 dark:bg-gray-700/30 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 space-y-3">
                    <div className="text-4xl">⏱️</div>
                    <div className="text-sm font-black text-gray-800 dark:text-gray-200">
                      بانتظار وصول المتسابقين عند خط النهاية
                    </div>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      عند انطلاق المتسابقين، اضغط على زر «تسجيل وصول» أو اضغط على بطاقة الممر بالأسفل لتحديد المركز الأول والثاني تلقائياً.
                    </p>
                  </div>
                ) : (
                  /* FINISHERS CARDS ORDERED AUTOMATICALLY (الأول 🥇، الثاني 🥈، الثالث 🥉، الرابع 🎖️) */
                  <div className="space-y-3">
                    {rankedRunners.map((runner, index) => {
                      const isEditing = editingLaneIndex === runner.laneIndex;

                      return (
                        <div
                          key={runner.laneIndex}
                          className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${
                            index === 0
                              ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600'
                              : index === 1
                              ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-600'
                              : index === 2
                              ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            
                            {/* Rank Medal & Identity */}
                            <div className="flex items-center gap-3">
                              {/* Big Rank Badge */}
                              <div className={`px-3 py-2 rounded-2xl font-black text-sm sm:text-base flex flex-col items-center justify-center min-w-[75px] shadow-xs ${
                                index === 0
                                  ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                                  : index === 1
                                  ? 'bg-gray-400 text-white ring-2 ring-gray-300'
                                  : index === 2
                                  ? 'bg-amber-700 text-white ring-2 ring-amber-600'
                                  : 'bg-gray-700 text-white'
                              }`}>
                                <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎖️'}</span>
                                <span className="text-xs">{runner.rankTitle}</span>
                              </div>

                              {/* Student Avatar & Name */}
                              <div className="flex items-center gap-2.5">
                                {runner.student && (
                                  <StudentAvatar
                                    photoUrl={runner.student.photoUrl}
                                    nomEleve={runner.student.nomEleve}
                                    sexe={runner.student.sexe}
                                    size="md"
                                  />
                                )}
                                <div>
                                  <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                                    {runner.student ? runner.student.nomEleve : `متسابق الممر #${runner.laneIndex}`}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="font-bold">الممر: #{runner.laneIndex}</span>
                                    {observerCount === 2 && (
                                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                                        (runner.observerId || 1) === 1
                                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                                          : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800'
                                      }`}>
                                        {(runner.observerId || 1) === 1 ? `👤 ${observer1Name}` : `👥 ${observer2Name}`}
                                      </span>
                                    )}
                                    {runner.student?.orderIndex && (
                                      <span>• رقم الترتيب: #{runner.student.orderIndex}</span>
                                    )}
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ تم الحفظ بالسجل</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Recorded Time, Speed, Score & Edit Controls */}
                            <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
                              
                              {/* Normal or Inline Edit Time */}
                              {isEditing ? (
                                <div className="flex items-center gap-1.5 bg-white dark:bg-gray-700 p-1.5 rounded-xl border border-amber-400 shadow-sm">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={tempEditTime}
                                    onChange={(e) => setTempEditTime(e.target.value)}
                                    placeholder="4.25"
                                    className="w-20 px-2 py-1 text-xs font-mono font-black border border-gray-300 dark:border-gray-600 rounded-lg text-center"
                                  />
                                  <span className="text-xs font-bold">ث</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditedTime(runner.laneIndex)}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                                  >
                                    حفظ ✔️
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
                                <div className="flex items-baseline gap-2 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-2 rounded-2xl border border-emerald-300 dark:border-emerald-800">
                                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">الزمن:</span>
                                  <span className="text-lg sm:text-xl font-mono font-black text-emerald-900 dark:text-emerald-100">
                                    {raceConfig.isMinutes 
                                      ? `${formatSecondsToMinSec(runner.recordedTime)} د` 
                                      : `${runner.recordedTime?.toFixed(2)} ث`}
                                  </span>
                                  {runner.speedKmH && (
                                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                      ({runner.speedKmH} كم/س)
                                    </span>
                                  )}
                                  {runner.score !== undefined && (
                                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-white/70 dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-amber-300/60">
                                      {runner.score}/20
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* REORDER / SWAP BUTTONS (مع إمكانية التعديل):
                                  تبديل الترتيب بين الأول والثاني، أو الثاني والثالث بنقرة واحدة */}
                              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl border border-gray-300 dark:border-gray-600">
                                {/* Move up (swap with previous) */}
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => handleSwapRanks(index, index - 1)}
                                  title="تبديل مع المركز السابق للأعلى"
                                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-30 cursor-pointer"
                                >
                                  ⬆️
                                </button>
                                {/* Move down (swap with next) */}
                                <button
                                  type="button"
                                  disabled={index === rankedRunners.length - 1}
                                  onClick={() => handleSwapRanks(index, index + 1)}
                                  title="تبديل مع المركز التالي للأسفل"
                                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-30 cursor-pointer"
                                >
                                  ⬇️
                                </button>
                              </div>

                              {/* Edit Time Button */}
                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditTime(runner.laneIndex, runner.recordedTime)}
                                  className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition"
                                  title="تعديل التوقيت يدوياً"
                                >
                                  <PencilSquareIcon className="w-5 h-5" />
                                </button>
                              )}

                              {/* Cancel/Undo Runner Time */}
                              <button
                                type="button"
                                onClick={() => handleLaneTileClick(runner.laneIndex)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
                                title="إلغاء توقيت هذا المتسابق"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>

                          </div>

                          {/* Quick Student Re-assigner if wrong student was picked */}
                          <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400 font-bold">
                              تغيير تلميذ هذا المركز إذا وقع خطأ:
                            </span>
                            <select
                              value={runner.studentNumber}
                              onChange={(e) => handleAssignStudentToLane(runner.laneIndex, e.target.value)}
                              className="text-xs font-bold py-1 px-2 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 cursor-pointer"
                            >
                              <option value="">-- اضغط لتغيير التلميذ لهذا المركز --</option>
                              {untestedStudents.map(s => (
                                <option key={s.numeroEleve} value={s.numeroEleve}>
                                  #{getStudentNumberDisplay(s)} - {s.nomEleve} ({s.sexe === 'F' ? 'أنثى' : 'ذكر'})
                                </option>
                              ))}
                              {testedStudents.map(({ student: s }) => (
                                <option key={s.numeroEleve} value={s.numeroEleve}>
                                  #{getStudentNumberDisplay(s)} - {s.nomEleve} (اجتاز سابقاً)
                                </option>
                              ))}
                            </select>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Lanes Live Click Matrix (Can tap lane card directly to record time) */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-between">
                    <span>ممرات السباق المباشرة (يمكن النقر مباشرة على الممر عند خط الوصول):</span>
                    <span className="text-[11px] text-amber-600 font-bold">الممرات: {laneCount}</span>
                  </div>

                  <div className={`grid grid-cols-2 ${laneCount === 3 ? 'sm:grid-cols-3' : laneCount >= 4 ? 'sm:grid-cols-4' : ''} gap-3`}>
                    {selectedRunners.map(runner => {
                      const student = students.find(s => String(s.numeroEleve) === String(runner.studentNumber));

                      return (
                        <button
                          key={runner.laneIndex}
                          type="button"
                          onClick={() => {
                            if (testState === 'idle') {
                              startTimer();
                            } else {
                              handleLaneTileClick(runner.laneIndex);
                            }
                          }}
                          className={`p-3 rounded-2xl border-2 transition-all transform active:scale-95 cursor-pointer text-center flex flex-col items-center justify-between min-h-[110px] ${
                            runner.isFinished
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-300'
                              : testState === 'running'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-100 hover:bg-amber-500/30 animate-pulse'
                              : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-amber-400'
                          }`}
                        >
                          <div className="text-[11px] font-black w-full flex items-center justify-between opacity-90">
                            <span>الممر #{runner.laneIndex}</span>
                            {runner.isFinished && runner.recordedTime && (
                              <span className="font-mono">{runner.recordedTime.toFixed(2)}ث</span>
                            )}
                          </div>

                          <div className="font-extrabold text-xs sm:text-sm truncate w-full my-1">
                            {student ? student.nomEleve : `متسابق #${runner.laneIndex}`}
                          </div>

                          <div className="text-[10px] font-bold opacity-90">
                            {runner.isFinished 
                              ? '✅ وصل (اضغط للإلغاء)' 
                              : testState === 'running' 
                              ? '⏱️ انقر للتسجيل' 
                              : '🚀 انقر للانطلاق'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Transition Bar: الانتقال للفوج التالي */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-gray-500 font-bold">
                    عند انتهاء الفوج، انقر على زر «الفوج التالي» للانتقال التلقائي للدفعة الموالية في لجنة الانطلاق:
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handlePrepareNextHeat}
                      className="flex-1 sm:flex-initial px-5 py-2.5 text-xs sm:text-sm font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>الفوج التالي (الانتقال للجنة الانطلاق) ⏩</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 3: جدول النتائج الإجمالية للقسم                      */}
          {/* ========================================================= */}
          <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-amber-500" />
                <span>جدول نتائج {raceConfig.title} بالقسم ({completedResults.length} تلميذ/ة):</span>
              </h3>
            </div>

            {completedResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed">
                لم يتم تسجيل أي زمن في {raceConfig.title} لهذا القسم بعد.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs max-h-60 custom-scrollbar">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-700 sticky top-0">
                    <tr>
                      <th className="p-2.5 w-12">#</th>
                      <th className="p-2.5 text-right">الاسم والنسب</th>
                      <th className="p-2.5 w-16">الجنس</th>
                      <th className="p-2.5 w-32">{raceConfig.isMinutes ? 'الزمن (د:ث)' : 'الزمن (ثانية)'}</th>
                      <th className="p-2.5 w-24">السرعة (كم/س)</th>
                      <th className="p-2.5 w-24">النقطة (/20)</th>
                      <th className="p-2.5 w-16">تعديل</th>
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
                              type="button"
                              onClick={() => {
                                setTableStudentToEdit({
                                  numeroEleve: student.numeroEleve,
                                  nomEleve: student.nomEleve,
                                  currentTime: timeSec || 0
                                });
                                setTableEditTimeInput(timeSec !== undefined ? String(timeSec) : '');
                              }}
                              title="تعديل هذا التوقيت"
                              className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg transition cursor-pointer"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => setStudentToDelete({ numeroEleve: student.numeroEleve, nomEleve: student.nomEleve })}
                              title="حذف نتيجة هذا التلميذ"
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-500 rounded-lg transition cursor-pointer"
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
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {activeSection === 'start_committee' 
              ? '🚦 شاشة لجنة الانطلاق: حدد المتسابقين في اللائحة ثم أطلق السباق' 
              : '🏁 شاشة لجنة الوصول: ترتيب الفائزين (الأول، الثاني...) تلقائياً مع خيارات التعديل'}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>

      {/* نافذة تأكيد المسح لنتيجة الاختبار */}
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
              هل أنت متأكد من رغبتك في مسح نتيجة التلميذ «<strong className="text-gray-900 dark:text-white font-bold">{studentToDelete.nomEleve}</strong>» من {raceConfig.title}؟
              سيتم حذف التوقيت المسجل والنقطة المحسوبة نهائياً.
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

      {/* نافذة تعديل نتيجة التلميذ في جدول النتائج */}
      {tableStudentToEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-gray-200 dark:border-gray-700 text-right">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <PencilSquareIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
              تعديل نتيجة التلميذ
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              التلميذ: <strong className="text-gray-900 dark:text-white font-bold">{tableStudentToEdit.nomEleve}</strong> ({raceConfig.title})
            </p>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  الزمن المسجل ({raceConfig.isMinutes ? 'دقائق' : 'ثواني'}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  value={tableEditTimeInput}
                  onChange={(e) => setTableEditTimeInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-mono font-black text-lg text-center text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="4.25"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  سيتم إعادة احتساب السرعة والنقطة تلقائياً بناءً على سلم التنقيط المعتمد وحفظها في السجل.
                </p>
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
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
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
