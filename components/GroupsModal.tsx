import React, { useState, useMemo } from 'react';
import type { StudentResult, AffinityGroup } from '../types';
import { XMarkIcon, DocumentTextIcon, ExcelIcon, UsersIcon } from './Icons';
import { exportGroupsToWord } from '../utils/wordHelper';
import { exportGroupsToExcel } from '../utils/csvHelper';
import { generateAffinityGroups, GenderMode } from '../utils/groupHelper';

interface GroupsModalProps {
  groups?: AffinityGroup[];
  results: StudentResult[];
  selectedClass: string;
  onClose: () => void;
}

const GroupCard: React.FC<{ group: AffinityGroup; index: number }> = ({ group, index }) => {
    // Dynamic border colors for visual distinction between groups
    const borderColors = [
      'border-indigo-500',
      'border-emerald-500',
      'border-amber-500',
      'border-purple-500',
      'border-rose-500',
      'border-cyan-500',
      'border-blue-500',
      'border-teal-500',
    ];
    const badgeColors = [
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300',
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
      'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
      'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300',
      'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
      'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300',
      'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
      'bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300',
    ];

    const currentBorder = borderColors[index % borderColors.length];
    const currentBadge = badgeColors[index % badgeColors.length];

    return (
        <div className={`bg-white dark:bg-gray-800 border-s-4 ${currentBorder} rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-base sm:text-lg text-gray-900 dark:text-gray-100">{group.name}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${currentBadge}`}>
                      {group.students.length} تلميذ
                  </span>
              </div>

              {/* Statistical indicators: Mean & Standard Deviation (Écart-type) */}
              <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-100 dark:bg-gray-900/80 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                  <div>
                      <span className="text-gray-600 dark:text-gray-300 block font-bold text-[11px]">المتوسط (Moyenne):</span>
                      <span className="font-black text-indigo-700 dark:text-indigo-300 text-sm">{group.vmaMoyenne.toFixed(2)} كم/س</span>
                  </div>
                  <div>
                      <span className="text-gray-600 dark:text-gray-300 block font-bold text-[11px]">الانحراف المعياري (σ):</span>
                      <span className="font-black text-amber-600 dark:text-amber-300 text-sm">±{group.ecartType.toFixed(2)} كم/س</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-[11px] text-gray-600 dark:text-gray-300 font-bold">
                      <span>نطاق السرعة (Plage): <strong className="text-gray-900 dark:text-white font-black">{group.vmaRange} كم/س</strong></span>
                      {group.coefficientVariation !== undefined && (
                          <span>التجانس (CV): <strong className="text-emerald-600 dark:text-emerald-300 font-black">{group.coefficientVariation.toFixed(1)}%</strong></span>
                      )}
                  </div>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 mt-1">
                {group.students.length > 0 ? (
                    <ul className="space-y-1.5">
                        {group.students.map(s => (
                        <li key={s.id || s.numeroEleve} className="text-xs flex justify-between items-center p-2 rounded-xl bg-gray-100 dark:bg-gray-700/90 border border-gray-200/90 dark:border-gray-600/80 shadow-2xs">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="font-mono font-black text-[11px] px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 shrink-0">
                                    #{s.numeroEleve}
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white truncate">
                                    {s.nomEleve || `تلميذ ${s.numeroEleve}`}
                                </span>
                                {s.sexe && (
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 border ${
                                        s.sexe === 'M' 
                                            ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
                                            : 'bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800'
                                    }`}>
                                        {s.sexe === 'M' ? 'ذكر' : 'أنثى'}
                                    </span>
                                )}
                            </div>
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
                                {s.vma.toFixed(1)} كم/س
                            </span>
                        </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs italic text-gray-500">لا يوجد تلاميذ في هذه المجموعة.</p>
                )}
            </div>
      </div>
    );
}

export const GroupsModal: React.FC<GroupsModalProps> = ({ 
  groups: initialGroups, 
  results, 
  selectedClass, 
  onClose 
}) => {
  const [numberOfGroups, setNumberOfGroups] = useState<number>(() => {
    if (initialGroups && initialGroups.length > 0) return initialGroups.length;
    const count = results.filter(r => r.vma > 0).length;
    if (count <= 8) return 2;
    if (count <= 16) return 3;
    if (count <= 28) return 4;
    return 5;
  });

  const [genderMode, setGenderMode] = useState<GenderMode>('ALL');

  // Calculate dynamic groups whenever results, group count, or genderMode changes
  const computedGroups = useMemo(() => {
    return generateAffinityGroups(results, { numberOfGroups, genderMode });
  }, [results, numberOfGroups, genderMode]);

  const handleWordExport = () => {
    exportGroupsToWord(computedGroups, selectedClass);
  };
  
  const handleExcelExport = () => {
    exportGroupsToExcel(computedGroups, selectedClass);
  };

  const studentCounts = useMemo(() => {
    const valid = results.filter(r => r && typeof r.vma === 'number' && r.vma > 0);
    const females = valid.filter(r => r.sexe === 'F').length;
    const males = valid.filter(r => r.sexe === 'M').length;
    return {
      total: valid.length,
      females,
      males
    };
  }, [results]);

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-3 sm:p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="groups-modal-title"
    >
      <div 
        className="bg-gray-100 dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <UsersIcon className="w-5 h-5" />
              </div>
              <h2 id="groups-modal-title" className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100">
                تكوين المجموعات المتجانسة حسب VMA
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              القسم: <strong className="text-gray-800 dark:text-gray-200">{selectedClass}</strong> • حساب تلقائي بدون تقسيم ذوي السرعة الموحدة
            </p>
          </div>

          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 self-end sm:self-auto"
            aria-label="إغلاق النافذة"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </header>

        {/* Group Options Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-col gap-3">
          {/* Row 1: Gender Mode Selection */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                وضع التوزيع حسب الجنس:
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setGenderMode('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                    genderMode === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  الجميع (مختلط)
                </button>
                <button
                  type="button"
                  onClick={() => setGenderMode('SEPARATE')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                    genderMode === 'SEPARATE'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  مجموعات منفصلة (إناث / ذكور)
                </button>
                <button
                  type="button"
                  onClick={() => setGenderMode('F')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                    genderMode === 'F'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  إناث فقط ({studentCounts.females})
                </button>
                <button
                  type="button"
                  onClick={() => setGenderMode('M')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                    genderMode === 'M'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  ذكور فقط ({studentCounts.males})
                </button>
              </div>
            </div>

            <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900">
              التلاميذ: {studentCounts.total} ({studentCounts.females} إناث • {studentCounts.males} ذكور)
            </div>
          </div>

          {/* Row 2: Number of Groups Selector */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-indigo-100/70 dark:border-indigo-900/50">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              عدد المجموعات {genderMode === 'SEPARATE' ? 'لكل جنس' : ''}:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNumberOfGroups(num)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                    numberOfGroups === num
                      ? 'bg-purple-600 text-white shadow-md scale-105 ring-2 ring-purple-300'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-purple-400'
                  }`}
                >
                  {num} مجموعات
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Groups Grid */}
        <main className="p-4 sm:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900/80 flex-1">
          {computedGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="font-bold">لا توجد نتائج مسجلة لإنشاء المجموعات.</p>
              <p className="text-xs mt-1">قم بتسجيل سرعات التلاميذ أولاً ثم أنشئ المجموعات.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {computedGroups.map((group, idx) => (
                <GroupCard key={group.name} group={group} index={idx} />
              ))}
            </div>
          )}
        </main>

        {/* Footer Actions */}
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-wrap justify-between items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            يتم التوزيع المتجانس بحساب المتوسط (Moyenne) والانحراف المعياري (Écart-type) لكل مجموعة تلقائياً.
          </span>
          <div className="flex items-center gap-2">
            <button
                onClick={handleWordExport}
                disabled={computedGroups.flatMap(g => g.students).length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95"
            >
                <DocumentTextIcon className="w-4 h-4" />
                <span>تصدير Word</span>
            </button>
            <button
                onClick={handleExcelExport}
                disabled={computedGroups.flatMap(g => g.students).length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95"
            >
                <ExcelIcon className="w-4 h-4" />
                <span>تصدير Excel</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};