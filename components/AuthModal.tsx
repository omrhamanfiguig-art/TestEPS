import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { 
  signInWithEmail, 
  registerWithEmail, 
  signInWithGoogle, 
  signOutTeacher 
} from '../utils/firebase';
import { useLanguage } from '../utils/i18n';
import { XMarkIcon, UserCircleIcon, CheckCircleIcon } from './Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess
}) => {
  const { language } = useLanguage();
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const isRealUser = currentUser && !currentUser.isAnonymous && currentUser.email;
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomain = errorMsg && (errorMsg.includes('unauthorized-domain') || errorMsg.includes('غير مصرح به'));

  const handleCopyDomain = () => {
    if (navigator?.clipboard && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await signInWithEmail(email, password);
      if (res.success && res.user) {
        setSuccessMsg(language === 'ar' ? 'تم تسجيل الدخول بنجاح! يتم الآن مزامنة بياناتك.' : 'Connexion réussie ! Vos données sont synchronisées.');
        if (onAuthSuccess) onAuthSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || (language === 'ar' ? 'تعذر تسجيل الدخول.' : 'Erreur de connexion.'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'ar' ? 'حدث خطأ غير متوقع.' : 'Une erreur est survenue.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await registerWithEmail(email, password, displayName);
      if (res.success && res.user) {
        setSuccessMsg(language === 'ar' ? 'تم إنشاء الحساب بنجاح! يتم الآن ربط وحفظ بياناتك بهذا الحساب.' : 'Compte créé avec succès ! Vos données sont liées à ce compte.');
        if (onAuthSuccess) onAuthSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || (language === 'ar' ? 'تعذر إنشاء الحساب.' : 'Erreur de création de compte.'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'ar' ? 'حدث خطأ غير متوقع.' : 'Une erreur est survenue.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await signInWithGoogle();
      if (res.success && res.user) {
        setSuccessMsg(language === 'ar' ? 'تم تسجيل الدخول بحساب Google بنجاح!' : 'Connexion Google réussie !');
        if (onAuthSuccess) onAuthSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || (language === 'ar' ? 'تعذر تسجيل الدخول عبر Google.' : 'Erreur Google.'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutTeacher();
      setSuccessMsg(language === 'ar' ? 'تم تسجيل الخروج بنجاح.' : 'Déconnexion réussie.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر تسجيل الخروج.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between bg-gray-50/70 dark:bg-gray-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <UserCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                {language === 'ar' ? 'حساب الأستاذ والمزامنة السحابية' : 'Compte enseignant & Cloud'}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {language === 'ar' ? 'حفظ وتأمين بياناتك تحت بريدك الإلكتروني' : 'Sauvegardez vos données sous votre adresse e-mail'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Notifications */}
          {errorMsg && (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 leading-relaxed">
                {errorMsg}
              </div>

              {isUnauthorizedDomain && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[11px] text-amber-800 dark:text-amber-300">
                      {language === 'ar' ? '📌 النطاق الحالي المطلوب ترخيصه:' : '📌 Domaine à autoriser :'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="px-2.5 py-1 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 text-[11px] font-bold text-amber-950 dark:text-amber-100 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedDomain ? (language === 'ar' ? '✓ تم النسخ' : '✓ Copié') : (language === 'ar' ? 'نسخ النطاق' : 'Copier')}
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-white/80 dark:bg-black/30 border border-amber-200/60 dark:border-amber-800/40 font-mono text-[11px] text-center select-all break-all text-gray-850 dark:text-gray-200">
                    {currentHostname}
                  </div>

                  <div className="text-[11px] leading-relaxed space-y-1 text-amber-950 dark:text-amber-200">
                    <p className="font-bold">
                      {language === 'ar' ? 'طريقة الترخيص في Firebase Console في دقيقة:' : 'Comment autoriser ce domaine dans Firebase :'}
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5 text-[10.5px]">
                      <li>
                        {language === 'ar' ? 'افتح لوحة تحكم ' : 'Ouvrez '}
                        <a 
                          href="https://console.firebase.google.com/project/clear-scheduler-bxctm/authentication/settings" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-bold text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800"
                        >
                          Firebase Console &gt; Authentication &gt; Settings
                        </a>
                      </li>
                      <li>{language === 'ar' ? 'انزل لقسم "Authorized domains" (النطاقات المصرح بها).' : 'Descendez à la section "Authorized domains".'}</li>
                      <li>{language === 'ar' ? 'انقر على "Add domain" وألصق النطاق المنسوخ أعلاه ثم اضغط حفظ (Save).' : 'Cliquez sur "Add domain", collez le domaine copié et enregistrez.'}</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Already logged in view */}
          {isRealUser ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-indigo-600/20">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="" 
                      className="w-full h-full rounded-2xl object-cover" 
                    />
                  ) : (
                    (currentUser.displayName?.[0] || currentUser.email?.[0] || 'U').toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {language === 'ar' ? 'متصل حالياً' : 'Connecté'}
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-white truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300 space-y-1 leading-relaxed">
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {language === 'ar' ? '💡 ربط البيانات السحابي نشط:' : '💡 Synchronisation active :'}
                </p>
                <p>
                  {language === 'ar'
                    ? 'كافة لوائح الأقسام، القياسات، والاختبارات تُحفظ وتُنسب إلى هذا البريد الإلكتروني. عند فتح التطبيق على أي هاتف أو حاسوب آخر وتسجيل الدخول بهذا البريد، ستجد بياناتك كاملة فوراً.'
                    : 'Toutes vos classes et résultats sont rattachés à cette adresse e-mail.'}
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  {loading && <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />}
                  <span>{language === 'ar' ? 'تسجيل الخروج من هذا الحساب' : 'Se déconnecter'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs: Sign in vs Register */}
              <div className="flex rounded-xl bg-gray-100 dark:bg-gray-700/60 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTab('signin')}
                  className={`flex-1 py-2 rounded-lg transition ${
                    tab === 'signin'
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  {language === 'ar' ? 'تسجيل الدخول' : 'Connexion'}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className={`flex-1 py-2 rounded-lg transition ${
                    tab === 'register'
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                  }`}
                >
                  {language === 'ar' ? 'إنشاء حساب جديد' : 'Créer un compte'}
                </button>
              </div>

              {/* Form */}
              <form onSubmit={tab === 'signin' ? handleSignIn : handleRegister} className="space-y-3 pt-1">
                {tab === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      {language === 'ar' ? 'الاسم الكامل أو اسم الأستاذ' : 'Nom complet'}
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={language === 'ar' ? 'أستاذ(ة) فلان' : 'Professeur...'}
                      className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Adresse e-mail'} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@gmail.com"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 text-left font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    {language === 'ar' ? 'كلمة المرور' : 'Mot de passe'} *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full px-3.5 py-2.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 text-left font-mono"
                  />
                  {tab === 'register' && (
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      {language === 'ar' ? '6 أحرف أو أرقام على الأقل' : '6 caractères minimum'}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>
                    {tab === 'signin'
                      ? (language === 'ar' ? 'تسجيل الدخول ومزامنة البيانات' : 'Se connecter')
                      : (language === 'ar' ? 'إنشاء الحساب وبدء الحفظ' : 'Créer le compte')}
                  </span>
                </button>
              </form>

              {/* Or Google Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                <span className="flex-shrink mx-3 text-[11px] text-gray-400 font-bold">
                  {language === 'ar' ? 'أو عبر Google' : 'Ou avec Google'}
                </span>
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 text-xs font-bold transition flex items-center justify-center gap-2.5 shadow-2xs disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{language === 'ar' ? 'متابعة بحساب Google' : 'Continuer avec Google'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
