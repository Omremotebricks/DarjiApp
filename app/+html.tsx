import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />

        {/* SEO */}
        <title>Darji Book Pro</title>
        <meta name="description" content="Premium Tailoring Management App - Manage clients, orders, measurements & payments" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* PWA - iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DarjiBook" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />

        {/* iOS Splash Screens */}
        <link
          rel="apple-touch-startup-image"
          href="/assets/images/splash-icon.png"
        />

        {/* PWA - Android / Chrome */}
        <meta name="theme-color" content="#065f46" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />

        {/* Expo scroll reset */}
        <ScrollViewStyleReset />

        {/* Base styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          #root, body, html { height: 100%; }
          body { overflow: hidden; margin: 0; }
          #root { display: flex; }
        `}} />

        {/* Register Service Worker */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW registered:', reg.scope); })
                .catch(function(err) { console.log('SW failed:', err); });
            });
          }
        `}} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
