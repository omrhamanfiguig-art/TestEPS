import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useLanguage } from '../utils/i18n';
import { WifiIcon, CheckCircleIcon } from './Icons';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t, isRtl } = useLanguage();
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestoredNotice(false);
    } else if (wasOffline) {
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div 
        className={`fixed bottom-4 ${isRtl ? 'start-4' : 'end-4'} z-50 flex items-center gap-2.5 rounded-2xl bg-amber-500/95 dark:bg-amber-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white shadow-xl border border-amber-400/40 animate-bounce-short`}
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
        </span>
        <WifiIcon className="w-4 h-4" />
        <span>{t.offlineBanner}</span>
      </div>
    );
  }

  if (showRestoredNotice) {
    return (
      <div 
        className={`fixed bottom-4 ${isRtl ? 'start-4' : 'end-4'} z-50 flex items-center gap-2.5 rounded-2xl bg-emerald-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white shadow-xl border border-emerald-400/40 animate-fadeIn`}
        role="status"
        aria-live="polite"
      >
        <CheckCircleIcon className="w-4 h-4 text-white" />
        <span>{t.onlineRestoredBanner}</span>
      </div>
    );
  }

  return null;
};
