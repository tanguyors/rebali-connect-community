import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  compact?: boolean;
}

export default function NotificationBell({ compact = false }: NotificationBellProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['search-notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('search_notifications')
        .select('id, read, created_at, listing_id, saved_search_id, saved_searches(keyword), listings(title_original, price)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n: any) => !n.read).map((n: any) => n.id);
    if (unreadIds.length === 0) return;
    for (const id of unreadIds) {
      await supabase.from('search_notifications').update({ read: true }).eq('id', id);
    }
    qc.invalidateQueries({ queryKey: ['search-notifications'] });
  };

  const handleClick = async (notif: any) => {
    if (!notif.read) {
      await supabase.from('search_notifications').update({ read: true }).eq('id', notif.id);
      qc.invalidateQueries({ queryKey: ['search-notifications'] });
    }
    setOpen(false);
    navigate(`/listing/${notif.listing_id}`);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      {compact ? (
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-colors text-muted-foreground"
        >
          <div className="relative">
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Alertes</span>
        </button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="flex-col items-center gap-0.5 h-auto py-1.5 px-3 relative"
          onClick={() => setOpen(!open)}
        >
          <div className="relative">
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Alertes</span>
        </Button>
      )}

      {open && (
        <div className={cn(
          "absolute bg-card border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto",
          compact 
            ? "bottom-full mb-2 right-0 w-[calc(100vw-2rem)] max-w-80" 
            : "top-full mt-1 right-0 w-80"
        )}>
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <div>
              {notifications.map((notif: any) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                    !notif.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notif.read && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {(notif.listings as any)?.title_original || 'Annonce'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Alerte : « {(notif.saved_searches as any)?.keyword} »
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {(notif.listings as any)?.price && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {new Intl.NumberFormat('id-ID').format((notif.listings as any).price)} IDR
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
