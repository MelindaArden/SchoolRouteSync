import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// PWA Service Worker Registration (only if not in iframe for Replit preview)
if ('serviceWorker' in navigator && window.top === window.self) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('PWA Service Worker registration failed:', error);
      });
  });
}

// PWA Install Prompt (only if not in iframe)
let deferredPrompt: any;
if (window.top === window.self) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA Install prompt available');
  });

  // PWA Install Function (can be called from UI)
  (window as any).installPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('PWA Install accepted');
        } else {
          console.log('PWA Install dismissed');
        }
        deferredPrompt = null;
      });
    }
  };
}

// Ensure React mounts properly in all contexts
const rootElement = document.getElementById("root");
if (rootElement) {
  try {
    createRoot(rootElement).render(<App />);
    console.log('Route Runner app initialized successfully');
  } catch (error) {
    console.error('Failed to mount Route Runner app:', error);
    // Fallback: Show basic error message
    rootElement.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Route Runner</h1><p>Loading...</p></div>';
  }
} else {
  console.error('Root element not found - cannot mount Route Runner app');
}
