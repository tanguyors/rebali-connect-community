import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getTranslation, detectBrowserLanguage, type LanguageCode } from '@/i18n';
import { supabase } from '@/integrations/supabase/client';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const stored = localStorage.getItem('rebali-lang');
    if (stored) return stored as LanguageCode;
    return detectBrowserLanguage();
  });

  const setLanguage = useCallback(async (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('rebali-lang', lang);
    // Sync to profile preferred_lang if logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ preferred_lang: lang }).eq('id', user.id);
    }
  }, []);

  const t = useCallback((key: string) => getTranslation(language, key), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
