import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedValue = useDebounce(value, 250);

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

  // Open dropdown when suggestions arrive
  useEffect(() => {
    if (suggestions && suggestions.length > 0 && debouncedValue.length >= 2) {
      setOpen(true);
      setActiveIndex(-1);
    } else {
      setOpen(false);
    }
  }, [suggestions, debouncedValue]);

  const handleSelect = useCallback(
    (title: string) => {
      onChange(title);
      onSelect?.(title);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange, onSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !suggestions?.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex].title);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
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
          if (suggestions && suggestions.length > 0 && value.length >= 2) setOpen(true);
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

      {open && suggestions && suggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
          role="listbox"
        >
          {suggestions.map((s, i) => (
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
                e.preventDefault(); // prevent blur before click
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
