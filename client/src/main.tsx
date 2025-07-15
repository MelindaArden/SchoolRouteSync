console.log("main.tsx: Script starting to load");

// Remove all imports temporarily to isolate the issue
// import { createRoot } from "react-dom/client";
// console.log("main.tsx: createRoot imported");

// import SuperMinimal from "./super-minimal";
// console.log("main.tsx: SuperMinimal imported");

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

console.log("main.tsx: About to render basic HTML");

// Direct DOM manipulation without React for troubleshooting
const rootElement = document.getElementById("root");
console.log("main.tsx: Root element found:", rootElement);

if (rootElement) {
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; min-height: 100vh;">
      <h1 style="color: #1976D2; margin-bottom: 20px;">
        Route Runner - Basic Mode
      </h1>
      
      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #333;">JavaScript Working</h2>
        <p style="color: #666; line-height: 1.5;">
          This page loads via direct JavaScript without React. The issue is likely with React imports or Vite module resolution.
        </p>
        
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin-top: 15px;">
          <strong style="color: #1976D2;">Status:</strong>
          <ul style="margin: 10px 0; padding-left: 20px; color: #555;">
            <li>✓ HTML loads correctly</li>
            <li>✓ JavaScript executes properly</li>
            <li>✓ DOM manipulation works</li>
            <li>❌ React/Vite module imports failing</li>
          </ul>
        </div>
      </div>

      <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; color: #333;">Demo Credentials</h3>
        <p style="margin: 5px 0; color: #666;">Username: <code>ma1313</code></p>
        <p style="margin: 5px 0; color: #666;">Password: <code>Dietdew13!</code></p>
      </div>
    </div>
  `;
  console.log("main.tsx: HTML content rendered successfully");
} else {
  console.error("main.tsx: Root element not found!");
}
