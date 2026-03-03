/* Re-Bali entry point */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initCapacitor } from "./capacitor";
import { supabase } from "./integrations/supabase/client";

// Global error handlers to prevent white screens
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});

// Restore session from deep-link hash tokens (native → webapp auth handoff)
(async () => {
  try {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=') && hash.includes('refresh_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        // Clean the hash so tokens don't leak in the URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  } catch (e) {
    console.error('Deep-link auth restore error:', e);
  }
})();

// Initialize native plugins when running on iOS/Android
try {
  initCapacitor();
} catch (e) {
  console.error('Capacitor init error:', e);
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
} else {
  console.error('Root element not found');
}
