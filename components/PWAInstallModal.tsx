import React, { useState } from 'react';
import { 
  XMarkIcon, 
  DevicePhoneMobileIcon, 
  ShareIcon, 
  CheckCircleIcon, 
  WifiIcon, 
  SparklesIcon,
  ArrowDownTrayIcon
} from './Icons';
import { useLanguage } from '../utils/i18n';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { t, language, isRtl } = useLanguage();
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    const success = await install();
    setIsInstalling(false);
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with App Brand Banner */}
        <div className="bg-gradient-to-tr from-indigo-700 via-indigo-600 to-violet-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 end-4 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition"
            aria-label={t.pwaClose}
          >
            <XMarkIcon />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-indigo-700 flex items-center justify-center shadow-lg font-black text-xl flex-shrink-0">
              <img 
                src="/pwa-192x192.png" 
                alt="Logo EPS" 
                className="w-12 h-12 rounded-xl object-contain"
                onError={(e) => {
                  // Fallback to text if image not loaded yet
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="sr-only">EPS</span>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-xs mb-1">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{isStandalone ? t.pwaInstalledBadge : t.pwaInstallOnPhone}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {t.pwaInstallTitle}
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Message if already installed or success */}
          {(isStandalone || isInstalled || installSuccess) ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 text-emerald-800 dark:text-emerald-200">
              <CheckCircleIcon className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">{t.pwaInstalledSuccess}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  {language === 'ar' 
                    ? 'يمكنك دائماً فتح التطبيق من أيقونة الشاشة الرئيسية لهاتفك واستخدامه بدون إنترنت.'
                    : 'Vous pouvez toujours lancer l\'application depuis votre écran d\'accueil et l\'utiliser hors-ligne.'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {t.pwaInstallDesc}
            </p>
          )}

          {/* Action Button for Android / Chrome or Promptable browsers */}
          {isInstallable && !isStandalone && !installSuccess && (
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-sm text-gray-900 dark:text-white">
                  {language === 'ar' ? 'جاهز للتثبيت المباشر' : 'Prêt pour l\'installation directe'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {language === 'ar' ? 'بنقرة واحدة سيتم تثبيت التطبيق على جهازك' : 'En un clic, l\'application sera installée sur votre appareil'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-60"
              >
                <ArrowDownTrayIcon />
                <span>{isInstalling ? (language === 'ar' ? 'جاري التثبيت...' : 'Installation...') : t.pwaInstallNow}</span>
              </button>
            </div>
          )}

          {/* Detailed Instructions per Platform */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Android / Chrome Guide */}
            <div className={`p-4 rounded-2xl border ${!isIOS ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20' : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30'}`}>
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-white mb-3">
                <DevicePhoneMobileIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{t.pwaAndroidTitle}</span>
              </div>

              <ol className="text-xs text-gray-600 dark:text-gray-300 space-y-2.5 list-decimal ps-4 leading-relaxed">
                <li>{t.pwaAndroidStep1}</li>
                <li>{t.pwaAndroidStep2}</li>
              </ol>

              <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Chrome, Samsung Internet, Edge, Firefox</span>
              </div>
            </div>

            {/* iOS Safari Guide */}
            <div className={`p-4 rounded-2xl border ${isIOS ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20' : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30'}`}>
              <div className="flex items-center justify-between gap-2 font-bold text-sm text-gray-900 dark:text-white mb-3">
                <div className="flex items-center gap-2">
                  <ShareIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t.pwaIosTitle}</span>
                </div>
                {isIOS && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold">
                    جهازك الحالي
                  </span>
                )}
              </div>

              <ol className="text-xs text-gray-600 dark:text-gray-300 space-y-2.5 list-decimal ps-4 leading-relaxed">
                <li>{t.pwaIosStep1}</li>
                <li>
                  <span className="inline-flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-100">
                    <ShareIcon className="w-3.5 h-3.5 inline text-indigo-600" /> {t.pwaIosStep2}
                  </span>
                </li>
                <li>{t.pwaIosStep3}</li>
              </ol>

              <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Safari (iOS 11.3+)</span>
              </div>
            </div>
          </div>

          {/* Key Advantages of PWA */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-amber-500" />
              <span>{t.pwaFeaturesTitle}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  <WifiIcon className="w-3.5 h-3.5" />
                  <span>{t.pwaFeatureOffline}</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                  {t.pwaFeatureOfflineDesc}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>{t.pwaFeatureFast}</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                  {t.pwaFeatureFastDesc}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
                  <span>{t.pwaFeatureStandalone}</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                  {t.pwaFeatureStandaloneDesc}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isStandalone ? t.pwaInstalledBadge : t.pwaBrowserBadge}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold text-xs transition"
          >
            {t.pwaClose}
          </button>
        </div>
      </div>
    </div>
  );
};
