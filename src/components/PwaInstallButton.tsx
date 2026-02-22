import { useState, useEffect, useRef } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'rebali-pwa-dismiss';

export default function PwaInstallButton() {
  const isMobile = useIsMobile();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [isStandalone, setIsStandalone] = useState(false);
  const [animate, setAnimate] = useState(true);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installed = () => setDeferredPrompt(null);
    window.addEventListener('appinstalled', installed);

    const timer = setTimeout(() => setAnimate(false), 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
      clearTimeout(timer);
    };
  }, []);

  // Close iOS tip on outside click
  useEffect(() => {
    if (!showIOSTip) return;
    const handler = (e: MouseEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) setShowIOSTip(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showIOSTip]);

  if (!isMobile || isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSTip(prev => !prev);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50" ref={tipRef}>
      {showIOSTip && (
        <div className="absolute bottom-12 right-0 w-56 rounded-lg border bg-card p-3 shadow-lg text-sm text-card-foreground mb-2">
          <div className="flex items-start gap-2">
            <Share className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p>Tap the <strong>Share</strong> button, then <strong>"Add to Home Screen"</strong></p>
          </div>
        </div>
      )}

      <div className="relative">
        <button
          onClick={handleClick}
          className={cn(
            "w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center",
            animate && "animate-pulse"
          )}
          aria-label="Install app"
        >
          <Download className="h-5 w-5" />
        </button>
        <button
          onClick={handleDismiss}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center shadow"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
