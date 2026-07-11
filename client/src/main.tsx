import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (!window.location.hash) {
  window.location.hash = "#/";
}

// Offline support for the road: register the service worker in production
// builds only (it would fight Vite's dev server otherwise). "./sw.js" keeps
// it working whether the app is hosted at the domain root or a subpath.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // No SW (e.g. http:// preview) — app still works online.
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
