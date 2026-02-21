import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { CATEGORY_ICONS, formatPrice } from '@/lib/constants';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ListingNotification {
  id: string;
  title_original: string;
  category: string;
  price: number;
  currency: string;
  location_area: string;
}

export default function NewListingNotification() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<ListingNotification[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel('new-listings-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listings',
          filter: 'status=eq.active',
        },
        (payload) => {
          const listing = payload.new as ListingNotification;
          setNotifications((prev) => [...prev, listing]);

          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== listing.id));
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: -100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={() => {
              navigate(`/listing/${notif.id}`);
              dismiss(notif.id);
            }}
            className="bg-card border border-border rounded-lg shadow-lg p-3 cursor-pointer hover:shadow-xl transition-shadow flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary mb-0.5">
                {t('notifications.newListing')}
              </p>
              <p className="text-sm font-medium text-foreground truncate">
                {CATEGORY_ICONS[notif.category]} {notif.title_original}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(notif.price, notif.currency)} · {t(`locations.${notif.location_area}`)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss(notif.id);
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
