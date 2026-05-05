import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, AlertCircle, Crown, Home } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useToast } from './Toast';
import { useI18n } from '../contexts/I18nContext';

interface VipSuccessViewProps {
  onNavigateHome: () => void;
}

export default function VipSuccessView({ onNavigateHome }: VipSuccessViewProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState(t('verifyingPayment'));
  const { showToast } = useToast();

  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      if (!sessionId) {
        setStatus('error');
        setMessage(t('invalidSession'));
        return;
      }

      try {
        await apiFetch('/api/vip/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        setStatus('success');
        setMessage(t('vipActivated'));
        showToast(t('welcomeToVip'), 'success');
        
        // Clear the query string to prevent re-verification on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err: any) {
        console.error('Payment verification failed:', err);
        setStatus('error');
        setMessage(err.message || t('failedToVerifyPayment'));
      }
    };

    verifyPayment();
  }, []);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-black">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        {status === 'verifying' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <h2 className="text-xl font-bold text-white">{t('verifyingPayment')}</h2>
            <p className="text-gray-400">{t('pleaseWaitConfirm')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-6">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              type="spring"
              className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30"
            >
              <Crown className="w-12 h-12 text-black fill-black" />
            </motion.div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{t('youAreNowVip')}</h2>
              <p className="text-gray-400">{t('thankYouSupport')}</p>
            </div>

            <button 
              onClick={onNavigateHome}
              className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              {t('returnHome')}
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-white mb-2">{t('somethingWentWrong')}</h2>
              <p className="text-red-400">{message}</p>
            </div>

            <button 
              onClick={onNavigateHome}
              className="w-full bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-all"
            >
              {t('returnHome')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
