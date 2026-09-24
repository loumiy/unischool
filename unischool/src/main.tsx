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
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
