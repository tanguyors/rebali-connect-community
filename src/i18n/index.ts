import en from './translations/en.json';
import id from './translations/id.json';
import fr from './translations/fr.json';
import es from './translations/es.json';
import zh from './translations/zh.json';
import de from './translations/de.json';
import nl from './translations/nl.json';
import ru from './translations/ru.json';
import tr from './translations/tr.json';
import ar from './translations/ar.json';
import hi from './translations/hi.json';
import ja from './translations/ja.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const translations: Record<string, any> = { en, id, fr, es, zh, de, nl, ru, tr, ar, hi, ja };

export function getTranslation(lang: string, key: string): string {
  const keys = key.split('.');
  let result: any = translations[lang] || translations.en;
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      // Fallback to English
      let fallback: any = translations.en;
      for (const fk of keys) {
        fallback = fallback?.[fk];
      }
      return fallback || key;
    }
  }
  return result || key;
}

export function detectBrowserLanguage(): LanguageCode {
  const browserLang = navigator.language.split('-')[0];
  const supported = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
  return supported ? supported.code : 'en';
}
