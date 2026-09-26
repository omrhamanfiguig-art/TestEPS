import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { 
    InformationCircleIcon, 
    Cog6ToothIcon, 
    GlobeAltIcon, 
    CheckIcon,
    DevicePhoneMobileIcon,
    ShareIcon,
    WifiIcon,
    SparklesIcon,
    CheckCircleIcon,
    UserCircleIcon,
    CloudIcon,
    ArrowPathIcon
} from '../components/Icons';
import { useLanguage, Language } from '../utils/i18n';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { auth, subscribeToAuthChanges, syncAllData } from '../utils/firebase';
import { AuthModal } from '../components/AuthModal';

interface SettingsScreenProps {
  selectedClass?: string;
  setSelectedClass?: (val: string) => void;
  groupSize?: number;
  setGroupSize?: (val: number) => void;
  sessionDate?: string;
  setSessionDate?: (val: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const { language, setLanguage, t } = useLanguage();
  const { isStandalone, isIOS } = usePWAInstall();
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuthChanges((u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncAllData();
      setSyncStatus(res.message);
      setTimeout(() => setSyncStatus(null), 5000);
    } catch (e: any) {
      setSyncStatus(e.message || 'فشلت المزامنة');
    } finally {
      setIsSyncing(false);
    }
  };

  const isRealUser = currentUser && !currentUser.isAnonymous && currentUser.email;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 pb-4 flex items-center gap-3">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <Cog6ToothIcon />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t.settingsTitle}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{t.settingsSubtitle}</p>
        </div>
      </header>

      {/* Language Section */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3">
          <GlobeAltIcon />
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t.languageSelect}</h2>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          اختر لغة واجهة التطبيق والتقارير. سيتم تغيير اتجاه الصفحة (RTL / LTR) تلقائياً.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Arabic Option */}
          <button
            type="button"
            onClick={() => handleLanguageChange('ar')}
            className={`p-4 rounded-xl border-2 text-right transition-all flex items-center justify-between ${
              language === 'ar'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div>
              <div className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <span>العربية</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  RTL
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                الواجهة باللغة العربية مع محاذاة من اليمين إلى اليسار
              </p>
            </div>
            {language === 'ar' && (
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                <CheckIcon />
              </div>
            )}
          </button>

          {/* French Option */}
          <button
            type="button"
            onClick={() => handleLanguageChange('fr')}
            className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
              language === 'fr'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-sm'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div>
              <div className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <span>Français</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  LTR
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Interface en Français avec alignement de gauche à droite
              </p>
            </div>
            {language === 'fr' && (
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                <CheckIcon />
              </div>
            )}
          </button>
        </div>
      </section>

      {/* Teacher Account & Email Sync Section */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4 border border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <UserCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {language === 'ar' ? 'حساب الأستاذ وحفظ البيانات بالبريد الإلكتروني' : 'Compte enseignant & Sauvegarde par e-mail'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'ar' ? 'ربط لوائح الأقسام ونتائج الاختبارات بحسابك السحابي' : 'Liez vos classes et vos résultats à votre compte Cloud'}
              </p>
            </div>
          </div>

          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            isRealUser 
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
              : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700'
          }`}>
            {isRealUser ? (language === 'ar' ? 'متصل بالبريد' : 'Connecté') : (language === 'ar' ? 'وضع الضيف / غير مسجل' : 'Mode Invité')}
          </span>
        </div>

        {syncStatus && (
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            {syncStatus}
          </div>
        )}

