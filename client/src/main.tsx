console.log("main.tsx: Script starting to load");

import { createRoot } from "react-dom/client";
console.log("main.tsx: createRoot imported");

import SuperMinimal from "./super-minimal";
console.log("main.tsx: SuperMinimal imported");

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

console.log("main.tsx: About to create root and render");

try {
  const rootElement = document.getElementById("root");
  console.log("main.tsx: Root element found:", rootElement);
  
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  const root = createRoot(rootElement);
  console.log("main.tsx: Root created successfully");
  
  root.render(<SuperMinimal />);
  console.log("main.tsx: Component rendered successfully");
} catch (error) {
  console.error("main.tsx: Error during rendering:", error);
  
  // Fallback: render directly to DOM
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial;">
        <h1 style="color: red;">Route Runner - Emergency Mode</h1>
        <p>React failed to load. Error: ${error.message}</p>
        <p>This is a direct DOM fallback.</p>
      </div>
    `;
  }
}
