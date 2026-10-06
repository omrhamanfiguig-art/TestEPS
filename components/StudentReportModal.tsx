import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  TrashIcon, 
  PencilSquareIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  SparklesIcon
} from './Icons';
import { StudentIdentity, PedagogicalReport, ReportCaseType } from '../types';
import { getStudentReports, savePedagogicalReport, deletePedagogicalReport } from '../utils/reportsDb';
import { StudentAvatar } from './StudentAvatar';

interface StudentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentIdentity | null;
  className: string;
}

const CASE_TYPES: { id: ReportCaseType; label: string; icon: string; color: string }[] = [
  { id: 'medical_exemption', label: 'إعفاء طبي (Dispense)', icon: '🏥', color: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300' },
  { id: 'behavior', label: 'ملاحظة سلوكية / انضباط', icon: '⚠️', color: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300' },
  { id: 'injury', label: 'إصابة رياضية', icon: '🩹', color: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300' },
  { id: 'outstanding_talent', label: 'موهبة وتفوق رياضي', icon: '🌟', color: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' },
  { id: 'absence_warning', label: 'إنذار غياب متكرر', icon: '🚨', color: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300' },
  { id: 'observation', label: 'ملاحظة بيداغوجية عامة', icon: '📋', color: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300' },
];

export const StudentReportModal: React.FC<StudentReportModalProps> = ({
  isOpen,
  onClose,
  student,
  className
}) => {
  const [reports, setReports] = useState<PedagogicalReport[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
  
  // Form State
  const [caseType, setCaseType] = useState<ReportCaseType>('medical_exemption');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [doctorName, setDoctorName] = useState('');
  const [exemptionStartDate, setExemptionStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [exemptionEndDate, setExemptionEndDate] = useState('');
  
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && student) {
      loadReports();
      resetForm();
    }
  }, [isOpen, student]);

  const loadReports = async () => {
    if (!student) return;
    const list = await getStudentReports(student.numeroEleve);
    setReports(list);
    if (list.length > 0 && !editingReportId) {
      // If student has reports, we can default to new or show badge
    }
  };

  const resetForm = () => {
    setCaseType('medical_exemption');
    setTitle('');
    setDetails('');
    setActionTaken('');
    setSeverity('medium');
    setDate(new Date().toISOString().split('T')[0]);
    setDoctorName('');
    setExemptionStartDate(new Date().toISOString().split('T')[0]);
    setExemptionEndDate('');
    setEditingReportId(null);
  };

  if (!isOpen || !student) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !details.trim()) {
      setFeedback('يرجى كتابة عنوان أو تفاصيل الحالة/التقرير.');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const reportObj: PedagogicalReport = {
      id: editingReportId || `rep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      className,
      studentNumber: student.numeroEleve,
      studentName: student.nomEleve,
      date,
      caseType,
      title: title.trim() || CASE_TYPES.find(c => c.id === caseType)?.label || 'تقرير تربوي',
      details: details.trim(),
      actionTaken: actionTaken.trim(),
      severity,
      doctorName: caseType === 'medical_exemption' ? doctorName.trim() : undefined,
      exemptionStartDate: caseType === 'medical_exemption' ? exemptionStartDate : undefined,
      exemptionEndDate: caseType === 'medical_exemption' ? exemptionEndDate : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await savePedagogicalReport(reportObj);
    await loadReports();
    resetForm();
    setActiveTab('list');
    setFeedback('تم حفظ التقرير والحالة التربوية بنجاح!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleEdit = (rep: PedagogicalReport) => {
    setEditingReportId(rep.id);
    setCaseType(rep.caseType);
    setTitle(rep.title);
    setDetails(rep.details);
    setActionTaken(rep.actionTaken || '');
    setSeverity(rep.severity || 'medium');
    setDate(rep.date);
    setDoctorName(rep.doctorName || '');
    setExemptionStartDate(rep.exemptionStartDate || rep.date);
    setExemptionEndDate(rep.exemptionEndDate || '');
    setActiveTab('new');
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا التقرير التربوي؟')) {
      await deletePedagogicalReport(id);
      await loadReports();
      setFeedback('تم حذف التقرير بنجاح.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-gray-100 dark:border-gray-700">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <StudentAvatar photoUrl={student.photoUrl} nomEleve={student.nomEleve} sexe={student.sexe} size="md" />
            <div>
              <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>{student.nomEleve}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  #{student.numeroEleve}
                </span>
              </h2>
              <p className="text-xs text-teal-100">
                فضاء التقارير والحالات التربوية والإعفاءات الطبية ({className})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full cursor-pointer transition">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Header */}
        <div className="px-6 pt-3 pb-2 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('new'); resetForm(); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
              }`}
            >
              {editingReportId ? '✏️ تعديل التقرير' : '➕ إضافة تقرير / حالة جديدة'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>سجل تقارير التلميذ</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                reports.length > 0 ? 'bg-amber-400 text-amber-950' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              }`}>
                {reports.length}
              </span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {feedback && (
            <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-slide-up">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {activeTab === 'new' ? (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 dark:text-gray-300">
                  نوع الحالة / التقرير:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CASE_TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCaseType(t.id)}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition text-right cursor-pointer ${
                        caseType === t.id
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-2 ring-teal-400'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    عنوان التقرير / موضوع الحالة:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: إعفاء طبي مؤقت من الجري / عدم إحضار البذلة المتكرر"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    تاريخ التسجيل:
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Medical Exemption Specific Fields */}
              {caseType === 'medical_exemption' && (
                <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/40 space-y-3">
                  <div className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <span>🏥 بيانات الإعفاء الطبي / الشهادة الطبية:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">الطبيب المعالج / المؤسسة:</label>
                      <input
                        type="text"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="د. فلان / مستوصف..."
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">تاريخ بداية الإعفاء:</label>
                      <input
                        type="date"
                        value={exemptionStartDate}
                        onChange={(e) => setExemptionStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">تاريخ نهاية الإعفاء (اختياري):</label>
                      <input
                        type="date"
                        value={exemptionEndDate}
                        onChange={(e) => setExemptionEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Details Textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  تفاصيل الحالة والملاحظات التربوية:
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="اكتب هنا كافة تفاصيل الحالة، السلوك، أو الإجراء الطبي بدقة..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none leading-relaxed"
                />
              </div>

              {/* Action Taken & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    الإجراء المتخذ (اختياري):
                  </label>
                  <input
                    type="text"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="مثال: تنبيه التلميذ / إشعار الإدارة / تكليف بمهام التحكيم"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    درجة الأهمية / الحالة:
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                  >
                    <option value="low">🟢 عادي (للتوثيق)</option>
                    <option value="medium">🟡 متوسط (يحتاج متابعة)</option>
                    <option value="high">🔴 هام وعاجل (إعفاء رسمي / حالة خاصة)</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 transition"
                >
                  {editingReportId ? 'تحديث التقرير' : 'حفظ التقرير'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <DocumentTextIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="text-xs font-bold">لا توجد تقارير أو حالات مسجلة لهذا التلميذ حتى الآن.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    إضافة أول تقرير
                  </button>
                </div>
              ) : (
                reports.map(rep => {
                  const typeObj = CASE_TYPES.find(c => c.id === rep.caseType) || CASE_TYPES[0];
                  return (
                    <div
                      key={rep.id}
                      className="p-4 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-2xl space-y-2 transition hover:shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{typeObj.icon}</span>
                          <div>
                            <h4 className="text-xs font-black text-gray-900 dark:text-white">
                              {rep.title}
                            </h4>
                            <span className="text-[10px] text-gray-400 font-bold">
                              📅 {rep.date}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(rep)}
                            className="p-1.5 text-gray-500 hover:text-teal-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                            title="تعديل"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rep.id)}
                            className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                            title="حذف"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {rep.details && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                          {rep.details}
                        </p>
                      )}

                      {rep.caseType === 'medical_exemption' && (rep.doctorName || rep.exemptionEndDate) && (
                        <div className="flex items-center gap-3 text-[10px] text-rose-700 dark:text-rose-300 font-bold bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-xl">
                          {rep.doctorName && <span>👨‍⚕️ الطبيب: {rep.doctorName}</span>}
                          {rep.exemptionEndDate && <span>⏳ حتى: {rep.exemptionEndDate}</span>}
                        </div>
                      )}

                      {rep.actionTaken && (
                        <div className="text-[10px] font-bold text-teal-800 dark:text-teal-300">
                          ⚡ الإجراء المتخذ: {rep.actionTaken}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
