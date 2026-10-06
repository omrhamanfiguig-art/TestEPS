import React, { useState, useEffect, useMemo } from 'react';
import { 
  DocumentTextIcon, 
  TrashIcon, 
  PencilSquareIcon, 
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  SparklesIcon,
  UserPlusIcon,
  InformationCircleIcon
} from './Icons';
import { StudentIdentity, PedagogicalReport, ReportCaseType } from '../types';
import { getPedagogicalReports, deletePedagogicalReport, savePedagogicalReport } from '../utils/reportsDb';
import { StudentReportModal } from './StudentReportModal';

interface PedagogicalReportsViewProps {
  selectedClass: string;
  students: StudentIdentity[];
}

const CASE_LABELS: Record<ReportCaseType, { label: string; icon: string; color: string }> = {
  medical_exemption: { label: 'إعفاء طبي', icon: '🏥', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  behavior: { label: 'سلوك وانضباط', icon: '⚠️', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  injury: { label: 'إصابة رياضية', icon: '🩹', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
  outstanding_talent: { label: 'موهبة وتفوق', icon: '🌟', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  absence_warning: { label: 'إنذار غياب', icon: '🚨', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  observation: { label: 'ملاحظة بيداغوجية', icon: '📋', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  other: { label: 'أخرى', icon: '📌', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
};

export const PedagogicalReportsView: React.FC<PedagogicalReportsViewProps> = ({
  selectedClass,
  students
}) => {
  const [reports, setReports] = useState<PedagogicalReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentIdentity | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    loadReports();
    const handleUpdate = () => loadReports();
    window.addEventListener('reportsUpdated', handleUpdate);
    return () => window.removeEventListener('reportsUpdated', handleUpdate);
  }, [selectedClass]);

  const loadReports = async () => {
    const list = await getPedagogicalReports(selectedClass);
    setReports(list);
  };

  const filteredReports = useMemo(() => {
    return reports.filter(rep => {
      if (filterType !== 'ALL' && rep.caseType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (rep.studentName || '').toLowerCase().includes(q) ||
          rep.studentNumber.toLowerCase().includes(q) ||
          rep.title.toLowerCase().includes(q) ||
          rep.details.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reports, filterType, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const med = reports.filter(r => r.caseType === 'medical_exemption').length;
    const beh = reports.filter(r => r.caseType === 'behavior').length;
    const tal = reports.filter(r => r.caseType === 'outstanding_talent').length;
    const inj = reports.filter(r => r.caseType === 'injury').length;
    return { med, beh, tal, inj, total: reports.length };
  }, [reports]);

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا التقرير؟')) {
      await deletePedagogicalReport(id);
      await loadReports();
    }
  };

  const handleExportExcel = () => {
    if (reports.length === 0) return;
    const XLSX = (window as any).XLSX;
    if (!XLSX) return;

    const headers = ["رقم التلميذ", "الاسم والنسب", "القسم", "التاريخ", "نوع الحالة", "العنوان", "التفاصيل", "الإجراء المتخذ", "الطبيب / المدة"];
    const rows = reports.map(r => [
      r.studentNumber,
      r.studentName || '',
      r.className,
      r.date,
      CASE_LABELS[r.caseType]?.label || r.caseType,
      r.title,
      r.details,
      r.actionTaken || '',
      r.doctorName ? `${r.doctorName} (حتى: ${r.exemptionEndDate || '-'})` : ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقارير التربوية");
    XLSX.writeFile(wb, `تقارير_تربوية_${selectedClass.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex items-center gap-3">
          <span className="text-2xl">🏥</span>
          <div>
            <div className="text-lg font-black text-rose-700 dark:text-rose-300">{stats.med}</div>
            <div className="text-[11px] font-bold text-gray-500">إعفاءات طبية</div>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="text-lg font-black text-amber-700 dark:text-amber-300">{stats.beh}</div>
            <div className="text-[11px] font-bold text-gray-500">حالات سلوك</div>
          </div>
        </div>

        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-center gap-3">
          <span className="text-2xl">🌟</span>
          <div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{stats.tal}</div>
            <div className="text-[11px] font-bold text-gray-500">مواهب وتفوق</div>
          </div>
        </div>

        <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-2xl flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <div className="text-lg font-black text-purple-700 dark:text-purple-300">{stats.total}</div>
            <div className="text-[11px] font-bold text-gray-500">إجمالي التقارير</div>
          </div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في التقارير أو باسم التلميذ..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none"
            />
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">جميع الأنواع</option>
            <option value="medical_exemption">🏥 إعفاء طبي</option>
            <option value="behavior">⚠️ سلوك وانضباط</option>
            <option value="outstanding_talent">🌟 موهبة وتفوق</option>
            <option value="injury">🩹 إصابة رياضية</option>
            <option value="absence_warning">🚨 إنذار غياب</option>
            <option value="observation">📋 ملاحظة عامة</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {reports.length > 0 && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
          )}

          {students.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedStudentForModal(students[0]);
                setIsReportModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition"
            >
              <DocumentTextIcon className="w-3.5 h-3.5" />
              <span>➕ إضافة تقرير جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-2">
          <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
          <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">
            لا توجد تقارير أو حالات تربوية مسجلة لهذا القسم حالياً
          </h3>
          <p className="text-xs text-gray-400">
            يمكنك تسجيل تقارير وإعفاءات التلاميذ مباشرة من لائحة الغياب بالنقر على زر «📝 تقرير» أمام كل تلميذ.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredReports.map(rep => {
            const typeInfo = CASE_LABELS[rep.caseType] || CASE_LABELS.other;
            const studentObj = students.find(s => s.numeroEleve === rep.studentNumber);

            return (
              <div
                key={rep.id}
                className="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xs space-y-3 hover:border-teal-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{typeInfo.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-gray-900 dark:text-white">
                          {rep.studentName || `تلميذ #${rep.studentNumber}`}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold">
                        📅 {rep.date} | #{rep.studentNumber}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (studentObj) {
                          setSelectedStudentForModal(studentObj);
                          setIsReportModalOpen(true);
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-teal-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      title="فتح ملف التلميذ"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(rep.id)}
                      className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      title="حذف"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-750 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1">
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    {rep.title}
                  </div>
                  {rep.details && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                      {rep.details}
                    </p>
                  )}
                </div>

                {rep.caseType === 'medical_exemption' && (rep.doctorName || rep.exemptionEndDate) && (
                  <div className="text-[10px] text-rose-700 dark:text-rose-300 font-bold bg-rose-50 dark:bg-rose-950/30 p-2 rounded-xl flex items-center justify-between">
                    {rep.doctorName && <span>👨‍⚕️ الطبيب: {rep.doctorName}</span>}
                    {rep.exemptionEndDate && <span>⏳ الإعفاء حتى: {rep.exemptionEndDate}</span>}
                  </div>
                )}

                {rep.actionTaken && (
                  <div className="text-[10px] font-bold text-teal-700 dark:text-teal-300">
                    ⚡ الإجراء المتخذ: {rep.actionTaken}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Student Report Modal */}
      {isReportModalOpen && selectedStudentForModal && (
        <StudentReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          student={selectedStudentForModal}
          className={selectedClass}
        />
      )}
    </div>
  );
};
