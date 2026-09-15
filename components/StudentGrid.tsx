import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { StudentIdentity } from '../types';
import { ArrowUturnLeftIcon } from './Icons';

interface StudentTileProps {
  id: string;
  index: number;
  name?: string;
  sexe?: 'M' | 'F';
  isFinished: boolean;
  onClick: (id: string) => void;
  onUndo: (id: string) => void;
  onToggleGender: (id: string) => void;
  testState: 'idle' | 'running' | 'finished';
  vma?: number;
}

const LONG_PRESS_DURATION_MS = 500; // 500ms required hold duration

const StudentTile: React.FC<StudentTileProps> = React.memo(({ 
  id, 
  index, 
  name, 
  sexe, 
  isFinished, 
  onClick, 
  onUndo, 
  onToggleGender, 
  testState, 
  vma 
}) => {
    const [isPressing, setIsPressing] = useState(false);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const isTouchMoved = useRef<boolean>(false);

    // Immediate and reliable action handler for both touch and desktop
    const handleTileAction = (e?: React.MouseEvent | React.TouchEvent) => {
        if (e) {
            e.stopPropagation();
        }

        if (testState === 'idle') {
            // In Idle mode: clicking tile toggles gender
            onToggleGender(id);
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(20); } catch (_) {}
            }
        } else if (testState === 'running') {
            if (!isFinished) {
                // Record Student Finish / VMA immediately
                onClick(id);
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate(60); } catch (_) {}
                }
            } else {
                // Undo Student
                onUndo(id);
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    try { navigator.vibrate([40, 30, 40]); } catch (_) {}
                }
            }
        } else if (testState === 'finished' && isFinished) {
            // Finished state: Allow undoing if clicked
            onUndo(id);
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try { navigator.vibrate(40); } catch (_) {}
            }
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        const t = e.touches[0];
        if (t) {
            touchStartPos.current = { x: t.clientX, y: t.clientY };
            isTouchMoved.current = false;
            setIsPressing(true);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartPos.current) return;
        const t = e.touches[0];
        if (t) {
            const dist = Math.hypot(t.clientX - touchStartPos.current.x, t.clientY - touchStartPos.current.y);
            if (dist > 18) {
                isTouchMoved.current = true;
                setIsPressing(false);
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        setIsPressing(false);
        if (!isTouchMoved.current && touchStartPos.current) {
            handleTileAction(e);
        }
        touchStartPos.current = null;
    };

    return (
        <div 
            className={`
                relative w-full h-16 sm:h-20 flex flex-col items-center justify-center p-1 rounded-xl transition-all duration-150 border-2 select-none overflow-hidden cursor-pointer active:scale-95
                ${isFinished 
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-inner ring-2 ring-indigo-300 dark:ring-indigo-700' 
                    : testState === 'running'
                        ? 'bg-white dark:bg-gray-800 border-indigo-300 dark:border-indigo-600 hover:border-indigo-500 hover:bg-indigo-50/40 text-gray-800 dark:text-gray-200 shadow-sm animate-pulse-slow'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-400 text-gray-800 dark:text-gray-200 shadow-xs'
                }
                ${isPressing ? 'scale-95 ring-2 ring-indigo-400 dark:ring-indigo-500 shadow-md' : ''}
                ${testState === 'finished' && !isFinished ? 'opacity-40 grayscale' : ''}
            `}
            style={{ 
                WebkitTouchCallout: 'none', 
                userSelect: 'none', 
                WebkitUserSelect: 'none',
                touchAction: 'manipulation' 
            }}
            onClick={(e) => {
                if (!touchStartPos.current) {
                    handleTileAction(e);
                }
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
                setIsPressing(false);
                touchStartPos.current = null;
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {!isFinished ? (
                <>
                    <span className="text-xl sm:text-2xl font-black">{index}</span>
                    {name && (
                        <span 
                            className="text-[10px] sm:text-[11px] mt-0.5 opacity-90 truncate w-full text-center px-1 font-bold leading-tight"
                            title={name}
                        >
                            {name}
                        </span>
                    )}
                    {sexe && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleGender(id);
                            }}
                            title={`الجنس: ${sexe === 'M' ? 'ذكر (اضغط لتغيير لأنثى)' : 'أنثى (اضغط لتغيير لذكر)'}`}
                            className={`absolute top-1 end-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-xs transition hover:scale-110 active:scale-90 ${
                                sexe === 'M' ? 'bg-blue-500 hover:bg-blue-600 ring-1 ring-blue-300' : 'bg-pink-500 hover:bg-pink-600 ring-1 ring-pink-300'
                            }`}
                        >
                            {sexe === 'M' ? '♂' : '♀'}
                        </button>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center w-full animate-in zoom-in-90 duration-150">
                    <div className="w-full flex items-center justify-between px-1.5 absolute top-1 left-0 right-0">
                        <span className="text-[9px] font-bold opacity-75 uppercase tracking-tighter">#{index}</span>
                        {testState !== 'idle' && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUndo(id);
                                }}
                                title="إلغاء وتسجيل من جديد"
                                className="p-0.5 rounded-full bg-white/25 hover:bg-white/40 text-white transition"
                            >
                                <ArrowUturnLeftIcon className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    <span 
                        className="text-[10px] sm:text-[11px] font-extrabold truncate w-full text-center leading-tight mt-1 mb-0.5 px-1 text-white"
                        title={name || 'تلميذ'}
                    >
                        {name || 'تلميذ'}
                    </span>
                    <div className="bg-white/25 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
                        <span className="text-xs font-black text-white">{vma ? vma.toFixed(1) : '--'}</span>
                    </div>
                </div>
            )}
        </div>
    );
});

