import React from 'react';
import { XMarkIcon, InformationCircleIcon, RunningManIcon, RulerIcon, AcademicCapIcon, UsersIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from './Icons';
import { useLanguage } from '../utils/i18n';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  const isAr = language === 'ar';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden text-right"
        dir={isAr ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-gray-800 dark:to-gray-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md font-black">
              <InformationCircleIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                {isAr ? 'حول التطبيق' : 'À propos de l\'application'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isAr ? 'منظومة التقويم التشخيصي والروائز البدنية EPS' : 'Système d\'évaluation diagnostique et tests physiques EPS'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-700 transition"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-gray-700 dark:text-gray-350 leading-relaxed">
          
          {/* Section 1: Developer Info */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-indigo-100/50 dark:from-indigo-950/40 dark:to-gray-800/80 rounded-2xl p-5 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-indigo-200/60 dark:border-indigo-900/40 pb-2.5">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <AcademicCapIcon className="w-5 h-5" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  {isAr ? 'من طوّر التطبيق' : 'Concepteurs & Développeurs'}
                </h3>
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-black rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                {isAr ? 'مديرية تاوريرت' : 'Direction Provinciale de Taourirt'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-gray-800/90 border border-indigo-100/80 dark:border-gray-700/80 shadow-xs">
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                  {isAr ? 'الأستاذ:' : 'Professeur :'}
                </div>
                <div className="text-sm font-black text-gray-900 dark:text-white">
                  {isAr ? 'عمر حماني' : 'Omar Hamani'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {isAr ? 'أستاذ مادة التربية البدنية والرياضية' : 'Professeur d\'Éducation Physique et Sportive'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-gray-800/90 border border-indigo-100/80 dark:border-gray-700/80 shadow-xs">
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                  {isAr ? 'المفتش:' : 'Inspecteur :'}
                </div>
                <div className="text-sm font-black text-gray-900 dark:text-white">
                  {isAr ? 'أمين سنوسي' : 'Amine Sanoussi'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {isAr ? 'مفتش التربية البدنية والرياضية' : 'Inspecteur de l\'Éducation Physique et Sportive'}
                </div>
              </div>
            </div>

            <div className="pt-1 text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <span className="text-base">💡</span>
              <span>
                {isAr 
                  ? 'من أجل حلول رقمية بيداغوجية لفائدة أساتذة وأطر التربية والتعليم لمادة التربية البدنية' 
                  : 'Pour des solutions pédagogiques numériques au profit des enseignants et cadres de l\'EPS'}
              </span>
            </div>
          </div>

          {/* Section 2: Objectives */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {isAr ? 'الهدف من إنشاء التطبيق' : 'Objectifs de l\'application'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                <div className="font-bold text-gray-900 dark:text-white mb-1">⏱️ رقمنة اختبار VMA Luc Léger</div>
                <div className="text-gray-600 dark:text-gray-400">تمرير رائز المكوك 20م الميداني بدقة صوتية وبصرية مع التسجيل الفوري لسرعة كل تلميذ.</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                <div className="font-bold text-gray-900 dark:text-white mb-1">📊 تكوين المجموعات الفيزيولوجية</div>
                <div className="text-gray-600 dark:text-gray-400">توزيع متجانس للقدرات وفق المتوسط الحسابي (Moyenne) والانحراف المعياري (Écart-type).</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                <div className="font-bold text-gray-900 dark:text-white mb-1">📋 تدبير القياسات والروائز البدنية</div>
                <div className="text-gray-600 dark:text-gray-400">حساب مؤشر كتلة الجسم IMC وتتبع روائز السرعة، القفز، الرمي، المرونة، والتوازن.</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                <div className="font-bold text-gray-900 dark:text-white mb-1">📑 تصدير تقارير Excel و Word</div>
                <div className="text-gray-650 dark:text-gray-400">تصدير لوائح الأقسام، البطاقات الفردية، وشبكات المجموعات المنسقة بنقرة واحدة.</div>
              </div>
            </div>
          </div>

          {/* Section 3: User Guide / Workflow */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              {isAr ? 'كيفية الاشتغال بالتطبيق (مراحل الاستخدام)' : 'Guide d\'utilisation étape par étape'}
            </h3>
            
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-700/30 border border-gray-150 dark:border-gray-700">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">استيراد الأقسام (Importation)</div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-400">استخدم زر <strong>"استيراد الأقسام"</strong> لاستيراد ملف أو عدة ملفات Excel (مسار أو مخصصة)، حيث يتعرف التطبيق تلقائياً على كل قسم وتلاميذه.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-700/30 border border-gray-150 dark:border-gray-700">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">القياسات البيومترية (Biométrie IMC)</div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-400">إدخال الوزن والطول ليتم حساب مؤشر كتلة الجسم IMC وتصنيف الحالة البدنية (نحافة، وزن مثالي، زيادة وزن...).</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-700/30 border border-gray-150 dark:border-gray-700">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">3</span>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">الروائز البدنية ورائز Luc Léger 20m</div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-400">إطلاق اختبار السرعة الهوائية الميداني والضغط على بطاقة التلميذ عند توقفه لتسجيل VMA، أو تعبئة نتائج الروائز البدنية في الجدول الموحد.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-700/30 border border-gray-150 dark:border-gray-700">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0">4</span>
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white">المجموعات الفيزيولوجية وتصدير النتائج (Export)</div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-400">توليد المجموعات الفيزيولوجية المتجانسة وفق المتوسط والانحراف المعياري، ثم تصدير جداول النتائج الكاملة إلى Excel أو Word.</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            تطبيق مخصص لأساتذة مادة التربية البدنية والرياضية • EPS Morocco
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition"
          >
            {isAr ? 'فهمت، إغلاق' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
};
