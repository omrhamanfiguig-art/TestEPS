import React, { useMemo } from 'react';
import type { StudentIdentity, TarlLevelKey, TarlStudentRow, PhysicalTests, StudentResult } from '../types';
import { TARL_LEVELS, getTarlLevelMeta } from '../utils/tarlHelper';
import type { SchoolLevel } from '../utils/massarHelper';
import { 
  ExcelIcon, 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon, 
  PrinterIcon, 
  BoltIcon, 
  MagnifyingGlassIcon, 
  XMarkIcon,
  CheckIcon,
  SparklesIcon,
  ArrowsRightLeftIcon
} from './Icons';
import { StudentAvatar } from './StudentAvatar';

interface TarlRosterViewProps {
  students: StudentIdentity[];
  tarlStudents: TarlStudentRow[];
  selectedClass: string;
  scopeMode: 'level' | 'class';
  activeLevel: SchoolLevel | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterLevel: 'all' | TarlLevelKey;
  setFilterLevel: (l: 'all' | TarlLevelKey) => void;
  onOpenConversionModal: () => void;
  onConvertMassarToTarl: () => void;
  onExportTarl: () => void;
  onDownloadBlankTarl: () => void;
  onTriggerImport: () => void;
  onUpdateTarlStudent: (numeroEleve: string, updates: Partial<TarlStudentRow>) => void;
  physicalTests?: PhysicalTests[];
  vmaList?: StudentResult[];
  onAutoFillMassarFromTarl?: () => void;
  onPrint?: () => void;
}

