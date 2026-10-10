import React, { useState, useMemo } from 'react';
import type { StudentIdentity, MassarGradeRecord, MassarClassConfig, TarlLevelKey, TarlStudentRow, PhysicalTests, StudentResult } from '../types';
import { 
  TARL_LEVELS, 
  getTarlLevelMeta, 
  convertTarlToMassarGrades, 
  roundMassarNote 
} from '../utils/tarlHelper';
import { getActivityMeta } from '../utils/massarHelper';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  SparklesIcon, 
  ArrowsRightLeftIcon, 
  InformationCircleIcon 
} from './Icons';

interface TarlConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentIdentity[];
  tarlStudents: TarlStudentRow[];
  config: MassarClassConfig;
  existingRecords: MassarGradeRecord[];
  onApplyConversion: (convertedRecords: MassarGradeRecord[]) => void;
  physicalTests?: PhysicalTests[];
  vmaList?: StudentResult[];
}

export const TarlConversionModal: React.FC<TarlConversionModalProps> = ({
  isOpen,
  onClose,
  students,
  tarlStudents,
  config,
  existingRecords,
  onApplyConversion,
  physicalTests = [],
  vmaList = []
}) => {
  if (!isOpen) return null;

  // Conversion Options
  const [conversionStyle, setConversionStyle] = useState<'standard' | 'progressive' | 'generous'>('standard');
  const [rounding, setRounding] = useState<'0.25' | '0.5' | '1' | 'none'>(config.rounding || '0.25');
  const [customVariance, setCustomVariance] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');

  const act1Meta = getActivityMeta(config.activity1);
  const act2Meta = getActivityMeta(config.activity2);
  const act3Meta = getActivityMeta(config.activity3);

  // Map tarlStudents by numeroEleve
  const tarlMap = useMemo(() => {
    const map: Record<string, TarlStudentRow> = {};
    tarlStudents.forEach(t => {
      map[t.numeroEleve] = t;
    });
    return map;
  }, [tarlStudents]);

  // Preview Converted Records
  const previewRecords = useMemo(() => {
    const cfg: MassarClassConfig = {
      ...config,
      rounding
    };

    // Calculate base conversion with actual physical tests and VMA results
    return convertTarlToMassarGrades(students, tarlMap, cfg, existingRecords, physicalTests, vmaList).map(rec => {
      if (rec.isDispense) return rec;

      let n1 = rec.noteDevoir1 || 10;
      let n2 = rec.noteDevoir2 || 10;
      let n3 = rec.noteDevoir3 || 10;

      // Adjust based on conversionStyle
      if (conversionStyle === 'generous') {
        n1 = Math.min(20, n1 + 0.75);
        n2 = Math.min(20, n2 + 0.75);
        n3 = Math.min(20, n3 + 0.75);
      } else if (conversionStyle === 'progressive') {
        // More marked progression across the 3 devoirs
        n1 = Math.max(1, n1 - 0.75);
        n2 = n2;
        n3 = Math.min(20, n3 + 1.25);
      }

      n1 = roundMassarNote(n1, rounding);
      n2 = roundMassarNote(n2, rounding);
      n3 = roundMassarNote(n3, rounding);

      return {
        ...rec,
        noteDevoir1: n1,
        noteDevoir2: n2,
        noteDevoir3: n3
      };
    });
  }, [students, tarlMap, config, rounding, conversionStyle, existingRecords]);

  // Filter preview records for search
  const filteredPreview = useMemo(() => {
    if (!searchTerm.trim()) return previewRecords;
    const q = searchTerm.toLowerCase().trim();
    return previewRecords.filter(r => 
      r.nomEleve.toLowerCase().includes(q) || 
      (r.codeMassar || '').toLowerCase().includes(q) ||
      r.numeroEleve.includes(q)
    );
  }, [previewRecords, searchTerm]);

  // Stats on preview
  const previewStats = useMemo(() => {
    const total = previewRecords.length;
    let sum = 0;
    let success = 0;
    previewRecords.forEach(r => {
      if (!r.isDispense && r.noteDevoir1 !== null && r.noteDevoir2 !== null && r.noteDevoir3 !== null) {
        const avg = (r.noteDevoir1 + r.noteDevoir2 + r.noteDevoir3) / 3;
        sum += avg;
        if (avg >= 10) success++;
      }
    });
    return {
      total,
      avg: total > 0 ? (sum / total).toFixed(2) : '0',
      successRate: total > 0 ? Math.round((success / total) * 100) : 0
    };
  }, [previewRecords]);

  const handleConfirm = () => {
    onApplyConversion(previewRecords);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-700/80 bg-gradient-to-r from-emerald-50/70 via-indigo-50/40 to-white dark:from-gray-800 dark:to-gray-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-2xl shadow-md shadow-emerald-500/20 shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white">
                  تحويل البيانات من لوائح طارل (TaRL) إلى لوائح مسار الرسمية
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  تحويل ذكي
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                مطابقة مستويات وروائز طارل التشخيصية وتحويلها آلياً إلى نقط الفروض الثلاثة (CC1، CC2، CC3) وملاحظات الأستاذ الرسمية لمسار.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          
          {/* Conversion Mapping Guide Cards */}
          <div className="bg-gray-50 dark:bg-gray-900/60 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
              <span>🎯 مصفوفة تحويل مستويات طارل إلى معدلات ونقط مسار:</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {TARL_LEVELS.map(lvl => {
                const count = tarlStudents.filter(s => s.tarlLevel === lvl.key).length;
                return (
                  <div key={lvl.key} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black border mb-1.5 ${lvl.badgeClass}`}>
                        {lvl.shortAr}
                      </span>
                      <p className="font-black text-gray-900 dark:text-white text-xs">
                        {lvl.minScore} - {lvl.maxScore} <span className="text-[10px] text-gray-400">/20</span>
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                        {lvl.descAr}
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-[10px] text-gray-500 font-bold">
                      <span>تلاميذ طارل:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">{count}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Config Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Conversion Style */}
            <div className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700">
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                نمط توزيع نقط الفروض:
              </label>
              <select 
                value={conversionStyle}
                onChange={(e) => setConversionStyle(e.target.value as any)}
                className="w-full text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-2 text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="standard">معياري متوازن (تدرج طبيعي)</option>
                <option value="progressive">تدرج تصاعدي ملحوظ (تطور عبر الدورات)</option>
                <option value="generous">تشجيعي إيجابي (+0.75 ن)</option>
              </select>
            </div>

            {/* Rounding Mode */}
            <div className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700">
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                نظام تقريب النقط لمسار:
              </label>
              <select 
                value={rounding}
                onChange={(e) => setRounding(e.target.value as any)}
                className="w-full text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-2 text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="0.25">أقرب 0.25 (المعتمد في مسار)</option>
                <option value="0.5">أقرب 0.50</option>
                <option value="1">أعداد صحيحة</option>
                <option value="none">بدون تقريب</option>
              </select>
            </div>

            {/* Target Activities */}
            <div className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700">
              <span className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                أنشطة الفروض المعتمدة:
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-bold flex-wrap">
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                  ف1: {act1Meta.shortAr}
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                  ف2: {act2Meta.shortAr}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                  ف3: {act3Meta.shortAr}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs flex-wrap gap-2">
            <span className="font-bold text-emerald-900 dark:text-emerald-200">
              📈 نتائج المعاينة: تم تحويل <strong>{previewStats.total}</strong> تلميذ
            </span>
            <div className="flex items-center gap-3">
              <span className="text-gray-700 dark:text-gray-300">
                المعدل العام التقديري: <strong className="text-emerald-700 dark:text-emerald-400">{previewStats.avg}/20</strong>
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                نسبة النجاح (≥10): <strong className="text-indigo-600 dark:text-indigo-400">{previewStats.successRate}%</strong>
              </span>
            </div>
          </div>

          {/* Search in Preview */}
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-black text-gray-900 dark:text-white">
              معاينة لائحة مسار بعد التحويل ({filteredPreview.length} تلميذ):
            </h4>
            <input 
              type="text"
              placeholder="بحث بالاسم أو رمز مسار..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none w-56"
            />
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-2.5 px-2 text-center w-8">ر.ت</th>
                  <th className="py-2.5 px-3 min-w-[100px]">رمز مسار</th>
                  <th className="py-2.5 px-3 min-w-[160px]">الاسم الكامل</th>
                  <th className="py-2.5 px-2 text-center min-w-[90px]">مستوى طارل</th>
                  <th className="py-2.5 px-2 text-center bg-indigo-50/60 dark:bg-indigo-950/20 min-w-[65px]">
                    الفرض 1
                  </th>
                  <th className="py-2.5 px-2 text-center bg-purple-50/60 dark:bg-purple-950/20 min-w-[65px]">
                    الفرض 2
                  </th>
                  <th className="py-2.5 px-2 text-center bg-amber-50/60 dark:bg-amber-950/20 min-w-[65px]">
                    الفرض 3
                  </th>
                  <th className="py-2.5 px-2 text-center bg-emerald-50/60 dark:bg-emerald-950/20 font-black min-w-[65px]">
                    المعدل
                  </th>
                  <th className="py-2.5 px-3 min-w-[180px]">ملاحظة مسار المولدة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredPreview.map((rec, idx) => {
                  const tRow = tarlMap[rec.numeroEleve];
                  const lvlMeta = tRow ? getTarlLevelMeta(tRow.tarlLevel) : TARL_LEVELS[2];
                  const avg = rec.noteDevoir1 !== null && rec.noteDevoir2 !== null && rec.noteDevoir3 !== null
                    ? ((rec.noteDevoir1 + rec.noteDevoir2 + rec.noteDevoir3) / 3).toFixed(2)
                    : '—';

                  return (
                    <tr key={rec.numeroEleve} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40">
                      <td className="py-2 px-2 text-center text-gray-400 font-bold">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-gray-700 dark:text-gray-300">
                        {rec.codeMassar || rec.numeroEleve}
                      </td>
                      <td className="py-2 px-3 font-bold text-gray-900 dark:text-white">
                        <div>{rec.nomEleve}</div>
                        {rec.physicalTestsSummary && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal mt-0.5">
                            ⚡ {rec.physicalTestsSummary}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${lvlMeta.badgeClass}`}>
                          {lvlMeta.shortAr}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/10">
                        {rec.noteDevoir1}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-purple-700 dark:text-purple-300 bg-purple-50/30 dark:bg-purple-950/10">
                        {rec.noteDevoir2}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-amber-700 dark:text-amber-300 bg-amber-50/30 dark:bg-amber-950/10">
                        {rec.noteDevoir3}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/10">
                        {avg}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[200px]" title={rec.remarque}>
                        {rec.remarque || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold transition cursor-pointer"
          >
            إلغاء
          </button>
          
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>تأكيد التحويل وحقن النقط في لوائح مسار الرسمية الآن 🚀</span>
          </button>
        </div>

      </div>
    </div>
  );
};
