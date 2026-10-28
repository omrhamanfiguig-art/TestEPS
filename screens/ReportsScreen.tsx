import React, { useState, useEffect, useMemo } from 'react';
import { 
  DocumentTextIcon, 
  UserGroupIcon, 
  AcademicCapIcon, 
  SparklesIcon, 
  InformationCircleIcon, 
  PrinterIcon, 
  ArrowDownTrayIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  UserPlusIcon,
  PlusIcon
} from '../components/Icons';
import { StudentIdentity, PedagogicalReport, ReportCaseType } from '../types';
import { getAllClasses, getStudentList, ClassStats } from '../utils/db';
import { getPedagogicalReports } from '../utils/reportsDb';
import { PedagogicalReportsView } from '../components/PedagogicalReportsView';
import { StudentReportModal } from '../components/StudentReportModal';
import { GroupReportModal } from '../components/GroupReportModal';
import { useLanguage } from '../utils/i18n';

interface ReportsScreenProps {
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  const { language } = useLanguage();
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [allClassReports, setAllClassReports] = useState<PedagogicalReport[]>([]);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<StudentIdentity | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGroupReportModalOpen, setIsGroupReportModalOpen] = useState(false);

  // Level filter
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const cls = await getAllClasses();
      setClasses(cls);
      if (cls.length > 0 && !selectedClass) {
        setSelectedClass(cls[0].className);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      loadStudentsAndReports(selectedClass);
    }
  }, [selectedClass]);

  const loadStudentsAndReports = async (clsName: string) => {
    try {
      const st = await getStudentList(clsName);
      setStudents(st || []);
      const reps = await getPedagogicalReports(clsName);
      setAllClassReports(reps || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Unique levels
  const academicLevels = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => {
      const match = c.className.match(/^(1APIC|2APIC|3APIC|TC|1BAC|2BAC|6ème|5ème|4ème|3ème|1AC|2AC|3AC)/i);
      if (match) set.add(match[1].toUpperCase());
    });
    return Array.from(set);
  }, [classes]);

  const filteredClasses = useMemo(() => {
    if (levelFilter === 'ALL') return classes;
    return classes.filter(c => c.className.toUpperCase().startsWith(levelFilter));
  }, [classes, levelFilter]);

  // Counts
  const stats = useMemo(() => {
    const medical = allClassReports.filter(r => r.caseType === 'medical_exemption').length;
    const behavior = allClassReports.filter(r => r.caseType === 'behavior').length;
    const injury = allClassReports.filter(r => r.caseType === 'injury').length;
    const talent = allClassReports.filter(r => r.caseType === 'outstanding_talent').length;
    const warning = allClassReports.filter(r => r.caseType === 'absence_warning').length;
    return {
      total: allClassReports.length,
      medical,
      behavior,
      injury,
      talent,
      warning
    };
  }, [allClassReports]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/60 p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
              فضاء التقارير والحالات البيداغوجية
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              توثيق الإعفاءات الطبية، تقارير الانضباط والسلوك، الحالات الصحية والإصابات، والتقارير الإدارية الجماعية
            </p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {academicLevels.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ps-1">المستوى:</span>
              <select
                value={levelFilter}
                onChange={(e) => {
                  setLevelFilter(e.target.value);
                  const matching = e.target.value === 'ALL' ? classes : classes.filter(c => c.className.toUpperCase().startsWith(e.target.value));
                  if (matching.length > 0) {
                    setSelectedClass(matching[0].className);
                  }
                }}
                className="bg-white dark:bg-gray-800 border-none font-bold text-xs text-gray-900 dark:text-white rounded-lg px-2 py-1 shadow-2xs cursor-pointer"
              >
                <option value="ALL">جميع المستويات</option>
                {academicLevels.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ps-1">القسم:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white dark:bg-gray-800 border-none font-bold text-xs text-indigo-600 dark:text-indigo-400 rounded-lg px-2.5 py-1 shadow-2xs cursor-pointer"
            >
              {filteredClasses.map(c => (
                <option key={c.className} value={c.className}>
                  {c.className} ({c.studentCount} ت)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              if (students.length > 0) {
                setSelectedStudentForReport(students[0]);
              }
              setIsReportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>تسجيل تقرير تلميذ</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGroupReportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserGroupIcon className="w-4 h-4" />
            <span>تقرير الإدارة الجماعي</span>
          </button>
        </div>
      </div>

      {/* Cards Statistics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-center shadow-2xs">
          <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
            <span>📋</span>
            <span>إجمالي التقارير</span>
          </div>
        </div>

        <div className="bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-center shadow-2xs">
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.medical}</div>
          <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mt-1 flex items-center justify-center gap-1">
            <span>🏥</span>
            <span>إعفاءات طبية</span>
          </div>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-center shadow-2xs">
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.behavior}</div>
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mt-1 flex items-center justify-center gap-1">
            <span>⚠️</span>
            <span>ملاحظات السلوك</span>
          </div>
        </div>

        <div className="bg-orange-50/60 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-900/40 text-center shadow-2xs">
          <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{stats.injury}</div>
          <div className="text-[11px] font-bold text-orange-700 dark:text-orange-300 mt-1 flex items-center justify-center gap-1">
            <span>🩹</span>
            <span>إصابات رياضية</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 text-center shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.talent}</div>
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mt-1 flex items-center justify-center gap-1">
            <span>🌟</span>
            <span>مواهب وتفوق</span>
          </div>
        </div>
      </div>

      {/* Main Reports View Component */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700/60">
        <PedagogicalReportsView
          selectedClass={selectedClass}
          students={students}
        />
      </div>

      {/* Student Report Modal */}
      {isReportModalOpen && selectedStudentForReport && (
        <StudentReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          student={selectedStudentForReport}
          className={selectedClass}
          allStudents={students}
          onSelectStudent={(s) => setSelectedStudentForReport(s)}
          onSave={() => loadStudentsAndReports(selectedClass)}
        />
      )}

      {/* Group Report Modal */}
      {isGroupReportModalOpen && (
        <GroupReportModal
          isOpen={isGroupReportModalOpen}
          onClose={() => setIsGroupReportModalOpen(false)}
          className={selectedClass}
          students={students}
        />
      )}
    </div>
  );
};
