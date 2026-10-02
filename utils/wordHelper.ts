import type { AffinityGroup } from '../types';

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
