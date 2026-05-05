import React, { useState } from 'react';
import { Globe, Check, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../contexts/I18nContext';

export default function LanguageSelector() {
  const { language, setLanguage, currency, setCurrency, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
  ];

  const currencies = [
    { code: 'USD', symbol: '$' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'JPY', symbol: '¥' },
    { code: 'CNY', symbol: '¥' },
    { code: 'BRL', symbol: 'R$' },
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/5"
      >
        <Globe className="w-4 h-4 text-white" />
        <span className="text-xs font-bold uppercase text-white">{language} / {currency}</span>
        <ChevronDown className="w-3 h-3 text-white/50" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  {t('language')} & {t('currency')}
                </h2>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Language Grid */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t('language')}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code as any)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${language === lang.code ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{lang.flag}</span>
                          <span className="text-sm font-medium">{lang.name}</span>
                        </div>
                        {language === lang.code && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Currency Grid */}
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{t('currency')}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {currencies.map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => setCurrency(curr.code as any)}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${currency === curr.code ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'}`}
                      >
                        <span className="text-sm font-bold">{curr.code}</span>
                        <span className="text-xs opacity-70">({curr.symbol})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-all"
                >
                  {t('save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
