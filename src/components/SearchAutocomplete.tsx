import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const RECENT_KEY = 'rebali_recent_searches';
const MAX_RECENT = 6;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentSearch(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const existing = getRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function removeRecentSearch(term: string) {
  const updated = getRecentSearches().filter((s) => s !== term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (title: string) => void;
  placeholder?: string;
  className?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: SearchAutocompleteProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedValue = useDebounce(value, 250);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Fetch trending searches
  const { data: trendingSearches } = useQuery({
    queryKey: ['trending-searches'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_trending_searches', { max_results: 6 });
      return (data as { term: string; search_count: number }[]) || [];
    },
    staleTime: 5 * 60_000, // 5 min cache
  });

  const { data: suggestions, isFetching } = useQuery({
    queryKey: ['search-suggestions', debouncedValue],
    queryFn: async () => {
      if (!debouncedValue || debouncedValue.length < 2) return [];
      const { data } = await supabase.rpc('search_suggestions', {
        search_term: debouncedValue,
        max_results: 8,
      });
      return (data as { title: string; listing_id: string; category: string }[]) || [];
    },
    staleTime: 30_000,
    enabled: debouncedValue.length >= 2,
  });

  // Log search to DB (fire-and-forget, debounced)
  const loggedRef = useRef<string>('');
  useEffect(() => {
    if (debouncedValue.length >= 2 && debouncedValue !== loggedRef.current) {
      loggedRef.current = debouncedValue;
      supabase.from('search_logs').insert({ term: debouncedValue }).then(() => {});
    }
  }, [debouncedValue]);

  const hasSuggestions = suggestions && suggestions.length > 0 && debouncedValue.length >= 2;
  const showRecent = !value && recentSearches.length > 0;
  const hasTrending = !value && !showRecent && trendingSearches && trendingSearches.length > 0;
  const showTrendingWithRecent = !value && showRecent && trendingSearches && trendingSearches.length > 0;
  const shouldOpen = hasSuggestions || showRecent || hasTrending;

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Open/close dropdown based on content
  useEffect(() => {
    if (hasSuggestions) {
      setOpen(true);
      setActiveIndex(-1);
    } else if (!showRecent) {
      setOpen(false);
    }
  }, [hasSuggestions, showRecent]);

  const handleSelect = useCallback(
    (title: string) => {
      addRecentSearch(title);
      setRecentSearches(getRecentSearches());
      onChange(title);
      onSelect?.(title);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange, onSelect],
  );

  const handleRemoveRecent = useCallback((term: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeRecentSearch(term);
    setRecentSearches(getRecentSearches());
  }, []);

  const handleClearAll = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
    setOpen(false);
  }, []);

  // Compute all items for keyboard nav
  const trendingItems = (hasTrending ? trendingSearches!.map((t) => t.term) : showTrendingWithRecent ? trendingSearches!.map((t) => t.term) : []);
  const allItems = hasSuggestions
    ? suggestions!.map((s) => s.title)
    : showRecent
      ? [...recentSearches, ...trendingItems]
      : hasTrending
        ? trendingItems
        : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || allItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(allItems[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-semibold text-primary">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className={cn('relative flex-1', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <Input
        ref={inputRef}
        placeholder={placeholder || t('home.searchPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (shouldOpen) {
            setOpen(true);
            setActiveIndex(-1);
          }
        }}
        onKeyDown={handleKeyDown}
        className="pl-9 pr-8"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {isFetching && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {!isFetching && value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            setOpen(false);
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && (
        <ul
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
          role="listbox"
        >
          {/* Recent searches (shown when input is empty) */}
          {showRecent && !hasSuggestions && (
            <>
              <li className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">
                  {t('search.recentSearches') || 'Recent searches'}
                </span>
                <button
                  type="button"
                  onMouseDown={handleClearAll}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  {t('search.clearAll') || 'Clear all'}
                </button>
              </li>
              {recentSearches.map((term, i) => (
                <li
                  key={term}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer transition-colors group',
                    i === activeIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50',
                  )}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(term);
                  }}
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{term}</span>
                  <button
                    type="button"
                    onMouseDown={(e) => handleRemoveRecent(term, e)}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </>
          )}

          {/* Trending searches (shown when input is empty) */}
          {!hasSuggestions && !value && trendingSearches && trendingSearches.length > 0 && (
            <>
              <li className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  {t('search.trending') || 'Trending'}
                </span>
              </li>
              {trendingSearches.map((item, i) => {
                const itemIndex = showRecent ? recentSearches.length + i : i;
                return (
                  <li
                    key={`trending-${item.term}`}
                    role="option"
                    aria-selected={itemIndex === activeIndex}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer transition-colors',
                      itemIndex === activeIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50',
                    )}
                    onMouseEnter={() => setActiveIndex(itemIndex)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item.term);
                    }}
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                    <span className="truncate capitalize">{item.term}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {item.search_count}×
                    </span>
                  </li>
                );
              })}
            </>
          )}

          {/* Suggestions from API */}
          {hasSuggestions &&
            suggestions!.map((s, i) => (
              <li
                key={s.listing_id}
                role="option"
                aria-selected={i === activeIndex}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer transition-colors',
                  i === activeIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s.title);
                }}
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{highlightMatch(s.title, value)}</span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {t(`categories.${s.category}`)}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
