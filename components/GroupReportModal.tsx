import React, { useState, useMemo, useRef } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ArrowDownTrayIcon, 
  DocumentTextIcon, 
  SparklesIcon,
  UserGroupIcon
} from './Icons';
import { StudentIdentity, AttendanceSession, AttendanceRecord } from '../types';
import { getTeacherForClass } from '../utils/teacherHelper';

interface GroupReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  students: StudentIdentity[];
  currentRecords: Record<string, AttendanceRecord>;
  previousSessions: AttendanceSession[];
  sessionDate: string;
  sessionTopic?: string;
}

export const GroupReportModal: React.FC<GroupReportModalProps> = ({
  isOpen,
  onClose,
  className,
  students,
  currentRecords,
  previousSessions,
  sessionDate,
  sessionTopic = "التربية البدنية والرياضية"
}) => {
  const [recipient, setRecipient] = useState<'director' | 'supervisor'>('supervisor');
  const [reportType, setReportType] = useState<'absence' | 'no_kit' | 'discipline' | 'custom'>('absence');
  const [selectedStudentNumbers, setSelectedStudentNumbers] = useState<string[]>(() => {
    // Default to today's absentees and no-kit students
    return students
      .filter(s => {
        const status = currentRecords[s.numeroEleve]?.status;
        return status === 'absent' || status === 'no-kit' || status === 'late';
      })
      .map(s => s.numeroEleve);
  });

  const [reportTitle, setReportTitle] = useState(() => `تقرير إخباري حول الغياب والانضباط - مادة التربية البدنية`);
  const [notes, setNotes] = useState(() => `نحيطكم علماً بوضعية التلاميذ المدرجة أسماؤهم أسفله بخصوص حصة اليوم والمواظبة العامة، قصد اتخاذ الإجراءات الإدارية والتربوية المعمول بها.`);
  
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAiNotes, setIsGeneratingAiNotes] = useState(false);

  const handleGenerateAiNotes = async () => {
    setIsGeneratingAiNotes(true);
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'pedagogical',
          title: reportTitle,
          period: sessionDate || new Date().toLocaleDateString('ar-MA'),
          context: `تأطير قسم ${className}. عدد التلاميذ المشمولين بالتقرير: ${selectedStudentNumbers.length}. الملاحظة الحالية: ${notes}`
        })
      });
      const data = await res.json();
      if (data.success && data.text) {
        setNotes(data.text);
      }
    } catch {}
    setIsGeneratingAiNotes(false);
  };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute student cumulative stats
  const studentsStatsMap = useMemo(() => {
    const map: Record<string, { present: number; absent: number; late: number; noKit: number; justified: number }> = {};
    
    students.forEach(s => {
      let present = 0, absent = 0, late = 0, noKit = 0, justified = 0;
      
      previousSessions.forEach(sess => {
        const rec = sess.records.find(r => r.studentNumber === s.numeroEleve);
        if (rec) {
          if (rec.status === 'present') present++;
          if (rec.status === 'absent') absent++;
          if (rec.status === 'late') late++;
          if (rec.status === 'no-kit') noKit++;
          if (rec.status === 'justified') justified++;
        }
      });

      // Include today's active record if not yet saved in previous sessions
      const todayRec = currentRecords[s.numeroEleve];
      if (todayRec) {
        if (todayRec.status === 'present') present++;
        if (todayRec.status === 'absent') absent++;
        if (todayRec.status === 'late') late++;
        if (todayRec.status === 'no-kit') noKit++;
        if (todayRec.status === 'justified') justified++;
      }

      map[s.numeroEleve] = { present, absent, late, noKit, justified };
    });

    return map;
  }, [students, previousSessions, currentRecords]);

  // Quick selection helpers
  const handleSelectAbsentees = () => {
    const ids = students.filter(s => currentRecords[s.numeroEleve]?.status === 'absent').map(s => s.numeroEleve);
    setSelectedStudentNumbers(ids);
  };

  const handleSelectNoKit = () => {
    const ids = students.filter(s => currentRecords[s.numeroEleve]?.status === 'no-kit').map(s => s.numeroEleve);
    setSelectedStudentNumbers(ids);
  };

  const handleSelectFrequentAbsentees = () => {
    const ids = students.filter(s => (studentsStatsMap[s.numeroEleve]?.absent || 0) >= 2).map(s => s.numeroEleve);
    setSelectedStudentNumbers(ids);
  };

  const handleSelectAll = () => {
    setSelectedStudentNumbers(students.map(s => s.numeroEleve));
  };

  const handleClearAll = () => {
    setSelectedStudentNumbers([]);
  };

  const toggleStudent = (num: string) => {
    setSelectedStudentNumbers(prev => 
      prev.includes(num) ? prev.filter(x => x !== num) : [...prev, num]
    );
  };

  if (!isOpen) return null;

  const selectedStudentsList = students.filter(s => selectedStudentNumbers.includes(s.numeroEleve));
  const teacherName = getTeacherForClass(className) || "أستاذ المادة";
  const recipientTitle = recipient === 'director' ? "السيد مدير / رئيس المؤسسة المحترم" : "السيد الحارس العام للخارجية / للداخلية المحترم";

  // Format Text for WhatsApp
  const generateWhatsAppMessage = () => {
    let msg = `📋 *${reportTitle}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📍 *إلى:* ${recipientTitle}\n`;
    msg += `🏫 *القسم:* ${className}\n`;
    msg += `📅 *التاريخ:* ${sessionDate}\n`;
    msg += `🏃 *النشاط:* ${sessionTopic}\n`;
    msg += `👨‍🏫 *الأستاذ:* ${teacherName}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `📌 *لائحة التلاميذ المعنيين (${selectedStudentsList.length} تلميذ):*\n\n`;

    selectedStudentsList.forEach((s, idx) => {
      const stats = studentsStatsMap[s.numeroEleve] || { present: 0, absent: 0, late: 0, noKit: 0, justified: 0 };
      const current = currentRecords[s.numeroEleve]?.status;
      const currentLabel = current === 'absent' ? '❌ غائب اليوم' :
                           current === 'no-kit' ? '👟 بدون بذلة رياضية' :
                           current === 'late' ? '⏱️ متأخر اليوم' :
                           current === 'justified' ? '📄 غياب مبرر' : '✅ حاضر';
      const note = currentRecords[s.numeroEleve]?.note;

      msg += `${idx + 1}. *${s.nomEleve}* (مسار: ${s.numeroEleve})\n`;
      msg += `   ▫️ *حالة اليوم:* ${currentLabel}\n`;
      msg += `   ▫️ *المجموع التراكمي:* ${stats.absent} غياب | ${stats.noKit} بدون بذلة | ${stats.late} تأخر\n`;
      if (note) {
        msg += `   ▫️ *ملاحظة:* ${note}\n`;
      }
      msg += `\n`;
    });

    if (notes) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `📝 *ملاحظات وتوجيهات:* ${notes}\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `_تم التوليد عبر تطبيق التربية البدنية والرياضية EPS App_`;
    return encodeURIComponent(msg);
  };

  const handleSendWhatsApp = () => {
    if (selectedStudentsList.length === 0) {
      setFeedback("يرجى تحديد تلميذ واحد على الأقل لإرسال التقرير.");
      setTimeout(() => setFeedback(null), 3000);
      return;
    }
    const url = `https://api.whatsapp.com/send?text=${generateWhatsAppMessage()}`;
    window.open(url, '_blank');
  };

  // Generate Image onto Canvas and Download
  const handleDownloadImage = () => {
    if (selectedStudentsList.length === 0) {
      setFeedback("يرجى تحديد تلميذ واحد على الأقل.");
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setIsGeneratingImage(true);

    const canvas = document.createElement('canvas');
    const width = 1200;
    // Calculate dynamic height based on row count
    const baseHeight = 420;
    const rowHeight = 48;
    const height = baseHeight + (selectedStudentsList.length * rowHeight) + (notes ? 120 : 60);

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Decorative Top Header Banner
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(1, '#0d9488');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, 140);

    // Top Title & Subtitles (Right to Left styling)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('المملكة المغربية - وزارة التربية الوطنية والتعليم الأولي والرياضة', width / 2, 48);

    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillText(reportTitle, width / 2, 90);

    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`إلى: ${recipientTitle} | القسم: ${className} | التاريخ: ${sessionDate}`, width / 2, 122);

    // Info Box
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(40, 160, width - 80, 80, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`• الأستاذ: ${teacherName}`, width - 70, 195);
    ctx.fillText(`• النشاط الرياضي: ${sessionTopic}`, width - 70, 222);

    ctx.textAlign = 'left';
    ctx.fillText(`• عدد الحالات المرفوعة: ${selectedStudentsList.length} تلميذ`, 70, 195);
    ctx.fillText(`• توقيت الإرسال: ${new Date().toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}`, 70, 222);

    // Table Header
    let startY = 260;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(40, startY, width - 80, 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('#', width - 65, startY + 27);
    ctx.fillText('اسم التلميذ والنسب', width - 240, startY + 27);
    ctx.fillText('رقم مسار', width - 420, startY + 27);
    ctx.fillText('حالة اليوم', width - 560, startY + 27);
    ctx.fillText('الغيابات التراكمية', width - 720, startY + 27);
    ctx.fillText('بدون بذلة', width - 860, startY + 27);
    ctx.fillText('ملاحظات الحصة', width - 1030, startY + 27);

    // Table Rows
    startY += 42;
    selectedStudentsList.forEach((s, idx) => {
      const stats = studentsStatsMap[s.numeroEleve] || { present: 0, absent: 0, late: 0, noKit: 0, justified: 0 };
      const current = currentRecords[s.numeroEleve]?.status;
      const currentLabel = current === 'absent' ? 'غائب (Absent)' :
                           current === 'no-kit' ? 'بدون بذلة' :
                           current === 'late' ? 'متأخر' :
                           current === 'justified' ? 'مبرر' : 'حاضر';
      const note = currentRecords[s.numeroEleve]?.note || '-';

      // Alternate row background
      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f1f5f9';
      ctx.fillRect(40, startY, width - 80, rowHeight);

      // Border bottom
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, startY + rowHeight);
      ctx.lineTo(width - 40, startY + rowHeight);
      ctx.stroke();

      // Row Text
      ctx.fillStyle = '#1e293b';
      ctx.font = '14px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';

      ctx.fillText(String(idx + 1), width - 65, startY + 29);
      
      ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
      ctx.fillText(s.nomEleve, width - 240, startY + 29);

      ctx.font = '13px "Segoe UI", monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(s.numeroEleve, width - 420, startY + 29);

      // Status color
      ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = current === 'absent' ? '#dc2626' : current === 'no-kit' ? '#7c3aed' : current === 'late' ? '#d97706' : '#059669';
      ctx.fillText(currentLabel, width - 560, startY + 29);

      ctx.fillStyle = stats.absent > 1 ? '#dc2626' : '#1e293b';
      ctx.fillText(`${stats.absent} حصص`, width - 720, startY + 29);

      ctx.fillStyle = stats.noKit > 0 ? '#7c3aed' : '#1e293b';
      ctx.fillText(`${stats.noKit}`, width - 860, startY + 29);

      ctx.fillStyle = '#475569';
      ctx.font = '12px "Segoe UI", Arial, sans-serif';
      ctx.fillText(note, width - 1030, startY + 29);

      startY += rowHeight;
    });

    // Notes Box
    if (notes) {
      startY += 20;
      ctx.fillStyle = '#fefce8';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(40, startY, width - 80, 70, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#854d0e';
      ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`• ملاحظات وإجراءات مقترحة: ${notes}`, width - 60, startY + 40);
      startY += 70;
    }

    // Signatures
    startY += 30;
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('توقيع أستاذ المادة:', width - 100, startY);

    ctx.textAlign = 'left';
    ctx.fillText('تأشيرة الإدارة التربوية:', 100, startY);

    // Save and download
    const link = document.createElement('a');
    link.download = `تقرير_إداري_جماعي_${className.replace(/\s+/g, '_')}_${sessionDate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setIsGeneratingImage(false);
    setFeedback("تم تصدير التقرير الجماعي كصورة رسمية عالية الدقة بنجاح!");
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-gray-100 dark:border-gray-700">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-2xl">
              <UserGroupIcon className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>التقرير الإداري والتربوي الجماعي</span>
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                  {className}
                </span>
              </h2>
              <p className="text-xs text-indigo-100">
                إعداد تقارير جماعية للإدارة (المدير / الحارس العام) مع إمكانية الإرسال بالواتساب أو كصورة
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full cursor-pointer transition">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {feedback && (
            <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-slide-up">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Config Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-750 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-705">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">المرسل إليه:</label>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none cursor-pointer"
              >
                <option value="supervisor">👮 الحارس العام للخارجية / للداخلية</option>
                <option value="director">👔 رئيس المؤسسة / السيد المدير</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-1 lg:col-span-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">موضوع التقرير:</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none"
              />
            </div>
          </div>

          {/* Quick Selection Filter Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-gray-900 dark:text-white">
                تحديد التلاميذ المعنيين بالتقرير ({selectedStudentNumbers.length} من {students.length}):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAbsentees}
                  className="px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-[11px] font-bold hover:bg-rose-100 transition cursor-pointer"
                >
                  ❌ غائبو اليوم
                </button>
                <button
                  type="button"
                  onClick={handleSelectNoKit}
                  className="px-2.5 py-1 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-[11px] font-bold hover:bg-purple-100 transition cursor-pointer"
                >
                  👟 بدون بذلة
                </button>
                <button
                  type="button"
                  onClick={handleSelectFrequentAbsentees}
                  className="px-2.5 py-1 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] font-bold hover:bg-amber-100 transition cursor-pointer"
                >
                  ⚠️ تكرار الغياب (≥2)
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-xl text-[11px] font-bold hover:bg-gray-200 transition cursor-pointer"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 text-gray-400 hover:text-gray-600 text-[11px] font-bold transition cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {/* Students Checkbox Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-2 bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700 custom-scrollbar">
              {students.map((s, idx) => {
                const isSelected = selectedStudentNumbers.includes(s.numeroEleve);
                const stats = studentsStatsMap[s.numeroEleve] || { present: 0, absent: 0, late: 0, noKit: 0, justified: 0 };
                const currentStatus = currentRecords[s.numeroEleve]?.status;

                return (
                  <div
                    key={`${s.numeroEleve}_${idx}`}
                    onClick={() => toggleStudent(s.numeroEleve)}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition select-none ${
                      isSelected 
                        ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 shadow-2xs' 
                        : 'bg-white dark:bg-gray-750 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{s.nomEleve}</div>
                        <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                          <span>{s.numeroEleve}</span>
                          {currentStatus === 'absent' && <span className="text-rose-600 font-bold">• غائب</span>}
                          {currentStatus === 'no-kit' && <span className="text-purple-600 font-bold">• بلا بذلة</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] font-bold text-gray-500 shrink-0 text-left">
                      {stats.absent > 0 && <span className="text-rose-600">{stats.absent}غ </span>}
                      {stats.noKit > 0 && <span className="text-purple-600">{stats.noKit}ب</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Teacher's Administrative Notes */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                ملاحظات وتوجيهات للإدارة التربوية:
              </label>
              <button
                type="button"
                onClick={handleGenerateAiNotes}
                disabled={isGeneratingAiNotes}
                className="px-2.5 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <SparklesIcon className="w-3 h-3 text-amber-300 animate-pulse" />
                <span>{isGeneratingAiNotes ? 'جاري الصياغة...' : 'صياغة ذكية بالذكاء الاصطناعي ✨'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب هنا أي توضيحات إضافية أو اضغط على زر الصياغة الذكية لإنشائها بالذكاء الاصطناعي..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium outline-none leading-relaxed"
            />
          </div>

          {/* Selected Students Summary Preview Table */}
          {selectedStudentsList.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-right">
                <thead className="bg-gray-50 dark:bg-gray-700/60 font-bold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">التلميذ</th>
                    <th className="p-2.5 text-center">حالة اليوم</th>
                    <th className="p-2.5 text-center">الغياب التراكمي</th>
                    <th className="p-2.5 text-center">بدون بذلة</th>
                    <th className="p-2.5">الملاحظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                  {selectedStudentsList.map((s, idx) => {
                    const stats = studentsStatsMap[s.numeroEleve] || { present: 0, absent: 0, late: 0, noKit: 0, justified: 0 };
                    const current = currentRecords[s.numeroEleve]?.status;
                    return (
                      <tr key={`${s.numeroEleve}_${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-750">
                        <td className="p-2 text-center text-gray-400 font-bold">{idx + 1}</td>
                        <td className="p-2 font-bold text-gray-900 dark:text-white">{s.nomEleve}</td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            current === 'absent' ? 'bg-rose-100 text-rose-700' :
                            current === 'no-kit' ? 'bg-purple-100 text-purple-700' :
                            current === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {current === 'absent' ? 'غائب' : current === 'no-kit' ? 'بدون بذلة' : current === 'late' ? 'متأخر' : 'حاضر'}
                          </span>
                        </td>
                        <td className="p-2 text-center font-bold text-rose-600">{stats.absent} حصص</td>
                        <td className="p-2 text-center font-bold text-purple-600">{stats.noKit}</td>
                        <td className="p-2 text-gray-500 text-[11px]">{currentRecords[s.numeroEleve]?.note || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-gray-500">
            تم تحديد <strong className="text-indigo-600 dark:text-indigo-400">{selectedStudentsList.length}</strong> تلميذ
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={selectedStudentsList.length === 0 || isGeneratingImage}
              onClick={handleDownloadImage}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>📸 تصدير كصورة رسمية</span>
            </button>

            <button
              type="button"
              disabled={selectedStudentsList.length === 0}
              onClick={handleSendWhatsApp}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition disabled:opacity-50"
            >
              <span>📲 إرسال عبر WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
