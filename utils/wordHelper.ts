import type { AffinityGroup, TextbookSession } from '../types';

/**
 * Helper to get Arabic day name from date string
 */
const getArabicDayName = (dateStr: string): string => {
  if (!dateStr) return '';
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const date = new Date(dateStr);
  return days[date.getDay()] || '';
};

export interface TextbookWordExportOptions {
  fontFamily?: string;
  fontSize?: string;
  margins?: string;
  levelFilter?: string;
  classFilter?: string;
}

/**
 * Exports Textbook Sessions into a beautifully formatted Microsoft Word (.doc) document
 * with custom Mise en page (font, size, margins, scope filters).
 */
export const exportTextbookToWord = (
  sessions: TextbookSession[],
  teacherName: string = "أستاذ التربية البدنية",
  className: string = "جميع الأقسام",
  options: TextbookWordExportOptions = {}
): boolean => {
  if (!sessions || sessions.length === 0) {
    return false;
  }

  const {
    fontFamily = "'Segoe UI', Tahoma, Arial, sans-serif",
    fontSize = '11pt',
    margins = '1.2cm',
    levelFilter = 'all',
    classFilter = 'all'
  } = options;

  const filteredSessions = sessions.filter(s => {
    if (classFilter && classFilter !== 'all' && classFilter !== 'my') {
      if (s.className !== classFilter) return false;
    }
    if (levelFilter && levelFilter !== 'all') {
      const matchLevel = s.className.toLowerCase().includes(levelFilter.toLowerCase());
      if (!matchLevel) return false;
    }
    return true;
  });

  if (filteredSessions.length === 0) {
    return false;
  }

  const currentDate = new Date().toLocaleDateString('ar-MA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const yearStr = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>دفتر النصوص الرياضي - ${className}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4 portrait;
          margin: ${margins};
          mso-header-margin: 0.5cm;
          mso-footer-margin: 0.5cm;
        }
        body {
          font-family: ${fontFamily};
          direction: rtl;
          text-align: right;
          color: #0f172a;
          font-size: ${fontSize};
          line-height: 1.4;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          border: none;
        }
        .header-cell-right {
          text-align: right;
          width: 50%;
          font-size: ${fontSize};
          font-weight: bold;
          color: #1e293b;
          border: none;
        }
        .header-cell-left {
          text-align: left;
          width: 50%;
          font-size: 10pt;
          color: #475569;
          border: none;
        }
        .doc-title {
          font-size: 18pt;
          font-weight: 900;
          color: #1e3a8a;
          text-align: center;
          margin-top: 10px;
          margin-bottom: 5px;
          border-bottom: 3px double #1e3a8a;
          padding-bottom: 8px;
        }
        .doc-subtitle {
          font-size: 10.5pt;
          color: #475569;
          text-align: center;
          margin-bottom: 20px;
        }
        .stats-summary {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 15px;
          margin-bottom: 15px;
          font-size: 10pt;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 20px;
        }
        .data-table th {
          background-color: #1e3a8a;
          color: #ffffff;
          font-weight: bold;
          text-align: center;
          padding: 8px 10px;
          border: 1px solid #1e3a8a;
          font-size: 10pt;
        }
        .data-table td {
          padding: 8px 10px;
          border: 1px solid #cbd5e1;
          font-size: ${fontSize};
          vertical-align: middle;
        }
        .data-table tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .font-bold { font-weight: bold; }
        .signatures-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 30px;
          border: none;
        }
        .signatures-cell {
          width: 50%;
          text-align: center;
          font-size: 10.5pt;
          font-weight: bold;
          color: #1e293b;
          border: none;
          vertical-align: top;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>

      <!-- Letterhead / Header Block -->
      <table class="header-table">
        <tr>
          <td class="header-cell-right">
            المملكة المغربية<br/>
            وزارة التربية الوطنية والتعليم الأولي والرياضة<br/>
            مادة التربية البدنية والرياضية
          </td>
          <td class="header-cell-left">
            السنة الدراسية: ${yearStr}<br/>
            تاريخ التصدير: ${currentDate}
          </td>
        </tr>
      </table>

      <!-- Document Title -->
      <div class="doc-title">دفتر النصوص الرياضي (Cahier de Textes)</div>
      <div class="doc-subtitle">توثيق الحصص الدراسية والأهداف البيداغوجية لمادة التربية البدنية والرياضية</div>

      <!-- Overview Stats -->
      <div class="stats-summary">
        📌 <strong>بطاقة تعريفية:</strong> 
        الأستاذ المؤطر: <strong>${teacherName}</strong> | 
        نطاق الاستخراج: <strong>${classFilter !== 'all' ? classFilter : (levelFilter !== 'all' ? levelFilter : className)}</strong> | 
        إجمالي الحصص الموثقة: <strong>${filteredSessions.length} حصة درسية</strong>.
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 12%;">رقم الحصة</th>
            <th style="width: 40%; text-align: right;">الهدف البيداغوجي ومحتوى درس الحصة</th>
            <th style="width: 12%;">القسم</th>
            <th style="width: 16%;">التاريخ واليوم</th>
            <th style="width: 20%;">التوقيت والزمن</th>
          </tr>
        </thead>
        <tbody>
  `;

  filteredSessions.forEach((s) => {
    const dayName = getArabicDayName(s.date);
    const dateFormatted = s.date ? `${s.date}${dayName ? ` (${dayName})` : ''}` : '-';

    htmlContent += `
      <tr>
        <td class="text-center font-bold" style="color: #1e3a8a;">${s.sessionNumber || 'الحصة'}</td>
        <td class="text-right font-bold">${s.goal || '-'}</td>
        <td class="text-center font-bold" style="background-color: #eff6ff;">${s.className || className}</td>
        <td class="text-center font-mono">${dateFormatted}</td>
        <td class="text-center font-mono">${s.timeSlot || '08:30 - 10:30'}</td>
      </tr>
    `;
  });

  htmlContent += `
        </tbody>
      </table>

      <!-- Signatures Block -->
      <table class="signatures-table">
        <tr>
          <td class="signatures-cell">
            توقيع وأختام الأستاذ المؤطر:<br/><br/><br/>
            ...................................................
          </td>
          <td class="signatures-cell">
            تأشيرة ومصادقة السيد مدير المؤسسة:<br/><br/><br/>
            ...................................................
          </td>
        </tr>
      </table>

    </body>
    </html>
  `;

  // Download Blob in native Word document format
  try {
    const blob = new Blob(['\uFEFF', htmlContent], {
      type: 'application/msword;charset=utf-8'
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const safeName = (classFilter !== 'all' ? classFilter : (levelFilter !== 'all' ? levelFilter : className)).replace(/\s+/g, '_');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `دفتر_النصوص_الرياضي_${safeName}_${new Date().toISOString().split('T')[0]}.doc`);
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 200);

    return true;
  } catch (err) {
    console.error('Error generating Word file for textbook:', err);
    return false;
  }
};

/**
 * Exports Affinity Groups into a beautifully formatted Microsoft Word (.doc) document
 * with professional RTL Arabic support, narrow print margins, and optimized A4 layout (1-2 pages).
 */
export const exportGroupsToWord = (groups: AffinityGroup[], className: string) => {
  const studentsInGroups = groups.flatMap(g => g.students);
  if (studentsInGroups.length === 0) {
    alert("لا توجد مجموعات بها تلاميذ لتصديرها.");
    return;
  }

  const currentDate = new Date().toLocaleDateString('ar-MA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate some overview stats
  const totalStudents = studentsInGroups.length;
  const femaleCount = studentsInGroups.filter(s => s.sexe === 'F').length;
  const maleCount = studentsInGroups.filter(s => s.sexe === 'M').length;

  // Render HTML Word-compatible content
  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>تقرير المجموعات المتجانسة - ${className}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4;
          margin: 1.2cm 1.2cm 1.2cm 1.2cm;
          mso-header-margin: 0.5cm;
          mso-footer-margin: 0.5cm;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          direction: rtl;
          text-align: right;
          color: #1e293b;
          font-size: 11pt;
          line-height: 1.4;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          border: none;
        }
        .header-cell-right {
          text-align: right;
          width: 50%;
          font-size: 11pt;
          font-weight: bold;
          color: #475569;
          border: none;
        }
        .header-cell-left {
          text-align: left;
          width: 50%;
          font-size: 10pt;
          color: #64748b;
          border: none;
        }
        .doc-title {
          font-size: 20pt;
          font-weight: 900;
          color: #1e3a8a;
          text-align: center;
          margin-top: 10px;
          margin-bottom: 5px;
          border-bottom: 3px double #1e3a8a;
          padding-bottom: 8px;
        }
        .doc-subtitle {
          font-size: 11pt;
          color: #475569;
          text-align: center;
          margin-bottom: 25px;
        }
        .stats-summary {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 15px;
          margin-bottom: 20px;
          font-size: 10.5pt;
        }
        .group-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        .group-header {
          font-size: 13pt;
          font-weight: bold;
          color: #0f172a;
          background-color: #f1f5f9;
          border-right: 5px solid #2563eb;
          padding: 6px 12px;
          margin-bottom: 10px;
        }
        .group-meta {
          font-size: 9.5pt;
          color: #475569;
          margin-bottom: 8px;
          font-weight: bold;
        }
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        table.data-table th {
          background-color: #1e3a8a;
          color: #ffffff;
          font-weight: bold;
          font-size: 10.5pt;
          padding: 7px 10px;
          border: 1px solid #1e3a8a;
          text-align: center;
        }
        table.data-table td {
          padding: 6px 10px;
          border: 1px solid #cbd5e1;
          font-size: 10pt;
          text-align: center;
        }
        table.data-table tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .badge-female {
          color: #be185d;
          font-weight: bold;
        }
        .badge-male {
          color: #1d4ed8;
          font-weight: bold;
        }
        .text-right {
          text-align: right !important;
        }
        .font-mono {
          font-family: 'Courier New', Courier, monospace;
        }
      </style>
    </head>
    <body>

      <!-- Letterhead / Header Block -->
      <table class="header-table">
        <tr>
          <td class="header-cell-right">
            وزارة التربية الوطنية والتعليم الأولي والرياضة<br/>
            مادة التربية البدنية والرياضية
          </td>
          <td class="header-cell-left">
            السنة الدراسية: ${new Date().getFullYear()}/${new Date().getFullYear() + 1}<br/>
            تاريخ التصدير: ${currentDate}
          </td>
        </tr>
      </table>

      <!-- Document Title -->
      <div class="doc-title">تقرير المجموعات المتجانسة للسرعة الهوائية (VMA)</div>
      <div class="doc-subtitle">توزيع التلاميذ حسب نتائج اختبار Luc Léger - القسم: <b>${className}</b></div>

      <!-- Overview Stats -->
      <div class="stats-summary">
        💡 <strong>خلاصة إحصائية للقسم:</strong> 
        عدد التلاميذ الإجمالي: <strong>${totalStudents}</strong> تلميذ وتلميذة 
        (ذكور: <strong>${maleCount}</strong> | إناث: <strong>${femaleCount}</strong>) 
        | عدد المجموعات المتجانسة المشكلة: <strong>${groups.length} مجموعات</strong>.
      </div>

  `;

  // Render Each Group
  groups.forEach((group, idx) => {
    if (group.students.length > 0) {
      const activeFemales = group.students.filter(s => s.sexe === 'F').length;
      const activeMales = group.students.filter(s => s.sexe === 'M').length;

      htmlContent += `
        <div class="group-section">
          <div class="group-header">👥 المبادئ البيداغوجية: ${group.name}</div>
          <div class="group-meta">
            📊 المعطيات الإحصائية للمجموعة: 
            متوسط السرعة الهوائية: <span class="font-mono">${group.vmaMoyenne.toFixed(2)} كم/س</span> 
            | الانحراف المعياري: <span class="font-mono">±${group.ecartType.toFixed(2)} كم/س</span>
            | نطاق السرعة: <span class="font-mono">${group.vmaRange} كم/س</span>
            ${group.coefficientVariation ? `| معامل الاختلاف التجانس (CV): <span class="font-mono">${group.coefficientVariation.toFixed(1)}%</span>` : ''}
          </div>
          
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 15%;">رقم التلميذ</th>
                <th style="text-align: right; width: 45%;">الاسم الكامل للتلميذ(ة)</th>
                <th style="width: 15%;">الجنس</th>
                <th style="width: 15%;">السرعة الهوائية (VMA)</th>
                <th style="width: 10%;">المستوى المحقق (Palier)</th>
              </tr>
            </thead>
            <tbody>
      `;

      group.students.forEach((student) => {
        const isFemale = student.sexe === 'F';
        const genderLabel = isFemale ? 'أنثى' : 'ذكر';
        const genderClass = isFemale ? 'badge-female' : 'badge-male';

        htmlContent += `
          <tr>
            <td class="font-mono">#${student.numeroEleve}</td>
            <td class="text-right"><strong>${student.nomEleve || ''}</strong></td>
            <td class="${genderClass}">${genderLabel}</td>
            <td class="font-mono" style="font-weight: bold; color: #047857;">${student.vma.toFixed(1)} كم/س</td>
            <td class="font-mono" style="font-weight: bold;">${student.palierAtteint}</td>
          </tr>
        `;
      });

      htmlContent += `
            </tbody>
          </table>
        </div>
      `;
    }
  });

  htmlContent += `
    </body>
    </html>
  `;

  // Create Blob & download in Microsoft Word native format with BOM prefix for Excel/Word Arabic characters support
  const blob = new Blob(['\uFEFF', htmlContent], {
    type: 'application/msword;charset=utf-8'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const safeClassName = className.replace(/\s+/g, '_');
  
  link.setAttribute('download', `تقرير_مجموعات_VMA_القسم_${safeClassName}.doc`);
  document.body.appendChild(link);
  link.click();
  
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
};
