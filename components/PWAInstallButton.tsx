import React, { useState } from 'react';
import { DevicePhoneMobileIcon, ArrowDownTrayIcon, SparklesIcon } from './Icons';
import { useLanguage } from '../utils/i18n';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'banner' | 'settings';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { t, language } = useLanguage();
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already running in standalone mode (installed), we can show a subtle badge or hide in header
  if (isStandalone && variant === 'header') {
    return null;
  }

  const handleButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If install prompt is ready and we're not iOS, prompt directly or open modal
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        // Fallback to showing modal if dismissed or error
        setIsModalOpen(true);
      }
    } else {
      // Show full guide modal for iOS or manual browsers
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleButtonClick}
          className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition flex items-center gap-1.5 shadow-xs ${className}`}
          title={t.pwaInstallOnPhone}
        >
          <DevicePhoneMobileIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">{t.pwaInstallOnPhone}</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <div className={`p-3 rounded-2xl bg-gradient-to-tr from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-900/50 ${className}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
              <DevicePhoneMobileIcon className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              {t.pwaInstallOnPhone}
            </div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 leading-tight">
            {language === 'ar' ? 'تثبيت سريع للعمل بدون إنترنت في الملعب' : 'Application autonome utilisable hors-ligne'}
          </p>
          <button
            type="button"
            onClick={handleButtonClick}
            className="w-full py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <ArrowDownTrayIcon />
            <span>{isStandalone ? t.pwaInstalledBadge : t.pwaInstallNow}</span>
          </button>
        </div>
      )}

      {variant === 'settings' && (
        <button
          type="button"
          onClick={handleButtonClick}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs ${
            isStandalone
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          } ${className}`}
        >
          <DevicePhoneMobileIcon className="w-4 h-4" />
          <span>{isStandalone ? t.pwaInstalledSuccess : t.pwaInstallNow}</span>
        </button>
      )}

      {/* The Guide Modal */}
      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
