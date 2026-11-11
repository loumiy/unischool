import type { ReactNode } from 'react';
import { DoubleSpeedIcon, StartingViewIcon, TiltViewIcon, TurnViewIcon } from './icons';

// Help text with its keys and buttons drawn (Plan 125 B): "[Q]" is a
// keycap, and "[icon:turn]" the map tool's own icon, so a sentence never
// has to say "the turn buttons in the map tools" or "the double-arrow
// button". The strings keep the brackets, so a screen reader and the
// string table read the key's name.

const ICONS: Record<string, { Icon: () => ReactNode; label: string }> = {
  turn: { Icon: () => <TurnViewIcon direction="left" />, label: 'turn' },
  tilt: { Icon: () => <TiltViewIcon direction="up" />, label: 'tilt' },
  home: { Icon: StartingViewIcon, label: 'starting view' },
  double: { Icon: DoubleSpeedIcon, label: 'double speed' },
};

export default function Keyed({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/).filter(Boolean).map((bit, i) => {
        if (!bit.startsWith('[')) return bit;
        const inner = bit.slice(1, -1);
        const icon = inner.startsWith('icon:') ? ICONS[inner.slice(5)] : undefined;
        if (icon) return <span key={i} className="keyed-icon" role="img" aria-label={icon.label}><icon.Icon /></span>;
        return <kbd key={i} className="keycap">{inner}</kbd>;
      })}
    </>
  );
}
