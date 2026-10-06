import React, { useState, useRef } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ArrowUpTrayIcon, 
  ArrowDownTrayIcon, 
  DocumentTextIcon, 
  CalendarDaysIcon,
  SparklesIcon,
  TrashIcon
} from './Icons';
import { AttendanceSession } from '../types';
import { 
  parseSportsActivitySessionsExcel, 
  downloadSessionsTemplate, 
  ParsedSessionsData 
} from '../utils/excelHelper';
import { saveAttendanceSession } from '../utils/db';

interface ImportSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClass: string;
  onSuccess: (importedCount: number) => void;
}

export const ImportSessionsModal: React.FC<ImportSessionsModalProps> = ({
  isOpen,
  onClose,
  currentClass,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedSessionsData | null>(null);
  const [targetClass, setTargetClass] = useState<string>(currentClass || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMessage(null);
    setIsParsing(true);

    try {
      const result = await parseSportsActivitySessionsExcel(selectedFile, targetClass || currentClass);
      if (result.sessions.length === 0) {
        setErrorMessage("لم يتم العثور على أي حصص صالحة في الملف المرفق. يرجى التأكد من مطابقة الأعمدة لنموذج الاستيراد.");
        setParsedData(null);
      } else {
        setParsedData(result);
        if (result.classes.length === 1 && result.classes[0]) {
          setTargetClass(result.classes[0]);
        }
      }
    } catch (err: any) {
      console.error("Error parsing sessions file:", err);
      setErrorMessage(err.message || "حدث خطأ أثناء قراءة ملف الحصص.");
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportSave = async () => {
    if (!parsedData || parsedData.sessions.length === 0) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let savedCount = 0;
      for (const session of parsedData.sessions) {
        const finalClassName = session.className || targetClass || currentClass;
        const finalSession: AttendanceSession = {
          ...session,
          className: finalClassName
        };
        await saveAttendanceSession(finalSession);
        savedCount++;
      }

      onSuccess(savedCount);
      onClose();
    } catch (err: any) {
      console.error("Failed to save imported sessions:", err);
      setErrorMessage("حدث خطأ أثناء حفظ الحصص في قاعدة البيانات.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-6 border border-gray-150 dark:border-gray-700 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ArrowUpTrayIcon />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                استيراد سجل الحصص والأنشطة الرياضية
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                استيراد سجلات الحصص السابقة من ملفات Excel أو CSV أو JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 space-y-5 pr-1 text-right">
          {/* Instructions & Template Download */}
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>نموذج Excel القياسي لسجل الحصص</span>
              </div>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                يمكنك تحميل النموذج المعبأ مسبقاً وتعبئته بحصص مادتك أو استخدام نفس ملف التصدير.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadSessionsTemplate}
              className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <ArrowDownTrayIcon />
              <span>تحميل النموذج (.xlsx)</span>
            </button>
          </div>

          {/* File Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 rounded-3xl p-6 text-center cursor-pointer transition bg-gray-50/50 dark:bg-gray-750/50 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-xs group-hover:scale-110 transition text-indigo-600 dark:text-indigo-400">
                <ArrowUpTrayIcon />
              </div>
              <div className="font-black text-sm text-gray-800 dark:text-gray-200">
                {file ? file.name : "اضغط هنا لاختيار ملف Excel أو CSV أو JSON"}
              </div>
              <p className="text-xs text-gray-400">
                يدعم ملفات .xlsx و .xls و .csv وملفات النسخ الاحتياطي .json
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs font-bold text-rose-700 dark:text-rose-300">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Loading Spinner */}
          {isParsing && (
            <div className="text-center py-6 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center gap-2">
              <span className="inline-block animate-spin text-lg">⏳</span>
              <span>جارٍ قراءة وفحص بيانات الحصص...</span>
            </div>
          )}

          {/* Parsed Sessions Summary and Preview */}
          {parsedData && (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>تم التعرف بنجاح على {parsedData.totalSessions} حصة مسجلة</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl">
                  الأقسام: {parsedData.classes.join(', ') || targetClass || currentClass}
                </span>
              </div>

              {/* Class Destination Selector */}
              <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  القسم المستهدف للتسجيل:
                </span>
                <input
                  type="text"
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  placeholder="مثلاً: 2APIC-1"
                  className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                />
              </div>

              {/* Preview Table of Sessions */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-[11px] text-right">
                  <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold sticky top-0">
                    <tr>
                      <th className="p-2">الحصة</th>
                      <th className="p-2">القسم</th>
                      <th className="p-2">التاريخ</th>
                      <th className="p-2">النشاط الرياضي</th>
                      <th className="p-2 text-center">حضور</th>
                      <th className="p-2 text-center">غياب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-medium">
                    {parsedData.sessions.map((sess, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="p-2 font-bold text-indigo-600">{sess.sessionNumber || `الحصة ${idx + 1}`}</td>
                        <td className="p-2 font-bold">{sess.className || targetClass || currentClass}</td>
                        <td className="p-2 font-mono">{sess.date}</td>
                        <td className="p-2 truncate max-w-[140px]">{sess.topic}</td>
                        <td className="p-2 text-center text-emerald-600 font-bold">{sess.summary.present}</td>
                        <td className="p-2 text-center text-rose-600 font-bold">{sess.summary.absent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={!parsedData || parsedData.sessions.length === 0 || isSaving}
            onClick={handleImportSave}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            {isSaving ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                <span>جارٍ الحفظ والمزامنة...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                <span>تأكيد استيراد {parsedData?.totalSessions || 0} حصة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
