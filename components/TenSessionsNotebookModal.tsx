import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  PrinterIcon, 
  ExcelIcon, 
  InformationCircleIcon,
  SparklesIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  TrophyIcon
} from './Icons';
import { StudentIdentity, TextbookSession } from '../types';
import { getAllClasses, getStudentList, ClassStats } from '../utils/db';
import { 
  exportTenSessionsNotebookToExcel, 
  exportTenSessionsProgressionToExcel 
} from '../utils/excelHelper';
import { getTeacherForClass, detectLevelFromClassName } from '../utils/teacherHelper';
import { 
  MOROCCAN_EPS_SPORTS, 
  getTenSessionsProgression, 
  PedagogicalSessionGoal, 
  SportProgression 
} from '../utils/pedagogicalObjectivesData';
import { saveTextbookSession } from '../utils/textbookDb';

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
  // Modal active tab: 'notebook' (Grid) vs 'progression' (10 Objectives)
  const [activeModalTab, setActiveModalTab] = useState<'notebook' | 'progression'>('notebook');

  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(defaultClassName);
  const [exportMode, setExportMode] = useState<'single' | 'all'>('single');
  
  // Customization fields
  const [institution, setInstitution] = useState<string>(() => localStorage.getItem('eps_school_name') || 'المؤسسة التعليمية');
  const [teacherName, setTeacherName] = useState<string>(() => localStorage.getItem('eps_teacher_name') || 'أستاذ التربية البدنية والرياضية');
  const [academicYear, setAcademicYear] = useState<string>(() => {
    const curYear = new Date().getFullYear();
    return `${curYear} / ${curYear + 1}`;
  });
  const [sportActivity, setSportActivity] = useState<string>('الجري السريع');

  // Pedagogical Progression States (Moroccan OP 2009)
  const [selectedSportKey, setSelectedSportKey] = useState<string>('vitesse');
  const [selectedCycle, setSelectedCycle] = useState<'college' | 'lycee'>('college');
  const [isSyncingTextbook, setIsSyncingTextbook] = useState<boolean>(false);
  const [printOption, setPrintOption] = useState<'current' | 'notebook' | 'progression' | 'both'>('current');

  // Loaded students for preview & export
  const [previewStudents, setPreviewStudents] = useState<StudentIdentity[]>([]);
  const [allClassesData, setAllClassesData] = useState<ClassRoster[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showStudentListModal, setShowStudentListModal] = useState<boolean>(false);

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

  // When class changes, adjust teacher, level, and preview students
  useEffect(() => {
    if (selectedClass) {
      loadStudentsForClass(selectedClass);
      const teacher = getTeacherForClass(selectedClass);
      if (teacher && teacher !== 'أستاذ التربية البدنية') {
        setTeacherName(teacher);
      }

      // Auto-detect educational cycle
      const levelInfo = detectLevelFromClassName(selectedClass);
      const isLycee = ['tc', '1bac', '2bac'].includes(levelInfo.key);
      setSelectedCycle(isLycee ? 'lycee' : 'college');
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

  // Find active sport and progression
  const currentSportMeta: SportProgression = 
    MOROCCAN_EPS_SPORTS.find(s => s.sportKey === selectedSportKey) || MOROCCAN_EPS_SPORTS[0];

  const currentProgression: PedagogicalSessionGoal[] = 
    selectedCycle === 'lycee' ? currentSportMeta.levels.lycee : currentSportMeta.levels.college;

  const currentOTC: string = 
    selectedCycle === 'lycee' ? currentSportMeta.otcLycéeAr : currentSportMeta.otcCollegeAr;

  const cycleLabelAr: string = 
    selectedCycle === 'lycee' ? 'السلك الثانوي التأهيلي' : 'السلك الثانوي الإعدادي';

  // Keep sportActivity in sync when sport key changes
  const handleSportChange = (sportKey: string) => {
    setSelectedSportKey(sportKey);
    const found = MOROCCAN_EPS_SPORTS.find(s => s.sportKey === sportKey);
    if (found) {
      setSportActivity(found.sportNameAr);
    }
  };

  /**
   * Generates standalone HTML for a single class tracking sheet in strict A4 Portrait format.
   * Includes 10 sessions + assessment columns (حركي - معرفي - سلوكي - النقطة /20)
   * Guaranteed to fit on exactly ONE single page per class.
   */
  const renderClassSheetHtml = (className: string, students: StudentIdentity[]): string => {
    const list = students || [];
    const totalRows = Math.max(35, list.length);

    let rowsHtml = '';
    for (let i = 0; i < totalRows; i++) {
      const s = list[i];
      rowsHtml += `
        <tr>
          <td style="font-weight: bold; width: 22px;">${i + 1}</td>
          <td style="font-family: monospace; font-size: 8px; width: 65px;">${s ? (s.codeMassar || s.numeroEleve || '') : ''}</td>
          <td class="student-name" style="width: 140px;">${s ? (s.nomEleve || '') : ''}</td>
          <td style="font-size: 8px; font-family: monospace; width: 56px;">${s ? (s.dateNaissance || '') : ''}</td>
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
          <td style="width: 20px; font-weight: bold;"></td>
          <td class="eval-cell"></td>
          <td class="eval-cell"></td>
          <td class="eval-cell"></td>
          <td style="width: 28px; background-color: #f7fee7; font-weight: bold;"></td>
          <td style="width: 50px;"></td>
        </tr>
      `;
    }

    return `
      <div class="sheet">
        <!-- Official Moroccan Header (Compact Portrait) -->
        <div class="official-header">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="text-align: right; line-height: 1.3; font-size: 9.5px; width: 33%;">
              <div style="font-weight: 800;">المملكة المغربية</div>
              <div>وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
              <div>المؤسسة: <strong style="text-decoration: underline;">${institution}</strong></div>
            </div>

            <div style="text-align: center; width: 34%;">
              <div class="title-box">
                دفتر التتبع اليومي والمواظبة والتقويم (10 حصص)
              </div>
              <div style="font-size: 9.5px; font-weight: bold; margin-top: 2px; color: #1f2937;">
                مادة التربية البدنية والرياضية — الموسم: ${academicYear}
              </div>
            </div>

            <div style="text-align: left; line-height: 1.3; font-size: 9.5px; width: 33%;">
              <div>الأستاذ(ة): <strong style="text-decoration: underline;">${teacherName}</strong></div>
              <div>القسم: <span style="font-weight: 900; background: #e5e7eb; padding: 1px 6px; border-radius: 4px; border: 1px solid #9ca3af; font-size: 10px;">${className}</span></div>
              <div>النشاط: <strong>${sportActivity}</strong></div>
            </div>
          </div>
        </div>

        <!-- Table Grid with Hierarchical Header -->
        <div style="flex: 1; overflow: hidden; margin-top: 2px;">
          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width: 22px;">الرقم</th>
                <th rowspan="2" style="width: 65px;">رقم مسار</th>
                <th rowspan="2" style="width: 140px; text-align: right; padding-right: 4px;">الاسم والنسب الكامل</th>
                <th rowspan="2" style="width: 56px;">ت.الازدياد</th>
                <th colspan="10" style="background-color: #e0e7ff !important; font-size: 8px; padding: 1.5px 0;">تتبع الحصص والمواظبة (10 حصص)</th>
                <th rowspan="2" style="width: 20px; font-size: 8px;">م.غ</th>
                <th colspan="3" style="background-color: #fef3c7 !important; font-size: 8px; padding: 1.5px 0;">مجالات التقويم التربوي</th>
                <th rowspan="2" style="width: 28px; font-size: 7.5px; background-color: #ecfdf5 !important;">النقطة<br/>/20</th>
                <th rowspan="2" style="width: 50px;">ملاحظات</th>
              </tr>
              <tr>
                <th class="session-th">ح1</th>
                <th class="session-th">ح2</th>
                <th class="session-th">ح3</th>
                <th class="session-th">ح4</th>
                <th class="session-th">ح5</th>
                <th class="session-th">ح6</th>
                <th class="session-th">ح7</th>
                <th class="session-th">ح8</th>
                <th class="session-th">ح9</th>
                <th class="session-th">ح10</th>
                <th class="eval-th">حركي</th>
                <th class="eval-th">معرفي</th>
                <th class="eval-th">سلوكي</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Official Signatures (Compact Footer) -->
        <div class="footer-sig">
          <div style="text-align: right;">
            <div>توقيع وتأشيرة الأستاذ(ة):</div>
            <div style="height: 22px;"></div>
          </div>
          <div style="text-align: left;">
            <div>توقيع وتأشيرة الإدارة التربوية:</div>
            <div style="height: 22px;"></div>
          </div>
        </div>
      </div>
    `;
  };

  /**
   * Generates standalone HTML for the 10 Pedagogical Objectives Progression Sheet (A4 Portrait).
   * Structured strictly according to Moroccan Pedagogical Orientations (OP 2009).
   */
  const renderProgressionSheetHtml = (className: string): string => {
    let rowsHtml = '';
    currentProgression.forEach((s) => {
      const phaseBg = s.phase === 'diagnostic' ? '#eff6ff' : (s.phase === 'integration' ? '#fefce8' : (s.phase === 'summative' ? '#ecfdf5' : '#f5f3ff'));
      const phaseBadgeColor = s.phase === 'diagnostic' ? '#1d4ed8' : (s.phase === 'integration' ? '#b45309' : (s.phase === 'summative' ? '#047857' : '#6d28d9'));

      rowsHtml += `
        <tr>
          <td style="font-weight: 800; font-size: 9px; width: 34px; background: #f9fafb;">ح${s.seanceNumber}</td>
          <td style="font-weight: 700; font-size: 8px; width: 62px; background: ${phaseBg}; color: ${phaseBadgeColor};">
            ${s.phaseLabelAr}
          </td>
          <td style="text-align: right; font-weight: 800; font-size: 8px; width: 120px; line-height: 1.2;">
            <div>${s.titleAr}</div>
            <div style="font-size: 7px; color: #4b5563; font-style: italic; direction: ltr; text-align: left;">${s.titleFr}</div>
          </td>
          <td style="text-align: right; font-size: 7.5px; width: 110px; line-height: 1.2; background: #f8fafc;">
            ${s.motorObjective}
          </td>
          <td style="text-align: right; font-size: 7.5px; width: 95px; line-height: 1.2;">
            ${s.cognitiveObjective}
          </td>
          <td style="text-align: right; font-size: 7.5px; width: 95px; line-height: 1.2;">
            ${s.behavioralObjective}
          </td>
          <td style="text-align: right; font-size: 7.5px; width: 125px; line-height: 1.2; background: #fafafa;">
            <div><strong>الوضعية:</strong> ${s.situation}</div>
            <div style="color: #047857; margin-top: 1px;"><strong>المعايير:</strong> ${s.criteria}</div>
          </td>
        </tr>
      `;
    });

    return `
      <div class="sheet">
        <!-- Header -->
        <div class="official-header">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="text-align: right; line-height: 1.3; font-size: 9px; width: 33%;">
              <div style="font-weight: 800;">المملكة المغربية</div>
              <div>وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
              <div>المؤسسة: <strong>${institution}</strong></div>
            </div>

            <div style="text-align: center; width: 34%;">
              <div class="title-box" style="background-color: #ecfdf5 !important; border-color: #047857;">
                بطاقة التدرج البيداغوجي لـ 10 حصص (توجيهات 2009)
              </div>
              <div style="font-size: 8.5px; font-weight: bold; margin-top: 2px; color: #1f2937;">
                مادة التربية البدنية والرياضية — الموسم الدراسي: ${academicYear}
              </div>
            </div>

            <div style="text-align: left; line-height: 1.3; font-size: 9px; width: 33%;">
              <div>الأستاذ(ة): <strong>${teacherName}</strong></div>
              <div>القسم: <strong style="background: #e5e7eb; padding: 1px 5px; border-radius: 3px;">${className}</strong></div>
              <div>السلك: <strong>${cycleLabelAr}</strong></div>
            </div>
          </div>

          <!-- Highlighted OTC Box -->
          <div style="margin-top: 4px; padding: 3px 6px; border: 1.5px solid #047857; border-radius: 4px; background: #f0fdf4; font-size: 8.5px; line-height: 1.25;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span style="font-weight: 900; color: #065f46;">🎯 الهدف الختامي للإدماج (OTC) — التوجيهات التربوية 2009:</span>
              <span style="font-weight: 800; background: #047857; color: #fff; padding: 1px 6px; border-radius: 3px; font-size: 8px;">
                النشاط: ${currentSportMeta.sportNameAr} (${currentSportMeta.sportNameFr})
              </span>
            </div>
            <div style="color: #1f2937; font-weight: 600;">${currentOTC}</div>
          </div>
        </div>

        <!-- Table Grid -->
        <div style="flex: 1; overflow: hidden; margin-top: 2px;">
          <table>
            <thead>
              <tr style="background-color: #f3f4f6 !important;">
                <th style="width: 34px;">الحصة</th>
                <th style="width: 62px;">المرحلة</th>
                <th style="width: 120px; text-align: right; padding-right: 4px;">موضوع الحصة (Ar/Fr)</th>
                <th style="width: 110px; background-color: #eff6ff !important; color: #1e3a8a;">🏃‍♂️ الهدف الحركي (Moteur)</th>
                <th style="width: 95px; background-color: #fefce8 !important; color: #78350f;">🧠 الهدف المعرفي (Cognitif)</th>
                <th style="width: 95px; background-color: #fdf2f8 !important; color: #831843;">🤝 الهدف السلوكي (Affectif)</th>
                <th style="width: 125px; background-color: #ecfdf5 !important; color: #064e3b;">📌 الوضعية ومعايير التقويم</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="footer-sig">
          <div style="text-align: right;">
            <div>توقيع وتأشيرة الأستاذ(ة):</div>
            <div style="height: 20px;"></div>
          </div>
          <div style="text-align: left;">
            <div>توقيع وتأشيرة الإدارة التربوية:</div>
            <div style="height: 20px;"></div>
          </div>
        </div>
      </div>
    `;
  };

  /**
   * Executes print via an isolated hidden iframe configured strictly for A4 Portrait.
   */
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      let sheetsHtml = '';

      const targetClassList = exportMode === 'single'
        ? [{ className: selectedClass || 'القسم', students: previewStudents }]
        : (allClassesData.length > 0 ? allClassesData : [{ className: selectedClass || 'القسم', students: previewStudents }]);

      // Decide what to print based on tab / printOption
      targetClassList.forEach(c => {
        if (activeModalTab === 'notebook') {
          sheetsHtml += renderClassSheetHtml(c.className, c.students);
        } else if (activeModalTab === 'progression') {
          sheetsHtml += renderProgressionSheetHtml(c.className);
        }
      });

      // Create an off-screen iframe
      const printIframe = document.createElement('iframe');
      printIframe.setAttribute('style', 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;border:none;');
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentWindow?.document;
      if (!iframeDoc) {
        window.print();
        setIsPrinting(false);
        return;
      }

      const fullHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>دفتر 10 حصص والأهداف البيداغوجية - توجيهات 2009 (A4 Portrait)</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 4mm 4mm 4mm 4mm;
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
              height: 288mm;
              max-height: 288mm;
              padding: 2.5mm 3.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
            }
            .sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .official-header {
              border-bottom: 1.5px solid #000;
              padding-bottom: 3px;
              margin-bottom: 3px;
            }
            .title-box {
              border: 1.5px solid #000;
              background-color: #f3f4f6 !important;
              font-weight: 900;
              font-size: 11px;
              padding: 2px 8px;
              border-radius: 4px;
              display: inline-block;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8px;
              border: 1.5px solid #000;
            }
            th, td {
              border: 1px solid #111;
              padding: 1.5px 2px;
              text-align: center;
              height: 15px;
              line-height: 1.15;
            }
            th {
              background-color: #f3f4f6 !important;
              font-weight: 800;
              font-size: 8px;
            }
            .session-th {
              width: 14.5px;
              font-size: 7.5px;
              background-color: #eef2ff !important;
              padding: 1px 0;
            }
            .session-cell {
              width: 14.5px;
              background-color: #fafafa !important;
            }
            .eval-th {
              width: 25px;
              font-size: 7.5px;
              background-color: #fffbeb !important;
              padding: 1px 0;
            }
            .eval-cell {
              width: 25px;
              background-color: #fffdf5 !important;
            }
            .student-name {
              text-align: right;
              padding-right: 4px;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .footer-sig {
              margin-top: 3px;
              padding-top: 3px;
              border-top: 1px solid #6b7280;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 8.5px;
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

  /**
   * Print Both Sheets (Tracking Grid + Pedagogical Progression)
   */
  const handlePrintBoth = async () => {
    setIsPrinting(true);
    try {
      let sheetsHtml = '';
      const targetClassList = exportMode === 'single'
        ? [{ className: selectedClass || 'القسم', students: previewStudents }]
        : (allClassesData.length > 0 ? allClassesData : [{ className: selectedClass || 'القسم', students: previewStudents }]);

      targetClassList.forEach(c => {
        // Page 1: Tracking and Evaluation Grid
        sheetsHtml += renderClassSheetHtml(c.className, c.students);
        // Page 2: Pedagogical Progression Sheet
        sheetsHtml += renderProgressionSheetHtml(c.className);
      });

      const printIframe = document.createElement('iframe');
      printIframe.setAttribute('style', 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;border:none;');
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentWindow?.document;
      if (!iframeDoc) {
        window.print();
        setIsPrinting(false);
        return;
      }

      const fullHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>دفتر 10 حصص والبطاقة البيداغوجية - توجيهات 2009</title>
          <style>
            @page { size: A4 portrait; margin: 4mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; padding: 0; background: #fff; font-family: system-ui, sans-serif; direction: rtl; }
            .sheet { page-break-after: always; break-after: page; box-sizing: border-box; width: 100%; height: 288mm; padding: 2.5mm 3.5mm; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
            .sheet:last-child { page-break-after: auto; break-after: auto; }
            .official-header { border-bottom: 1.5px solid #000; padding-bottom: 3px; margin-bottom: 3px; }
            .title-box { border: 1.5px solid #000; background-color: #f3f4f6 !important; font-weight: 900; font-size: 11px; padding: 2px 8px; border-radius: 4px; display: inline-block; }
            table { width: 100%; border-collapse: collapse; font-size: 8px; border: 1.5px solid #000; }
            th, td { border: 1px solid #111; padding: 1.5px 2px; text-align: center; height: 15px; line-height: 1.15; }
            th { background-color: #f3f4f6 !important; font-weight: 800; font-size: 8px; }
            .session-th { width: 14.5px; font-size: 7.5px; background-color: #eef2ff !important; padding: 1px 0; }
            .session-cell { width: 14.5px; background-color: #fafafa !important; }
            .eval-th { width: 25px; font-size: 7.5px; background-color: #fffbeb !important; padding: 1px 0; }
            .eval-cell { width: 25px; background-color: #fffdf5 !important; }
            .student-name { text-align: right; padding-right: 4px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .footer-sig { margin-top: 3px; padding-top: 3px; border-top: 1px solid #6b7280; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.5px; font-weight: bold; }
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
          window.print();
        } finally {
          setIsPrinting(false);
          setTimeout(() => {
            try { document.body.removeChild(printIframe); } catch (e) {}
          }, 30000);
        }
      }, 400);

    } catch (e) {
      setIsPrinting(false);
      window.print();
    }
  };

  /**
   * Export to Excel (Notebook or Progression depending on active tab)
   */
  const handleExcelExport = async () => {
    setIsExporting(true);
    try {
      if (activeModalTab === 'progression') {
        exportTenSessionsProgressionToExcel(
          currentSportMeta.sportNameAr,
          cycleLabelAr,
          currentOTC,
          currentProgression,
          {
            institution,
            teacherName,
            academicYear,
            className: selectedClass || 'القسم'
          }
        );
        setNotification({ 
          message: `تم تصدير بطاقة الأهداف البيداغوجية (10 حصص) للنشاط «${currentSportMeta.sportNameAr}» بصيغة Excel بنجاح!`, 
          type: 'success' 
        });
        return;
      }

      // Notebook Grid Mode
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
          message: `تم تصدير دفتر تتبع الحصص والتقويم للقسم «${targetClass}» بنجاح!`, 
          type: 'success' 
        });
      } else {
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
          message: `تم تصدير دفاتر التتبع والتقويم لجميع الأقسام (${rosters.length} قسماً) كل قسم في ورقة مستقلة بنجاح!`, 
          type: 'success' 
        });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'حدث خطأ أثناء تصدير ملف Excel', type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Sync and Apply the 10 Progressive Sessions into the Class Textbook (Cahier de Textes)
   */
  const handleApplyToTextbook = async () => {
    const targetClass = selectedClass;
    if (!targetClass) {
      setNotification({ message: 'المرجو اختيار القسم المستهدف أولاً.', type: 'error' });
      return;
    }

    setIsSyncingTextbook(true);
    try {
      const today = new Date();
      
      for (let i = 0; i < currentProgression.length; i++) {
        const s = currentProgression[i];
        
        // Approximate a weekly schedule for the 10 sessions
        const sessionDate = new Date(today);
        sessionDate.setDate(today.getDate() + (i * 7));
        const formattedDate = sessionDate.toISOString().slice(0, 10);

        const goalFormatted = [
          `[التوجيهات التربوية 2009] النشاط: ${currentSportMeta.sportNameAr} (${cycleLabelAr})`,
          `الموضوع: ${s.titleAr} (${s.titleFr})`,
          `• المرحلة: ${s.phaseLabelAr}`,
          `• الهدف الحركي (Moteur): ${s.motorObjective}`,
          `• الهدف المعرفي (Cognitif): ${s.cognitiveObjective}`,
          `• الهدف السلوكي (Affectif): ${s.behavioralObjective}`,
          `• وضعية التعلم والإنجاز: ${s.situation}`,
          `• معايير النجاح والتقويم: ${s.criteria}`
        ].join('\n');

        const sessionObj: TextbookSession = {
          id: `tb_op2009_${targetClass}_h${s.seanceNumber}_${Date.now() + i}`,
          sessionNumber: `الحصة ${s.seanceNumber} (${s.phaseLabelAr})`,
          goal: goalFormatted,
          className: targetClass,
          date: formattedDate,
          timeSlot: '08:00 - 10:00',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await saveTextbookSession(sessionObj);
      }

      setNotification({ 
        message: `تم بنجاح استيراد وتطبيق 10 حصص بيداغوجية للنشاط «${currentSportMeta.sportNameAr}» في دفتر النصوص للقسم «${targetClass}»! ✨`, 
        type: 'success' 
      });
    } catch (err: any) {
      setNotification({ message: err.message || 'حدث خطأ أثناء تطبيق الحصص في دفتر النصوص', type: 'error' });
    } finally {
      setIsSyncingTextbook(false);
    }
  };

  /**
   * Copy the 10 Progressive Objectives to Clipboard
   */
  const handleCopyObjectives = () => {
    try {
      const text = [
        `=== بطاقة التدرج البيداغوجي لـ 10 حصص (التوجيهات التربوية 2009) ===`,
        `النشاط الرياضي: ${currentSportMeta.sportNameAr} (${currentSportMeta.sportNameFr})`,
        `السلك: ${cycleLabelAr}`,
        `الهدف الختامي للإدماج (OTC): ${currentOTC}`,
        `----------------------------------------------------`,
        ...currentProgression.map(s => (
          `الحصة ${s.seanceNumber} [${s.phaseLabelAr}]: ${s.titleAr} (${s.titleFr})\n` +
          `- الهدف الحركي: ${s.motorObjective}\n` +
          `- الهدف المعرفي: ${s.cognitiveObjective}\n` +
          `- الهدف السلوكي: ${s.behavioralObjective}\n` +
          `- الوضعية: ${s.situation}\n` +
          `- معايير التقويم: ${s.criteria}\n`
        ))
      ].join('\n');

      navigator.clipboard.writeText(text);
      setNotification({ message: 'تم نسخ صيرورة الأهداف الـ 10 للحافظة بنجاح! 📋', type: 'success' });
    } catch (e) {
      setNotification({ message: 'تعذر النسخ التلقائي للحافظة', type: 'error' });
    }
  };

  if (!isOpen) return null;

  // Decide what to show in on-screen preview
  const previewRosters = exportMode === 'single'
    ? [{ className: selectedClass || 'القسم', students: previewStudents }]
    : (allClassesData.length > 0 ? allClassesData : [{ className: selectedClass || 'القسم', students: previewStudents }]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-850 rounded-t-3xl sm:rounded-3xl w-full max-w-6xl h-[95vh] sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-gray-100">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shadow-xs">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black">
                  دفتر تتبع 10 حصص والأهداف البيداغوجية المقترحة
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-gray-900">
                  توجيهات 2009 ✨ A4 بورتريه
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-indigo-100 mt-0.5">
                تتبع الحصص والتقويم الثلاثي (حركي/معرفي/سلوكي) + 10 أهداف متدرجة مطابقة للتوجيهات الرسمية 2009
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

        {/* Tab Switcher: Notebook vs Progression */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-800 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModalTab('notebook')}
            className={`pb-2.5 px-4 font-black text-xs transition relative flex items-center gap-2 cursor-pointer rounded-t-xl ${
              activeModalTab === 'notebook'
                ? 'bg-white dark:bg-gray-850 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>📋 شبكة التتبع والتقويم (10 حصص — A4 بورتريه)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
              3 مجالات
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModalTab('progression')}
            className={`pb-2.5 px-4 font-black text-xs transition relative flex items-center gap-2 cursor-pointer rounded-t-xl ${
              activeModalTab === 'progression'
                ? 'bg-white dark:bg-gray-850 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <SparklesIcon className="w-4 h-4 text-amber-500" />
            <span>🎯 الأهداف البيداغوجية المقترحة (10 حصص — توجيهات 2009)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-black animate-pulse">
              جديد ✨
            </span>
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
                القسم المستهدف:
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

            {/* Sport Selector */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                النشاط الرياضي (APSA):
              </label>
              <select
                value={selectedSportKey}
                onChange={(e) => handleSportChange(e.target.value)}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400"
              >
                {MOROCCAN_EPS_SPORTS.map(s => (
                  <option key={s.sportKey} value={s.sportKey}>
                    {s.sportNameAr} ({s.sportNameFr})
                  </option>
                ))}
              </select>
            </div>

            {/* Cycle / Level Toggle */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                السلك التعليمي (توجيهات 2009):
              </label>
              <div className="grid grid-cols-2 gap-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedCycle('college')}
                  className={`py-1 px-1.5 rounded-lg text-center transition cursor-pointer ${
                    selectedCycle === 'college'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  🏫 إعدادي
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCycle('lycee')}
                  className={`py-1 px-1.5 rounded-lg text-center transition cursor-pointer ${
                    selectedCycle === 'lycee'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  🎓 تأهيلي
                </button>
              </div>
            </div>

            {/* Institution / Teacher quick field */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                المؤسسة والأستاذ:
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="المؤسسة"
                  className="w-1/2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2 py-1.5 text-xs font-bold truncate"
                  title="المؤسسة التعليمية"
                />
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="الأستاذ"
                  className="w-1/2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2 py-1.5 text-xs font-bold truncate"
                  title="اسم الأستاذ(ة)"
                />
              </div>
            </div>
          </div>

          {/* Action buttons bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <InformationCircleIcon className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                {activeModalTab === 'progression'
                  ? `النشاط: «${currentSportMeta.sportNameAr}» (${cycleLabelAr}) — 10 أهداف متدرجة مطابقة للتوجيهات التربوية الرسمية 2009`
                  : (exportMode === 'single'
                      ? `القسم «${selectedClass}» (${previewStudents.length} تلميذ مسجل — ورقة A4 بورتريه واحدة)`
                      : `سيتم تصدير وطباعة جميع الأقسام (${previewRosters.length} قسماً) كل قسم في صفحة A4 بورتريه مستقلة`)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStudentListModal(true)}
                className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>👁️ معاينة لائحة التلاميذ</span>
                <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">{previewStudents.length}</span>
              </button>

              {activeModalTab === 'progression' && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyObjectives}
                    className="px-3 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold text-xs transition active:scale-95 cursor-pointer"
                  >
                    📋 نسخ الأهداف
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyToTextbook}
                    disabled={isSyncingTextbook}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    <span>{isSyncingTextbook ? 'جاري الحفظ...' : 'تطبيق في دفتر النصوص للقسم'}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleExcelExport}
                disabled={isExporting}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ExcelIcon className="w-4 h-4" />
                <span>{isExporting ? 'جاري التصدير...' : (activeModalTab === 'progression' ? 'تصدير الأهداف إلى Excel' : 'تصدير شبكة Excel')}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>{isPrinting ? 'جاري التحضير...' : (activeModalTab === 'progression' ? 'طباعة بطاقة الأهداف (A4)' : 'طباعة / PDF (A4 بورتريه)')}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintBoth}
                disabled={isPrinting}
                title="طباعة شبكة التتبع وبطاقة الأهداف البيداغوجية معاً"
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>🖨️ طباعة الوثيقتين معاً (2 صفحة A4)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-100 dark:bg-gray-900 space-y-6">
          
          {/* VIEW 1: PROGRESSION TAB (10 Progressive Sessions) */}
          {activeModalTab === 'progression' && (
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* OTC Official Banner */}
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-emerald-500/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl border border-white/20 shadow-inner">
                      🎯
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-gray-900">
                          الهدف الختامي للإدماج (OTC)
                        </span>
                        <span className="text-xs font-bold text-emerald-200">
                          التوجيهات التربوية الرسمية 2009
                        </span>
                      </div>
                      <h3 className="text-lg font-black mt-1">
                        دورة تعليمية لـ 10 حصص: {currentSportMeta.sportNameAr} ({currentSportMeta.sportNameFr})
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="px-3 py-1 rounded-xl bg-white/15 border border-white/20">
                      السلك: {cycleLabelAr}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-white/15 border border-white/20">
                      القسم: {selectedClass || 'قسم مخصص'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs sm:text-sm font-medium leading-relaxed bg-black/20 p-3.5 rounded-2xl border border-white/10 text-emerald-50">
                  <strong className="text-amber-300 font-black">نص الهدف الختامي للإدماج (OTC): </strong>
                  « {currentOTC} »
                </div>
              </div>

              {/* 10 Progressive Sessions Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <TrophyIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">
                      تدرج الأهداف البيداغوجية عبر الحصص العشر (تتبع الهرم البيداغوجي 2009):
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500">
                    10 حصص متكاملة (تشخيص ⬅️ بناء ⬅️ إدماج ⬅️ إشهاد)
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {currentProgression.map((s) => {
                    const phaseColorClass = s.phase === 'diagnostic'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300'
                      : (s.phase === 'integration'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300'
                          : (s.phase === 'summative'
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                              : 'border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300'));

                    const badgeColor = s.phase === 'diagnostic'
                      ? 'bg-blue-600 text-white'
                      : (s.phase === 'integration'
                          ? 'bg-amber-600 text-white'
                          : (s.phase === 'summative'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 text-white'));

                    return (
                      <div
                        key={s.seanceNumber}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition space-y-3"
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                              ح{s.seanceNumber}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badgeColor}`}>
                                  {s.phaseLabelAr}
                                </span>
                                <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                                  {s.titleAr}
                                </h4>
                              </div>
                              <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 italic mt-0.5" dir="ltr">
                                {s.titleFr}
                              </p>
                            </div>
                          </div>

                          <div className="text-[11px] font-bold text-gray-400">
                            الحصة {s.seanceNumber} من 10
                          </div>
                        </div>

                        {/* 3 Moroccan Educational Domains Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                          {/* Motor Objective */}
                          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                            <div className="flex items-center gap-1.5 text-xs font-black text-blue-900 dark:text-blue-300 mb-1">
                              <span>🏃‍♂️</span>
                              <span>الهدف الحركي / المهاري (Moteur):</span>
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                              {s.motorObjective}
                            </p>
                          </div>

                          {/* Cognitive Objective */}
                          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                            <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-300 mb-1">
                              <span>🧠</span>
                              <span>الهدف المعرفي / المفاهيمي (Cognitif):</span>
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                              {s.cognitiveObjective}
                            </p>
                          </div>

                          {/* Behavioral Objective */}
                          <div className="p-3 rounded-xl bg-fuchsia-50/70 dark:bg-fuchsia-950/30 border border-fuchsia-200 dark:border-fuchsia-800/40">
                            <div className="flex items-center gap-1.5 text-xs font-black text-fuchsia-900 dark:text-fuchsia-300 mb-1">
                              <span>🤝</span>
                              <span>الهدف السلوكي والوجداني (Affectif):</span>
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                              {s.behavioralObjective}
                            </p>
                          </div>
                        </div>

                        {/* Situation and Evaluation Criteria */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            <strong className="text-indigo-600 dark:text-indigo-400 font-black">📌 وضعية التعلم والإنجاز: </strong>
                            <span>{s.situation}</span>
                          </div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            <strong className="text-emerald-600 dark:text-emerald-400 font-black">✅ معايير النجاح والتقويم: </strong>
                            <span>{s.criteria}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: NOTEBOOK GRID TAB */}
          {activeModalTab === 'notebook' && (
            isLoadingPreview ? (
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
                    className="bg-white text-gray-900 rounded-2xl p-4 sm:p-6 shadow-md border border-gray-200 max-w-5xl mx-auto"
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
                          الصفحة {rIdx + 1} من {previewRosters.length} (A4 بورتريه)
                        </span>
                      </div>
                    )}

                    {/* Official Moroccan Header */}
                    <div className="border-b-2 border-gray-900 pb-2.5 mb-2.5">
                      <div className="flex items-center justify-between text-center text-[10px] sm:text-xs font-bold leading-tight">
                        <div className="text-start space-y-0.5">
                          <div className="font-extrabold text-[11px]">المملكة المغربية</div>
                          <div>وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
                          <div>المؤسسة: <span className="font-black underline">{institution}</span></div>
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs sm:text-sm font-black tracking-wide border-2 border-gray-900 px-3 py-1 rounded-md bg-gray-50">
                            دفتر التتبع اليومي والمواظبة والتقويم (10 حصص)
                          </div>
                          <div className="text-[10px] font-bold text-gray-700">
                            مادة التربية البدنية والرياضية — الموسم: {academicYear}
                          </div>
                        </div>
                        <div className="text-end space-y-0.5">
                          <div>الأستاذ(ة): <span className="font-black underline">{teacherName}</span></div>
                          <div>القسم: <span className="font-black text-xs px-2 py-0.5 bg-gray-100 rounded-md border border-gray-300">{roster.className}</span></div>
                          <div>النشاط: <span className="font-black">{sportActivity}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Hierarchical Grid Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] border-collapse border-2 border-gray-900 text-center">
                        <thead>
                          <tr className="bg-gray-100 border-b-2 border-gray-900 font-black text-gray-900">
                            <th rowSpan={2} className="border border-gray-900 p-1 w-7">الرقم</th>
                            <th rowSpan={2} className="border border-gray-900 p-1 w-20">رقم مسار</th>
                            <th rowSpan={2} className="border border-gray-900 p-1 text-start px-2 w-44">الاسم والنسب الكامل</th>
                            <th rowSpan={2} className="border border-gray-900 p-1 w-16">ت.الازدياد</th>
                            <th colSpan={10} className="border border-gray-900 p-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-[10px]">
                              تتبع الحصص والمواظبة (10 حصص)
                            </th>
                            <th rowSpan={2} className="border border-gray-900 p-1 w-8 text-[9px]">م.غ</th>
                            <th colSpan={3} className="border border-gray-900 p-1 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-[10px]">
                              مجالات التقويم التربوي
                            </th>
                            <th rowSpan={2} className="border border-gray-900 p-1 w-10 text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-black">
                              النقطة<br/>/20
                            </th>
                            <th rowSpan={2} className="border border-gray-900 p-1 w-20">ملاحظات</th>
                          </tr>
                          <tr className="bg-gray-50 border-b-2 border-gray-900 font-bold text-gray-800 text-[9px]">
                            {Array.from({ length: 10 }, (_, i) => (
                              <th key={i} className="border border-gray-900 p-0.5 w-6 bg-indigo-50/50">
                                ح{i + 1}
                              </th>
                            ))}
                            <th className="border border-gray-900 p-0.5 w-8 bg-amber-50/60 font-black">حركي</th>
                            <th className="border border-gray-900 p-0.5 w-8 bg-amber-50/60 font-black">معرفي</th>
                            <th className="border border-gray-900 p-0.5 w-8 bg-amber-50/60 font-black">سلوكي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: totalDisplayRows }, (_, idx) => {
                            const s = studentsList[idx];
                            return (
                              <tr key={idx} className="border-b border-gray-800 hover:bg-gray-50/50">
                                <td className="border border-gray-800 p-0.5 font-bold">{idx + 1}</td>
                                <td className="border border-gray-800 p-0.5 font-mono text-[9px] text-gray-700">
                                  {s ? (s.codeMassar || s.numeroEleve || '') : ''}
                                </td>
                                <td className="border border-gray-800 p-0.5 text-start px-2 font-bold truncate max-w-[150px]">
                                  {s ? s.nomEleve : ''}
                                </td>
                                <td className="border border-gray-800 p-0.5 text-[9px] font-mono text-gray-600">
                                  {s ? (s.dateNaissance || '') : ''}
                                </td>
                                {Array.from({ length: 10 }, (_, i) => (
                                  <td key={i} className="border border-gray-800 p-0.5 h-5 bg-gray-50/30"></td>
                                ))}
                                <td className="border border-gray-800 p-0.5 font-bold"></td>
                                <td className="border border-gray-800 p-0.5 bg-amber-50/20"></td>
                                <td className="border border-gray-800 p-0.5 bg-amber-50/20"></td>
                                <td className="border border-gray-800 p-0.5 bg-amber-50/20"></td>
                                <td className="border border-gray-800 p-0.5 font-bold bg-emerald-50/30"></td>
                                <td className="border border-gray-800 p-0.5"></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Signatures & Footer */}
                    <div className="mt-3 pt-2.5 border-t border-gray-300 flex items-center justify-between text-[11px] font-bold px-3">
                      <div className="space-y-4">
                        <div>توقيع وتأشيرة الأستاذ(ة):</div>
                        <div className="h-5"></div>
                      </div>
                      <div className="space-y-4 text-end">
                        <div>توقيع وتأشيرة الإدارة التربوية:</div>
                        <div className="h-5"></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}

        </div>

        {/* Student List Preview Modal */}
        {showStudentListModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-850 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-gray-100">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-violet-700 to-indigo-700 text-white">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👥</span>
                  <div>
                    <h3 className="font-black text-sm">لائحة تلاميذ القسم: {selectedClass}</h3>
                    <p className="text-[11px] text-violet-100">المجموع: {previewStudents.length} تلميذ(ة)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStudentListModal(false)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                {previewStudents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs">لا توجد سجلات تلاميذ مسجلة لهذا القسم حالياً.</div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-gray-100 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-300">
                        <tr>
                          <th className="p-2.5 text-center w-12">#</th>
                          <th className="p-2.5">رقم مسار / التعريف</th>
                          <th className="p-2.5">الاسم والنسب الكامل</th>
                          <th className="p-2.5 text-center w-20">الجنس</th>
                          <th className="p-2.5 text-center w-28">تاريخ الازدياد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {previewStudents.map((s, idx) => (
                          <tr key={s.numeroEleve || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="p-2.5 text-center font-bold text-gray-500">{idx + 1}</td>
                            <td className="p-2.5 font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">{s.codeMassar || s.numeroEleve}</td>
                            <td className="p-2.5 font-bold">{s.nomEleve}</td>
                            <td className="p-2.5 text-center font-semibold">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] ${s.sexe === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
                                {s.sexe === 'F' ? 'أنثى' : 'ذكر'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono text-[11px] text-gray-500">{s.dateNaissance || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowStudentListModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  إغلاق المعاينة
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