export const TarlRosterView: React.FC<TarlRosterViewProps> = ({
  students,
  tarlStudents,
  selectedClass,
  scopeMode,
  activeLevel,
  searchQuery,
  setSearchQuery,
  filterLevel,
  setFilterLevel,
  onOpenConversionModal,
  onConvertMassarToTarl,
  onExportTarl,
  onDownloadBlankTarl,
  onTriggerImport,
  onUpdateTarlStudent,
  physicalTests = [],
  vmaList = [],
  onAutoFillMassarFromTarl,
  onPrint
}) => {
  // Statistics on TaRL levels
  const stats = useMemo(() => {
    const total = tarlStudents.length;
    const l1 = tarlStudents.filter(s => s.tarlLevel === 'niveau_1').length;
    const l2 = tarlStudents.filter(s => s.tarlLevel === 'niveau_2').length;
    const l3 = tarlStudents.filter(s => s.tarlLevel === 'niveau_3').length;
    const l4 = tarlStudents.filter(s => s.tarlLevel === 'niveau_4').length;
    const l5 = tarlStudents.filter(s => s.tarlLevel === 'niveau_5').length;

    const masteredCount = l4 + l5;
    const remediationCount = l1 + l2;

    return {
      total,
      l1,
      l2,
      l3,
      l4,
      l5,
      masteredCount,
      masteredRate: total > 0 ? Math.round((masteredCount / total) * 100) : 0,
      remediationCount,
      remediationRate: total > 0 ? Math.round((remediationCount / total) * 100) : 0
    };
  }, [tarlStudents]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return tarlStudents.filter(t => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.nomEleve.toLowerCase().includes(q);
        const matchCode = (t.codeMassar || '').toLowerCase().includes(q);
        const matchNum = t.numeroEleve.toLowerCase().includes(q);
        const matchGroup = (t.tarlGroup || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchNum && !matchGroup) return false;
      }
      if (filterLevel !== 'all' && t.tarlLevel !== filterLevel) {
        return false;
      }
      return true;
    });
  }, [tarlStudents, searchQuery, filterLevel]);

  const targetTitle = scopeMode === 'level' && activeLevel 
    ? `المستوى التعليمي: ${activeLevel.name} (${activeLevel.classes.join('، ')})` 
    : `القسم: ${selectedClass}`;

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      
      {/* Official TaRL Program Banner Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-800/80 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-x-20 -translate-y-20 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl translate-x-20 translate-y-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                🎯 مقاربة طارل (TaRL) - مدارس الريادة
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                مادة التربية البدنية والرياضية
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              لوائح تشخيص وتفييء التعلمات (طارل - TaRL)
            </h2>
            <p className="text-xs md:text-sm text-indigo-200/80 leading-relaxed">
              تفييء التلاميذ حسب مستويات التحكم والأداء الحركي (مبتدئ، كلمة، جملة، فقرة، قصة/متفوق)، وتوزيعهم على مجموعات الدعم، مع إمكانية تحويل بياناتهم ونقطهم مباشرة إلى لوائح مسار الرسمية.
            </p>
            <div className="text-xs text-indigo-300 font-bold flex items-center gap-2 pt-1">
              <span>🏫 {targetTitle}</span>
              <span>•</span>
              <span>👥 {stats.total} تلميذ</span>
            </div>
          </div>

          {/* Master Actions inside Banner */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 flex-wrap">
            {onAutoFillMassarFromTarl && (
              <button
                onClick={onAutoFillMassarFromTarl}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-black text-xs shadow-lg shadow-amber-400/25 transition cursor-pointer"
                title="ملء لوائح مسار مباشرة بالتقويمات والاختبارات البدنية التي قام بها التلاميذ في طارل"
              >
                <BoltIcon className="w-5 h-5 text-gray-900" />
                <span>⚡ ملء لوائح مسار بالتقويمات والاختبارات البدنية</span>
              </button>
            )}

            <button
              onClick={onOpenConversionModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition cursor-pointer"
              title="تحويل مستويات وروائز طارل إلى نقط الفروض الثلاثة في مسار"
            >
              <BoltIcon className="w-5 h-5 text-amber-200" />
              <span>🔄 تحويل البيانات إلى لوائح مسار</span>
            </button>

            <button
              onClick={onExportTarl}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs border border-white/20 transition cursor-pointer backdrop-blur-xs"
              title="تصدير لائحة طارل إكسيل"
            >
              <ExcelIcon className="w-4 h-4 text-emerald-400" />
              <span>تصدير طارل Excel</span>
            </button>

            <button
              onClick={onDownloadBlankTarl}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl bg-white/5 hover:bg-white/15 text-indigo-200 font-bold text-xs border border-white/10 transition cursor-pointer"
              title="تنزيل نموذج فارغ"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>نموذج فارغ</span>
            </button>

            <button
              onClick={onTriggerImport}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl bg-white/5 hover:bg-white/15 text-indigo-200 font-bold text-xs border border-white/10 transition cursor-pointer"
              title="استيراد لائحة طارل من إكسيل"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              <span>استيراد طارل</span>
            </button>

            <button
              onClick={onPrint || (() => window.print())}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl bg-white/5 hover:bg-white/15 text-indigo-200 font-bold text-xs border border-white/10 transition cursor-pointer print:hidden"
              title="معاينة لائحة طارل وطباعتها أو استخراجها كملف PDF"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>معاينة / PDF 🖨️</span>
            </button>
          </div>
        </div>
      </div>

      {/* TaRL 5-Level Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {TARL_LEVELS.map(lvl => {
          const count = tarlStudents.filter(s => s.tarlLevel === lvl.key).length;
          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
          const isSelected = filterLevel === lvl.key;

          return (
            <button
              key={lvl.key}
              onClick={() => setFilterLevel(isSelected ? 'all' : lvl.key)}
              className={`p-4 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                isSelected 
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 shadow-md ring-2 ring-indigo-500' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${lvl.badgeClass}`}>
                    {lvl.shortAr}
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${lvl.dotColor}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gray-900 dark:text-white">{count}</span>
                  <span className="text-xs text-gray-400">({pct}%)</span>
                </div>
                <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mt-1 line-clamp-1">
                  {lvl.nameAr}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-[10px] text-gray-400">
                <span>المعدل المرجعي:</span>
                <strong className="text-gray-700 dark:text-gray-300">{lvl.minScore}-{lvl.maxScore}/20</strong>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، رمز مسار، أو فوج طارل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-gray-100"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
          <button
            onClick={() => setFilterLevel('all')}
            className={`px-3 py-1.5 rounded-xl transition ${
              filterLevel === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
            }`}
          >
            جميع المستويات ({tarlStudents.length})
          </button>
          {TARL_LEVELS.map(lvl => (
            <button
              key={lvl.key}
              onClick={() => setFilterLevel(lvl.key)}
              className={`px-2.5 py-1.5 rounded-xl transition text-[11px] font-black ${
                filterLevel === lvl.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {lvl.shortAr} ({tarlStudents.filter(s => s.tarlLevel === lvl.key).length})
            </button>
          ))}
        </div>
      </div>

      {/* Interactive TaRL Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/90 text-gray-600 dark:text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="py-3.5 px-3 text-center w-12">ر.ت</th>
                <th className="py-3.5 px-3 min-w-[110px]">رمز مسار</th>
                <th className="py-3.5 px-4 min-w-[190px]">الاسم الكامل للتلميذ</th>
                <th className="py-3.5 px-3 text-center min-w-[80px]">القسم</th>
                <th className="py-3.5 px-3 text-center min-w-[160px] bg-indigo-50/40 dark:bg-indigo-950/20">
                  مستوى طارل (TaRL)
                </th>
                <th className="py-3.5 px-3 text-center min-w-[130px]">فوج / مجموعة الدعم</th>
                <th className="py-3.5 px-3 text-center min-w-[110px] bg-emerald-50/40 dark:bg-emerald-950/20">
                  نقطة الرائز (/20)
                </th>
                <th className="py-3.5 px-4 min-w-[240px]">الخطة العلاجية المقترحة</th>
                <th className="py-3.5 px-3 min-w-[140px]">ملاحظات إضافية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/80">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 font-bold">
                    لا يوجد تلاميذ يطابقون معايير البحث أو التصفية الحالية
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const meta = getTarlLevelMeta(row.tarlLevel);

                  return (
                    <tr 
                      key={`${row.numeroEleve}-${idx}`}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition"
                    >
                      {/* Order */}
                      <td className="py-3 px-3 text-center text-gray-400 font-bold">
                        {idx + 1}
                      </td>

                      {/* Code Massar */}
                      <td className="py-3 px-3 font-mono font-bold text-gray-700 dark:text-gray-300">
                        {row.codeMassar || row.numeroEleve}
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar 
                            student={{ numeroEleve: row.numeroEleve, nomEleve: row.nomEleve, sexe: row.sexe }} 
                            size="sm" 
                          />
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white block">
                              {row.nomEleve}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              رقم: {row.numeroEleve} {row.sexe === 'F' ? '• أنثى' : '• ذكر'}
                            </span>
                            {(() => {
                              const pTest = physicalTests.find(p => p.numeroEleve === row.numeroEleve || (row.codeMassar && p.codeMassar === row.codeMassar));
                              const pVma = vmaList.find(v => v.numeroEleve === row.numeroEleve);
                              const vmaVal = pVma?.vma || pTest?.vma;
                              const physParts: string[] = [];
                              if (pTest?.scoreVitesse30m !== undefined) physParts.push(`سرعة 30م: ${pTest.scoreVitesse30m}/20`);
                              else if (pTest?.vitesse30m) physParts.push(`سرعة 30م: ${pTest.vitesse30m}ث`);
                              if (vmaVal) physParts.push(`VMA: ${vmaVal} كم/س`);
                              if (pTest?.scoreSautLong !== undefined) physParts.push(`ارتقاء: ${pTest.scoreSautLong}/20`);
                              else if (pTest?.sautHorizontal) physParts.push(`ارتقاء: ${pTest.sautHorizontal}م`);
                              if (physParts.length === 0) return null;
                              return (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                  ⚡ {physParts.join(' | ')}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {row.className || selectedClass}
                        </span>
                      </td>

                      {/* TaRL Level Dropdown */}
                      <td className="py-3 px-3 text-center bg-indigo-50/20 dark:bg-indigo-950/10">
                        <select
                          value={row.tarlLevel}
                          onChange={(e) => onUpdateTarlStudent(row.numeroEleve, { tarlLevel: e.target.value as TarlLevelKey })}
                          className={`text-xs font-black rounded-xl px-2.5 py-1 border transition focus:outline-none ${meta.badgeClass}`}
                        >
                          {TARL_LEVELS.map(lvl => (
                            <option key={lvl.key} value={lvl.key}>
                              {lvl.nameAr}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* TaRL Group */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="text"
                          value={row.tarlGroup || ''}
                          onChange={(e) => onUpdateTarlStudent(row.numeroEleve, { tarlGroup: e.target.value })}
                          placeholder="مثال: فوج 1"
                          className="w-24 text-center text-xs py-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none font-bold"
                        />
                      </td>

                      {/* Diagnostic Score */}
                      <td className="py-3 px-3 text-center bg-emerald-50/20 dark:bg-emerald-950/10">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={row.tarlScore !== undefined && !isNaN(row.tarlScore) ? row.tarlScore : ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateTarlStudent(row.numeroEleve, { tarlScore: isNaN(val) ? 0 : val });
                          }}
                          className="w-16 text-center font-black text-sm py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 focus:outline-none"
                        />
                      </td>

                      {/* Remediation Plan */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={row.tarlRemediation || meta.defaultRemediation}
                          onChange={(e) => onUpdateTarlStudent(row.numeroEleve, { tarlRemediation: e.target.value })}
                          className="w-full text-xs py-1 px-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none"
                        />
                      </td>

                      {/* Observation */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={row.observation || ''}
                          onChange={(e) => onUpdateTarlStudent(row.numeroEleve, { observation: e.target.value })}
                          placeholder="ملاحظة..."
                          className="w-full text-xs py-1 px-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Conversion Prompt Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-3xl p-5 md:p-6 border border-emerald-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
            <span>🚀 جاهز لحقن النقط في لوائح مسار؟</span>
          </h4>
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            سيقوم النظام بتحويل كافة مستويات التلاميذ وروائز طارل إلى نقط الفروض الثلاثة (CC1، CC2، CC3) وملاحظات الأستاذ لمسار بضغطة واحدة.
          </p>
        </div>

        <button
          onClick={onOpenConversionModal}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer shrink-0"
        >
          <BoltIcon className="w-4 h-4 text-amber-200" />
          <span>تحويل البيانات من طارل إلى مسار الآن ⚡</span>
        </button>
      </div>

    </div>
  );
};
