import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Lock, Loader2, AlertCircle, Mail, Phone } from 'lucide-react';
import { UserProfile } from '../types';
import { apiFetch } from '../utils/api';
import WelcomeView from './WelcomeView';
import { useToast } from './Toast';
import { useI18n } from '../contexts/I18nContext';

interface AuthViewProps {
  onAuthSuccess: (user: UserProfile) => void;
  key?: React.Key;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const data = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password.trim(),
          email: email.trim(),
          phone: phone.trim()
        }),
      });

      showToast(isLogin ? t('successfullySignedIn') : t('successfullySignedUp'), 'success');
      onAuthSuccess(data);
    } catch (err: any) {
      setError(err.message);
      showToast(err.message || t('authenticationFailed'), 'error');
      if (isLogin && err.message.toLowerCase().includes('not found')) {
        // If user not found during login, suggest signing up
        const shouldSignUp = window.confirm(`${err.message}\n\n${t('userNotFoundPrompt')}`);
        if (shouldSignUp) {
          setIsLogin(false);
          setError(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showWelcome) {
    return <WelcomeView onContinue={() => setShowWelcome(false)} />;
  }

  return (
    <div className="h-full flex items-center justify-center p-6 bg-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">{isLogin ? t('welcomeBack') : t('joinQuickee')}</h2>
          <p className="text-gray-400 text-sm">
            {isLogin ? t('signInToShare') : t('createAccountToStart')}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">{t('username')}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                placeholder={t('enterUsername')}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">{t('password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">{t('emailRecovery')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                    placeholder="your@email.com"
                    required={!isLogin}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">{t('phoneRecovery')}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {isLogin ? t('signingIn') : t('creatingAccount')}
              </>
            ) : (
              isLogin ? t('signIn') : t('signUp')
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isLogin ? t('dontHaveAccount') : t('alreadyHaveAccount')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
