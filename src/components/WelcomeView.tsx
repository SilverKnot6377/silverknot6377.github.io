import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Users, Video, Zap } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

interface WelcomeViewProps {
  onContinue: () => void;
}

export default function WelcomeView({ onContinue }: WelcomeViewProps) {
  const { t } = useI18n();
  
  return (
    <div className="h-full flex items-center justify-center p-6 bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-panel p-8 shadow-2xl text-center"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-white/10">
            <TrendingUp className="w-10 h-10 text-black" />
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-4 tracking-tighter">{t('welcomeToQuickee')}</h1>
        
        <p className="text-gray-400 mb-8 leading-relaxed">
          {t('welcomeDesc')}
        </p>

        <div className="grid grid-cols-1 gap-4 mb-8 text-left">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="bg-indigo-500/20 p-2 rounded-lg">
              <Video className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{t('shareYourWork')}</h3>
              <p className="text-xs text-gray-500">{t('shareYourWorkDesc')}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{t('joinTheCommunity')}</h3>
              <p className="text-xs text-gray-500">{t('joinTheCommunityDesc')}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="bg-amber-500/20 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{t('getDiscovered')}</h3>
              <p className="text-xs text-gray-500">{t('getDiscoveredDesc')}</p>
            </div>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all shadow-lg shadow-white/5"
        >
          {t('getStarted')}
        </button>
      </motion.div>
    </div>
  );
}
