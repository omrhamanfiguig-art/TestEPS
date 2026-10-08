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
  arrivalOrder?: number; // 1 = الأول, 2 = الثاني, 3 = الثالث, 4 = الرابع ...
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
  
  // Lane count: either 2, 3, 4, 7, 8, 10 or custom
  const [laneCount, setLaneCount] = useState<number>(() => (testType === 'relay' || testType === 'endurance' ? 4 : 3));

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
          subtitle: 'تحديد متسابقي الفوج وقياس وصول المتسابقين بدقة مع زر حفظ النتائج',
          counterLabel: 'عداد وقت سباق السرعة 60م (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesse60m' as const,
          distanceMeters: 60,
          scale: SPEED_SCALE_60M,
          scoreField: 'scoreVitesse60m' as const,
          isMinutes: false
        };
      case 'speed-80':
        return {
          title: 'اختبار الجري السريع (80 م)',
          subtitle: 'تحديد متسابقي الفوج وقياس وصول المتسابقين بدقة مع زر حفظ النتائج',
          counterLabel: 'عداد وقت سباق السرعة 80م (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesse80m' as const,
          distanceMeters: 80,
          scale: SPEED_SCALE_80M,
          scoreField: 'scoreVitesse80m' as const,
          isMinutes: false
        };
      case 'speed-100':
        return {
          title: 'اختبار الجري السريع (100 م)',
          subtitle: 'تحديد متسابقي الفوج وقياس وصول المتسابقين بدقة مع زر حفظ النتائج',
          counterLabel: 'عداد وقت سباق السرعة 100م (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesse100m' as const,
          distanceMeters: 100,
          scale: SPEED_SCALE_100M,
          scoreField: 'scoreVitesse100m' as const,
          isMinutes: false
        };
      case 'endurance':
        return {
          title: 'اختبار سباق السرعة المتوسطة (التحمل 1000م / 600م)',
          subtitle: 'تحديد التوقيت بالدقائق والثواني وترتيب الواصلين مع زر حفظ النتائج',
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
          title: 'سباق التتابع (4 × 50 م)',
          subtitle: 'قياس سباق تتابع الفرق وحساب النتيجة الإجمالية',
          counterLabel: 'عداد وقت سباق التتابع (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesseRelay' as const,
          distanceMeters: 200,
          scale: SPEED_SCALE_100M,
          scoreField: 'scoreRelay' as const,
          isMinutes: false
        };
      case 'speed':
      default:
        return {
          title: 'اختبار الجري السريع (30 م)',
          subtitle: 'تحديد متسابقي الفوج وقياس وصول المتسابقين بدقة مع زر حفظ النتائج',
          counterLabel: 'عداد وقت سباق السرعة 30م (ثواني)',
          unitLabel: 'ثانية',
          field: 'vitesse30m' as const,
          distanceMeters: 30,
          scale: SPEED_SCALE_30M,
          scoreField: 'scoreVitesse30m' as const,
          isMinutes: false
        };
    }
  }, [currentTestType]);

  // Selected runners state for current heat (starts with clean unassigned lanes)
  const [selectedRunners, setSelectedRunners] = useState<SelectedRunner[]>(() => {
    const initialRunners: SelectedRunner[] = [];
    const count = testType === 'relay' || testType === 'endurance' ? 4 : 3;
    for (let i = 1; i <= count; i++) {
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
      const currentMap = new Map<number, SelectedRunner>(prev.map(r => [r.laneIndex, r]));
      const nextRunners: SelectedRunner[] = [];

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
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
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
      'الثاني عشر 🏅',
      'الثالث عشر 🎖️',
      'الرابع عشر 🏅',
      'الخامس عشر 🎖️',
      'السادس عشر 🏅',
      'السابع عشر 🎖️',
      'الثامن عشر 🏅',
      'التاسع عشر 🎖️',
      'العشرون 🏅'
    ];
    return ranks[orderIndex] || `المركز ${orderIndex + 1}`;
  };

  // Tested & untested students in class
  const testedStudents = useMemo(() => {
    return students
      .map(s => {
        const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
        const val = (res as any)?.[raceConfig.field];
        return {
          student: s,
          prevTime: val !== undefined && val !== null && val > 0 ? Number(val) : undefined
        };
      })
      .filter(item => item.prevTime !== undefined);
  }, [students, physicalResults, raceConfig.field]);

  const untestedStudents = useMemo(() => {
    return students.filter(s => {
      const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
      const val = (res as any)?.[raceConfig.field];
      return val === undefined || val === null || val <= 0;
    });
  }, [students, physicalResults, raceConfig.field]);

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
      const mark = calculateScore(runner.recordedTime!, raceConfig.scale, studentObj.sexe || 'M', true);

      const updatedItem: any = {
        ...(existingIdx >= 0 ? currentPhys[existingIdx] : {}),
        numeroEleve: String(runner.studentNumber),
        nomEleve: studentObj.nomEleve,
        sexe: studentObj.sexe,
        [raceConfig.field]: runner.recordedTime,
        [raceConfig.scoreField]: mark,
        ...(raceConfig.scoreField === 'scoreVitesse30m' ? { scoreVitesse: mark } : {}),
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
    showFeedback(`✓ تم بنجاح حفظ نتائج ${finishedRunners.length} متسابق في السجل العام!`);
  };

  // Delete result from DB
  const handleDeleteResult = async (numeroEleve: string) => {
    const updatedPhys = physicalResults.map(p => {
      if (String(p.numeroEleve) === String(numeroEleve)) {
        const copy: any = { ...p };
        delete copy[raceConfig.field];
        delete copy[raceConfig.scoreField];
        if (raceConfig.scoreField === 'scoreVitesse30m') {
          delete copy.scoreVitesse;
        }
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
      showFeedback('يرجى إدخال زمن صحيح (مثال: 4.25)');
      return;
    }
    const timeSec = Number(parsed.toFixed(2));
    
    const studentObj = students.find(s => String(s.numeroEleve) === String(tableStudentToEdit.numeroEleve));
    const currentPhys = [...physicalResults];
    const existingIdx = currentPhys.findIndex(p => String(p.numeroEleve) === String(tableStudentToEdit.numeroEleve));
    const mark = studentObj ? calculateScore(timeSec, raceConfig.scale, studentObj.sexe || 'M', true) : undefined;

    const updatedItem: any = {
      ...(existingIdx >= 0 ? currentPhys[existingIdx] : {}),
      numeroEleve: String(tableStudentToEdit.numeroEleve),
      nomEleve: tableStudentToEdit.nomEleve,
      sexe: studentObj?.sexe,
      [raceConfig.field]: timeSec,
      [raceConfig.scoreField]: mark,
      ...(raceConfig.scoreField === 'scoreVitesse30m' ? { scoreVitesse: mark } : {}),
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

  // Single-button finisher recording logic (WITHOUT auto-saving to DB)
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
      const newRunner: SelectedRunner = {
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
      showFeedback(`تم تسجيل وصول متسابق #${newLaneIndex}: ${timeInSec}ث (اضغط حفظ لتثبيتها)`);
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
      showFeedback(`تم تسجيل وصول الممر #${laneIndex} (${getArabicRankName(newArrivalOrder - 1)})`);

      if (updated.every(r => r.isFinished)) {
        pauseTimer();
      }
    } else {
      // Undo recorded time
      playBeep(440, 0.1);
      setSelectedRunners(prev => prev.map(r => r.laneIndex === laneIndex ? { ...r, recordedTime: undefined, isFinished: false, arrivalOrder: undefined } : r));
      setHasUnsavedChanges(true);
      setIsBatchSaved(false);
      showFeedback(`تم إلغاء توقيت الممر #${laneIndex}`);
    }
  };

  // Assign or change student for a lane
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

  // Swap ranks between two finished positions
  const handleSwapRanks = (rankAIndex: number, rankBIndex: number) => {
    if (rankAIndex < 0 || rankBIndex < 0 || rankAIndex >= rankedRunners.length || rankBIndex >= rankedRunners.length) {
      return;
    }

    const runnerA = rankedRunners[rankAIndex];
    const runnerB = rankedRunners[rankBIndex];

    const timeA = runnerA.recordedTime;
    const timeB = runnerB.recordedTime;

    if (timeA === undefined || timeB === undefined) return;

    setSelectedRunners(prev => prev.map(r => {
      if (r.laneIndex === runnerA.laneIndex) {
        return { ...r, recordedTime: timeB };
      }
      if (r.laneIndex === runnerB.laneIndex) {
        return { ...r, recordedTime: timeA };
      }
      return r;
    }));

    setHasUnsavedChanges(true);
    setIsBatchSaved(false);
    playBeep(880, 0.1);
    showFeedback(`تم تبديل المركزين بنجاح (${runnerA.rankTitle} ⇋ ${runnerB.rankTitle}) - اضغط حفظ لتثبيت التعديل`);
  };

  // Edit recorded time manually for a specific lane
  const handleStartEditTime = (laneIndex: number, currentTime?: number) => {
    setEditingLaneIndex(laneIndex);
    setTempEditTime(currentTime !== undefined ? String(currentTime) : '');
  };

  const handleSaveEditedTime = (laneIndex: number) => {
    const parsedTime = parseFloat(tempEditTime);
    if (isNaN(parsedTime) || parsedTime <= 0) {
      showFeedback('يرجى إدخال زمن صحيح (مثال: 4.35)');
      return;
    }

    const roundedTime = Number(parsedTime.toFixed(2));

    setSelectedRunners(prev => prev.map(r =>
      r.laneIndex === laneIndex ? { ...r, recordedTime: roundedTime, isFinished: true } : r
    ));

    setEditingLaneIndex(null);
    setHasUnsavedChanges(true);
    setIsBatchSaved(false);
    playBeep(980, 0.1);
    showFeedback(`تم تعديل توقيت الممر #${laneIndex} إلى ${roundedTime}ث (اضغط حفظ النتائج لتثبيتها بالسجل)`);
  };

  // Prepare next run with clean unassigned lanes for manual post-race assignment
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
    showFeedback('تم تجهيز الفوج التالي - الانطلاق والتعيين اليدوي جاهز');
  };

  // Overall completed results in class
  const completedResults = useMemo(() => {
    return students
      .map(s => {
        const res = physicalResults.find(r => String(r.numeroEleve) === String(s.numeroEleve));
        const val = (res as any)?.[raceConfig.field];
        let score = (res as any)?.[raceConfig.scoreField];
        if (score === undefined && raceConfig.scoreField === 'scoreVitesse30m') {
          score = res?.scoreVitesse;
        }
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
        
        {/* Top Header - Ultra Slim & Simple Title */}
        <div className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black flex items-center gap-1">
              <span>⚡</span>
              <span>سباق الجري</span>
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

        {/* Compact Single-Row: Race Event Dropdown & Class Dropdown Side by Side */}
        <div className="px-3 sm:px-4 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* مسابقة الجري كلائحة منسدلة */}
            <div className="flex items-center gap-1">
              <label className="font-bold text-gray-700 dark:text-gray-300 shrink-0">مسابقة الجري:</label>
              <select
                value={currentTestType}
                onChange={(e) => setCurrentTestType(e.target.value as RaceTestType)}
                disabled={testState !== 'idle'}
                className="px-2 py-1 font-bold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 cursor-pointer text-gray-900 dark:text-white shadow-2xs text-xs"
              >
                <option value="speed">⚡ سباق السرعة (30 م)</option>
                <option value="speed-60">⚡ سباق السرعة (60 م)</option>
                <option value="speed-80">⚡ سباق السرعة (80 م)</option>
                <option value="speed-100">⚡ سباق السرعة (100 م)</option>
                <option value="endurance">🏃‍♂️ السرعة المتوسطة (التحمل 1000م / 600م)</option>
                <option value="relay">🎽 سباق التتابع (4 × 50 م)</option>
              </select>
            </div>

            {/* لائحة القسم قرب لائحة المسابقة */}
            <div className="flex items-center gap-1">
              <label className="font-bold text-gray-700 dark:text-gray-300 shrink-0">القسم:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={testState !== 'idle'}
                className="px-2 py-1 font-bold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 cursor-pointer text-gray-900 dark:text-white shadow-2xs text-xs"
              >
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body: DIRECT STOPWATCH & LIVE ARRIVAL RECORDING */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-5 flex-grow custom-scrollbar">

          {/* ========================================================= */}
          {/* STOPWATCH & LIVE ARRIVAL RECORDING                        */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 text-white rounded-3xl shadow-xl border border-gray-700 relative overflow-hidden space-y-2.5">
            <div className="text-[11px] font-black text-amber-400 uppercase tracking-widest text-center">
              {raceConfig.counterLabel}
            </div>

            {/* Giant Digital Stopwatch */}
            {raceConfig.isMinutes ? (
              <div className="flex items-baseline justify-center font-mono font-black text-amber-400 drop-shadow-md my-0.5 flex-wrap text-center">
                <span className="text-4xl xs:text-5xl sm:text-6xl tracking-wider">
                  {Math.floor(elapsedTime / 60000).toString().padStart(2, '0')}:{Math.floor((elapsedTime % 60000) / 1000).toString().padStart(2, '0')}
                </span>
                <span className="text-xl xs:text-2xl text-amber-200/80 ms-1 font-mono">
                  .{Math.floor((elapsedTime % 1000) / 10).toString().padStart(2, '0')}
                </span>
                <span className="text-sm xs:text-base text-amber-100 font-sans font-bold ms-2">دقيقة</span>
              </div>
            ) : (
              <div className="text-4xl xs:text-5xl sm:text-6xl font-mono font-black tracking-wider text-amber-400 drop-shadow-md my-0.5">
                {formattedSeconds} <span className="text-lg sm:text-xl font-bold text-gray-400">ثانية</span>
              </div>
            )}

            {/* DYNAMIC FINISHER TAP BUTTON (بشكل مطول وعرض أقصر) */}
            <div className="w-full flex justify-center px-1 my-1">
              <button
                type="button"
                onClick={recordNextFinisher}
                className="w-40 sm:w-44 py-6 px-3 bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-gray-950 font-black rounded-3xl shadow-xl shadow-amber-500/30 border-2 border-amber-200 transition-all transform active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-2 text-center min-h-[135px]"
              >
                <span className="text-3xl animate-bounce">🏁</span>
                <div className="text-xs sm:text-sm font-black text-gray-950 leading-tight">
                  {testState === 'idle'
                    ? 'انقر للبدء 🚀'
                    : `تسجيل وصول:\nالمركز ${nextFinisherRankTitle}`}
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
                  <span>بدء السباق 🚀</span>
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
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg transition cursor-pointer text-xs sm:text-sm"
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
                  <TrophyIcon className="w-4 h-4 text-amber-500" />
                  <span>ترتيب الواصلين:</span>
                </h4>

                {/* Status Badge */}
                {isBatchSaved ? (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black rounded-xl border border-emerald-300 flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم حفظ نتائج هذا الفوج ✓</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl">
                    الواصلون: {finishedCount}
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
                                {runner.student ? runner.student.nomEleve : `متسابق الممر #${runner.laneIndex}`}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                <span className="font-bold">الممر: #{runner.laneIndex}</span>
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

                        {/* Recorded Time, Score & Edit Controls */}
                        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
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
                                {raceConfig.isMinutes 
                                  ? `${formatSecondsToMinSec(runner.recordedTime)} د` 
                                  : `${runner.recordedTime?.toFixed(2)} ث`}
                              </span>
                              {runner.speedKmH && (
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                  ({runner.speedKmH} كم/س)
                                </span>
                              )}
                              {typeof runner.score === 'number' && !isNaN(runner.score) && (
                                <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-white/70 dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-amber-300/60">
                                  {runner.score}/20
                                </span>
                              )}
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
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
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
                            className="w-full text-xs font-bold py-2 px-3 rounded-lg bg-white dark:bg-gray-800 border border-amber-400 dark:border-amber-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                          >
                            <option value="">-- 👤 اختر التلميذ الفائز بالمركز ({runner.rankTitle}) --</option>
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
                  className="px-4 py-2.5 text-xs sm:text-sm font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>الفوج التالي ⏩</span>
                </button>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 4: جدول النتائج الإجمالية للقسم                      */}
          {/* ========================================================= */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-amber-500" />
                <span>جدول النتائج الإجمالية المسجلة بالقسم ({completedResults.length} تلميذ/ة):</span>
              </h3>
            </div>

            {completedResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed">
                لم يتم حفظ أي نتيجة في {raceConfig.title} لهذا القسم بعد.
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
                        <tr key={`${student.numeroEleve}_${idx}`} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors">
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
                          <td className="p-2 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                            {raceConfig.isMinutes ? formatSecondsToMinSec(timeSec) : `${timeSec} ث`}
                          </td>
                          <td className="p-2 font-mono text-indigo-600 dark:text-indigo-400">
                            {speedKmH}
                          </td>
                          <td className="p-2 font-bold text-amber-600 dark:text-amber-400">
                            {typeof score === 'number' && !isNaN(score) ? `${score}/20` : '-'}
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTableStudentToEdit({ numeroEleve: student.numeroEleve, nomEleve: student.nomEleve, currentTime: timeSec || 0 });
                                setTableEditTimeInput(String(timeSec || ''));
                              }}
                              className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                              title="تعديل النتيجة"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => setStudentToDelete({ numeroEleve: student.numeroEleve, nomEleve: student.nomEleve })}
                              className="p-1 text-gray-400 hover:text-rose-600 transition"
                              title="حذف النتيجة"
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

        {/* Modal Footer */}
        <div className="p-4 bg-gray-100 dark:bg-gray-700/80 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            📊 مجموع التلاميذ الذين اجتازوا الاختبار: <strong className="text-gray-800 dark:text-gray-200">{completedResults.length}</strong> من <strong className="text-gray-800 dark:text-gray-200">{students.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>

      {/* Edit Recorded Time Modal */}
      {tableStudentToEdit && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-200 dark:border-gray-700 max-w-sm w-full space-y-4">
            <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              <PencilSquareIcon className="w-5 h-5 text-indigo-500" />
              <span>تعديل توقيت: {tableStudentToEdit.nomEleve}</span>
            </h4>
            <div>
              <label className="text-xs text-gray-500 font-bold block mb-1">
                الزمن الجديد {raceConfig.isMinutes ? '(بالثواني)' : '(بالثواني)'}:
              </label>
              <input
                type="number"
                step="0.01"
                value={tableEditTimeInput}
                onChange={(e) => setTableEditTimeInput(e.target.value)}
                className="w-full py-2 px-3 text-center text-sm font-mono font-black bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setTableStudentToEdit(null)}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveTableEditTime}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {studentToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border border-gray-200 dark:border-gray-700 max-w-sm w-full space-y-4">
            <h4 className="text-sm font-black text-rose-600 flex items-center gap-2">
              <TrashIcon className="w-5 h-5" />
              <span>تأكيد حذف النتيجة</span>
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              هل أنت متأكد من رغبتك في حذف نتيجة التلميذ <strong>«{studentToDelete.nomEleve}»</strong> من {raceConfig.title}؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
