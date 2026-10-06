import React, { useState } from 'react';
import { 
  XMarkIcon, 
  PrinterIcon, 
  ArrowDownTrayIcon, 
  Cog6ToothIcon, 
  AcademicCapIcon,
  CheckCircleIcon,
  SparklesIcon
} from './Icons';

export interface PrintPreviewColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'right' | 'center' | 'left';
}

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  institutionName?: string;
  academicYear?: string;
  columns: PrintPreviewColumn[];
  data: Array<Record<string, any>>;
  reportText?: string;
  reportImageUrl?: string;
  onExportExcel?: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title: initialTitle,
  subtitle: initialSubtitle = 'الجمعية الرياضية المدرسية',
  institutionName: initialInstitution = 'المملكة المغربية • وزارة التربية الوطنية والتعليم الأولي والرياضة',
  academicYear: initialAcademicYear = 'الموسم الدراسي: 2025/2026',
  columns,
  data,
  reportText,
  reportImageUrl,
  onExportExcel
}) => {
  // Customizable print options state
  const [docTitle, setDocTitle] = useState(initialTitle);
  const [docSubtitle, setDocSubtitle] = useState(initialSubtitle);
  const [docInstitution, setDocInstitution] = useState(initialInstitution);
  const [docAcademicYear, setDocAcademicYear] = useState(initialAcademicYear);

  // Styling customizations
  const [fontFamily, setFontFamily] = useState<'tajawal' | 'cairo' | 'amiri' | 'sans'>('tajawal');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [colorTheme, setColorTheme] = useState<'emerald' | 'indigo' | 'amber' | 'mono'>('emerald');
  const [showSignatures, setShowSignatures] = useState(true);
  const [showLogo, setShowLogo] = useState(true);

  if (!isOpen) return null;

  // Font family mapping
  const fontFamilyCss = {
    tajawal: 'font-["Tajawal",sans-serif]',
    cairo: 'font-["Cairo",sans-serif]',
    amiri: 'font-["Amiri",serif]',
    sans: 'font-sans'
  }[fontFamily];

  // Font size mapping
  const fontSizeCss = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  }[fontSize];

  // Table font size mapping
  const tableFontSizeCss = {
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base'
  }[fontSize];

  // Accent color mapping
  const themeColors = {
    emerald: {
      border: 'border-emerald-600',
      bgHeader: 'bg-emerald-800 text-white',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      textAccent: 'text-emerald-800',
      tableHeader: 'bg-emerald-700 text-white',
      rowEven: 'bg-emerald-50/40'
    },
    indigo: {
      border: 'border-indigo-600',
      bgHeader: 'bg-indigo-800 text-white',
      badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      textAccent: 'text-indigo-800',
      tableHeader: 'bg-indigo-700 text-white',
      rowEven: 'bg-indigo-50/40'
    },
    amber: {
      border: 'border-amber-600',
      bgHeader: 'bg-amber-800 text-white',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      textAccent: 'text-amber-800',
      tableHeader: 'bg-amber-700 text-white',
      rowEven: 'bg-amber-50/40'
    },
    mono: {
      border: 'border-gray-800',
      bgHeader: 'bg-gray-900 text-white',
      badge: 'bg-gray-100 text-gray-900 border-gray-300',
      textAccent: 'text-gray-900',
      tableHeader: 'bg-gray-800 text-white',
      rowEven: 'bg-gray-50'
    }
  }[colorTheme];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex flex-col overflow-hidden text-right" dir="rtl">
      {/* Top Bar Navigation */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <PrinterIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-base flex items-center gap-2">
              <span>المعاينة قبل الطباعة والتصدير (Print Preview)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                تخصيص كامل ✨
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              قم بضبط الخطوط والأحجام والألوان قبل الحفظ كـ PDF أو الطباعة المباشرة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer active:scale-95"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>تصدير إكسيل (Excel)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>طباعة / حفظ كـ PDF 🖨️</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Container: Controls Sidebar + Document Preview Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Sidebar */}
        <div className="w-80 bg-slate-800/90 border-l border-slate-700/80 p-5 overflow-y-auto space-y-5 text-slate-200 text-xs shrink-0 print:hidden">
          <div className="flex items-center gap-2 font-black text-sm text-amber-400 border-b border-slate-700 pb-2">
            <Cog6ToothIcon className="w-4 h-4" />
            <span>خيارات تخصيص المظهر والطبع</span>
          </div>

          {/* Title Customization */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-300">عنوان التقرير / الوثيقة:</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-300">الجهة / الجمعية:</label>
            <input
              type="text"
              value={docSubtitle}
              onChange={(e) => setDocSubtitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-300">الموسم الدراسي / التاريخ:</label>
            <input
              type="text"
              value={docAcademicYear}
              onChange={(e) => setDocAcademicYear(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Font Family Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-300">نوع الخط (Font Family):</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFontFamily('tajawal')}
                className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${fontFamily === 'tajawal' ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
              >
                خط تجوال (Tajawal)
              </button>
              <button
                type="button"
                onClick={() => setFontFamily('cairo')}
                className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${fontFamily === 'cairo' ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
              >
                خط القاهرة (Cairo)
              </button>
              <button
                type="button"
                onClick={() => setFontFamily('amiri')}
                className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${fontFamily === 'amiri' ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
              >
                الخط الأميري (Amiri)
              </button>
              <button
                type="button"
                onClick={() => setFontFamily('sans')}
                className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition cursor-pointer ${fontFamily === 'sans' ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
              >
                قياسي (System)
              </button>
            </div>
          </div>

          {/* Font Size Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-300">حجم الخط (Font Size):</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { key: 'sm', label: 'صغير' },
                { key: 'md', label: 'عادي' },
                { key: 'lg', label: 'كبير' },
                { key: 'xl', label: 'ضخم' }
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setFontSize(s.key as any)}
                  className={`py-2 rounded-xl font-extrabold text-xs border text-center transition cursor-pointer ${fontSize === s.key ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Theme Accent */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-300">نسق الألوان (Color Theme):</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setColorTheme('emerald')}
                className={`py-2 px-3 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer ${colorTheme === 'emerald' ? 'bg-emerald-700 border-emerald-400 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-emerald-400'}`}
              >
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span>
                <span>زمردي رياضة</span>
              </button>
              <button
                type="button"
                onClick={() => setColorTheme('indigo')}
                className={`py-2 px-3 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer ${colorTheme === 'indigo' ? 'bg-indigo-700 border-indigo-400 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-indigo-400'}`}
              >
                <span className="w-3 h-3 rounded-full bg-indigo-500 border border-white"></span>
                <span>أزرق ملكي</span>
              </button>
              <button
                type="button"
                onClick={() => setColorTheme('amber')}
                className={`py-2 px-3 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer ${colorTheme === 'amber' ? 'bg-amber-700 border-amber-400 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-amber-400'}`}
              >
                <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
                <span>ذهبي / برونزي</span>
              </button>
              <button
                type="button"
                onClick={() => setColorTheme('mono')}
                className={`py-2 px-3 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer ${colorTheme === 'mono' ? 'bg-gray-800 border-gray-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-gray-300'}`}
              >
                <span className="w-3 h-3 rounded-full bg-gray-600 border border-white"></span>
                <span>أسود وأبيض</span>
              </button>
            </div>
          </div>

          {/* Orientation */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-300">اتجاه ورقة الطباعة:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`py-2 rounded-xl border font-bold text-xs transition cursor-pointer ${orientation === 'portrait' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
              >
                📄 عمودي (Portrait)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`py-2 rounded-xl border font-bold text-xs transition cursor-pointer ${orientation === 'landscape' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
              >
                📑 أفقي (Landscape)
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-slate-700">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-slate-300">عرض التوقيع والمصادقة:</span>
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-slate-300">عرض الترويسة والشعار الرسمي:</span>
              <input
                type="checkbox"
                checked={showLogo}
                onChange={(e) => setShowLogo(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Right Printable Preview View Area */}
        <div className="flex-1 bg-slate-950 p-6 overflow-auto flex justify-center items-start print:p-0 print:m-0 print:bg-white print:overflow-visible">
          {/* Paper Container */}
          <div 
            className={`bg-white text-slate-900 shadow-2xl p-8 rounded-sm my-auto ${fontFamilyCss} ${fontSizeCss} transition-all duration-200 print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none ${
              orientation === 'landscape' ? 'w-[1050px] min-h-[700px]' : 'w-[800px] min-h-[1050px]'
            }`}
            style={{ boxSizing: 'border-box' }}
          >
            {/* Document Header */}
            {showLogo && (
              <div className="border-b-2 border-slate-800 pb-4 mb-6 text-center space-y-1">
                <div className="flex items-center justify-between font-black text-xs text-slate-700">
                  <div className="text-right">
                    <div>{docInstitution}</div>
                    <div className="text-[11px] text-slate-500 font-bold">{docSubtitle}</div>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-black text-lg text-emerald-800">
                      🏆
                    </div>
                  </div>
                  <div className="text-left font-mono text-[11px]">
                    <div>{docAcademicYear}</div>
                    <div className="text-slate-400">{new Date().toLocaleDateString('ar-MA')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Title Banner */}
            <div className={`p-4 rounded-xl border-2 ${themeColors.border} ${themeColors.bgHeader} text-center mb-6 shadow-xs`}>
              <h1 className="font-black text-lg md:text-xl tracking-tight">
                {docTitle}
              </h1>
              {data.length > 0 && (
                <div className="text-xs font-bold mt-1 opacity-90">
                  إجمالي المسجلين: {data.length} مشارك ومشاركة
                </div>
              )}
            </div>

            {/* Optional Report Content if present */}
            {reportText && (
              <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-justify leading-relaxed font-medium">
                <div className="whitespace-pre-line">{reportText}</div>
                {reportImageUrl && (
                  <div className="mt-4 text-center">
                    <img src={reportImageUrl} alt="Report Attachment" className="max-h-64 mx-auto rounded-xl border border-slate-300 shadow-sm" />
                  </div>
                )}
              </div>
            )}

            {/* Main Table */}
            {data.length > 0 && (
              <div className="overflow-x-auto mb-8">
                <table className={`w-full border-collapse border border-slate-300 ${tableFontSizeCss}`}>
                  <thead>
                    <tr className={themeColors.tableHeader}>
                      <th className="border border-slate-300 p-2.5 text-center font-black w-10">#</th>
                      {columns.map((col) => (
                        <th 
                          key={col.key} 
                          className={`border border-slate-300 p-2.5 font-black text-${col.align || 'right'}`}
                          style={{ width: col.width }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={`border-b border-slate-200 ${idx % 2 === 1 ? themeColors.rowEven : 'bg-white'} hover:bg-slate-100 transition`}
                      >
                        <td className="border border-slate-300 p-2 text-center font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        {columns.map((col) => (
                          <td 
                            key={col.key} 
                            className={`border border-slate-300 p-2 font-semibold text-${col.align || 'right'}`}
                          >
                            {row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signatures & Footer Section */}
            {showSignatures && (
              <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs font-black text-slate-800">
                <div className="space-y-12">
                  <div>توقيع وختم رئيس الجمعية الرياضية المدرسية</div>
                  <div className="h-10 text-slate-300 text-[10px]">.........................................................</div>
                </div>
                <div className="space-y-12">
                  <div>توقيع الأستاذ(ة) المشرف(ة)</div>
                  <div className="h-10 text-slate-300 text-[10px]">.........................................................</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded CSS for clean browser printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          /* Print container only */
          .fixed, .backdrop-blur-md {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
          }
          div[class*="bg-white"][class*="shadow-2xl"] {
            visibility: visible !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
          div[class*="bg-white"][class*="shadow-2xl"] * {
            visibility: visible !important;
          }
          @page {
            size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
};
