import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, ActiveScreen } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { PhysicalTestsScreen } from './screens/PhysicalTestsScreen';
import { AthleticsScreen } from './screens/AthleticsScreen';
import { TeamGamesScreen } from './screens/TeamGamesScreen';
import { GlobalGradesScreen } from './screens/GlobalGradesScreen';
import { TextbookScreen } from './screens/TextbookScreen';
import { TalentScreen } from './screens/TalentScreen';
import { BiometricMeasurementsScreen } from './screens/BiometricMeasurementsScreen';
import { ClassesScreen } from './screens/ClassesScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ChampionshipsScreen } from './screens/ChampionshipsScreen';
import { LanguageProvider, useLanguage } from './utils/i18n';
import { getAllClasses } from './utils/db';
import { syncCloudToLocalDB, syncLocalToCloudDB, listenToCloudClasses, subscribeToAuthChanges } from './utils/firebase';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LoginScreen } from './components/LoginScreen';

const MainLayout: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('classes');
  
  // Persist selectedClass in localStorage so the user's choice is remembered across refreshes and syncs
  const [selectedClass, setSelectedClassState] = useState<string>(() => {
    return localStorage.getItem('eps_selected_class') || '';
  });

  const selectedClassRef = useRef<string>(selectedClass);

  const setSelectedClass = (clsName: string) => {
    setSelectedClassState(clsName);
    selectedClassRef.current = clsName;
    if (clsName) {
      localStorage.setItem('eps_selected_class', clsName);
    }
  };

  useEffect(() => {
    selectedClassRef.current = selectedClass;
    if (selectedClass) {
      localStorage.setItem('eps_selected_class', selectedClass);
    }
  }, [selectedClass]);

  const [groupSize, setGroupSize] = useState<number>(8); // For affinity groups
  const [sessionDate, setSessionDate] = useState<string>(''); // Empty string means "now"
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const { t } = useLanguage();

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('eps_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('eps_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('eps_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    // Helper to ensure current selected class is valid without overwriting if it exists
    const ensureValidClassSelection = async () => {
      try {
        const classes = await getAllClasses();
        if (classes.length === 0) return;

        const currentSelected = selectedClassRef.current;
        const exists = classes.some(c => c.className === currentSelected);

        // Only select default if there is no selected class or the selected class no longer exists
        if (!currentSelected || !exists) {
          setSelectedClass(classes[0].className);
        }
      } catch (err) {
        console.error('Failed to ensure valid class selection:', err);
      }
    };

    // 1. Initial local load
    ensureValidClassSelection();

    // 2. Background sync from cloud to get rosters imported by any teacher
    syncCloudToLocalDB().then(async (res) => {
      if (res.success && res.classCount > 0) {
        await ensureValidClassSelection();
      } else {
        const classes = await getAllClasses();
        if (classes.length > 0) {
          // Push local to cloud if cloud was empty
          syncLocalToCloudDB().catch(() => {});
        }
      }
    }).catch((err) => {
      console.warn('Initial cloud sync notice:', err);
    });

    // 3. Listen for real-time cloud updates from other teachers
    const unsubscribe = listenToCloudClasses(async () => {
      await ensureValidClassSelection();
    });

    const handleOnline = () => {
      syncCloudToLocalDB().then(() => {
        ensureValidClassSelection();
      }).catch(() => {});
    };
    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 font-sans flex flex-row">
      {/* Sidebar Navigation */}
      <Sidebar
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden pb-24 md:pb-0">
        <TopHeader
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        <main className="flex-grow">
          {activeScreen === 'physical-tests' && (
            <PhysicalTestsScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              groupSize={groupSize}
              sessionDate={sessionDate}
            />
          )}

          {activeScreen === 'team-games' && (
            <TeamGamesScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
            />
          )}

          {activeScreen === 'global-grades' && (
            <GlobalGradesScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
            />
          )}

          {activeScreen === 'textbook' && (
            <TextbookScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
            />
          )}

          {activeScreen === 'athletics' && (
            <AthleticsScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
            />
          )}

          {activeScreen === 'talent' && (
            <TalentScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
            />
          )}

          {activeScreen === 'measurements' && (
            <BiometricMeasurementsScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              sessionDate={sessionDate}
            />
          )}

          {activeScreen === 'classes' && (
            <ClassesScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              onNavigateToScreen={setActiveScreen}
            />
          )}

          {activeScreen === 'attendance' && (
            <AttendanceScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              sessionDate={sessionDate}
            />
          )}

          {activeScreen === 'championships' && (
            <ChampionshipsScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
            />
          )}

          {activeScreen === 'settings' && (
            <SettingsScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              groupSize={groupSize}
              setGroupSize={setGroupSize}
              sessionDate={sessionDate}
              setSessionDate={setSessionDate}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          )}
        </main>
      </div>

      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const passkey = localStorage.getItem('eps_passkey_auth');
    return passkey === 'Hamani2026';
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      const passkey = localStorage.getItem('eps_passkey_auth');
      if (passkey === 'Hamani2026') {
        setIsAuthenticated(true);
      } else if (user && !user.isAnonymous && user.email) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
          <span className="text-xs font-black text-gray-500 dark:text-gray-400">جاري تحميل المنصة...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LanguageProvider>
        <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <MainLayout />
    </LanguageProvider>
  );
};

export default App;
