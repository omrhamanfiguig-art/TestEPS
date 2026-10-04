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
  StopIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon
} from './Icons';
import { StudentAvatar } from './StudentAvatar';
import { 
  calculateScore, 
  getCustomScale,
  formatSecondsToMinSec, 
  formatMinSecWithLabel,
  SPEED_SCALE_30M, 
  LONG_JUMP_SCALE, 
  SHOT_PUT_SCALE, 
  ENDURANCE_SCALE_1000M 
} from '../utils/ScoringConstants';

interface AthleticsTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass: string;
  testType: 'speed' | 'speed-60' | 'speed-80' | 'speed-100' | 'endurance' | 'long-jump' | 'shot-put';
  onDataSaved?: () => void;
}

interface RankedResult {
  rank: number;
  timeMs: number;
  studentNumber: string;
}

export const AthleticsTestModal: React.FC<AthleticsTestModalProps> = ({
  isOpen,
  onClose,
  initialClass,
  testType,
  onDataSaved,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [physicalResults, setPhysicalResults] = useState<PhysicalTests[]>([]);
  
  // Number of attempts for Field tests (القفز الطولي / دفع الجلة): 1, 2, or 3 attempts
  const [attemptCount, setAttemptCount] = useState<1 | 2 | 3>(3);
  
  // Local state for attempt values per student: { [studentNumber]: [attempt1, attempt2, attempt3] }
  const [attemptsState, setAttemptsState] = useState<Record<string, (string | number | undefined)[]>>({});

  // View mode for field tests: 'cards' or 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TESTED' | 'UNTESTED'>('ALL');

  // Feedback toast
  const [feedback, setFeedback] = useState<string | null>(null);

  // Race state
  const [testState, setTestState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const [rankedResults, setRankedResults] = useState<RankedResult[]>([]);
  const [runnerCount, setRunnerCount] = useState<number>(4);

  const isFieldTest = testType === 'long-jump' || testType === 'shot-put';
  const isRace = testType === 'speed' || testType === 'speed-60' || testType === 'speed-80' || testType === 'speed-100' || testType === 'endurance';

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    if (isOpen) {
      loadClasses();
      loadClassData(selectedClass || initialClass);
    }
  }, [isOpen, selectedClass]);

  const loadClasses = async () => {
    const clsList = await getAllClasses();
    setClasses(clsList.map(c => c.className));
  };

  const loadClassData = async (clsName: string) => {
    if (!clsName) return;
    const rawStudents = await getStudentList(clsName);
    const rawPhys = await getPhysicalTests(clsName);
    setStudents(rawStudents || []);
    setPhysicalResults(rawPhys || []);

    // Initialize attempts state from saved DB data
    const initialAttempts: Record<string, (string | number | undefined)[]> = {};
    (rawStudents || []).forEach(s => {
      const res = (rawPhys || []).find(p => String(p.numeroEleve) === String(s.numeroEleve));
      if (res) {
        if (testType === 'long-jump') {
          if (res.sautLongAttempts && Array.isArray(res.sautLongAttempts) && res.sautLongAttempts.length > 0) {
            initialAttempts[s.numeroEleve] = [res.sautLongAttempts[0] ?? '', res.sautLongAttempts[1] ?? '', res.sautLongAttempts[2] ?? ''];
          } else if (res.sautLong !== undefined && res.sautLong !== null) {
            initialAttempts[s.numeroEleve] = [res.sautLong, '', ''];
          } else {
            initialAttempts[s.numeroEleve] = ['', '', ''];
          }
        } else if (testType === 'shot-put') {
          if (res.lancerPoidsAttempts && Array.isArray(res.lancerPoidsAttempts) && res.lancerPoidsAttempts.length > 0) {
            initialAttempts[s.numeroEleve] = [res.lancerPoidsAttempts[0] ?? '', res.lancerPoidsAttempts[1] ?? '', res.lancerPoidsAttempts[2] ?? ''];
          } else if (res.lancerPoids !== undefined && res.lancerPoids !== null) {
            initialAttempts[s.numeroEleve] = [res.lancerPoids, '', ''];
          } else {
            initialAttempts[s.numeroEleve] = ['', '', ''];
          }
        }
      } else {
        initialAttempts[s.numeroEleve] = ['', '', ''];
      }
    });
    setAttemptsState(initialAttempts);
  };

  // Timer loop for race tests
  useEffect(() => {
    let interval: any;
    if (testState === 'running') {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 16);
    }
    return () => clearInterval(interval);
  }, [testState]);

  const startTimer = () => {
    if (testState === 'idle') {
      startTimeRef.current = Date.now();
    } else if (testState === 'paused') {
      startTimeRef.current = Date.now() - elapsedTime;
    }
    setTestState('running');
  };

  const pauseTimer = () => setTestState('paused');
  
  const recordRank = () => {
    if (testState !== 'running') return;
    const rank = rankedResults.length + 1;
    setRankedResults([...rankedResults, { rank, timeMs: elapsedTime, studentNumber: '' }]);
    if (rank >= runnerCount) {
      setTestState('finished');
    }
  };

  const resetTest = () => {
    setTestState('idle');
    setElapsedTime(0);
    setRankedResults([]);
  };

  const handleAssignStudent = async (rankIdx: number, studentNum: string) => {
    const updated = [...rankedResults];
    updated[rankIdx].studentNumber = studentNum;
    setRankedResults(updated);

    if (studentNum) {
      await saveResult(studentNum, updated[rankIdx].timeMs / 1000);
    }
  };

  // Field test handler: updates one attempt value for a student, auto-determines the best attempt, and saves
  const handleAttemptChange = async (studentNum: string, attemptIndex: number, rawVal: string) => {
    const current = attemptsState[studentNum] ? [...attemptsState[studentNum]] : ['', '', ''];
    while (current.length < 3) current.push('');
    
    current[attemptIndex] = rawVal;
    
    setAttemptsState(prev => ({
      ...prev,
      [studentNum]: current
    }));

    // Parse valid numeric attempts up to active attemptCount
    const validAttempts: number[] = [];
    for (let i = 0; i < attemptCount; i++) {
      const v = current[i];
      if (v !== undefined && v !== '' && v !== null) {
        const parsed = parseFloat(String(v));
        if (!isNaN(parsed) && parsed > 0) {
          validAttempts.push(parsed);
        }
      }
    }

    const studentObj = students.find(s => String(s.numeroEleve) === String(studentNum));
    if (!studentObj) return;

    const currentPhys = [...physicalResults];
    const existingIdx = currentPhys.findIndex(p => String(p.numeroEleve) === String(studentNum));
    
    const isLongJump = testType === 'long-jump';
    const mainField = isLongJump ? 'sautLong' : 'lancerPoids';
    const attemptsField = isLongJump ? 'sautLongAttempts' : 'lancerPoidsAttempts';
    const scoreField = isLongJump ? 'scoreSautLong' : 'scoreLancerPoids';
    const scale = getCustomScale(testType);

    // Filter array of up to attemptCount items to store in DB
    const storedAttemptsArray = current.slice(0, attemptCount).map(val => {
      if (val === undefined || val === '' || val === null) return 0;
      const num = parseFloat(String(val));
      return isNaN(num) ? 0 : num;
    });

    if (validAttempts.length > 0) {
      const bestVal = Math.max(...validAttempts);
      const score = calculateScore(bestVal, scale, studentObj.sexe || 'M', false);

      const updatedItem: any = {
        ...(existingIdx >= 0 ? currentPhys[existingIdx] : {}),
        numeroEleve: String(studentNum),
        nomEleve: studentObj.nomEleve,
        sexe: studentObj.sexe,
        [mainField]: bestVal,
        [attemptsField]: storedAttemptsArray,
        [scoreField]: score,
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
    } else {
      // If all attempts cleared, remove the result
      if (existingIdx >= 0) {
        const updatedItem = { ...currentPhys[existingIdx] };
        delete (updatedItem as any)[mainField];
        delete (updatedItem as any)[attemptsField];
        delete (updatedItem as any)[scoreField];
        currentPhys[existingIdx] = updatedItem;
        setPhysicalResults(currentPhys);
        await savePhysicalTests(selectedClass, currentPhys);
        window.dispatchEvent(new CustomEvent('dbUpdated'));
        if (onDataSaved) onDataSaved();
      }
    }
  };

  // Clear all attempts for a single student
  const handleClearStudentAttempts = async (studentNum: string) => {
    setAttemptsState(prev => ({
      ...prev,
      [studentNum]: ['', '', '']
    }));

    const currentPhys = [...physicalResults];
    const existingIdx = currentPhys.findIndex(p => String(p.numeroEleve) === String(studentNum));
    if (existingIdx >= 0) {
      const updatedItem = { ...currentPhys[existingIdx] };
      if (testType === 'long-jump') {
        delete updatedItem.sautLong;
        delete updatedItem.sautLongAttempts;
        delete updatedItem.scoreSautLong;
      } else {
        delete updatedItem.lancerPoids;
        delete updatedItem.lancerPoidsAttempts;
        delete updatedItem.scoreLancerPoids;
      }
      currentPhys[existingIdx] = updatedItem;
      setPhysicalResults(currentPhys);
      await savePhysicalTests(selectedClass, currentPhys);
      window.dispatchEvent(new CustomEvent('dbUpdated'));
      if (onDataSaved) onDataSaved();
      showToast('تم مسح محاولات التلميذ');
    }
  };

  // Helper to compute best attempt & metadata for a student
  const getStudentBestInfo = (studentNum: string) => {
    const arr = attemptsState[studentNum] || [];
    const valid: { val: number; index: number }[] = [];
    
    for (let i = 0; i < attemptCount; i++) {
      const v = arr[i];
      if (v !== undefined && v !== '' && v !== null) {
        const num = parseFloat(String(v));
        if (!isNaN(num) && num > 0) {
          valid.push({ val: num, index: i });
        }
      }
    }

    if (valid.length === 0) return { bestVal: undefined, bestAttemptIndex: -1, attemptsFilledCount: 0 };

    let maxObj = valid[0];
    for (let i = 1; i < valid.length; i++) {
      if (valid[i].val > maxObj.val) {
        maxObj = valid[i];
      }
    }

    return {
      bestVal: maxObj.val,
      bestAttemptIndex: maxObj.index,
      attemptsFilledCount: valid.length
    };
  };

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.nomEleve.toLowerCase().includes(q);
        const matchNum = String(s.numeroEleve).includes(q) || (s.orderIndex && String(s.orderIndex).includes(q));
        if (!matchName && !matchNum) return false;
      }

      // Gender
      if (genderFilter !== 'ALL' && s.sexe !== genderFilter) return false;

      // Status
      const { bestVal } = getStudentBestInfo(s.numeroEleve);
      const isTested = bestVal !== undefined && bestVal > 0;
      if (statusFilter === 'TESTED' && !isTested) return false;
      if (statusFilter === 'UNTESTED' && isTested) return false;

      return true;
    });
  }, [students, searchQuery, genderFilter, statusFilter, attemptsState, attemptCount]);

  // Overall class ranking for field test
  const fieldClassRanking = useMemo(() => {
    if (!isFieldTest) return [];
    return students
      .map(s => {
        const { bestVal, bestAttemptIndex } = getStudentBestInfo(s.numeroEleve);
        const score = bestVal !== undefined ? calculateScore(bestVal, getCustomScale(testType), s.sexe || 'M', false) : undefined;
        return {
          student: s,
          bestVal,
          bestAttemptIndex,
          score
        };
      })
      .filter(item => item.bestVal !== undefined && item.bestVal > 0)
      .sort((a, b) => (b.bestVal || 0) - (a.bestVal || 0));
  }, [students, attemptsState, attemptCount, testType, isFieldTest]);

  // Statistics
  const stats = useMemo(() => {
    const testedCount = fieldClassRanking.length;
    const totalCount = students.length;
    const bestOverall = fieldClassRanking.length > 0 ? fieldClassRanking[0] : null;
    const avgScore = fieldClassRanking.length > 0 
      ? (fieldClassRanking.reduce((acc, curr) => acc + (curr.bestVal || 0), 0) / fieldClassRanking.length).toFixed(2)
      : null;
    return { testedCount, totalCount, bestOverall, avgScore };
  }, [fieldClassRanking, students]);

  // Save for Race tests
  const saveResult = async (studentNum: string, value: number) => {
    const student = students.find(s => String(s.numeroEleve) === String(studentNum));
    if (!student) return;

    const currentPhys = [...physicalResults];
    const existingIdx = currentPhys.findIndex(p => String(p.numeroEleve) === String(studentNum));
    
    const fieldMap: Record<string, keyof PhysicalTests> = {
      'speed': 'vitesse30m',
      'speed-60': 'vitesse60m',
      'speed-80': 'vitesse80m',
      'speed-100': 'vitesse100m',
      'endurance': 'enduranceTemps',
      'long-jump': 'sautLong',
      'shot-put': 'lancerPoids'
    };

    const field = fieldMap[testType];
    let actualScoreField: keyof PhysicalTests = 'scoreVitesse';
    let scale = getCustomScale(testType);
    let lowerIsBetter = true;

    if (testType === 'speed' || testType === 'speed-60' || testType === 'speed-80' || testType === 'speed-100') {
      actualScoreField = 'scoreVitesse';
      lowerIsBetter = true;
    } else if (testType === 'endurance') {
      actualScoreField = 'scoreEndurance';
      lowerIsBetter = true;
    } else if (testType === 'long-jump') {
      actualScoreField = 'scoreSautLong';
      lowerIsBetter = false;
    } else if (testType === 'shot-put') {
      actualScoreField = 'scoreLancerPoids';
      lowerIsBetter = false;
    }

    const score = calculateScore(value, scale, student.sexe || 'M', lowerIsBetter);

    const updatedItem: any = {
      ...(existingIdx >= 0 ? currentPhys[existingIdx] : {}),
      numeroEleve: String(studentNum),
      nomEleve: student.nomEleve,
      sexe: student.sexe,
      [field]: value,
      [actualScoreField]: score,
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

  const getTestTitle = () => {
    switch (testType) {
      case 'long-jump': return 'اختبار القفز الطولي (Saut en Longueur)';
      case 'shot-put': return 'اختبار دفع الجلة (Lancer de Poids)';
      case 'speed-60': return 'اختبار الجري السريع (60 م)';
      case 'speed-80': return 'اختبار الجري السريع (80 م)';
      case 'speed-100': return 'اختبار الجري السريع (100 م)';
      case 'endurance': return 'اختبار سباق السرعة المتوسطة (التحمل)';
      case 'speed':
      default:
        return 'اختبار الجري السريع (30 م)';
    }
  };

  const getTestUnit = () => {
    return isFieldTest ? 'متر (م)' : 'ثانية (ث)';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className={`px-5 py-3.5 ${
          testType === 'long-jump'
            ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700'
            : testType === 'shot-put'
            ? 'bg-gradient-to-r from-slate-700 via-gray-800 to-slate-900'
            : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700'
        } text-white flex items-center justify-between shrink-0 shadow-md`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-2xl backdrop-blur-md">
              <TrophyIcon className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black">{getTestTitle()}</h2>
                <span className="text-[10px] font-bold bg-black/30 px-2 py-0.5 rounded-full border border-white/20">
                  {selectedClass || 'قسم'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/80 font-medium">
                {isFieldTest 
                  ? 'تسجيل المحاولات (1 أو 2 أو 3 محاولات) وتحديد أحسن محاولة وحساب النقطة تلقائياً' 
                  : 'تسجيل التوقيت والترتيب التلقائي'}
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

        {/* Floating Feedback Toast */}
        {feedback && (
          <div className="bg-emerald-600 text-white text-xs font-black py-2 px-4 text-center shadow-lg transition-all animate-bounce flex items-center justify-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Top Controls Bar */}
        <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            
            {/* Class Selector */}
            <div className="flex items-center gap-2">
              <label className="font-bold text-gray-600 dark:text-gray-300 shrink-0">القسم:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs"
              >
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* ATTEMPTS SELECTOR FOR FIELD TESTS (1 محاولة أو 2 أو 3 محاولات) */}
            {isFieldTest && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-gray-700 dark:text-gray-200 flex items-center gap-1">
                  <span>🎯</span>
                  <span>عدد المحاولات لكل تلميذ:</span>
                </span>
                
                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-2xl border border-gray-300 dark:border-gray-600 shadow-2xs gap-1">
                  <button
                    type="button"
                    onClick={() => setAttemptCount(1)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1 ${
                      attemptCount === 1
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'
                    }`}
                  >
                    <span>1️⃣ محاولة واحدة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttemptCount(2)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1 ${
                      attemptCount === 2
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'
                    }`}
                  >
                    <span>2️⃣ محاولتان</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttemptCount(3)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1 ${
                      attemptCount === 3
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600'
                    }`}
                  >
                    <span>3️⃣ 3 محاولات (الرسمي)</span>
                  </button>
                </div>
              </div>
            )}

            {/* View Mode Switcher (Cards vs Table) */}
            {isFieldTest && (
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-300 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === 'cards' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' : 'text-gray-500'
                  }`}
                  title="عرض البطاقات المفصلة"
                >
                  🗂️ بطاقات
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition ${
                    viewMode === 'table' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' : 'text-gray-500'
                  }`}
                  title="عرض الجدول المدمج"
                >
                  📊 جدول
                </button>
              </div>
            )}
          </div>

          {/* Quick Summary Chips Banner for Field Test */}
          {isFieldTest && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <span className="font-bold text-indigo-900 dark:text-indigo-200">👥 نسبة الإنجاز:</span>
                <span className="font-mono font-black text-indigo-700 dark:text-indigo-300">
                  {stats.testedCount} / {stats.totalCount}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <span className="font-bold text-emerald-900 dark:text-emerald-200">🏆 أفضل إنجاز:</span>
                <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
                  {stats.bestOverall ? `${stats.bestOverall.bestVal} م` : '-'}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                <span className="font-bold text-amber-900 dark:text-amber-200">📈 المعدل العام:</span>
                <span className="font-mono font-black text-amber-700 dark:text-amber-300">
                  {stats.avgScore ? `${stats.avgScore} م` : '-'}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                <span className="font-bold text-purple-900 dark:text-purple-200">🎯 النظام المعتمد:</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">
                  أحسن محاولة من {attemptCount}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-grow custom-scrollbar">

          {/* ========================================================= */}
          {/* FIELD TESTS (القفز الطولي & دفع الجلة) مع نظام المحاولات     */}
          {/* ========================================================= */}
          {isFieldTest && (
            <div className="space-y-5">
              
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                
                {/* Search */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="ابحث باسم التلميذ أو رقمه..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 px-3 ps-8 text-xs font-bold bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      statusFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    الكل ({students.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('UNTESTED')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      statusFilter === 'UNTESTED' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    لم يختبروا ({students.length - stats.testedCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('TESTED')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      statusFilter === 'TESTED' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    تم اختبارهم ({stats.testedCount})
                  </button>

                  <span className="text-gray-300 dark:text-gray-600">|</span>

                  <button
                    type="button"
                    onClick={() => setGenderFilter(genderFilter === 'M' ? 'ALL' : 'M')}
                    className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
                      genderFilter === 'M' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    ذكور 👦
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenderFilter(genderFilter === 'F' ? 'ALL' : 'F')}
                    className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
                      genderFilter === 'F' ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                    }`}
                  >
                    إناث 👧
                  </button>
                </div>
              </div>

              {/* CARD VIEW: Responsive Grid of Interactive Student Cards */}
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map((s, idx) => {
                    const studentAttempts = attemptsState[s.numeroEleve] || ['', '', ''];
                    const { bestVal, bestAttemptIndex, attemptsFilledCount } = getStudentBestInfo(s.numeroEleve);
                    const isTested = bestVal !== undefined && bestVal > 0;
                    const scale = getCustomScale(testType);
                    const score = isTested ? calculateScore(bestVal, scale, s.sexe || 'M', false) : undefined;

                    return (
                      <div
                        key={s.numeroEleve}
                        className={`p-4 rounded-3xl border-2 transition-all shadow-sm flex flex-col justify-between gap-3.5 ${
                          isTested
                            ? 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-800/80 ring-1 ring-indigo-300/40'
                            : 'bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {/* Student Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <StudentAvatar
                              photoUrl={s.photoUrl}
                              nomEleve={s.nomEleve}
                              sexe={s.sexe}
                              size="sm"
                            />
                            <div>
                              <div className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span>{s.nomEleve}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                <span>#{s.orderIndex || (students.indexOf(s) + 1)}</span>
                                <span>•</span>
                                <span className={s.sexe === 'F' ? 'text-pink-600 font-bold' : 'text-blue-600 font-bold'}>
                                  {s.sexe === 'F' ? 'أنثى' : 'ذكر'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Score Badge */}
                          {score !== undefined ? (
                            <div className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1 ${
                              score >= 10
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                            }`}>
                              <span>{score}/20</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg">
                              لم يُسجل
                            </span>
                          )}
                        </div>

                        {/* ATTEMPTS INPUTS (1, 2, or 3 attempts) */}
                        <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
                            <span>المحاولات ({attemptCount}):</span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold">الوحدة: متر (م)</span>
                          </div>

                          <div className={`grid ${attemptCount === 1 ? 'grid-cols-1' : attemptCount === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                            {Array.from({ length: attemptCount }).map((_, attIdx) => {
                              const val = studentAttempts[attIdx] ?? '';
                              const isBest = isTested && bestAttemptIndex === attIdx;

                              return (
                                <div key={attIdx} className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 px-1">
                                    <span>م {attIdx + 1}</span>
                                    {isBest && <span className="text-amber-500 font-black animate-pulse">⭐ الأفضل</span>}
                                  </div>

                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={val}
                                      onChange={(e) => handleAttemptChange(s.numeroEleve, attIdx, e.target.value)}
                                      className={`w-full py-2 px-2 text-center text-xs font-mono font-black rounded-xl border transition-all focus:ring-2 focus:ring-indigo-500 ${
                                        isBest
                                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400 font-extrabold shadow-2xs'
                                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                                      }`}
                                    />
                                    <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">
                                      م
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Best Attempt Summary Strip */}
                        <div className="p-2 rounded-2xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200/80 dark:border-gray-600/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-500 font-bold">🏆</span>
                            <span className="font-bold text-gray-700 dark:text-gray-200">أحسن إنجاز:</span>
                            {bestVal !== undefined ? (
                              <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                {bestVal} م {bestAttemptIndex >= 0 ? `(م${bestAttemptIndex + 1})` : ''}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">بانتظار إدخال المحاولات</span>
                            )}
                          </div>

                          {isTested && (
                            <button
                              type="button"
                              onClick={() => handleClearStudentAttempts(s.numeroEleve)}
                              className="p-1 text-gray-400 hover:text-red-500 transition cursor-pointer"
                              title="مسح محاولات هذا التلميذ"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                /* TABLE VIEW: Compact Table for Fast Data Entry */
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="p-3 w-12">#</th>
                          <th className="p-3 text-right">الاسم والنسب</th>
                          <th className="p-3 w-16">الجنس</th>
                          <th className="p-3 w-28">المحاولة 1 (م)</th>
                          {attemptCount >= 2 && <th className="p-3 w-28">المحاولة 2 (م)</th>}
                          {attemptCount >= 3 && <th className="p-3 w-28">المحاولة 3 (م)</th>}
                          <th className="p-3 w-32 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200">
                            ⭐ أحسن محاولة (م)
                          </th>
                          <th className="p-3 w-24">النقطة (/20)</th>
                          <th className="p-3 w-12">مسح</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredStudents.map((s, idx) => {
                          const studentAttempts = attemptsState[s.numeroEleve] || ['', '', ''];
                          const { bestVal, bestAttemptIndex } = getStudentBestInfo(s.numeroEleve);
                          const isTested = bestVal !== undefined && bestVal > 0;
                          const scale = getCustomScale(testType);
                          const score = isTested ? calculateScore(bestVal, scale, s.sexe || 'M', false) : undefined;

                          return (
                            <tr key={s.numeroEleve} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
                              <td className="p-2.5 font-bold text-gray-500 font-mono">
                                #{s.orderIndex || (idx + 1)}
                              </td>
                              <td className="p-2.5 text-right font-bold text-gray-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                  <StudentAvatar photoUrl={s.photoUrl} nomEleve={s.nomEleve} sexe={s.sexe} size="xs" />
                                  <span>{s.nomEleve}</span>
                                </div>
                              </td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  s.sexe === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {s.sexe === 'F' ? 'أنثى' : 'ذكر'}
                                </span>
                              </td>

                              {/* Attempt 1 */}
                              <td className="p-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={studentAttempts[0] ?? ''}
                                  onChange={(e) => handleAttemptChange(s.numeroEleve, 0, e.target.value)}
                                  className={`w-24 py-1.5 px-2 text-center text-xs font-mono font-bold rounded-lg border ${
                                    bestAttemptIndex === 0 ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 font-black' : 'bg-gray-50 dark:bg-gray-700'
                                  }`}
                                />
                              </td>

                              {/* Attempt 2 */}
                              {attemptCount >= 2 && (
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={studentAttempts[1] ?? ''}
                                    onChange={(e) => handleAttemptChange(s.numeroEleve, 1, e.target.value)}
                                    className={`w-24 py-1.5 px-2 text-center text-xs font-mono font-bold rounded-lg border ${
                                      bestAttemptIndex === 1 ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 font-black' : 'bg-gray-50 dark:bg-gray-700'
                                    }`}
                                  />
                                </td>
                              )}

                              {/* Attempt 3 */}
                              {attemptCount >= 3 && (
                                <td className="p-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={studentAttempts[2] ?? ''}
                                    onChange={(e) => handleAttemptChange(s.numeroEleve, 2, e.target.value)}
                                    className={`w-24 py-1.5 px-2 text-center text-xs font-mono font-bold rounded-lg border ${
                                      bestAttemptIndex === 2 ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 font-black' : 'bg-gray-50 dark:bg-gray-700'
                                    }`}
                                  />
                                </td>
                              )}

                              {/* Best Attempt */}
                              <td className="p-2.5 font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm bg-indigo-50/50 dark:bg-indigo-950/30">
                                {bestVal !== undefined ? `${bestVal} م` : '-'}
                              </td>

                              {/* Score */}
                              <td className="p-2.5 font-mono font-black text-emerald-600 dark:text-emerald-400">
                                {score !== undefined ? `${score} / 20` : '-'}
                              </td>

                              {/* Clear */}
                              <td className="p-2">
                                {isTested && (
                                  <button
                                    type="button"
                                    onClick={() => handleClearStudentAttempts(s.numeroEleve)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition"
                                    title="مسح محاولات هذا التلميذ"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Class Podium & Top Results Section */}
              {fieldClassRanking.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2.5">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <TrophyIcon className="w-5 h-5 text-amber-500" />
                      <span>ترتيب أفضل النتائج في القسم ({fieldClassRanking.length} تلميذ):</span>
                    </h3>
                    <span className="text-xs text-gray-500 font-bold">مرتبة تنازلياً حسب أفضل إنجاز</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {fieldClassRanking.slice(0, 3).map((item, idx) => (
                      <div
                        key={item.student.numeroEleve}
                        className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                          idx === 0
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-950 dark:text-amber-100 shadow-sm'
                            : idx === 1
                            ? 'bg-slate-50 dark:bg-slate-800 border-slate-300'
                            : 'bg-orange-50 dark:bg-orange-950/20 border-orange-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                          <div>
                            <div className="font-black text-xs sm:text-sm">{item.student.nomEleve}</div>
                            <div className="text-[10px] text-gray-500">#{item.student.orderIndex || (idx + 1)}</div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-300">
                            {item.bestVal} م
                          </div>
                          <div className="text-[10px] font-bold text-emerald-600">
                            {item.score !== undefined ? `${item.score}/20` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* RACE TESTS (سباقات السرعة والتحمل القديمة أو البسيطة)          */}
          {/* ========================================================= */}
          {isRace && (
            <div className="space-y-6">
              <div className="bg-gray-900 text-white p-8 rounded-3xl text-center space-y-4">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                  {testType === 'endurance' ? 'عداد وقت سباق التحمل (دقائق : ثواني)' : 'عداد وقت سباق السرعة (ثواني)'}
                </div>

                <div className="text-5xl sm:text-6xl font-mono font-black text-amber-400">
                  {testType === 'endurance' ? (
                    <>
                      {formatSecondsToMinSec(Math.floor(elapsedTime / 1000), true)}
                      <span className="text-2xl text-amber-200/80">.{Math.floor((elapsedTime % 1000) / 100)}</span>
                      <span className="text-lg font-sans text-gray-400 ms-2">(د:ث)</span>
                    </>
                  ) : (
                    <>
                      {(elapsedTime / 1000).toFixed(2)} <span className="text-xl text-gray-400">ثانية</span>
                    </>
                  )}
                </div>
                <div className="flex justify-center gap-4">
                  {testState === 'idle' && (
                    <button onClick={startTimer} className="bg-emerald-600 p-4 rounded-2xl hover:bg-emerald-500 transition cursor-pointer">
                      <PlayIcon className="w-8 h-8 fill-current" />
                    </button>
                  )}
                  {testState === 'running' && (
                    <>
                      <button onClick={pauseTimer} className="bg-amber-500 p-4 rounded-2xl hover:bg-amber-400 transition cursor-pointer">
                        <PauseIcon className="w-8 h-8" />
                      </button>
                      <button onClick={recordRank} className="bg-indigo-600 px-8 py-4 rounded-2xl hover:bg-indigo-500 font-bold text-xl transition cursor-pointer">
                        وصول المتسابق ({rankedResults.length + 1})
                      </button>
                    </>
                  )}
                  {(testState === 'paused' || testState === 'finished') && (
                    <button onClick={resetTest} className="bg-gray-700 p-4 rounded-2xl hover:bg-gray-600 transition cursor-pointer">
                      <ArrowPathIcon className="w-8 h-8" />
                    </button>
                  )}
                </div>
              </div>

              {/* Ranks and Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rankedResults.map((res, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                        {res.rank}
                      </span>
                      <div>
                        <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                          {testType === 'endurance' 
                            ? `${formatSecondsToMinSec(res.timeMs / 1000)} (${formatMinSecWithLabel(res.timeMs / 1000)})` 
                            : `${(res.timeMs / 1000).toFixed(2)} ث`}
                        </div>
                        <div className="text-xs text-gray-500">المركز {res.rank}</div>
                      </div>
                    </div>
                    <select
                      value={res.studentNumber}
                      onChange={(e) => handleAssignStudent(idx, e.target.value)}
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="">-- اختر المتسابق --</option>
                      {students.map((s, sIdx) => {
                        const numDisplay = s.orderIndex || (sIdx + 1);
                        return (
                          <option key={s.numeroEleve} value={s.numeroEleve}>
                            #{numDisplay} - {s.nomEleve}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isFieldTest 
              ? 'يتم تحديد أحسن محاولة وحساب النقطة وحفظها بالسجل تلقائياً فور كتابة الأداء.' 
              : 'يتم حفظ البيانات تلقائياً عند تسجيل النتيجة.'}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 rounded-xl font-bold text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
