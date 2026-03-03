/* Re-Bali entry point */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initCapacitor } from "./capacitor";

// Global error handlers to prevent white screens
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});

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
