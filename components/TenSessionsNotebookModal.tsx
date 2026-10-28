import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  PrinterIcon, 
  ExcelIcon, 
  InformationCircleIcon
} from './Icons';
import { StudentIdentity } from '../types';
import { getAllClasses, getStudentList, ClassStats } from '../utils/db';
import { exportTenSessionsNotebookToExcel } from '../utils/excelHelper';
import { getTeacherForClass } from '../utils/teacherHelper';

interface TenSessionsNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClassName?: string;
}

interface ClassRoster {
  className: string;
  students: StudentIdentity[];
}

export const TenSessionsNotebookModal: React.FC<TenSessionsNotebookModalProps> = ({
  isOpen,
  onClose,
  defaultClassName = ''
}) => {
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(defaultClassName);
  const [exportMode, setExportMode] = useState<'single' | 'all'>('single');
  
  // Customization fields
  const [institution, setInstitution] = useState<string>(() => localStorage.getItem('eps_school_name') || 'الثانوية التأهيلية');
  const [teacherName, setTeacherName] = useState<string>(() => localStorage.getItem('eps_teacher_name') || 'أستاذ التربية البدنية والرياضية');
  const [academicYear, setAcademicYear] = useState<string>(() => {
    const curYear = new Date().getFullYear();
    return `${curYear} / ${curYear + 1}`;
  });
  const [sportActivity, setSportActivity] = useState<string>('التربية البدنية والرياضية');

  // Loaded students for preview & export
  const [previewStudents, setPreviewStudents] = useState<StudentIdentity[]>([]);
  const [allClassesData, setAllClassesData] = useState<ClassRoster[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultClassName) {
      setSelectedClass(defaultClassName);
    }
  }, [defaultClassName]);

  const loadInitialData = async () => {
    try {
      const cls = await getAllClasses();
      setClasses(cls);
      
      const targetClass = defaultClassName || (cls.length > 0 ? cls[0].className : '');
      if (targetClass) {
        setSelectedClass(targetClass);
      }

      // Preload all classes for "all" mode
      if (cls.length > 0) {
        loadAllClassesRosters(cls);
      }
    } catch (e) {
      console.error('Error loading initial classes:', e);
    }
  };

  const loadAllClassesRosters = async (classList: ClassStats[]) => {
    try {
      const rosters: ClassRoster[] = [];
      for (const c of classList) {
        const studs = await getStudentList(c.className);
        rosters.push({ className: c.className, students: studs || [] });
      }
      setAllClassesData(rosters);
    } catch (e) {
      console.error('Error loading all class rosters:', e);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadStudentsForClass(selectedClass);
      const teacher = getTeacherForClass(selectedClass);
      if (teacher && teacher !== 'أستاذ التربية البدنية') {
        setTeacherName(teacher);
      }
    }
  }, [selectedClass]);

  const loadStudentsForClass = async (clsName: string) => {
    if (!clsName) return;
    setIsLoadingPreview(true);
    try {
      const studs = await getStudentList(clsName);
      setPreviewStudents(studs || []);
    } catch (e) {
      console.error('Error loading students for class:', e);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  /**
   * Generates standalone HTML for a single class sheet
   */
  const renderClassSheetHtml = (className: string, students: StudentIdentity[]): string => {
    const list = students || [];
    const totalRows = Math.max(35, list.length);

    let rowsHtml = '';
    for (let i = 0; i < totalRows; i++) {
      const s = list[i];
      rowsHtml += `
        <tr>
          <td style="font-weight: bold; width: 32px;">${i + 1}</td>
          <td style="font-family: monospace; font-size: 10px; width: 110px;">${s ? (s.codeMassar || s.numeroEleve || '') : ''}</td>
          <td class="student-name" style="width: 220px;">${s ? (s.nomEleve || '') : ''}</td>
          <td style="font-size: 10px; font-family: monospace; width: 95px;">${s ? (s.dateNaissance || '') : ''}</td>
          <td class="session-cell"></td>
          <td class="session-cell"></td>
          <td class="session-cell"></td>
          <td class="session-cell"></td>
          <td class="session-cell"></td>
          <td class="session-cell"></td>
          <td class="session-cell"></td>
          <td class="session-cell"></td>
          <td class="session-cell"></td>
          <td class="session-cell"></td>
          <td style="width: 55px;"></td>
          <td style="width: 130px;"></td>
        </tr>
      `;
    }

    return `
      <div class="sheet">
        <!-- Official Moroccan Header -->
        <div class="official-header">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="text-align: right; line-height: 1.35; font-size: 11px;">
              <div style="font-weight: 800;">المملكة المغربية</div>
              <div>وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
              <div>المؤسسة: <strong style="text-decoration: underline;">${institution}</strong></div>
            </div>

            <div style="text-align: center;">
              <div class="title-box">
                دفتر التتبع اليومي والمواظبة (10 حصص)
              </div>
              <div style="font-size: 11px; font-weight: bold; margin-top: 4px; color: #333;">
                مادة التربية البدنية والرياضية — الموسم الدراسي: ${academicYear}
              </div>
            </div>

            <div style="text-align: left; line-height: 1.35; font-size: 11px;">
              <div>الأستاذ(ة): <strong style="text-decoration: underline;">${teacherName}</strong></div>
              <div>القسم: <span style="font-weight: 900; background: #e5e7eb; padding: 2px 8px; border-radius: 4px; border: 1px solid #9ca3af; font-size: 12px;">${className}</span></div>
              <div>النشاط: <strong>${sportActivity}</strong></div>
            </div>
          </div>
        </div>

        <!-- Table Grid -->
        <div style="flex: 1; overflow: hidden;">
          <table>
            <thead>
              <tr>
                <th style="width: 32px;">الرقم</th>
                <th style="width: 110px;">رقم مسار</th>
                <th style="text-align: right; padding-right: 6px; width: 220px;">الاسم والنسب الكامل</th>
                <th style="width: 95px;">تاريخ الازدياد</th>
                <th class="session-th">ح 1</th>
                <th class="session-th">ح 2</th>
                <th class="session-th">ح 3</th>
                <th class="session-th">ح 4</th>
                <th class="session-th">ح 5</th>
                <th class="session-th">ح 6</th>
                <th class="session-th">ح 7</th>
                <th class="session-th">ح 8</th>
                <th class="session-th">ح 9</th>
                <th class="session-th">ح 10</th>
                <th style="width: 55px; font-size: 10px;">م.الغياب</th>
                <th style="width: 130px;">ملاحظات عامة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Official Signatures -->
        <div class="footer-sig">
          <div>
            <div>توقيع وتأشيرة الأستاذ(ة):</div>
            <div style="height: 38px;"></div>
          </div>
          <div style="font-size: 9px; color: #666; text-align: center; margin-top: 25px;">
            منصة EPS Maroc — وثيقة رسمية للتتبع المستمر والمواظبة في التربية البدنية والرياضية (10 حصص)
          </div>
          <div style="text-align: left;">
            <div>توقيع وتأشيرة الإدارة التربوية:</div>
            <div style="height: 38px;"></div>
          </div>
        </div>
      </div>
    `;
  };

  /**
   * Executes print via an isolated hidden iframe.
   * This is 100% resilient inside embedded iframes and does not clip or render blank pages!
   */
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      let sheetsHtml = '';

      if (exportMode === 'single') {
        const targetClass = selectedClass || 'القسم';
        let studs = previewStudents;
        if (!studs || studs.length === 0) {
          studs = await getStudentList(targetClass);
        }
        sheetsHtml = renderClassSheetHtml(targetClass, studs || []);
      } else {
        // All classes mode
        let rosters = allClassesData;
        if (!rosters || rosters.length === 0) {
          const freshClasses = await getAllClasses();
          rosters = [];
          for (const c of freshClasses) {
            const st = await getStudentList(c.className);
            rosters.push({ className: c.className, students: st || [] });
          }
        }
        if (!rosters || rosters.length === 0) {
          rosters = [{ className: selectedClass || 'القسم 1', students: previewStudents }];
        }
        sheetsHtml = rosters.map(cls => renderClassSheetHtml(cls.className, cls.students)).join('');
      }

      // Create an off-screen iframe
      const printIframe = document.createElement('iframe');
      printIframe.setAttribute('style', 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;border:none;');
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentWindow?.document;
      if (!iframeDoc) {
        // Fallback to window.print if iframe doc is inaccessible
        window.print();
        setIsPrinting(false);
        return;
      }

      const fullHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>دفتر التتبع اليومي - 10 حصص</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 6mm 6mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              direction: rtl;
            }
            .sheet {
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              box-sizing: border-box;
              width: 100%;
              min-height: 98vh;
              height: 98vh;
              padding: 4mm 6mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .official-header {
              border-bottom: 2px solid #000;
              padding-bottom: 5px;
              margin-bottom: 6px;
            }
            .title-box {
              border: 2px solid #000;
              background-color: #f3f4f6 !important;
              font-weight: 900;
              font-size: 15px;
              padding: 3px 14px;
              border-radius: 6px;
              display: inline-block;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
              border: 1.5px solid #000;
            }
            th, td {
              border: 1px solid #1f2937;
              padding: 2.5px 3px;
              text-align: center;
              height: 19px;
            }
            th {
              background-color: #f3f4f6 !important;
              font-weight: 800;
              font-size: 10px;
            }
            .session-th {
              width: 32px;
              font-size: 9.5px;
            }
            .session-cell {
              width: 32px;
            }
            .student-name {
              text-align: right;
              padding-right: 6px;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .footer-sig {
              margin-top: 6px;
              padding-top: 5px;
              border-top: 1px solid #6b7280;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${sheetsHtml}
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(fullHtml);
      iframeDoc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print failed, falling back to window.print', err);
          window.print();
        } finally {
          setIsPrinting(false);
          // Clean up iframe after printing dialog closes
          setTimeout(() => {
            try {
              document.body.removeChild(printIframe);
            } catch (e) {}
          }, 30000);
        }
      }, 400);

    } catch (e) {
      console.error('Print trigger failed:', e);
      setIsPrinting(false);
      window.print();
    }
  };

  const handleExcelExport = async () => {
    setIsExporting(true);
    try {
      if (exportMode === 'single') {
        const targetClass = selectedClass || 'القسم';
        let studs = previewStudents;
        if (!studs || studs.length === 0) {
          studs = await getStudentList(targetClass);
        }
        exportTenSessionsNotebookToExcel([{ className: targetClass, students: studs || [] }], {
          institution,
          teacherName,
          academicYear,
          sportActivity
        });
        setNotification({ 
          message: `تم تصدير دفتر تتبع الحصص للقسم «${targetClass}» بنجاح!`, 
          type: 'success' 
        });
      } else {
        // All classes mode
        let rosters = allClassesData;
        if (!rosters || rosters.length === 0) {
          const freshClasses = await getAllClasses();
          rosters = [];
          for (const c of freshClasses) {
            const st = await getStudentList(c.className);
            rosters.push({ className: c.className, students: st || [] });
          }
        }

        if (rosters.length === 0) {
          rosters = [{ className: selectedClass || 'القسم 1', students: previewStudents }];
        }

        exportTenSessionsNotebookToExcel(rosters, {
          institution,
          teacherName,
          academicYear,
          sportActivity
        });
        setNotification({ 
          message: `تم تصدير دفاتر التتبع لجميع الأقسام (${rosters.length} قسماً) كل قسم في ورقة مستقلة بنجاح!`, 
          type: 'success' 
        });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'حدث خطأ أثناء تصدير ملف Excel', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  // Decide what to show in on-screen preview
  const previewRosters = exportMode === 'single'
    ? [{ className: selectedClass || 'القسم', students: previewStudents }]
    : (allClassesData.length > 0 ? allClassesData : [{ className: selectedClass || 'القسم', students: previewStudents }]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-850 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-gray-100">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shadow-xs">
              📋
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">
                دفتر التتبع اليومي والمواظبة (10 حصص)
              </h2>
              <p className="text-[11px] sm:text-xs text-indigo-100">
                شبكة متابعة الحضور والغياب في 10 حصص — كل قسم في ورقة A4 واحدة مستقلة مع تاريخ الازدياد
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Options & Controls Bar */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 shrink-0 space-y-3">
          {notification && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
              notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}>
              <span>{notification.message}</span>
              <button onClick={() => setNotification(null)} className="p-1 cursor-pointer">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Scope / Mode */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                نطاق التصدير والطباعة:
              </label>
              <select
                value={exportMode}
                onChange={(e) => setExportMode(e.target.value as 'single' | 'all')}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold"
              >
                <option value="single">قسم محدد فقط</option>
                <option value="all">جميع الأقسام (كل قسم في ورقة مستقلة)</option>
              </select>
            </div>

            {/* Class Selector */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                القسم:
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={exportMode === 'all'}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
              >
                {classes.length === 0 ? (
                  <option value={selectedClass || 'قسم 1'}>{selectedClass || 'قسم 1'}</option>
                ) : (
                  classes.map(c => (
                    <option key={c.className} value={c.className}>
                      {c.className} ({c.studentCount} تلميذ)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Institution */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                المؤسسة:
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="اسم المؤسسة..."
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold"
              />
            </div>

            {/* Teacher Name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                الأستاذ(ة):
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="اسم الأستاذ..."
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold"
              />
            </div>

            {/* Sport / Activity */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                النشاط الرياضي:
              </label>
              <input
                type="text"
                value={sportActivity}
                onChange={(e) => setSportActivity(e.target.value)}
                placeholder="النشاط الرياضي..."
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <InformationCircleIcon className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                {exportMode === 'single' 
                  ? `القسم «${selectedClass}» (${previewStudents.length} تلميذ مسجل — ورقة A4 أفقية)`
                  : `سيتم تصدير وطباعة جميع الأقسام (${previewRosters.length} قسماً) كل قسم في صفحة A4 مستقلة`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExcelExport}
                disabled={isExporting}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ExcelIcon className="w-4 h-4" />
                <span>{isExporting ? 'جاري التصدير...' : 'تصدير Excel (كل قسم بورقة)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>{isPrinting ? 'جاري التحضير...' : 'معاينة وطباعة / حفظ PDF'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100 dark:bg-gray-900 space-y-8">
          {isLoadingPreview ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-xs font-bold">جاري تحميل بيانات القسم والتلاميذ...</div>
            </div>
          ) : (
            previewRosters.map((roster, rIdx) => {
              const studentsList = roster.students || [];
              const totalDisplayRows = Math.max(35, studentsList.length);

              return (
                <div 
                  key={roster.className + rIdx} 
                  className="bg-white text-gray-900 rounded-2xl p-5 sm:p-6 shadow-md border border-gray-200"
                >
                  {/* Class Badge for Multi-view */}
                  {exportMode === 'all' && (
                    <div className="mb-3 pb-2 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <span className="font-black text-sm text-indigo-900">
                          ورقة القسم: {roster.className}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({studentsList.length} تلميذ)
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400">
                        الصفحة {rIdx + 1} من {previewRosters.length}
                      </span>
                    </div>
                  )}

                  {/* Official Moroccan Header */}
                  <div className="border-b-2 border-gray-900 pb-3 mb-3">
                    <div className="flex items-center justify-between text-center text-xs font-bold leading-tight">
                      <div className="text-start space-y-0.5">
                        <div>المملكة المغربية</div>
                        <div>وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
                        <div>المؤسسة: <span className="font-black underline">{institution}</span></div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm sm:text-base font-black tracking-wide border-2 border-gray-900 px-4 py-1 rounded-lg bg-gray-50">
                          دفتر التتبع اليومي والمواظبة (10 حصص)
                        </div>
                        <div className="text-[11px] font-bold text-gray-700">
                          مادة التربية البدنية والرياضية — الموسم الدراسي: {academicYear}
                        </div>
                      </div>
                      <div className="text-end space-y-0.5">
                        <div>الأستاذ(ة): <span className="font-black underline">{teacherName}</span></div>
                        <div>القسم: <span className="font-black text-xs px-2 py-0.5 bg-gray-100 rounded-md border border-gray-300">{roster.className}</span></div>
                        <div>النشاط: <span className="font-black">{sportActivity}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Grid Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse border-2 border-gray-900 text-center">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-900 font-black text-gray-900">
                          <th className="border border-gray-900 p-1.5 w-10">الرقم</th>
                          <th className="border border-gray-900 p-1.5 w-24">رقم مسار</th>
                          <th className="border border-gray-900 p-1.5 text-start px-2 w-48">الاسم والنسب الكامل</th>
                          <th className="border border-gray-900 p-1.5 w-24">تاريخ الازدياد</th>
                          {Array.from({ length: 10 }, (_, i) => (
                            <th key={i} className="border border-gray-900 p-1 w-9 text-[10px]">
                              ح {i + 1}
                            </th>
                          ))}
                          <th className="border border-gray-900 p-1 w-14 text-[10px]">م.الغياب</th>
                          <th className="border border-gray-900 p-1.5 w-32">ملاحظات عامة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: totalDisplayRows }, (_, idx) => {
                          const s = studentsList[idx];
                          return (
                            <tr key={idx} className="border-b border-gray-800 hover:bg-gray-50/50">
                              <td className="border border-gray-800 p-1 font-bold">{idx + 1}</td>
                              <td className="border border-gray-800 p-1 font-mono text-[10px] text-gray-600">
                                {s ? (s.codeMassar || s.numeroEleve || '') : ''}
                              </td>
                              <td className="border border-gray-800 p-1 text-start px-2 font-bold truncate max-w-[180px]">
                                {s ? s.nomEleve : ''}
                              </td>
                              <td className="border border-gray-800 p-1 text-[10px] font-mono text-gray-600">
                                {s ? (s.dateNaissance || '') : ''}
                              </td>
                              {Array.from({ length: 10 }, (_, i) => (
                                <td key={i} className="border border-gray-800 p-1 h-6"></td>
                              ))}
                              <td className="border border-gray-800 p-1 font-bold"></td>
                              <td className="border border-gray-800 p-1"></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures & Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-300 flex items-center justify-between text-xs font-bold px-4">
                    <div className="space-y-6">
                      <div>توقيع وتأشيرة الأستاذ(ة):</div>
                      <div className="h-6"></div>
                    </div>
                    <div className="text-center text-[10px] text-gray-500">
                      <span>منصة EPS Maroc — وثيقة رسمية للتتبع المستمر (10 حصص)</span>
                    </div>
                    <div className="space-y-6 text-end">
                      <div>توقيع وتأشيرة الإدارة التربوية:</div>
                      <div className="h-6"></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
