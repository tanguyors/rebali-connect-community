import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { CATEGORIES, CATEGORY_ICONS, CATEGORY_TREE } from '@/lib/constants';
import { useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function CategoryMarquee() {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [paused, setPaused] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCatEnter = (cat: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({ left: rect.left, top: rect.bottom });
    setHoveredCat(cat);
    setPaused(true);
  };

  const handleCatLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setHoveredCat(null);
      setPaused(false);
    }, 150);
  };

  const handlePopoverEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  };

  const handlePopoverLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setHoveredCat(null);
      setPaused(false);
    }, 150);
  };

  const subcategories = hoveredCat ? CATEGORY_TREE[hoveredCat] : [];

  const categoriesToRender = isMobile ? CATEGORIES : [...CATEGORIES, ...CATEGORIES];

  return (
    <section className="border-b border-border/50 bg-card overflow-visible relative">
      <div className={isMobile ? 'overflow-x-auto scrollbar-hide' : 'overflow-hidden'}>
        <div
          className={`flex w-max ${isMobile ? '' : `marquee-track ${paused ? 'paused' : ''}`}`}
        >
          {categoriesToRender.map((cat, i) => (
            <Link
              key={`${cat}-${i}`}
              to={`/browse?category=${cat}`}
              onMouseEnter={(e) => handleCatEnter(cat, e)}
              onMouseLeave={handleCatLeave}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors whitespace-nowrap border-b-2 border-transparent hover:border-primary shrink-0"
            >
              <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
              <span>{t(`categories.${cat}`)}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Subcategory popover */}
      {hoveredCat && popoverPos && subcategories.length > 0 && (
        <div
          onMouseEnter={handlePopoverEnter}
          onMouseLeave={handlePopoverLeave}
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[200px] max-w-[320px] animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ left: popoverPos.left, top: popoverPos.top + 4 }}
        >
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            {CATEGORY_ICONS[hoveredCat]} {t(`categories.${hoveredCat}`)}
          </p>
          <div className="flex flex-wrap gap-1">
            {subcategories.map((sub) => (
              <Link
                key={sub}
                to={`/browse?category=${hoveredCat}&subcategory=${sub}`}
                className="block px-2.5 py-1.5 text-sm rounded-md text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {t(`subcategories.${sub}`)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
