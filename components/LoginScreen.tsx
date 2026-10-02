import React, { useState } from 'react';
import { signInWithGoogle } from '../utils/firebase';
import { useLanguage } from '../utils/i18n';
import { SparklesIcon } from './Icons';

interface LoginScreenProps {
  onLoginSuccess: (method: 'passkey' | 'google', email?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'passkey' | 'google'>('passkey');
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasskeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (passkey.trim() === 'Hamani2026') {
      if (rememberMe) {
        localStorage.setItem('eps_passkey_auth', 'Hamani2026');
      }
      onLoginSuccess('passkey');
    } else {
      setErrorMsg(
        language === 'ar' 
          ? '❌ القن السري غير صحيح، يرجى المحاولة مرة أخرى.' 
          : '❌ Passkey incorrect. Veuillez réessayer.'
      );
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.success && res.user) {
        onLoginSuccess('google', res.user.email || undefined);
      } else {
        setErrorMsg(
          language === 'ar'
            ? `❌ فشل تسجيل الدخول: ${res.error || 'تعذر الاتصال بـ Google'}`
            : `❌ Login failed: ${res.error || 'Could not connect to Google'}`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 to-indigo-100/40 dark:from-gray-950 dark:to-slate-900/80 p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl p-6 sm:p-8 space-y-6 transition-colors">
        
        {/* Logo and Titles */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 font-black text-xl tracking-wider mb-2 animate-bounce">
            EPS PORTAL
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center justify-center gap-1.5">
            <span>منصة التربية البدنية والرياضية الرقمية</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            لوحة التحكم الذكية لإدارة الروائز، الحضور والبطولات المدرسية
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('passkey');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'passkey'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            🔑 قن أساتذة المادة
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('google');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'google'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-950 dark:hover:text-white'
            }`}
          >
            🌐 عموم الأساتذة (Gmail)
          </button>
        </div>

        {/* Dynamic Forms / Tabs */}
        {activeTab === 'passkey' ? (
          <form onSubmit={handlePasskeySubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 dark:text-gray-400 block">
                القن السري الخاص بأساتذة المادة:
              </label>
              <div className="relative">
                <input
                  type={showPasskey ? 'text' : 'password'}
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="أدخل القن السري هنا..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute left-3 top-3 text-xs text-gray-400 hover:text-gray-600 font-bold"
                >
                  {showPasskey ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2">
              <input
                id="remember_me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded-sm focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="remember_me" className="text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                حفظ القن السري وتسجيل الدخول تلقائياً بالمتصفح
              </label>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200/40 rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg hover:shadow-indigo-600/20 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>دخول آمن للمنصة 🔒</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-center p-4 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/40 rounded-2xl space-y-1.5">
              <div className="inline-flex p-1.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg text-xs">
                <SparklesIcon className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">حساب شخصي ومستقل بالكامل للعموم</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-semibold">
                إذا كنت أستاذاً زائراً أو ترغب بالعمل بشكل مستقل تماماً، يمكنك الدخول بـ Gmail ليقوم التطبيق بإنشاء بيئة عمل سحابية خاصة بك لحفظ بياناتك.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200/40 rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 border border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.281 1.69 15.483 1 12.24 1 6.21 1 1.31 5.925 1.31 12s4.9 11 10.93 11c6.3 0 10.43-4.407 10.43-10.612 0-.712-.075-1.267-.168-1.688H12.24z"
                />
              </svg>
              <span>{loading ? 'جاري الاتصال بـ Google...' : 'تسجيل الدخول باستخدام Google / Gmail'}</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center font-bold">
          © الجمعية الرياضية المدرسية • كافة الحقوق محفوظة
        </div>

      </div>
    </div>
  );
};
