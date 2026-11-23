import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SendPage from './components/SendPage';
import { sentUrl, withoutSent } from './workspace/send';
import { windowTarget } from './workspace/useWindows';

const root = createRoot(document.getElementById('root')!);
const startApp = (sent?: string) =>
  root.render(
    <StrictMode>
      <App sent={sent} />
    </StrictMode>,
  );

// F-189 Stufe 2: Aufruf über das Lesezeichen „An E-Sources senden“ (?open=<Adresse>)
const sent = sentUrl(window.location.search);
if (sent) {
  window.history.replaceState(window.history.state, '', withoutSent(window.location.href));
  // Das kleine Fenster zeigt das Symbol „Öffnen in“ (Favicon mit grünem Pfeil).
  for (const l of document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')) l.remove();
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/svg+xml';
  icon.href = '/send-icon.svg';
  document.head.appendChild(icon);
  root.render(
    <StrictMode>
      <SendPage
        url={sent}
        onAlone={() => {
          // Kein E-Sources offen: Dieses Fenster wird zum Main Desk (und darf dafür größer werden).
          window.name = windowTarget('');
          icon.href = '/favicon.svg';
          try {
            if (window.outerWidth < 800) window.resizeTo(Math.round(window.screen.availWidth * 0.8), Math.round(window.screen.availHeight * 0.8));
          } catch {
            /* Browser lässt es nicht zu */
          }
          startApp(sent);
        }}
      />
    </StrictMode>,
  );
} else startApp();
