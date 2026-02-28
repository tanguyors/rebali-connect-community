import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export default function PushNotificationToggle() {
  const { t } = useLanguage();
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success(t("notifications.pushDisabled"));
    } else {
      const ok = await subscribe();
      if (ok) {
        toast.success(t("notifications.pushEnabled"));
      } else if (permission === "denied") {
        toast.error(t("notifications.pushBlocked"));
      }
    }
  };

  return (
    <Button
      variant={isSubscribed ? "secondary" : "outline"}
      size="sm"
      onClick={handleToggle}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <BellRing className="h-4 w-4" />
          {t("notifications.pushOn")}
        </>
      ) : permission === "denied" ? (
        <>
          <BellOff className="h-4 w-4" />
          {t("notifications.pushBlocked")}
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          {t("notifications.enablePush")}
        </>
      )}
    </Button>
  );
}
