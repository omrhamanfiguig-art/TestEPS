
import React from 'react';
import type { LucLegerLevel, TestState } from '../types';
import { RunnerAnimation } from './RunnerAnimation';

interface DisplayProps {
  currentLevel: LucLegerLevel | null;
  time: number;
  testState: TestState;
}

export const Display: React.FC<DisplayProps> = ({ currentLevel, time, testState }) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const getStatusInfo = () => {
    switch(testState) {
        case 'idle':
            return { text: "جاهز للبدء", color: "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800" };
        case 'running':
            return { text: "جاري الاختبار", color: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800" };
        case 'finished':
            return { text: "انتهى الاختبار", color: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800" };
    }
  }

  const status = getStatusInfo();

  return (
    <div className="flex flex-col w-full gap-3">
        {/* Top Timer & Palier Row */}
        <div className="flex flex-row items-center justify-between p-4 bg-gray-50/90 dark:bg-gray-900/50 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-inner">
            {/* Digital Timer */}
            <div className="flex flex-col justify-center">
                <div className="text-4xl sm:text-5xl md:text-6xl font-mono font-black text-gray-900 dark:text-white tracking-widest drop-shadow-xs">
                    {formattedTime}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${status.color}`}>
                        {status.text}
                    </span>
                </div>
            </div>

            {/* Level (Palier) Card */}
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl px-4 py-2.5 shadow-md border border-indigo-400/30 shrink-0 min-w-[110px]">
                <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">المستوى (Palier)</span>
                <span className="text-4xl sm:text-5xl font-black tracking-tighter my-0.5 leading-none">
                    {currentLevel?.palier || (testState === 'idle' ? 1 : '...')}
                </span>
                <span className="text-[11px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full mt-1">
                    {currentLevel?.vitesse || 8.0} كم/س
                </span>
            </div>
        </div>

        {/* Runner Track */}
        <RunnerAnimation testState={testState} currentLevel={currentLevel} time={time} />
    </div>
  );
};