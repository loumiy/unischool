// The game's mark (the title art's): a temple front whose three columns read
// I-U-I, under a pediment pierced by an oculus, on two steps. Drawn in
// currentColor so it sits on the sky in white and on a card in the ink; the
// oculus and the gaps are holes, not paint, so whatever is behind shows
// through.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="40 30 740 625" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <path fillRule="evenodd" d="M95 190 413 40 730 190V222H95Z M413 113a34 34 0 1 0 0.01 0Z" />
        {/* The outer columns: capital, shaft, foot. */}
        <path d="M138 250H290V262Q268 266 265 280H165Q162 266 138 262Z M165 278H265V514H165Z M165 512Q162 522 140 526V545H290V526Q268 522 265 512Z" />
        <path d="M538 250H690V262Q668 266 665 280H565Q562 266 538 262Z M565 278H665V514H565Z M565 512Q562 522 540 526V545H690V526Q668 522 665 512Z" />
        {/* The middle one, the U: its shaft rounds off above the steps. */}
        <path d="M340 250H490V262Q468 266 465 280H365Q362 266 340 262Z M365 278H465V495A50 50 0 0 1 365 495Z" />
        {/* The steps: the upper parted round the U, the lower whole. */}
        <path d="M105 562H298Q312 562 322 590H105Z M720 562H530Q516 562 506 590H720Z M45 602H775V650H45Z" />
      </g>
    </svg>
  );
}

// The mark over the name, as the title screen shows it. The name is real
// text (the screen's heading) set in capitals by the stylesheet.
export default function Logo() {
  return (
    <div className="logo">
      <LogoMark className="logo-mark" />
      <h1 className="logo-name">UniSchool</h1>
    </div>
  );
}
