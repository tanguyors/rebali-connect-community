/* Re-Bali entry point */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initCapacitor } from "./capacitor";

// Initialize native plugins when running on iOS/Android
initCapacitor();

createRoot(document.getElementById("root")!).render(<App />);
