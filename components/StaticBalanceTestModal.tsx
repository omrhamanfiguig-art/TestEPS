
import React, { useState, useEffect, useRef } from 'react';
import { StudentIdentity, PhysicalTests } from '../types';
import { getStudentList, getPhysicalTests, savePhysicalTests, getAllClasses } from '../utils/db';
import { 
  XMarkIcon, 
  PlayIcon, 
  PauseIcon,
  ArrowPathIcon, 
  CheckCircleIcon, 
  UserGroupIcon, 
  TrophyIcon,
  SparklesIcon
} from './Icons';
import { StudentAvatar } from './StudentAvatar';

interface StaticBalanceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass: string;
  onDataSaved?: () => void;
}

interface BalanceParticipant {
  studentNumber: string;
  timeMs?: number;
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
  
  const [testState, setTestState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const [participantCount, setParticipantCount] = useState<number>(10);
  const [participants, setParticipants] = useState<BalanceParticipant[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadClasses();
      loadClassData(selectedClass || initialClass);
    }
  }, [isOpen, selectedClass]);

  useEffect(() => {
    // Initialize participants when count changes or data loads
    const initialParticipants: BalanceParticipant[] = Array.from({ length: participantCount }, () => ({
      studentNumber: '',
      isFinished: false
    }));
    setParticipants(initialParticipants);
  }, [participantCount, isOpen]);

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
  
  const recordFinish = async (idx: number) => {
    if (testState !== 'running') return;
    const updated = [...participants];
    if (updated[idx].isFinished) return;

    const timeSec = parseFloat((elapsedTime / 1000).toFixed(1));
    updated[idx].timeMs = elapsedTime;
    updated[idx].isFinished = true;
    setParticipants(updated);

    if (updated[idx].studentNumber) {
      await saveBalanceResult(updated[idx].studentNumber, timeSec);
    }

    if (updated.every(p => p.isFinished || !p.studentNumber)) {
      // Check if all active participants are done
      const activeParticipants = updated.filter(p => p.studentNumber);
      if (activeParticipants.every(p => p.isFinished)) {
        setTestState('finished');
      }
    }
  };

  const resetTest = () => {
    setTestState('idle');
    setElapsedTime(0);
    setParticipants(participants.map(p => ({ ...p, timeMs: undefined, isFinished: false })));
  };

  const handleAssignStudent = async (idx: number, studentNum: string) => {
    const updated = [...participants];
    updated[idx].studentNumber = studentNum;
    setParticipants(updated);

    if (studentNum && updated[idx].isFinished && updated[idx].timeMs !== undefined) {
      await saveBalanceResult(studentNum, parseFloat((updated[idx].timeMs! / 1000).toFixed(1)));
    }
  };

  const saveBalanceResult = async (studentNum: string, value: number) => {
    const student = students.find(s => s.numeroEleve === studentNum);
    if (!student) return;

    const currentPhys = [...physicalResults];
    const existingIdx = currentPhys.findIndex(p => p.numeroEleve === studentNum);
    
    const updatedItem: PhysicalTests = {
      ...(existingIdx >= 0 ? currentPhys[existingIdx] : {}),
      numeroEleve: studentNum,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrophyIcon className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">اختبار التوازن الثابت (متعدد المشاركين)</h2>
              <p className="text-xs opacity-80">تسجيل توقيت اختلال التوازن لعدة تلاميذ في آن واحد</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-200">
             <div className="flex items-center gap-2">
              <label className="text-sm font-bold">القسم:</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-white dark:bg-gray-800 border border-gray-300 rounded-xl px-3 py-1.5 text-sm"
              >
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold">عدد المشاركين:</label>
              <input 
                type="number" 
                min={1} 
                max={40} 
                value={participantCount} 
                onChange={(e) => setParticipantCount(parseInt(e.target.value) || 1)}
                className="w-16 bg-white dark:bg-gray-800 border border-gray-300 rounded-xl px-3 py-1.5 text-sm font-bold text-center"
              />
            </div>
          </div>

          {/* Stopwatch Display */}
          <div className="bg-gray-900 text-white p-6 rounded-3xl text-center space-y-4 shadow-xl">
            <div className="text-6xl font-mono font-black text-emerald-400">
              {(elapsedTime / 1000).toFixed(1)} <span className="text-2xl text-gray-400">ثانية</span>
            </div>
            <div className="flex justify-center gap-4">
              {testState === 'idle' && (
                <button onClick={startTimer} className="bg-emerald-600 px-8 py-3 rounded-2xl hover:bg-emerald-500 font-bold flex items-center gap-2">
                  <PlayIcon className="w-6 h-6 fill-current" />
                  <span>انطلاق الاختبار 🚀</span>
                </button>
              )}
              {testState === 'running' && (
                <button onClick={pauseTimer} className="bg-amber-500 px-8 py-3 rounded-2xl hover:bg-amber-400 font-bold flex items-center gap-2">
                  <PauseIcon className="w-6 h-6" />
                  <span>إيقاف مؤقت</span>
                </button>
              )}
              {(testState === 'paused' || testState === 'finished') && (
                <button onClick={resetTest} className="bg-gray-700 px-8 py-3 rounded-2xl hover:bg-gray-600 font-bold flex items-center gap-2">
                  <ArrowPathIcon className="w-6 h-6" />
                  <span>إعادة الضبط</span>
                </button>
              )}
              {testState === 'paused' && (
                <button onClick={startTimer} className="bg-emerald-600 px-8 py-3 rounded-2xl hover:bg-emerald-500 font-bold flex items-center gap-2">
                  <PlayIcon className="w-6 h-6 fill-current" />
                  <span>متابعة</span>
                </button>
              )}
            </div>
          </div>

          {/* Participants Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {participants.map((p, idx) => {
              const student = students.find(s => s.numeroEleve === p.studentNumber);
              
              return (
                <div 
                  key={idx} 
                  className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 shadow-sm ${
                    p.isFinished 
                      ? 'bg-rose-50 border-rose-400 dark:bg-rose-950/20' 
                      : testState === 'running' && p.studentNumber
                        ? 'bg-emerald-50 border-emerald-400 dark:bg-emerald-950/20 animate-pulse'
                        : 'bg-white border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  <div className="w-full flex justify-between items-center text-[10px] font-bold text-gray-400 mb-1">
                    <span>#{idx + 1}</span>
                    {p.isFinished && <span className="text-rose-600">اختل التوازن 🛑</span>}
                  </div>

                  <StudentAvatar photoUrl={student?.photoUrl} nomEleve={student?.nomEleve || '?'} sexe={student?.sexe} size="sm" />
                  
                  <select
                    value={p.studentNumber}
                    onChange={(e) => handleAssignStudent(idx, e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 rounded-lg py-1 px-1 text-[10px] font-bold text-center"
                  >
                    <option value="">-- اختر --</option>
                    {students.map(s => (
                      <option key={s.numeroEleve} value={s.numeroEleve}>{s.nomEleve}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => recordFinish(idx)}
                    disabled={testState !== 'running' || !p.studentNumber || p.isFinished}
                    className={`w-full py-2 rounded-xl text-xs font-black transition-all ${
                      p.isFinished
                        ? 'bg-rose-600 text-white'
                        : testState === 'running' && p.studentNumber
                          ? 'bg-amber-400 text-black hover:bg-amber-300'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {p.isFinished ? `${(p.timeMs! / 1000).toFixed(1)} ث` : 'سقط'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">يتم تسجيل الزمن فور الضغط على زر "سقط" لكل تلميذ مشارك</p>
          <button onClick={onClose} className="px-8 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold transition-colors">إغلاق</button>
        </div>
      </div>
    </div>
  );
};