        {isRealUser ? (
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-850 border border-gray-200/80 dark:border-gray-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                {(currentUser.displayName?.[0] || currentUser.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-gray-900 dark:text-white truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </div>
                <div className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                  {currentUser.email}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  ✓ {language === 'ar' ? 'يتم حفظ كافة البيانات تلقائياً تحت هذا الحساب السحابي' : 'Données synchronisées sous ce compte'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-xs font-bold transition flex items-center gap-1.5"
                title="مزامنة وتحيين كافة البيانات مع السحابة"
              >
                <div className={isSyncing ? 'animate-spin' : ''}>
                  <ArrowPathIcon />
                </div>
                <span>{language === 'ar' ? 'مزامنة الآن' : 'Synchroniser'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
              >
                {language === 'ar' ? 'إدارة الحساب' : 'Gérer le compte'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-black text-amber-900 dark:text-amber-200">
                {language === 'ar' ? 'أنت تستخدم التطبيق في الوضع المحلي كضيف' : 'Vous utilisez l’application en mode invité'}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-xl">
                {language === 'ar'
                  ? 'سجل الدخول ببريدك الإلكتروني (أو حساب Google) لحفظ لوائح الأقسام، القياسات، ونتائج VMA بشكل دائم، ومشاركتها عبر جميع هواتفك وحواسيبك.'
                  : 'Connectez-vous avec votre e-mail pour sauvegarder vos données dans le Cloud et y accéder depuis tous vos appareils.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 shrink-0"
            >
              <UserCircleIcon className="w-4 h-4" />
              <span>{language === 'ar' ? 'تسجيل الدخول بالبريد' : 'Se connecter'}</span>
            </button>
          </div>
        )}
      </section>

      {/* PWA Phone Installation Section */}
      <section className="bg-gradient-to-tr from-white to-indigo-50/40 dark:from-gray-800 dark:to-indigo-950/20 rounded-2xl shadow-lg p-6 space-y-6 border border-indigo-100 dark:border-indigo-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <DevicePhoneMobileIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t.pwaInstall}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                تثبيت التطبيق على الهواتف الذكية (Android / iPhone) للعمل دون اتصال بالإنترنت
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isStandalone 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
            }`}>
              {isStandalone ? t.pwaInstalledBadge : t.pwaBrowserBadge}
            </span>
            <PWAInstallButton variant="settings" />
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {t.pwaInstallDesc}
        </p>

        {/* 2-Column Installation Guides */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Android Guide */}
          <div className="p-4 rounded-xl bg-white dark:bg-gray-900/70 border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-2">
            <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <DevicePhoneMobileIcon className="w-4 h-4 text-emerald-600" />
              <span>{t.pwaAndroidTitle}</span>
            </div>
            <ol className="text-xs text-gray-600 dark:text-gray-300 space-y-2 list-decimal ps-4 leading-relaxed">
              <li>{t.pwaAndroidStep1}</li>
              <li>{t.pwaAndroidStep2}</li>
            </ol>
          </div>

          {/* iOS Safari Guide */}
          <div className="p-4 rounded-xl bg-white dark:bg-gray-900/70 border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-2">
            <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShareIcon className="w-4 h-4 text-indigo-600" />
                <span>{t.pwaIosTitle}</span>
              </div>
              {isIOS && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold">
                  iOS Safari
                </span>
              )}
            </div>
            <ol className="text-xs text-gray-600 dark:text-gray-300 space-y-2 list-decimal ps-4 leading-relaxed">
              <li>{t.pwaIosStep1}</li>
              <li>{t.pwaIosStep2}</li>
              <li>{t.pwaIosStep3}</li>
            </ol>
          </div>
        </div>

        {/* Advantage Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
              <WifiIcon className="w-3.5 h-3.5" />
              <span>{t.pwaFeatureOffline}</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {t.pwaFeatureOfflineDesc}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>{t.pwaFeatureFast}</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {t.pwaFeatureFastDesc}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
              <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
              <span>{t.pwaFeatureStandalone}</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {t.pwaFeatureStandaloneDesc}
            </p>
          </div>
        </div>
      </section>

      {/* About App & Credits */}
      <section className="bg-indigo-50/70 dark:bg-gray-800/80 rounded-2xl shadow-md p-6 border border-indigo-100 dark:border-gray-700 space-y-5">
        <div className="flex items-start gap-4">
          <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 flex-shrink-0">
            <InformationCircleIcon />
          </div>
          <div className="space-y-4 flex-grow">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{t.aboutApp}</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {t.aboutAppDesc}
              </p>
            </div>

            {/* Developer Credits Card */}
            <div className="bg-white dark:bg-gray-900/90 rounded-2xl p-5 border border-indigo-100 dark:border-gray-700/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                  {t.devTitle}
                </div>
                <span className="px-2.5 py-0.5 text-[11px] font-black rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                  {t.directorate}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80">
                  <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">الأستاذ:</div>
                  <div className="font-black text-base text-gray-900 dark:text-white">{t.dev1Name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">أستاذ مادة التربية البدنية والرياضية</div>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80">
                  <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">المفتش:</div>
                  <div className="font-black text-base text-gray-900 dark:text-white">{t.dev2Name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">مفتش التربية البدنية والرياضية</div>
                </div>
              </div>
              <div className="pt-2 text-xs font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-950/30 p-2.5 rounded-xl">
                <span>💡</span>
                <span>{t.devMission}</span>
              </div>
              <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800">
                <span>{t.directorate}</span>
                <span>{t.allRightsReserved}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teacher Authentication Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        currentUser={currentUser}
      />
    </div>
  );
};
