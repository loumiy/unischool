import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The three faces of the register (styles.css's --display, --sans, --mono),
// self-hosted through fontsource so the game never fetches fonts over the
// network. Azeret Mono is the figures face for the weekly-ticking cash
// readout.
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/azeret-mono';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
// The title's wordmark (Logo.tsx): Archivo at its heaviest.
import '@fontsource/archivo/800.css';
import App from './App';
import CrashScreen from './components/CrashScreen';
import { appOpened } from './analytics/analytics';

// The play statistics' first event (analytics.ts): held until the title
// screen's question is answered, and sent only if it is yes.
appOpened();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashScreen>
      <App />
    </CrashScreen>
  </StrictMode>,
);
