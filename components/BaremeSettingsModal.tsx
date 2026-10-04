import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ArrowPathIcon,
  TrophyIcon
} from './Icons';
import { 
  ScoringScale,
  getCustomScale, 
  saveCustomScale, 
  resetCustomScale,
  formatSecondsToMinSec,
  parseMinSecToSeconds,
  SPEED_SCALE_30M,
  ENDURANCE_SCALE_1000M,
  LONG_JUMP_SCALE,
  SHOT_PUT_SCALE
} from '../utils/ScoringConstants';

interface BaremeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTestKey?: 'speed' | 'speed-60' | 'speed-80' | 'speed-100' | 'endurance' | 'long-jump' | 'shot-put';
}

export const BaremeSettingsModal: React.FC<BaremeSettingsModalProps> = ({
  isOpen,
  onClose,
  defaultTestKey = 'endurance'
}) => {
  const [selectedTest, setSelectedTest] = useState<'speed' | 'speed-60' | 'speed-80' | 'speed-100' | 'endurance' | 'long-jump' | 'shot-put'>(defaultTestKey);
  const [activeGender, setActiveGender] = useState<'M' | 'F'>('M');
  const [currentScale, setCurrentScale] = useState<ScoringScale[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadScale(selectedTest);
    }
  }, [isOpen, selectedTest]);

  const loadScale = (testKey: 'speed' | 'speed-60' | 'speed-80' | 'speed-100' | 'endurance' | 'long-jump' | 'shot-put') => {
    const scale = getCustomScale(testKey);
    // Deep clone to allow editing
    setCurrentScale(JSON.parse(JSON.stringify(scale)));
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

  const handleSave = () => {
    saveCustomScale(selectedTest, currentScale);
    setFeedback("تم حفظ سلم التنقيط المخصص بنجاح!");
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleReset = () => {
    if (confirm("هل تريد استعادة سلم التنقيط الوزاري الافتراضي لهذا الاختبار؟")) {
      resetCustomScale(selectedTest);
      loadScale(selectedTest);
      setFeedback("تم استرجاع السلم الافتراضي بنجاح.");
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrophyIcon className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-black">شبكة وسلالم التنقيط (الباريم)</h2>
              <p className="text-xs text-indigo-100">
                تحديد وضبط معايير التنقيط المعتمدة في التقويم البدني لكل اختبار
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {feedback && (
            <div className="p-3 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Test Type Tabs */}
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
            {[
              { id: 'endurance', label: 'التحمل', unit: 'د:ث' },
              { id: 'speed', label: '30 م', unit: 'ث' },
              { id: 'speed-60', label: '60 م', unit: 'ث' },
              { id: 'speed-80', label: '80 م', unit: 'ث' },
              { id: 'speed-100', label: '100 م', unit: 'ث' },
              { id: 'long-jump', label: 'القفز الطولي', unit: 'م' },
              { id: 'shot-put', label: 'دفع الجلة', unit: 'م' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTest(tab.id as any)}
                className={`p-3 rounded-2xl text-xs font-bold transition text-center flex flex-col items-center gap-1 ${
                  selectedTest === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] ${selectedTest === tab.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {tab.unit}
                </span>
              </button>
            ))}
          </div>

          {/* Gender Selector */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded-2xl border border-gray-200 dark:border-gray-600">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 ps-2">
              الفئة المستهدفة:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveGender('M')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
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
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeGender === 'F'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                إناث (Filles)
              </button>
            </div>
          </div>

          {/* Scale Notice for Endurance */}
          {selectedTest === 'endurance' && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-2xl text-xs text-red-800 dark:text-red-300 flex items-center gap-2">
              <span>⏱️</span>
              <span>
                <strong>معيار التحمل:</strong> وحدة القياس بالدقائق والثواني (د:ث). يمكنك إدخال التوقيت بصيغة <strong>3:20</strong> أو <strong>03:20</strong> وسيتم حسابه تلقائياً.
              </span>
            </div>
          )}

          {/* Thresholds Table */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/60 font-bold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-3">المستوى / الترتيب</th>
                  <th className="p-3 text-center">
                    الأداء المطلوب {(selectedTest === 'speed' || selectedTest === 'speed-60' || selectedTest === 'speed-80') ? '(ثانية)' : selectedTest === 'endurance' ? '(دقائق : ثواني)' : '(متر)'}
                  </th>
                  <th className="p-3 text-center">النقطة من 20</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                {thresholds.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-750">
                    <td className="p-3 font-bold text-gray-500">
                      المرتبة {idx + 1}
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
                        className="w-28 text-center font-mono font-bold text-sm px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                        className="w-20 text-center font-black font-mono text-sm px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-gray-500 hover:text-rose-600 flex items-center gap-1.5 transition"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>استعادة الباريم الافتراضي</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              حفظ التعديلات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
