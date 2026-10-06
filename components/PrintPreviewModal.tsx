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

  // Mobile View Tab State: 'preview' (Paper) vs 'settings' (Controls)
  const [mobileTab, setMobileTab] = useState<'preview' | 'settings'>('preview');

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
    sm: 'text-[10px] sm:text-[11px]',
    md: 'text-xs',
    lg: 'text-xs sm:text-sm',
    xl: 'text-sm sm:text-base'
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
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col overflow-hidden text-right" dir="rtl">
      {/* Top Bar Navigation - Mobile Responsive */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 py-2.5 sm:px-6 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-white shrink-0 print:hidden">
        {/* Title and Icon */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
              <PrinterIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="font-black text-xs sm:text-base flex items-center gap-1.5 flex-wrap">
                <span>المعاينة والطباعة (Print Preview)</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block">
                ضبط الخطوط والألوان قبل الحفظ كـ PDF أو الطباعة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer sm:hidden shrink-0"
            title="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="flex-1 sm:flex-none px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>إكسيل (Excel)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>طباعة / PDF 🖨️</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="hidden sm:flex p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer shrink-0"
            title="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Switcher Segmented Control (Visible on screens < lg) */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-1.5 flex items-center gap-1 shrink-0 print:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'preview'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-800/50'
          }`}
        >
          <PrinterIcon className="w-4 h-4" />
          <span>📄 معاينة الوثيقة الورقية</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('settings')}
          className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white bg-slate-800/50'
          }`}
        >
          <Cog6ToothIcon className="w-4 h-4" />
          <span>🎨 خيارات الخط والتنسيق</span>
        </button>
      </div>

      {/* Main Container: Controls Sidebar + Document Preview Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Control Sidebar (Visible always on lg+, controlled by mobileTab on mobile) */}
        <div className={`
          w-full lg:w-80 bg-slate-800/95 border-l border-slate-700/80 p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-200 text-xs shrink-0 print:hidden
          ${mobileTab === 'settings' ? 'block' : 'hidden lg:block'}
        `}>
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-400">
              <Cog6ToothIcon className="w-4 h-4" />
              <span>خيارات تخصيص المظهر والطباعة</span>
            </div>
            {mobileTab === 'settings' && (
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className="lg:hidden px-2.5 py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-lg"
              >
                عرض الوثيقة 📄
              </button>
            )}
          </div>

          {/* Title Customization */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">عنوان التقرير / الوثيقة:</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">الجهة / الجمعية:</label>
            <input
              type="text"
              value={docSubtitle}
              onChange={(e) => setDocSubtitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">الموسم الدراسي / التاريخ:</label>
            <input
              type="text"
              value={docAcademicYear}
              onChange={(e) => setDocAcademicYear(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Font Family Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">نوع الخط (Font Family):</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setFontFamily('tajawal')}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer min-h-[40px] ${fontFamily === 'tajawal' ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
              >
                خط تجوال (Tajawal)
              </button>
              <button
                type="button"
                onClick={() => setFontFamily('cairo')}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer min-h-[40px] ${fontFamily === 'cairo' ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
              >
                خط القاهرة (Cairo)
              </button>
              <button
                type="button"
                onClick={() => setFontFamily('amiri')}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer min-h-[40px] ${fontFamily === 'amiri' ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
              >
                الخط الأميري (Amiri)
              </button>
              <button
                type="button"
                onClick={() => setFontFamily('sans')}
                className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer min-h-[40px] ${fontFamily === 'sans' ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
              >
                قياسي (System)
              </button>
            </div>
          </div>

          {/* Font Size Selection */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">حجم الخط (Font Size):</label>
            <div className="grid grid-cols-4 gap-1">
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
                  className={`py-2 rounded-xl font-extrabold text-xs border text-center transition cursor-pointer min-h-[38px] ${fontSize === s.key ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Theme Accent */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">نسق الألوان (Color Theme):</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setColorTheme('emerald')}
                className={`py-2 px-2.5 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px] ${colorTheme === 'emerald' ? 'bg-emerald-700 border-emerald-400 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-emerald-400'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shrink-0"></span>
                <span>زمردي رياضة</span>
              </button>
              <button
                type="button"
                onClick={() => setColorTheme('indigo')}
                className={`py-2 px-2.5 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px] ${colorTheme === 'indigo' ? 'bg-indigo-700 border-indigo-400 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-indigo-400'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white shrink-0"></span>
                <span>أزرق ملكي</span>
              </button>
              <button
                type="button"
                onClick={() => setColorTheme('amber')}
                className={`py-2 px-2.5 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px] ${colorTheme === 'amber' ? 'bg-amber-700 border-amber-400 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-amber-400'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shrink-0"></span>
                <span>ذهبي برونزي</span>
              </button>
              <button
                type="button"
                onClick={() => setColorTheme('mono')}
                className={`py-2 px-2.5 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px] ${colorTheme === 'mono' ? 'bg-gray-800 border-gray-500 text-white shadow-md' : 'bg-slate-900 border-slate-700 text-gray-300'}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-gray-600 border border-white shrink-0"></span>
                <span>أسود وأبيض</span>
              </button>
            </div>
          </div>

          {/* Orientation */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">اتجاه ورقة الطباعة:</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`py-2 rounded-xl border font-bold text-xs transition cursor-pointer min-h-[40px] ${orientation === 'portrait' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
              >
                📄 عمودي (Portrait)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`py-2 rounded-xl border font-bold text-xs transition cursor-pointer min-h-[40px] ${orientation === 'landscape' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
              >
                📑 أفقي (Landscape)
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-700">
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="font-bold text-slate-300">عرض التوقيع والمصادقة:</span>
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="font-bold text-slate-300">عرض الترويسة والشعار:</span>
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
        <div className={`
          flex-1 bg-slate-950 p-2 sm:p-6 overflow-x-auto overflow-y-auto flex justify-center items-start print:p-0 print:m-0 print:bg-white print:overflow-visible
          ${mobileTab === 'preview' ? 'block' : 'hidden lg:flex'}
        `}>
          {/* Paper Container - Responsive Width for Mobile Screens */}
          <div 
            className={`
              bg-white text-slate-900 shadow-2xl p-4 sm:p-8 rounded-sm my-auto ${fontFamilyCss} ${fontSizeCss} transition-all duration-200 
              print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none w-full
              ${orientation === 'landscape' ? 'max-w-[1050px] min-h-[550px] sm:min-h-[700px]' : 'max-w-[800px] min-h-[650px] sm:min-h-[1050px]'}
            `}
            style={{ boxSizing: 'border-box' }}
          >
            {/* Document Header */}
            {showLogo && (
              <div className="border-b-2 border-slate-800 pb-3 sm:pb-4 mb-4 sm:mb-6 text-center space-y-1">
                <div className="flex flex-col sm:flex-row items-center justify-between font-black text-xs text-slate-700 gap-2">
                  <div className="text-center sm:text-right">
                    <div>{docInstitution}</div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold">{docSubtitle}</div>
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-black text-base sm:text-lg text-emerald-800">
                      🏆
                    </div>
                  </div>
                  <div className="text-center sm:text-left font-mono text-[10px] sm:text-[11px]">
                    <div>{docAcademicYear}</div>
                    <div className="text-slate-400">{new Date().toLocaleDateString('ar-MA')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Title Banner */}
            <div className={`p-3 sm:p-4 rounded-xl border-2 ${themeColors.border} ${themeColors.bgHeader} text-center mb-4 sm:mb-6 shadow-xs`}>
              <h1 className="font-black text-base sm:text-lg md:text-xl tracking-tight leading-snug">
                {docTitle}
              </h1>
              {data.length > 0 && (
                <div className="text-[11px] sm:text-xs font-bold mt-1 opacity-90">
                  إجمالي المسجلين: {data.length} مشارك ومشاركة
                </div>
              )}
            </div>

            {/* Optional Report Content if present */}
            {reportText && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-justify leading-relaxed font-medium text-xs sm:text-sm">
                <div className="whitespace-pre-line">{reportText}</div>
                {reportImageUrl && (
                  <div className="mt-4 text-center">
                    <img src={reportImageUrl} alt="Report Attachment" className="max-h-48 sm:max-h-64 mx-auto rounded-xl border border-slate-300 shadow-sm max-w-full" />
                  </div>
                )}
              </div>
            )}

            {/* Main Table */}
            {data.length > 0 && (
              <div className="overflow-x-auto mb-6 sm:mb-8 -mx-2 sm:mx-0">
                <table className={`w-full border-collapse border border-slate-300 ${tableFontSizeCss}`}>
                  <thead>
                    <tr className={themeColors.tableHeader}>
                      <th className="border border-slate-300 p-1.5 sm:p-2.5 text-center font-black w-7 sm:w-10">#</th>
                      {columns.map((col) => (
                        <th 
                          key={col.key} 
                          className={`border border-slate-300 p-1.5 sm:p-2.5 font-black text-${col.align || 'right'}`}
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
                        <td className="border border-slate-300 p-1.5 sm:p-2 text-center font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        {columns.map((col) => (
                          <td 
                            key={col.key} 
                            className={`border border-slate-300 p-1.5 sm:p-2 font-semibold text-${col.align || 'right'}`}
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
              <div className="mt-8 sm:mt-12 pt-4 sm:pt-6 border-t border-slate-300 grid grid-cols-2 gap-4 sm:gap-8 text-center text-[10px] sm:text-xs font-black text-slate-800">
                <div className="space-y-6 sm:space-y-12">
                  <div>توقيع وختم رئيس الجمعية الرياضية المدرسية</div>
                  <div className="h-8 text-slate-300 text-[10px] overflow-hidden">.........................................................</div>
                </div>
                <div className="space-y-6 sm:space-y-12">
                  <div>توقيع الأستاذ(ة) المشرف(ة)</div>
                  <div className="h-8 text-slate-300 text-[10px] overflow-hidden">.........................................................</div>
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
            max-width: 100% !important;
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
