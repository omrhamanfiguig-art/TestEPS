import React, { useState, useRef } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, CheckCircleIcon, SparklesIcon, DocumentTextIcon } from './Icons';
import { ChampionshipRegistration } from '../types';
import * as XLSX from 'xlsx';

interface ChampionshipPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  championshipTitle: string;
  championshipType: string;
  participants: ChampionshipRegistration[];
}

export const ChampionshipPrintPreviewModal: React.FC<ChampionshipPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  championshipTitle,
  championshipType,
  participants
}) => {
  const [fontFamily, setFontFamily] = useState<'Cairo' | 'Tajawal' | 'Amiri' | 'Arial' | 'Segoe UI'>('Cairo');
  const [fontSize, setFontSize] = useState<number>(12); // pt
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [schoolName, setSchoolName] = useState<string>(() => localStorage.getItem('eps_school_name') || 'الثانوية التأهيلية الخوارزمية');
  const [showHeader, setShowHeader] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSchoolNameChange = (val: string) => {
    setSchoolName(val);
    localStorage.setItem('eps_school_name', val);
  };

  const handleExportExcel = () => {
    if (participants.length === 0) return;

    const dataRows = participants.map((reg, idx) => ({
      'الترتيب': idx + 1,
      'الاسم الكامل': reg.nomEleve,
      'القسم': reg.className,
      'رقم مسار': reg.numeroEleve,
      'الجنس': reg.sexe === 'F' ? 'أنثى' : 'ذكر',
      'المسابقة / الدور': reg.sportCollectifRole || 'مشارك',
      'الملاحظات': reg.note || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المشاركون');
    const safeTitle = championshipTitle.replace(/[/\\?%*:|"<>]/g, '_');
    XLSX.writeFile(wb, `لائحة_المشاركين_${safeTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  const getFontFamilyStyle = () => {
    switch (fontFamily) {
      case 'Cairo': return "'Cairo', sans-serif";
      case 'Tajawal': return "'Tajawal', sans-serif";
      case 'Amiri': return "'Amiri', serif";
      case 'Arial': return "Arial, sans-serif";
      case 'Segoe UI': return "'Segoe UI', Tahoma, sans-serif";
      default: return "'Cairo', sans-serif";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/80 backdrop-blur-md animate-in fade-in" dir="rtl">
      {/* Printable Style Injector */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* MODAL NAVBAR / TOOLBAR */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 shrink-0 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 font-bold">
            🖨️
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
              معاينة قبل الطباعة وتخصيص الوثيقة الرسمية
            </h3>
            <p className="text-xs text-gray-500">
              تحديد خيارات الخط، التنسيق، والطباعة المباشرة لـ {participants.length} مشارك
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>تصدير Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerPrint}
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
          >
            <span>🖨️ طباعة / حفظ كـ PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER: CONTROLS SIDEBAR + LIVE PREVIEW CANVAS */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* SIDEBAR SETTINGS CONTROL PANEL */}
        <div className="w-full md:w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-5 overflow-y-auto space-y-5 text-xs text-right shrink-0 no-print">
          <h4 className="font-black text-sm text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700">
            🎨 إعدادات التنسيق والخطوط
          </h4>

          {/* School Name */}
          <div className="space-y-1">
            <label className="font-bold text-gray-700 dark:text-gray-300">اسم المؤسسة التعليمية:</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => handleSchoolNameChange(e.target.value)}
              placeholder="مثال: الثانوية التأهيلية الخوارزمي"
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold"
            />
          </div>

          {/* Font Family Selection */}
          <div className="space-y-1">
            <label className="font-bold text-gray-700 dark:text-gray-300">نوع الخط (Font Family):</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value as any)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold cursor-pointer"
            >
              <option value="Cairo">القاهرة (Cairo) - عصري ورسمي</option>
              <option value="Tajawal">تجوال (Tajawal) - واضح ومقروء</option>
              <option value="Amiri">الأميري (Amiri) - خط تقليدي فاخر</option>
              <option value="Arial">Arial - قياسي</option>
              <option value="Segoe UI">Segoe UI - افتراضي</option>
            </select>
          </div>

          {/* Font Size Selection */}
          <div className="space-y-1">
            <label className="font-bold text-gray-700 dark:text-gray-300">حجم الخط (Font Size):</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { size: 10, label: '10pt (صغير)' },
                { size: 12, label: '12pt (عادي)' },
                { size: 14, label: '14pt (كبير)' },
                { size: 16, label: '16pt (ضخم)' },
              ].map(opt => (
                <button
                  key={opt.size}
                  type="button"
                  onClick={() => setFontSize(opt.size)}
                  className={`py-2 rounded-xl font-bold transition text-center ${
                    fontSize === opt.size 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {opt.size}pt
                </button>
              ))}
            </div>
          </div>

          {/* Layout Display Mode */}
          <div className="space-y-1">
            <label className="font-bold text-gray-700 dark:text-gray-300">نمط عرض المشاركين:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>📊 جدول منسق</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                  viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>🎴 بطاقات الوفد</span>
              </button>
            </div>
          </div>

          {/* Header & Footer Toggles */}
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showHeader}
                onChange={(e) => setShowHeader(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              <span>إظهار الترويسة الرسمية للوزارة</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              <span>إظهار خانة التوقيعات والتأشيرات</span>
            </label>
          </div>
        </div>

        {/* LIVE PRINTABLE DOCUMENT SHEET PREVIEW AREA */}
        <div className="flex-1 bg-gray-200 dark:bg-gray-900 p-4 md:p-8 overflow-y-auto flex justify-center">
          <div
            id="printable-area"
            style={{
              fontFamily: getFontFamilyStyle(),
              fontSize: `${fontSize}pt`,
              lineHeight: 1.6
            }}
            className="bg-white text-gray-900 w-full max-w-4xl p-8 md:p-12 shadow-2xl rounded-2xl border border-gray-300 text-right space-y-6 self-start"
          >
            {/* OFFICIAL HEADER */}
            {showHeader && (
              <div className="border-b-2 border-gray-900 pb-4 flex items-center justify-between gap-4">
                <div className="text-right text-xs font-bold leading-relaxed text-gray-800">
                  المملكة المغربية<br />
                  وزارة التربية الوطنية والتعليم الأولي والرياضة<br />
                  الأكاديمية الجهوية للتربية والتكوين<br />
                  المديرية الإقليمية<br />
                  <span className="font-extrabold text-indigo-900">{schoolName}</span><br />
                  <span className="font-extrabold text-emerald-800">الجمعية الرياضية المدرسية</span>
                </div>

                <div className="text-center shrink-0">
                  <div className="w-16 h-16 rounded-full border-2 border-indigo-900 flex items-center justify-center font-black text-indigo-900 text-xl mx-auto">
                    EPS
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 mt-1">الجمعية الرياضية</div>
                </div>

                <div className="text-left text-xs font-mono text-gray-600 leading-relaxed">
                  تاريخ التوثيق: {new Date().toLocaleDateString('ar-MA')}<br />
                  الموسم الدراسي: 2025/2026<br />
                  عدد المشاركين: {participants.length}
                </div>
              </div>
            )}

            {/* DOCUMENT TITLE */}
            <div className="text-center space-y-1 my-4">
              <h1 className="font-black text-xl md:text-2xl text-gray-900 underline underline-offset-8 decoration-2 decoration-indigo-600">
                لائحة المشاركين الرسمية في {championshipTitle}
              </h1>
              <p className="text-xs text-gray-500 font-bold">
                وفد الجمعية الرياضية المدرسية بالمؤسسة لتمثيل الثانوية في التظاهرة الرياضية
              </p>
            </div>

            {/* PARTICIPANTS DISPLAY MODE */}
            {participants.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold">
                لا يوجد مشاركون محددون في هذه البطولة بعد.
              </div>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto border border-gray-900 rounded-lg">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-900 text-gray-900 font-black">
                      <th className="p-2.5 border-l border-gray-900 w-12 text-center">#</th>
                      <th className="p-2.5 border-l border-gray-900">الاسم الكامل للتلميذ(ة)</th>
                      <th className="p-2.5 border-l border-gray-900 w-28 text-center">القسم</th>
                      <th className="p-2.5 border-l border-gray-900 w-32 font-mono text-center">رقم مسار</th>
                      <th className="p-2.5 border-l border-gray-900 w-20 text-center">الجنس</th>
                      <th className="p-2.5">المسابقة / الاختصاص</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 font-medium text-gray-800">
                    {participants.map((reg, idx) => (
                      <tr key={`${reg.id}_${idx}`} className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}>
                        <td className="p-2.5 border-l border-gray-300 text-center font-bold font-mono">{idx + 1}</td>
                        <td className="p-2.5 border-l border-gray-300 font-bold text-gray-900">{reg.nomEleve}</td>
                        <td className="p-2.5 border-l border-gray-300 text-center font-bold">{reg.className}</td>
                        <td className="p-2.5 border-l border-gray-300 text-center font-mono">{reg.numeroEleve}</td>
                        <td className="p-2.5 border-l border-gray-300 text-center font-bold">
                          {reg.sexe === 'F' ? 'أنثى' : 'ذكر'}
                        </td>
                        <td className="p-2.5 font-bold text-indigo-950">{reg.sportCollectifRole || 'مشارك'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* CARDS DISPLAY MODE */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {participants.map((reg, idx) => (
                  <div key={`${reg.id}_${idx}`} className="p-3 border-2 border-gray-800 rounded-xl bg-gray-50/50 space-y-1">
                    <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                      <span className="font-mono font-black text-xs text-gray-500">#{idx + 1}</span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-gray-200">{reg.className}</span>
                    </div>
                    <div className="font-black text-sm text-gray-900">{reg.nomEleve}</div>
                    <div className="text-[10px] text-gray-600 font-mono">رقم مسار: {reg.numeroEleve}</div>
                    <div className="text-[11px] font-bold text-indigo-900">{reg.sportCollectifRole || 'مشارك'}</div>
                  </div>
                ))}
              </div>
            )}

            {/* OFFICIAL SIGNATURES BLOCK */}
            {showSignatures && (
              <div className="pt-8 border-t border-gray-300 mt-8">
                <table className="w-full text-center font-bold">
                  <tbody>
                    <tr>
                      <td className="w-1/2 p-4">
                        توقيع الأستاذ المؤطر ورئيس الجمعية:<br /><br /><br />
                        <span className="text-gray-400 font-normal">...................................................</span>
                      </td>
                      <td className="w-1/2 p-4">
                        تأشيرة وخاتم السيد مدير المؤسسة:<br /><br /><br />
                        <span className="text-gray-400 font-normal">...................................................</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