interface StudentGridProps {
  totalStudents: number;
  studentList: StudentIdentity[];
  finishedStudents: Set<string>;
  onStudentClick: (id: string) => void;
  onStudentUndo: (id: string) => void;
  onToggleGender: (id: string) => void;
  testIsRunning: boolean;
  testState: 'idle' | 'running' | 'finished';
  results?: any[];
}

export const StudentGrid: React.FC<StudentGridProps> = ({ studentList, finishedStudents, onStudentClick, onStudentUndo, onToggleGender, testState, results = [] }) => {
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');

  // Only display students from the list
  const fullList = studentList.map((s, idx) => ({
    id: String(s.numeroEleve),
    name: s.nomEleve,
    sexe: s.sexe,
    originalIndex: idx + 1
  }));

  const maleCount = fullList.filter(s => s.sexe === 'M').length;
  const femaleCount = fullList.filter(s => s.sexe === 'F').length;

  const filteredList = fullList.filter(s => {
    if (genderFilter === 'M') return s.sexe === 'M';
    if (genderFilter === 'F') return s.sexe === 'F';
    return true;
  });

  if (fullList.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-center">
                لا يوجد تلاميذ في اللائحة.<br/>
                يرجى استيراد لائحة من الإعدادات.
            </p>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Gender Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-gray-100/90 dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
            تصفية الشبكة:
          </span>
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setGenderFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                genderFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              الجميع ({fullList.length})
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('M')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                genderFilter === 'M'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>♂</span>
              <span>ذكور ({maleCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('F')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                genderFilter === 'F'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>♀</span>
              <span>إناث ({femaleCount})</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
          المكتملون: <span className="text-indigo-600 dark:text-indigo-400 font-black">{finishedStudents.size}</span> من <span className="font-black text-gray-800 dark:text-gray-200">{fullList.length}</span>
        </div>
      </div>

      {/* Grid of Student Tiles */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
        {filteredList.map((student) => {
          const studentResult = results.find(r => String(r.numeroEleve) === student.id);
          return (
              <StudentTile
                  key={student.id}
                  id={student.id}
                  index={student.originalIndex}
                  name={student.name}
                  sexe={student.sexe}
                  isFinished={finishedStudents.has(student.id)}
                  onClick={onStudentClick}
                  onUndo={onStudentUndo}
                  onToggleGender={onToggleGender}
                  testState={testState}
                  vma={studentResult?.vma}
              />
          )
        })}
      </div>
    </div>
  );
};
