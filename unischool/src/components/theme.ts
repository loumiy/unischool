import type { SchoolColors } from '../state/types';
import { TEXT_ON_PRIMARY } from '../data/schoolColors';

// The one place the school's colours reach the stylesheet: overwrites the
// :root custom properties styles.css declares, and all chrome follows. Called
// from App.tsx once the run starts and from the startup screen as the player
// previews pairs. All four are set together so none can go stale.
export function applySchoolColors(colors: SchoolColors): void {
  const root = document.documentElement.style;
  root.setProperty('--school-primary', colors.primary);
  root.setProperty('--school-secondary', colors.secondary);
  root.setProperty('--school-on-primary', TEXT_ON_PRIMARY);
  root.setProperty('--school-on-secondary', colors.primary);
}
