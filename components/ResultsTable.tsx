import React, { useState, useMemo } from 'react';
import type { StudentResult } from '../types';
import { 
  PencilSquareIcon, 
  TrashIcon, 
  MagnifyingGlassIcon, 
  TableCellsIcon, 
  Squares2X2Icon,
  UsersIcon
} from './Icons';

interface ResultsTableProps {
  results: StudentResult[];
  onStudentClick?: (numeroEleve: string) => void;
  onDeleteResult?: (numeroEleve: string) => void;
  onClearAll?: () => void;
  onGenerateGroups?: () => void;
  selectedClass?: string;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ 
  results, 
  onStudentClick,
  onDeleteResult,
  onClearAll,
  onGenerateGroups,
  selectedClass
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [sortBy, setSortBy] = useState<'number' | 'vma-desc' | 'vma-asc' | 'gender-m' | 'gender-f'>('number');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filter and sort results
  const filteredAndSortedResults = useMemo(() => {
    let list = results.map((r, idx) => ({
      ...r,
      orderIndex: idx + 1
    })).filter(r => {
      if (genderFilter === 'M' && r.sexe !== 'M') return false;
      if (genderFilter === 'F' && r.sexe !== 'F') return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const matchOrder = String(r.orderIndex) === q || String(r.orderIndex).startsWith(q);
      const matchNum = r.numeroEleve.toLowerCase().includes(q);
      const matchName = (r.nomEleve || '').toLowerCase().includes(q);
      return matchOrder || matchNum || matchName;
    });

    return list.sort((a, b) => {
      if (sortBy === 'gender-m') {
        const gA = a.sexe === 'M' ? 0 : 1;
        const gB = b.sexe === 'M' ? 0 : 1;
        if (gA !== gB) return gA - gB;
        return b.vma - a.vma;
      }
      if (sortBy === 'gender-f') {
        const gA = a.sexe === 'F' ? 0 : 1;
        const gB = b.sexe === 'F' ? 0 : 1;
        if (gA !== gB) return gA - gB;
        return b.vma - a.vma;
      }
      if (sortBy === 'vma-desc') return b.vma - a.vma;
      if (sortBy === 'vma-asc') return a.vma - b.vma;
      
      const na = parseInt(a.numeroEleve, 10);
      const nb = parseInt(b.numeroEleve, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.numeroEleve.localeCompare(b.numeroEleve);
    });
  }, [results, searchQuery, sortBy, genderFilter]);

  // Summary statistics
  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const vmas = results.map(r => r.vma);
    const sum = vmas.reduce((acc, v) => acc + v, 0);
    const avg = sum / vmas.length;
    const max = Math.max(...vmas);
    const min = Math.min(...vmas);
    return {
      count: results.length,
      avg: avg.toFixed(1),
      max: max.toFixed(1),
      min: min.toFixed(1)
    };
  }, [results]);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
            نتائج السرعة الهوائية (VMA)
          </h2>
          {results.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
              {results.length} مسجل
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* Group Formation Button */}
          {onGenerateGroups && (
            <button
              type="button"
              onClick={onGenerateGroups}
              disabled={results.length === 0}
              title="تكوين المجموعات المتجانسة بناءً على VMA والمتوسط والانحراف المعياري"
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-black shadow-sm transition flex items-center gap-1.5 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed active:scale-95"
            >
              <UsersIcon className="w-4 h-4" />
              <span>تكوين المجموعات</span>
            </button>
          )}

          {/* View toggle (cards vs table) */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-0.5 rounded-xl border border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="عرض بطاقات النتائج (مناسب للهاتف)"
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4" />
              <span className="hidden xs:inline">بطاقات</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="عرض جدول تفصيلي"
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <TableCellsIcon className="w-4 h-4" />
              <span className="hidden xs:inline">جدول</span>
            </button>
          </div>

          {/* Clear results button */}
          {results.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              title="مسح جميع نتائج VMA المسجلة"
              className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold transition flex items-center gap-1 active:scale-95"
            >
              <TrashIcon className="w-3.5 h-3.5 text-red-500" />
              <span>مسح الكل</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Statistics Bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 p-2 sm:p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-center">
          <div className="p-1">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">العدد</div>
            <div className="text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-300">{stats.count}</div>
          </div>
          <div className="p-1 border-r border-indigo-100 dark:border-indigo-800/60">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">المعدل</div>
            <div className="text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-300 font-mono">{stats.avg}</div>
          </div>
          <div className="p-1 border-r border-indigo-100 dark:border-indigo-800/60">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">أعلى VMA</div>
            <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.max}</div>
          </div>
          <div className="p-1 border-r border-indigo-100 dark:border-indigo-800/60">
            <div className="text-[10px] text-gray-500 dark:text-gray-400">أدنى VMA</div>
            <div className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 font-mono">{stats.min}</div>
          </div>
        </div>
      )}

      {/* Search, Gender Filter & Sort Toolbar */}
      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <MagnifyingGlassIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالرقم أو الاسم..."
                className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="number">ترتيب: رقم التلميذ</option>
              <option value="vma-desc">ترتيب: VMA تنازلي (الأسرع)</option>
              <option value="vma-asc">ترتيب: VMA تصاعدي (الأبطأ)</option>
              <option value="gender-m">ترتيب: الذكور أولاً</option>
              <option value="gender-f">ترتيب: الإناث أولاً</option>
            </select>
          </div>

          {/* Quick Filter by Gender */}
          <div className="flex items-center gap-1.5 self-start bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl border border-gray-200 dark:border-gray-600">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 px-1.5">فرز حسب الجنس:</span>
            <button
              type="button"
              onClick={() => setGenderFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                genderFilter === 'ALL'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              الجميع
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('M')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                genderFilter === 'M'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              ذكور
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('F')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                genderFilter === 'F'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              إناث
            </button>
          </div>
        </div>
      )}

      {/* Content Area: Cards or Table */}
      <div className="flex-grow overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 min-h-[220px]">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 mb-2">
              <TableCellsIcon className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-gray-700 dark:text-gray-300">
              لا توجد نتائج مسجلة حالياً.
            </p>
            <p className="text-xs mt-1 text-gray-400 dark:text-gray-500 max-w-xs">
              ابدأ الاختبار واضغط على بطاقة التلميذ عند توقفه لتسجيل سرعته الهوائية.
            </p>
          </div>
        ) : filteredAndSortedResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500">
            <p className="font-semibold text-sm">لا توجد نتائج مطابقة لبحثك "{searchQuery}".</p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Mobile Card View */
          <div className="p-2 sm:p-3 space-y-2.5">
            {filteredAndSortedResults.map((result) => (
              <div 
                key={result.id}
                className="p-3 bg-white dark:bg-gray-800/90 border border-gray-200/90 dark:border-gray-700/80 rounded-xl shadow-xs flex flex-col gap-2.5 transition hover:shadow-md"
              >
                {/* Header Row: Order Number, Name, Gender Badge & Action Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-black text-xs flex items-center justify-center shrink-0">
                      #{result.orderIndex}
                    </div>
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate" title={result.nomEleve}>
                      {result.nomEleve || `تلميذ رقم ${result.numeroEleve}`}
                    </span>
                    {result.sexe && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                        result.sexe === 'F' 
                          ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      }`}>
                        {result.sexe === 'F' ? 'أنثى' : 'ذكر'}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {onStudentClick && (
                      <button
                        type="button"
                        onClick={() => onStudentClick(result.numeroEleve)}
                        title="تعديل بيانات التلميذ"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteResult && (
                      <button
                        type="button"
                        onClick={() => onDeleteResult(result.numeroEleve)}
                        title="حذف نتيجة هذا التلميذ والتراجع عنها"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics Grid Row */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
                  {/* Student details: Palier, Distance */}
                  <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-gray-600 dark:text-gray-300">
                    <div>
                      <span className="text-gray-400 dark:text-gray-500 me-1">المستوى:</span>
                      <strong className="font-bold text-gray-900 dark:text-white">{result.palierAtteint}</strong>
                    </div>
                    {result.distanceParcourue !== undefined && (
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 me-1">المسافة:</span>
                        <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{result.distanceParcourue} م</strong>
                      </div>
                    )}
                  </div>

                  {/* VMA Badge */}
                  <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-xl shrink-0">
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold">VMA:</span>
                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 font-mono">
                      {result.vma.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">كم/س</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[620px] text-xs sm:text-sm text-right text-gray-600 dark:text-gray-300">
              <thead className="text-[11px] uppercase bg-gray-50 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 sticky top-0 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th scope="col" className="px-2.5 py-3 text-center w-12"># الترتيب</th>
                  <th scope="col" className="px-3 py-3">الاسم والنسب</th>
                  <th scope="col" className="px-2 py-3 text-center">الجنس</th>
                  <th scope="col" className="px-2 py-3 text-center">المستوى</th>
                  <th scope="col" className="px-2 py-3 text-center">المسافة المقطوعة</th>
                  <th scope="col" className="px-3 py-3 text-center">VMA</th>
                  <th scope="col" className="px-2 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredAndSortedResults.map((result) => (
                  <tr 
                    key={result.id} 
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition"
                  >
                    <td className="px-2.5 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-black text-xs">
                        {result.orderIndex}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">
                      {result.nomEleve || '-'}
                    </td>
                    <td className="px-2 py-3 text-center">
                      {result.sexe ? (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          result.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}>
                          {result.sexe === 'F' ? 'أنثى' : 'ذكر'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-gray-700 dark:text-gray-300">
                      {result.palierAtteint}
                    </td>
                    <td className="px-2 py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {result.distanceParcourue !== undefined ? `${result.distanceParcourue} م` : '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50">
                        {result.vma.toFixed(1)} كم/س
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onStudentClick && (
                          <button
                            type="button"
                            onClick={() => onStudentClick(result.numeroEleve)}
                            title="تعديل بيانات التلميذ"
                            className="p-1 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteResult && (
                          <button
                            type="button"
                            onClick={() => onDeleteResult(result.numeroEleve)}
                            title="حذف نتيجة التلميذ"
                            className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
