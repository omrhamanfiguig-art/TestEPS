import React, { useState, useEffect, useMemo } from 'react';
import { 
  AcademicCapIcon, 
  TrophyIcon, 
  UserGroupIcon, 
  DocumentTextIcon, 
  SparklesIcon, 
  CalendarDaysIcon, 
  BanknotesIcon, 
  RulerIcon, 
  Cog6ToothIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon,
  CheckIcon,
  UsersIcon,
  RunningManIcon,
  ScaleIcon,
  TableCellsIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '../components/Icons';
import type { ActiveScreen } from '../components/Sidebar';
import { useLanguage } from '../utils/i18n';
import { getAllClasses, ClassStats, getStudentList, getAttendanceSessions } from '../utils/db';
import { detectLevelFromClassName, EDUCATIONAL_LEVELS } from '../utils/teacherHelper';

interface HomeScreenProps {
  onNavigate: (screen: ActiveScreen) => void;
  selectedClass: string;
  setSelectedClass: (cls: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  selectedClass,
  setSelectedClass
}) => {
  const { t, language, isRtl } = useLanguage();
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [todayAttendanceCount, setTodayAttendanceCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Selected level filter for quick overview
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        const clsList = await getAllClasses();
        setClasses(clsList);
        
        let studentsSum = 0;
        clsList.forEach(c => {
          studentsSum += (c.studentCount || 0);
        });
        setTotalStudents(studentsSum);

        // Fetch recent attendance sessions
        if (clsList.length > 0) {
          const sessions = await getAttendanceSessions(clsList[0].className);
          setTodayAttendanceCount(sessions.length);
        }
      } catch (err) {
        console.error('Failed to load overview data', err);
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
    window.addEventListener('dbUpdated', loadOverviewData);
    return () => window.removeEventListener('dbUpdated', loadOverviewData);
  }, []);

  // Filtered classes according to selected level
  const filteredClasses = useMemo(() => {
    if (selectedLevel === 'ALL') return classes;
    return classes.filter(c => detectLevelFromClassName(c.className).key === selectedLevel);
  }, [classes, selectedLevel]);

  // Main navigation cards corresponding to the sidebar items
  const menuCards = [
    {
      id: 'classes' as ActiveScreen,
      title: language === 'ar' ? 'إدارة الأقسام والتلاميذ' : 'Gestion des Classes',
      subtitle: language === 'ar' ? 'استيراد اللوائح، إضافة التلاميذ، تدبير مسار وطارل' : 'Import Excel, listes d\'élèves, TaRL',
      icon: <AcademicCapIcon className="w-8 h-8 text-white" />,
      gradient: 'from-blue-600 to-indigo-600',
      shadowColor: 'shadow-blue-500/20',
      badge: `${classes.length} ${language === 'ar' ? 'أقسام' : 'classes'}`,
      badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      highlightTag: language === 'ar' ? 'الأساس' : 'Base'
    },
    {
      id: 'physical-tests' as ActiveScreen,
      title: language === 'ar' ? 'التقويم والروائز البدنية' : 'Tests Physiques & Aptitude',
      subtitle: language === 'ar' ? 'شبكة 3×3: التوازن، السرعة، VMA، التحمل، القفز، الرمي والباريم' : 'Grille 3x3: Équilibre, Vitesse, VMA, Saut, Lancer',
      icon: <TrophyIcon className="w-8 h-8 text-white" />,
      gradient: 'from-amber-500 to-orange-600',
      shadowColor: 'shadow-amber-500/20',
      badge: language === 'ar' ? '9 روائز معتمدة' : '9 Tests',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      highlightTag: language === 'ar' ? 'شبكة 3×3' : 'Grille 3x3'
    },
    {
      id: 'team-games' as ActiveScreen,
      title: language === 'ar' ? 'الفروض والأنشطة الرياضية' : 'Évaluations & Devoirs',
      subtitle: language === 'ar' ? 'تقويم الرياضات الجماعية، الجمباز الأرضي، السرعة والوثب' : 'Sports collectifs, Gymnastique, Athlétisme',
      icon: <UserGroupIcon className="w-8 h-8 text-white" />,
      gradient: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/20',
      badge: language === 'ar' ? 'المراقبة المستمرة' : 'Devoirs',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      highlightTag: language === 'ar' ? 'فروض' : 'Éval'
    },
    {
      id: 'massar' as ActiveScreen,
      title: language === 'ar' ? 'فضاء مسار وطارل (TaRL)' : 'Espace Massar & TaRL',
      subtitle: language === 'ar' ? 'تصدير النقط لمسار، مجموعات الدعم، تقارير التميز والمعالجة' : 'Export Massar, groupes de remédiation TaRL',
      icon: <DocumentTextIcon className="w-8 h-8 text-white" />,
      gradient: 'from-violet-600 to-purple-600',
      shadowColor: 'shadow-purple-500/20',
      badge: language === 'ar' ? 'مسار / طارل' : 'Massar',
      badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
      highlightTag: language === 'ar' ? 'رسمي' : 'Officiel'
    },
    {
      id: 'attendance' as ActiveScreen,
      title: language === 'ar' ? 'الغياب ودفتر النصوص' : 'Présence & Cahier de Textes',
      subtitle: language === 'ar' ? 'تسجيل الحضور والغياب بالحصص، تخطيط الدروس وتوثيق السجلات' : 'Pointage absence par séance, cahier de textes',
      icon: <CalendarDaysIcon className="w-8 h-8 text-white" />,
      gradient: 'from-indigo-600 to-blue-700',
      shadowColor: 'shadow-indigo-500/20',
      badge: language === 'ar' ? 'توثيق وتتبع' : 'Suivi',
      badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
      highlightTag: language === 'ar' ? 'يومي' : 'Quotidien'
    },
    {
      id: 'talent' as ActiveScreen,
      title: language === 'ar' ? 'رصد وتتبع المواهب الرياضية' : 'Détection des Talents',
      subtitle: language === 'ar' ? 'اكتشاف وتصنيف الأبطال الموهوبين في الروائز والأنشطة' : 'Identification des élèves à haut potentiel sportif',
      icon: <SparklesIcon className="w-8 h-8 text-white" />,
      gradient: 'from-rose-500 to-pink-600',
      shadowColor: 'shadow-rose-500/20',
      badge: language === 'ar' ? 'مواهب متميزة' : 'Talents',
      badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
      highlightTag: language === 'ar' ? 'نخبة' : 'Elite'
    },
    {
      id: 'measurements' as ActiveScreen,
      title: language === 'ar' ? 'القياسات البيومترية ومؤشر IMC' : 'Mesures Biométriques & IMC',
      subtitle: language === 'ar' ? 'قياس الطول، الوزن، حساب مؤشر كتلة الجسم والنبض القلبي' : 'Taille, poids, indice de masse corporelle, FC',
      icon: <ScaleIcon className="w-8 h-8 text-white" />,
      gradient: 'from-cyan-600 to-teal-700',
      shadowColor: 'shadow-cyan-500/20',
      badge: language === 'ar' ? 'صحة ولياقة' : 'Santé',
      badgeBg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
      highlightTag: language === 'ar' ? 'صحي' : 'Biométrie'
    },
    {
      id: 'sports-association' as ActiveScreen,
      title: language === 'ar' ? 'فضاء الجمعية الرياضية المدرسية' : 'Association Sportive (ASS)',
      subtitle: language === 'ar' ? 'تدبير المنخرطين، المداخيل، المصاريف، الأنشطة والبطولات' : 'Gestion des adhérents, budget, compétitions',
      icon: <BanknotesIcon className="w-8 h-8 text-white" />,
      gradient: 'from-emerald-600 to-green-700',
      shadowColor: 'shadow-emerald-500/20',
      badge: language === 'ar' ? 'ASS المدرسية' : 'ASS',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      highlightTag: language === 'ar' ? 'جمعية' : 'Club'
    },
    {
      id: 'settings' as ActiveScreen,
      title: language === 'ar' ? 'الإعدادات والمزامنة السحابية' : 'Paramètres & Synchronisation',
      subtitle: language === 'ar' ? 'المزامنة مع الأساتذة، حجم المجموعات، السلالم وتخصيص التطبيق' : 'Cloud sync, configuration, barèmes et thèmes',
      icon: <Cog6ToothIcon className="w-8 h-8 text-white" />,
      gradient: 'from-slate-600 to-gray-700',
      shadowColor: 'shadow-gray-500/20',
      badge: language === 'ar' ? 'خيارات عامة' : 'Config',
      badgeBg: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      highlightTag: language === 'ar' ? 'نظام' : 'Système'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white p-6 sm:p-8 shadow-xl shadow-indigo-600/10 border border-indigo-500/30">
        <div className="absolute -end-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 start-1/3 w-48 h-48 bg-violet-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>منصة التربية البدنية والرياضية بالمغرب (EPS Maroc)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              {language === 'ar' ? 'مرحباً بك في فضائك التربوي المتكامل' : 'Bienvenue dans votre Espace EPS'}
            </h1>
            <p className="text-sm sm:text-base text-indigo-100 max-w-2xl font-medium leading-relaxed">
              {language === 'ar' 
                ? 'تدبير شامل للأقسام، الروائز البدنية بنظام 3×3، الفروض والمراقبة المستمرة، الغياب اليومي، ودفتر النصوص الرقمي.'
                : 'Gestion complète des classes, tests physiques 3x3, évaluations continues, assiduité et cahier de textes numérique.'}
            </p>
          </div>

          {/* Quick Class & Level Selector on Home Hero */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex flex-col gap-2.5 min-w-[240px] sm:min-w-[280px]">
            <div className="text-xs font-bold text-indigo-100 flex items-center justify-between">
              <span>{language === 'ar' ? 'القسم النشط حالياً:' : 'Classe active :'}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                {classes.length} {language === 'ar' ? 'قسم' : 'classes'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-indigo-200 mb-1 font-bold">
                  {language === 'ar' ? 'المستوى الدراسي:' : 'Niveau :'}
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    const matched = classes.filter(c => e.target.value === 'ALL' || detectLevelFromClassName(c.className).key === e.target.value);
                    if (matched.length > 0 && !matched.some(c => c.className === selectedClass)) {
                      setSelectedClass(matched[0].className);
                    }
                  }}
                  className="w-full text-xs font-bold bg-white/20 text-white rounded-xl px-2.5 py-1.5 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                >
                  <option value="ALL" className="text-gray-900 bg-white">
                    {language === 'ar' ? 'جميع المستويات' : 'Tous les niveaux'}
                  </option>
                  {EDUCATIONAL_LEVELS.map(lvl => (
                    <option key={lvl.key} value={lvl.key} className="text-gray-900 bg-white">
                      {lvl.labelAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-indigo-200 mb-1 font-bold">
                  {language === 'ar' ? 'القسم المستهدف:' : 'Classe :'}
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full text-xs font-bold bg-white/20 text-white rounded-xl px-2.5 py-1.5 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                >
                  {filteredClasses.length === 0 ? (
                    <option value="" className="text-gray-900 bg-white">
                      {language === 'ar' ? 'لا يوجد أقسام' : 'Aucune classe'}
                    </option>
                  ) : (
                    filteredClasses.map(c => (
                      <option key={c.className} value={c.className} className="text-gray-900 bg-white">
                        {c.className} ({c.studentCount || 0} {language === 'ar' ? 'تلميذ' : 'élèves'})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-indigo-100">
              <span>{language === 'ar' ? 'مجموع التلاميذ:' : 'Total élèves :'}</span>
              <span className="font-black text-white bg-white/20 px-2 py-0.5 rounded-md">
                {totalStudents} {language === 'ar' ? 'تلميذاً' : 'élèves'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Main Application Modules as Professional Cards */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">❖</span>
              <span>{language === 'ar' ? 'القائمة الرئيسية والتطبيقات' : 'Menu Principal & Applications'}</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'ar' ? 'اضغط على أي بطاقة لفتح الفضاء المخصص والبدء في العمل' : 'Sélectionnez un espace pour démarrer'}
            </p>
          </div>
        </div>

        {/* Responsive Cards Grid: 1 col on mobile, 2 cols on tablet, 3 cols on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {menuCards.map((card) => (
            <div
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="group relative bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-[0.98]"
            >
              {/* Subtle hover gradient wash */}
              <div className="absolute top-0 end-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  {/* Distinctive Icon with Gradient Background */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${card.gradient} flex items-center justify-center shadow-lg ${card.shadowColor} group-hover:scale-105 transition-transform duration-300 shrink-0`}>
                    {card.icon}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${card.badgeBg}`}>
                      {card.badge}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {card.highlightTag}
                    </span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5 flex items-center gap-1.5">
                  <span>{card.title}</span>
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium line-clamp-2">
                  {card.subtitle}
                </p>
              </div>

              {/* Action Button at bottom */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                <span className="flex items-center gap-1">
                  <span>{language === 'ar' ? 'دخول الفضاء' : 'Accéder'}</span>
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 transition-colors">
                  {isRtl ? (
                    <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  ) : (
                    <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
