import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const HERO_WORDS: Record<string, string[]> = {
  en: ['-Bali', '-Use', '-Sell', '-Home', '-Discover'],
  fr: ['-Bali', '-Utilise', '-Vends', '-Trouve', '-Découvre'],
  id: ['-Bali', '-Pakai', '-Jual', '-Temukan', '-Gunakan'],
  es: ['-Bali', '-Usa', '-Vende', '-Encuentra', '-Descubre'],
  zh: ['-Bali', '-用', '-卖', '-找', '-发现'],
  de: ['-Bali', '-Nutze', '-Verkaufe', '-Finde', '-Entdecke'],
  nl: ['-Bali', '-Gebruik', '-Verkoop', '-Vind', '-Ontdek'],
  ru: ['-Bali', '-Используй', '-Продай', '-Найди', '-Открой'],
};

export default function AnimatedHeroText() {
  const { language } = useLanguage();
  const words = HERO_WORDS[language] || HERO_WORDS.en;
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % words.length);
        setFade(true);
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <h1 className="text-4xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
      <span>Re</span>
      <span
        className={`inline-block text-primary transition-all duration-300 ${
          fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        {words[index]}
      </span>
    </h1>
  );
}
