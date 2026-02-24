import { useState } from 'react';
import ListingCardSmall from '@/components/ListingCardSmall';
import { Skeleton } from '@/components/ui/skeleton';

interface ListingMarqueeProps {
  listings: any[];
  isLoading: boolean;
  emptyMessage?: string;
}

export default function ListingMarquee({ listings, isLoading, emptyMessage }: ListingMarqueeProps) {
  const [paused, setPaused] = useState(false);

  if (!isLoading && (!listings || listings.length === 0)) {
    return emptyMessage ? (
      <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
    ) : null;
  }

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[160px] sm:w-[180px] space-y-2">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Duplicate listings for seamless loop
  const items = [...listings, ...listings];

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={`listing-marquee flex gap-3 w-max ${paused ? 'paused' : ''}`}
      >
        {items.map((listing: any, i: number) => (
          <ListingCardSmall key={`${listing.id}-${i}`} listing={listing} />
        ))}
      </div>
    </div>
  );
}
