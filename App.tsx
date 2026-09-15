import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveScreen } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { PhysicalTestsScreen } from './screens/PhysicalTestsScreen';
import { BiometricMeasurementsScreen } from './screens/BiometricMeasurementsScreen';
import { ClassesScreen } from './screens/ClassesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { LanguageProvider, useLanguage } from './utils/i18n';
import { getAllClasses } from './utils/db';
import { OfflineIndicator } from './components/OfflineIndicator';

const MainLayout: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('classes');
  const [selectedClass, setSelectedClass] = useState<string>('Classe 1');
  const [groupSize, setGroupSize] = useState<number>(8); // For affinity groups
  const [sessionDate, setSessionDate] = useState<string>(''); // Empty string means "now"
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const { t } = useLanguage();

  useEffect(() => {
    const initClass = async () => {
      try {
        const classes = await getAllClasses();
        if (classes.length > 0 && selectedClass === 'Classe 1') {
          setSelectedClass(classes[0].className);
        }
      } catch (err) {
        console.error('Failed to init class', err);
      }
    };
    initClass();
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
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <TopHeader
          activeScreen={activeScreen}
          setActiveScreen={setActiveScreen}
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
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

          {activeScreen === 'settings' && (
            <SettingsScreen
              selectedClass={selectedClass}
              setSelectedClass={setSelectedClass}
              groupSize={groupSize}
              setGroupSize={setGroupSize}
              sessionDate={sessionDate}
              setSessionDate={setSessionDate}
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
  return (
    <LanguageProvider>
      <MainLayout />
    </LanguageProvider>
  );
};

export default App;
