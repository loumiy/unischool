import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// The two faces of the register (Plan 18, PR A — see styles.css's --display
// and --sans), self-hosted through fontsource so Vite bundles the woff2
// files and the game never reaches for a font over the network. Bricolage
// is the variable font (one file covers weights 200–800); Archivo is the
// four static weights the text actually uses.
import '@fontsource-variable/bricolage-grotesque';
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
