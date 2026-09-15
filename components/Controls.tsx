import React from 'react';
import type { TestState, StudentResult } from '../types';
import { exportResultsToXLSX } from '../utils/csvHelper';
import { PlayIcon, StopIcon, ArrowPathIcon, ExcelIcon, TrashIcon } from './Icons';

interface ControlsProps {
  testState: TestState;
  results: StudentResult[];
  selectedClass: string;
  onStart: () => void;
  onStop: () => void;
  onClearAllData: () => void;
  onPrepareNextRun: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ 
  testState, 
  results, 
  selectedClass, 
  onStart, 
  onStop, 
  onClearAllData, 
  onPrepareNextRun
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {testState === 'idle' && (
          <div className="relative group">
            <button
              onClick={onStart}
              aria-label="بدء الاختبار"
              title="بدء الاختبار"
              className="p-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg hover:shadow-emerald-600/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <PlayIcon className="w-6 h-6" />
            </button>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 text-xs font-black bg-gray-900 text-white px-3 py-1 rounded-xl shadow-xl whitespace-nowrap z-50 border border-gray-700">
              بدء الاختبار
            </div>
          </div>
        )}

        {testState === 'running' && (
          <div className="relative group">
            <button
              onClick={onStop}
              aria-label="إيقاف الاختبار"
              title="إيقاف الاختبار"
              className="p-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl shadow-lg animate-pulse transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <StopIcon className="w-6 h-6" />
            </button>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 text-xs font-black bg-gray-900 text-white px-3 py-1 rounded-xl shadow-xl whitespace-nowrap z-50 border border-gray-700">
              إيقاف الاختبار
            </div>
          </div>
        )}

        {/* Button to start next batch for same class */}
        {testState === 'finished' && (
          <div className="relative group">
            <button
              onClick={onPrepareNextRun}
              aria-label="المجموعة التالية"
              title="إعادة ضبط المؤقت للمجموعة التالية"
              className="p-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ArrowPathIcon className="w-6 h-6" />
            </button>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 text-xs font-black bg-gray-900 text-white px-3 py-1 rounded-xl shadow-xl whitespace-nowrap z-50 border border-gray-700">
              المجموعة التالية
            </div>
          </div>
        )}

        {/* Button to clear ALL results for the class */}
        {results.length > 0 && (
          <div className="relative group">
            <button
              onClick={onClearAllData}
              aria-label="مسح النتائج"
              title="مسح جميع نتائج السرعة الهوائية المسجلة"
              className="p-3.5 bg-red-500/20 hover:bg-red-500/30 text-red-500 dark:text-red-400 border border-red-500/30 rounded-2xl shadow-sm transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <TrashIcon className="w-6 h-6" />
            </button>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 text-xs font-black bg-gray-900 text-white px-3 py-1 rounded-xl shadow-xl whitespace-nowrap z-50 border border-gray-700">
              مسح النتائج
            </div>
          </div>
        )}

        <div className="relative group">
          <button
            onClick={() => exportResultsToXLSX(results, selectedClass)}
            disabled={results.length === 0}
            aria-label="تصدير النتائج (XLSX)"
            title="تصدير النتائج إلى ملف Excel"
            className="p-3.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ExcelIcon className="w-6 h-6" />
          </button>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 text-xs font-black bg-gray-900 text-white px-3 py-1 rounded-xl shadow-xl whitespace-nowrap z-50 border border-gray-700">
            تصدير Excel
          </div>
        </div>
      </div>
    </div>
  );
};