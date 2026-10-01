
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
  ArrowDownTrayIcon
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
  testType: 'speed' | 'speed-60' | 'speed-80' | 'endurance' | 'long-jump' | 'shot-put';
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
  
  // Race state
  const [testState, setTestState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const [rankedResults, setRankedResults] = useState<RankedResult[]>([]);
  const [runnerCount, setRunnerCount] = useState<number>(4);

  // Jump/Put state (Non-race tests)
  const [jumpValues, setJumpValues] = useState<Record<string, number>>({});

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
    setStudents(rawStudents);
    setPhysicalResults(rawPhys);
  };

  // Timer loop
  useEffect(() => {
    let interval: any;
    if (testState === 'running') {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 10);
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
    const oldStudent = updated[rankIdx].studentNumber;
    updated[rankIdx].studentNumber = studentNum;
    setRankedResults(updated);

    if (studentNum) {
      await saveResult(studentNum, updated[rankIdx].timeMs / 1000);
    }
  };

  const saveResult = async (studentNum: string, value: number) => {
    const student = students.find(s => s.numeroEleve === studentNum);
    if (!student) return;

    const currentPhys = [...physicalResults];
    const existingIdx = currentPhys.findIndex(p => p.numeroEleve === studentNum);
    
    const fieldMap = {
      'speed': 'vitesse30m',
      'speed-60': 'vitesse60m',
      'speed-80': 'vitesse80m',
      'endurance': 'enduranceTemps',
      'long-jump': 'sautLong',
      'shot-put': 'lancerPoids'
    } as const;

    const field = fieldMap[testType];
    
    // Explicit mapping for score fields
    let actualScoreField = '';
    let scale = getCustomScale(testType);
    let lowerIsBetter = true;

    if (testType === 'speed' || testType === 'speed-60' || testType === 'speed-80') {
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
      numeroEleve: studentNum,
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

  const isRace = testType === 'speed' || testType === 'endurance';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrophyIcon className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">
                {testType === 'speed' && 'اختبار الجري السريع (30 م)'}
                {testType === 'speed-60' && 'اختبار الجري السريع (60 م)'}
                {testType === 'speed-80' && 'اختبار الجري السريع (80 م)'}
                {testType === 'endurance' && 'اختبار الجري المسافات المتوسطة'}
                {testType === 'long-jump' && 'اختبار القفز الطولي'}
                {testType === 'shot-put' && 'اختبار دفع الجلة'}
              </h2>
              <p className="text-xs opacity-80">تسجيل النتائج والتقويم التلقائي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Class Select */}
          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-2">
              <label className="text-sm font-bold">القسم:</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 rounded-xl px-3 py-1.5 text-sm"
              >
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {isRace && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold">عدد المشاركين:</label>
                <input 
                  type="number" 
                  min={1} 
                  max={20} 
                  value={runnerCount} 
                  onChange={(e) => setRunnerCount(parseInt(e.target.value))}
                  className="w-16 bg-gray-50 dark:bg-gray-700 border border-gray-300 rounded-xl px-3 py-1.5 text-sm"
                />
              </div>
            )}
          </div>

          {isRace ? (
            /* Race UI */
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
                    <button onClick={startTimer} className="bg-emerald-600 p-4 rounded-2xl hover:bg-emerald-500">
                      <PlayIcon className="w-8 h-8 fill-current" />
                    </button>
                  )}
                  {testState === 'running' && (
                    <>
                      <button onClick={pauseTimer} className="bg-amber-500 p-4 rounded-2xl hover:bg-amber-400">
                        <PauseIcon className="w-8 h-8" />
                      </button>
                      <button onClick={recordRank} className="bg-indigo-600 px-8 py-4 rounded-2xl hover:bg-indigo-500 font-bold text-xl">
                        وصول المتسابق ({rankedResults.length + 1})
                      </button>
                    </>
                  )}
                  {(testState === 'paused' || testState === 'finished') && (
                    <button onClick={resetTest} className="bg-gray-700 p-4 rounded-2xl hover:bg-gray-600">
                      <ArrowPathIcon className="w-8 h-8" />
                    </button>
                  )}
                </div>
              </div>

              {/* Ranks and Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rankedResults.map((res, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-200 flex items-center justify-between gap-4">
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
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="">-- اختر المتسابق --</option>
                      {students.map(s => (
                        <option key={s.numeroEleve} value={s.numeroEleve}>
                          {s.nomEleve} (#{s.numeroEleve})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Field UI (Jump/Put) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map(s => {
                const res = physicalResults.find(r => r.numeroEleve === s.numeroEleve);
                const field = testType === 'long-jump' ? 'sautLong' : 'lancerPoids';
                const val = (res as any)?.[field];
                const scoreField = testType === 'long-jump' ? 'scoreSautLong' : 'scoreLancerPoids';
                const score = (res as any)?.[scoreField];

                return (
                  <div key={s.numeroEleve} className="p-4 bg-white dark:bg-gray-700 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                      <StudentAvatar photoUrl={s.photoUrl} nomEleve={s.nomEleve} sexe={s.sexe} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{s.nomEleve}</div>
                        <div className="text-xs text-gray-500">#{s.numeroEleve}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="الأداء (م)"
                        defaultValue={val || ''}
                        onBlur={(e) => saveResult(s.numeroEleve, parseFloat(e.target.value))}
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold text-center"
                      />
                      <div className={`px-3 py-2 rounded-xl text-sm font-black ${score >= 10 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {score !== undefined ? score : '-'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">يتم حفظ البيانات تلقائياً عند اختيار التلميذ أو الخروج من الحقل</p>
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-xl font-bold">إغلاق</button>
        </div>
      </div>
    </div>
  );
};
