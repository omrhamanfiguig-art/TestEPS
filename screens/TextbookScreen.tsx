import React, { useState, useEffect, useMemo } from 'react';
import { TextbookSession, StudentIdentity } from '../types';
import { 
  getTextbookSessions, 
  saveTextbookSession, 
  deleteTextbookSession 
} from '../utils/textbookDb';
import { 
  getAllClasses, 
  ClassStats 
} from '../utils/db';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  CalendarDaysIcon, 
  CheckCircleIcon, 
  XMarkIcon, 
  TrashIcon, 
  PencilSquareIcon,
  PlusIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  UserGroupIcon
} from '../components/Icons';
import { useLanguage } from '../utils/i18n';

interface TextbookScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
}

export const TextbookScreen: React.FC<TextbookScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  const { language } = useLanguage();
  const [classList, setClassList] = useState<ClassStats[]>([]);
  const [sessions, setSessions] = useState<TextbookSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [formSessionNumber, setFormSessionNumber] = useState('الحصة 1');
  const [formGoal, setFormGoal] = useState('');
  const [formClassName, setFormClassName] = useState(selectedClass || '');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTimeSlot, setFormTimeSlot] = useState('08:30 - 10:30');

  // Filter state
  const [classFilter, setClassFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadClasses();
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedClass && !formClassName) {
      setFormClassName(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const list = await getAllClasses();
    setClassList(list);
    if (list.length > 0 && !selectedClass) {
      setSelectedClass(list[0].className);
      setFormClassName(list[0].className);
    }
  };

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await getTextbookSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGoal.trim() || !formSessionNumber.trim() || !formClassName) {
      setNotification({ message: 'المرجو ملء جميع الحقول المطلوبة.', type: 'error' });
      return;
    }

    const sessionObj: TextbookSession = {
      id: editingSessionId || `tb_${Date.now()}`,
      sessionNumber: formSessionNumber.trim(),
      goal: formGoal.trim(),
      className: formClassName,
      date: formDate,
      timeSlot: formTimeSlot.trim(),
      createdAt: editingSessionId ? (sessions.find(s => s.id === editingSessionId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveTextbookSession(sessionObj);
      setNotification({ 
        message: editingSessionId ? 'تم تعديل الحصة الرياضية في دفتر النصوص بنجاح!' : 'تم إضافة الحصة الرياضية لدفتر النصوص ومزامنتها بنجاح!', 
        type: 'success' 
      });
      setIsFormOpen(false);
      setEditingSessionId(null);
      setFormGoal('');
      loadSessions();
    } catch (err) {
      setNotification({ message: 'حدث خطأ أثناء الحفظ.', type: 'error' });
    }
  };

  const handleEdit = (session: TextbookSession) => {
    setEditingSessionId(session.id);
    setFormSessionNumber(session.sessionNumber);
    setFormGoal(session.goal);
    setFormClassName(session.className);
    setFormDate(session.date);
    setFormTimeSlot(session.timeSlot);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الحصة من دفتر النصوص؟')) {
      try {
        await deleteTextbookSession(id);
        setNotification({ message: 'تم حذف الحصة من دفتر النصوص بنجاح.', type: 'success' });
        loadSessions();
      } catch (err) {
        setNotification({ message: 'حدث خطأ أثناء الحذف.', type: 'error' });
      }
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchClass = classFilter === 'all' || s.className === classFilter;
      const matchQuery = !searchQuery || 
        s.sessionNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.goal.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.className.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchQuery;
    });
  }, [sessions, classFilter, searchQuery]);

  const handleExportExcel = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      alert("لم يتم تحميل مكتبة Excel.");
      return;
    }

    const headers = [
      "الحصة / رقم الحصة", 
      "الهدف البيداغوجي / المحتوى", 
      "القسم", 
      "التاريخ", 
      "التوقيت / الحيز الزمني",
      "تاريخ الإضافة"
    ];

    const rows = filteredSessions.map(s => [
      s.sessionNumber,
      s.goal,
      s.className,
      s.date,
      s.timeSlot,
      new Date(s.createdAt).toLocaleDateString('ar-MA')
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "دفتر النصوص");
    XLSX.writeFile(wb, `دفتر_النصوص_الرياضي_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl shadow-md text-sm font-bold flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="w-5 h-5" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-80">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <DocumentTextIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              دفتر النصوص الرياضي
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              توثيق صيرورة الحصص والأنشطة الرياضية والأهداف البيداغوجية والزمنية لكل قسم
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setEditingSessionId(null);
              setFormSessionNumber(`الحصة ${sessions.length + 1}`);
              setFormGoal('');
              setIsFormOpen(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>تسجيل حصة جديدة</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>تصدير دفتر النصوص</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في دفتر النصوص..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <DocumentTextIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-gray-500">القسم:</span>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-bold text-xs text-gray-900 dark:text-white rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">جميع الأقسام</option>
            {classList.map(c => (
              <option key={c.className} value={c.className}>{c.className}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Textbook Entry Form (Modal) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {editingSessionId ? 'تعديل حصة دفتر النصوص' : 'تسجيل صيرورة حصة رياضية جديدة'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Session Designation */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">رقم الحصة / عنوانها:</label>
                <input 
                  type="text"
                  value={formSessionNumber}
                  onChange={(e) => setFormSessionNumber(e.target.value)}
                  placeholder="مثال: الحصة 1 أو الحصة الأولى"
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm"
                  required
                />
              </div>

              {/* Class Select */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">القسم المستهدف:</label>
                <select 
                  value={formClassName}
                  onChange={(e) => setFormClassName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm cursor-pointer"
                  required
                >
                  <option value="" disabled>اختر القسم</option>
                  {classList.map(c => (
                    <option key={c.className} value={c.className}>{c.className}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                  <span>التاريخ:</span>
                </label>
                <input 
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm"
                  required
                />
              </div>

              {/* Time slot */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span>الحيز الزمني / التوقيت:</span>
                </label>
                <input 
                  type="text"
                  value={formTimeSlot}
                  onChange={(e) => setFormTimeSlot(e.target.value)}
                  placeholder="مثال: 08:30 - 10:30"
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm"
                  required
                />
              </div>
            </div>

            {/* Goal / Description */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">الهدف البيداغوجي / محتوى الدرس:</label>
              <textarea 
                value={formGoal}
                onChange={(e) => setFormGoal(e.target.value)}
                placeholder="أدخل الأهداف البيداغوجية والمهارات المبرمجة في هذه الحصة..."
                rows={4}
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Form actions */}
            <div className="flex gap-2 pt-2">
              <button 
                type="submit"
                className="flex-1 bg-indigo-600 text-white font-black py-2.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {editingSessionId ? 'تعديل الحصة' : 'تسجيل في الدفتر'}
              </button>
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 font-black py-2.5 rounded-xl hover:bg-gray-200 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Sessions Feed */}
      <div className="space-y-4">
        {filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSessions.map(session => (
              <div key={session.id} className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-1.5 w-full bg-indigo-600"></div>

                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-xl">
                        {session.sessionNumber}
                      </span>
                      <span className="text-xs font-bold text-gray-400">
                        القسم: <strong className="text-gray-900 dark:text-white">{session.className}</strong>
                      </span>
                    </div>

                    <div className="text-xs font-bold text-gray-400 flex items-center gap-4 pt-1">
                      <span className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{session.date}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>{session.timeSlot}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(session)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                      title="تعديل الحصة"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="حذف الحصة"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Pedagoical Goal */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/80">
                  <span className="text-[11px] font-black text-gray-400 block mb-1">الهدف البيداغوجي ومحتوى الدرس:</span>
                  <p className="text-xs text-gray-700 dark:text-gray-200 font-bold leading-relaxed whitespace-pre-line">
                    {session.goal}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-700">
            <InformationCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-black text-gray-500">لا توجد أي حصص مبرمجة في دفتر النصوص حالياً</h3>
            <p className="text-xs text-gray-400 mt-1">اضغط على زر «تسجيل حصة جديدة» لإدخال وتوثيق أول حصة في دفتر النصوص.</p>
          </div>
        )}
      </div>
    </div>
  );
};
