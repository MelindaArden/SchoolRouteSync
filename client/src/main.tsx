import { createRoot } from "react-dom/client";
import App from "./App";
import MinimalApp from "./minimal-app";
import "./index.css";

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
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

// PWA Install Prompt
let deferredPrompt: any;
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

// Use minimal app until we fix the main app issues
const useMinimal = window.location.search.includes("minimal=false") ? false : true;
createRoot(document.getElementById("root")!).render(
  useMinimal ? <MinimalApp /> : <App />
);
