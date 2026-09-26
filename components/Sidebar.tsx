import React, { useState, useEffect } from 'react';
import { 
    RunningManIcon, 
    ScaleIcon, 
    RulerIcon, 
    ArrowsRightLeftIcon, 
    Cog6ToothIcon, 
    Bars3Icon, 
    XMarkIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
    GlobeAltIcon,
    AcademicCapIcon,
    UserCircleIcon
} from './Icons';
import { useLanguage } from '../utils/i18n';
import { getAllClasses, ClassStats } from '../utils/db';
import { subscribeToAuthChanges, auth } from '../utils/firebase';
import type { User } from 'firebase/auth';
import { AuthModal } from './AuthModal';

export type ActiveScreen = 
  | 'physical-tests' 
  | 'measurements' 
  | 'classes'
  | 'settings';

interface SidebarProps {
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  selectedClass: string;
  setSelectedClass: (className: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  setActiveScreen,
  selectedClass,
  setSelectedClass,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const [classList, setClassList] = useState<ClassStats[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      const classes = await getAllClasses();
      setClassList(classes);
    };
    fetchClasses();
    
    // Listen for storage changes or internal custom events if needed
    window.addEventListener('dbUpdated', fetchClasses);
    const unsubAuth = subscribeToAuthChanges((u) => setCurrentUser(u));

    return () => {
      window.removeEventListener('dbUpdated', fetchClasses);
      unsubAuth();
    };
  }, [selectedClass]);

  const navItems = [
    {
      id: 'classes' as ActiveScreen,
      label: t.navClasses,
      icon: <AcademicCapIcon className="w-5 h-5" />,
      badge: classList.length > 0 ? String(classList.length) : undefined
    },
    {
      id: 'physical-tests' as ActiveScreen,
      label: t.navPhysicalTests,
      icon: <RunningManIcon className="w-5 h-5" />
    },
    {
      id: 'measurements' as ActiveScreen,
      label: t.navMeasurements,
      icon: <RulerIcon className="w-5 h-5" />,
      badge: 'IMC'
    },
    {
      id: 'settings' as ActiveScreen,
      label: t.navSettings,
      icon: <Cog6ToothIcon />,
    }
  ];

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'fr' : 'ar');
  };

  const handleNavClick = (screen: ActiveScreen) => {
    setActiveScreen(screen);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen flex flex-col bg-white dark:bg-gray-900 border-x border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out ${
          isRtl ? 'right-0' : 'left-0'
        } ${
          isMobileOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0')
        } ${
          isCollapsed ? 'md:w-20' : 'w-72 md:w-68 lg:w-72'
        }`}
      >
        {/* Brand & Collapse Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow-md font-black text-lg">
              EPS
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="font-extrabold text-sm text-gray-900 dark:text-white truncate">
                  {t.appName}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {t.appSubtitle}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title={isCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
          >
            {isCollapsed ? (
              isRtl ? <ChevronDoubleLeftIcon /> : <ChevronDoubleRightIcon />
            ) : (
              isRtl ? <ChevronDoubleRightIcon /> : <ChevronDoubleLeftIcon />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Current Class Badge */}
        {!isCollapsed && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t.class} :
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                {selectedClass || "EPS"}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-grow p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                  } ${isCollapsed ? 'justify-center px-2' : 'justify-between'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom Area: Account & Credits */}
        {!isCollapsed && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
            {/* Account Card */}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700/80 transition text-right flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                {currentUser && !currentUser.isAnonymous && currentUser.email ? (
                  (currentUser.displayName?.[0] || currentUser.email?.[0] || 'U').toUpperCase()
                ) : (
                  <UserCircleIcon className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser && !currentUser.isAnonymous ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                    {currentUser && !currentUser.isAnonymous ? 'حساب متصل' : 'دخول بالبريد'}
                  </span>
                </div>
                <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {currentUser && !currentUser.isAnonymous && currentUser.email 
                    ? currentUser.email 
                    : (language === 'ar' ? 'تسجيل الدخول' : 'Connexion')}
                </div>
              </div>
            </button>

            <div className="px-2 text-[10px] text-gray-400 dark:text-gray-500 text-center">
              {t.developer}
            </div>
          </div>
        )}
      </aside>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        currentUser={currentUser}
      />
    </>
  );
};
