import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ArrowPathIcon,
  TrophyIcon,
  SparklesIcon,
  AcademicCapIcon
} from './Icons';
import { 
  ScoringScale,
  getCustomScale, 
  saveCustomScale, 
  resetCustomScale,
  formatSecondsToMinSec,
  parseMinSecToSeconds,
  getCyclePresets,
  generateRelativeScaleFromBest,
  AcademicCycle
} from '../utils/ScoringConstants';

interface BaremeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTestKey?: string;
  selectedClass?: string;
}

export const BaremeSettingsModal: React.FC<BaremeSettingsModalProps> = ({
  isOpen,
  onClose,
  defaultTestKey = 'endurance',
  selectedClass = ''
}) => {
  const [selectedTest, setSelectedTest] = useState<string>(defaultTestKey);
  const [activeGender, setActiveGender] = useState<'M' | 'F'>('M');
  const [currentScale, setCurrentScale] = useState<ScoringScale[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Best score relative scaling input
  const [bestPerfInput, setBestPerfInput] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadScale(selectedTest);
    }
  }, [isOpen, selectedTest]);

  const loadScale = (testKey: string) => {
    const scale = getCustomScale(testKey);
    setCurrentScale(JSON.parse(JSON.stringify(scale)));
    setBestPerfInput('');
  };

  if (!isOpen) return null;

  const genderScale = currentScale.find(s => s.gender === activeGender);
  const thresholds = genderScale?.thresholds || [];

  const handleThresholdChange = (index: number, rawValue: string) => {
    if (!genderScale) return;
    const updated = [...currentScale];
    const gIdx = updated.findIndex(s => s.gender === activeGender);
    if (gIdx === -1) return;

    let numVal: number | undefined;
    if (selectedTest === 'endurance') {
      numVal = parseMinSecToSeconds(rawValue);
    } else {
      numVal = parseFloat(rawValue);
    }

    if (numVal !== undefined && !isNaN(numVal)) {
      updated[gIdx].thresholds[index].value = numVal;
      setCurrentScale(updated);
    }
  };

  const handleScoreChange = (index: number, rawScore: string) => {
    if (!genderScale) return;
    const updated = [...currentScale];
    const gIdx = updated.findIndex(s => s.gender === activeGender);
    if (gIdx === -1) return;

    const num = parseFloat(rawScore);
    if (!isNaN(num)) {
      updated[gIdx].thresholds[index].score = num;
      setCurrentScale(updated);
    }
  };

  // Apply academic cycle preset (Collège, Lycée, Primaire)
  const handleApplyCycle = (cycle: AcademicCycle) => {
    const preset = getCyclePresets(cycle, selectedTest);
    setCurrentScale(preset);
    const label = cycle === 'college' ? 'السلك الإعدادي (الرسمي)' : cycle === 'lycee' ? 'السلك التأهيلي' : 'التعليم الابتدائي';
    setFeedback(`تم تطبيق معايير ${label} بنجاح!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Generate relative scale where the best performance gets 20/20
  const handleGenerateRelativeScale = () => {
    let bestVal: number | undefined;
    if (selectedTest === 'endurance') {
      bestVal = parseMinSecToSeconds(bestPerfInput);
    } else {
      bestVal = parseFloat(bestPerfInput);
    }

    if (!bestVal || isNaN(bestVal) || bestVal <= 0) {
      setFeedback("يرجى إدخال أفضل نتيجة مسجلة بشكل صحيح أولاً.");
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const lowerIsBetter = selectedTest.includes('speed') || selectedTest === 'endurance';
    const relativeGen = generateRelativeScaleFromBest(bestVal, lowerIsBetter, activeGender);

    const updated = [...currentScale];
    const gIdx = updated.findIndex(s => s.gender === activeGender);
    if (gIdx >= 0) {
      updated[gIdx] = relativeGen;
    } else {
      updated.push(relativeGen);
    }

    setCurrentScale(updated);
    setFeedback(`تم توليد سلم تنقيط نسبي بناءً على أفضل نتيجة (${bestPerfInput} = 20/20) بنجاح!`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSave = () => {
    saveCustomScale(selectedTest, currentScale);
    setFeedback("تم حفظ سلم التنقيط المخصص بنجاح!");
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleReset = () => {
    resetCustomScale(selectedTest);
    loadScale(selectedTest);
    setFeedback("تم استرجاع السلم الافتراضي بنجاح.");
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-2xl">
              <TrophyIcon className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <span>سلم ومعايير التنقيط (الباريم)</span>
                {selectedClass && (
                  <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                    {selectedClass}
                  </span>
                )}
              </h2>
              <p className="text-xs text-indigo-100">
                تعديل سلم التنقيط حسب الرياضة، أو تحديده آلياً حسب السلك وأفضل نتيجة (20/20)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full cursor-pointer transition">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {feedback && (
            <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-slide-up">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Test Type Tabs */}
          <div className="space-y-1.5">
            <span className="text-xs font-black text-gray-700 dark:text-gray-300">اختر الرياضة / الاختبار:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5">
              {[
                { id: 'speed', label: '30 م سرعة', unit: 'ث' },
                { id: 'speed-60', label: '60 م سرعة', unit: 'ث' },
                { id: 'speed-80', label: '80 م سرعة', unit: 'ث' },
                { id: 'speed-100', label: '100 م', unit: 'ث' },
                { id: 'endurance', label: 'التحمل', unit: 'د:ث' },
                { id: 'long-jump', label: 'القفز الطولي', unit: 'م' },
                { id: 'shot-put', label: 'دفع الجلة', unit: 'م' },
                { id: 'balance', label: 'توازن ثابت', unit: 'ث' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTest(tab.id)}
                  className={`p-2 rounded-2xl text-xs font-bold transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                    selectedTest === tab.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  <span className={`text-[10px] ${selectedTest === tab.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                    ({tab.unit})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Top Presets: Academic Cycle & Best-Score Relative Generation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            {/* Cycle Preset */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <AcademicCapIcon className="w-4 h-4 text-indigo-600" />
                <span>تحديد تلقائي حسب السلك التعليمي:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyCycle('college')}
                  className="px-2.5 py-1.5 bg-white dark:bg-gray-800 hover:bg-indigo-50 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] font-bold text-gray-800 dark:text-gray-200 shadow-2xs cursor-pointer active:scale-95 transition"
                >
                  🏫 إعدادي (Collège)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCycle('lycee')}
                  className="px-2.5 py-1.5 bg-white dark:bg-gray-800 hover:bg-indigo-50 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] font-bold text-gray-800 dark:text-gray-200 shadow-2xs cursor-pointer active:scale-95 transition"
                >
                  🎓 تأهيلي (Lycée)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCycle('primaire')}
                  className="px-2.5 py-1.5 bg-white dark:bg-gray-800 hover:bg-indigo-50 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] font-bold text-gray-800 dark:text-gray-200 shadow-2xs cursor-pointer active:scale-95 transition"
                >
                  🎒 ابتدائي (Primaire)
                </button>
              </div>
            </div>

            {/* Relative Best Score Generator */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-amber-500" />
                <span>تحديد نسبي (أفضل نتيجة = 20/20):</span>
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={bestPerfInput}
                  onChange={(e) => setBestPerfInput(e.target.value)}
                  placeholder={selectedTest === 'endurance' ? 'مثال: 3:10' : 'مثال: 4.15'}
                  className="w-28 px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-mono font-bold text-center text-amber-900 dark:text-amber-100 outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleGenerateRelativeScale}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-black shadow-xs cursor-pointer active:scale-95 transition whitespace-nowrap"
                >
                  ⚡ توليد السلم
                </button>
              </div>
            </div>
          </div>

          {/* Gender Selector */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-750 p-2 rounded-2xl border border-gray-200 dark:border-gray-600">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 ps-2">
              الفئة المستهدفة:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveGender('M')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeGender === 'M'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                ذكور (Garçons)
              </button>
              <button
                type="button"
                onClick={() => setActiveGender('F')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeGender === 'F'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                إناث (Filles)
              </button>
            </div>
          </div>

          {/* Thresholds Table */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/60 font-bold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-3 text-center w-24">المرتبة</th>
                  <th className="p-3 text-center">
                    الأداء المطلوب {selectedTest.includes('speed') || selectedTest === 'balance' ? '(بالثواني)' : selectedTest === 'endurance' ? '(دقائق : ثواني)' : '(بالمتر)'}
                  </th>
                  <th className="p-3 text-center w-32">النقطة (/20)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                {thresholds.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-750">
                    <td className="p-3 text-center font-bold text-gray-500">
                      #{idx + 1}
                    </td>

                    <td className="p-3 text-center">
                      <input
                        type="text"
                        defaultValue={
                          selectedTest === 'endurance'
                            ? (t.value !== undefined && !isNaN(t.value) ? formatSecondsToMinSec(t.value) : '')
                            : (t.value !== undefined && !isNaN(t.value) ? String(t.value) : '')
                        }
                        key={`${selectedTest}-${activeGender}-${idx}-${t.value}`}
                        onBlur={(e) => handleThresholdChange(idx, e.target.value)}
                        placeholder={selectedTest === 'endurance' ? '3:20' : ''}
                        className="w-32 text-center font-mono font-bold text-sm px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </td>

                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        defaultValue={t.score !== undefined && !isNaN(t.score) ? t.score : ''}
                        key={`${selectedTest}-${activeGender}-${idx}-score-${t.score}`}
                        onBlur={(e) => handleScoreChange(idx, e.target.value)}
                        className="w-24 text-center font-black font-mono text-sm px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-gray-500 hover:text-rose-600 flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>استعادة الباريم الافتراضي</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer active:scale-95 transition"
            >
              حفظ التعديلات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
