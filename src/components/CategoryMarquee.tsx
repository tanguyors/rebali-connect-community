import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { CATEGORIES, CATEGORY_ICONS } from '@/lib/constants';
import { useRef, useEffect, useState } from 'react';

export default function CategoryMarquee() {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animId: number;
    let speed = 0.5;

    const step = () => {
      if (!paused && el) {
        el.scrollLeft += speed;
        // Loop: when we've scrolled past the first set, reset
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [paused]);

  // Duplicate items for seamless loop
  const items = [...CATEGORIES, ...CATEGORIES];

  return (
    <section className="border-b border-border/50 bg-card overflow-hidden">
      <div
        ref={scrollRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="flex overflow-x-hidden scrollbar-hide"
        style={{ scrollBehavior: 'auto' }}
      >
        {items.map((cat, i) => (
          <Link
            key={`${cat}-${i}`}
            to={`/browse?category=${cat}`}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors whitespace-nowrap border-b-2 border-transparent hover:border-primary shrink-0"
          >
            <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
            <span>{t(`categories.${cat}`)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
