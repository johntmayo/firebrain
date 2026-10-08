import React from 'react';

/**
 * Icon — the chassis icon set. Hand-drawn 24×24 line icons (Lucide-like),
 * stroked with `currentColor` so they take the colour of whatever text
 * they sit in. Default 16px; chips use 14, mobile tabs / empty states 20.
 *
 * Icons never change a fixed row/chip height: they are `vertical-align:
 * middle` inline blocks and the container decides the box.
 */
export type IconName =
  | 'load'
  | 'unload'
  | 'edit'
  | 'more'
  | 'check'
  | 'plus'
  | 'close'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-right'
  | 'chevron-left'
  | 'loadout'
  | 'quest'
  | 'cache'
  | 'alert'
  | 'calendar'
  | 'operator'
  | 'energy'
  | 'import'
  | 'search'
  | 'settings'
  | 'palette'
  | 'logout'
  | 'grip'
  | 'lock'
  | 'lock-open'
  | 'tools'
  | 'info'
  | 'pin'
  | 'pin-off'
  | 'trash'
  | 'list'
  | 'grid'
  | 'matrix'
  | 'sort'
  | 'eye'
  | 'sparkle'
  | 'unlink'
  | 'clock';

export type IconSize = 12 | 14 | 16 | 20;

export interface IconProps {
  name: IconName;
  size?: IconSize;
  className?: string;
  /** When given, the icon is announced with this label instead of hidden. */
  title?: string;
}

/* Each entry: 1–4 path/shape elements on a 24×24 grid, 1.75 stroke. */
const PATHS: Record<IconName, React.ReactNode> = {
  load: (
    <>
      <path d="M12 16V5" />
      <path d="M7 10l5-5 5 5" />
      <path d="M4 20h16" />
    </>
  ),
  unload: (
    <>
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  close: (
    <>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </>
  ),
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-up': <path d="M6 15l6-6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
  // Case / briefcase — the loadout is a packed case.
  loadout: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </>
  ),
  // Flag — a quest is a banner you march under.
  quest: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h12l-3 4 3 4H5" />
    </>
  ),
  // Inbox tray — the cache where missions land.
  cache: (
    <>
      <path d="M4 13l2.2-7.4A1 1 0 0 1 7.2 5h9.6a1 1 0 0 1 1 .6L20 13" />
      <path d="M4 13h4.5l1.5 3h4l1.5-3H20v6H4z" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3L2.5 20h19L12 3z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
    </>
  ),
  operator: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  energy: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  import: (
    <>
      <path d="M12 15V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  // Sliders.
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.3 0 2-.8 2-1.8 0-.9-.6-1.4-.6-2.2 0-1 .8-1.8 1.9-1.8H17a4 4 0 0 0 4-4c0-4.6-4-8.2-9-8.2z" />
      <path d="M7.5 11.5h.01M10.5 7.5h.01M15 7.5h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 8l4 4-4 4" />
      <path d="M19 12H9" />
    </>
  ),
  grip: (
    <>
      <path d="M9 6h.01M15 6h.01" strokeWidth="3" />
      <path d="M9 12h.01M15 12h.01" strokeWidth="3" />
      <path d="M9 18h.01M15 18h.01" strokeWidth="3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  'lock-open': (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.8-1.2" />
    </>
  ),
  tools: (
    <path d="M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-5-5l2.5 2.5-1 3-3 1z" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  pin: (
    <>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
    </>
  ),
  'pin-off': (
    <>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" />
      <path d="M4 4l16 16" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  list: <path d="M4 7h16M4 12h16M4 17h16" />,
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </>
  ),
  matrix: (
    <>
      <path d="M5 5h.01M12 5h.01M19 5h.01" strokeWidth="3" />
      <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" />
      <path d="M5 19h.01M12 19h.01M19 19h.01" strokeWidth="3" />
    </>
  ),
  sort: (
    <>
      <path d="M4 7h14M4 12h10M4 17h6" />
      <path d="M18 11v9M15 17l3 3 3-3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" />
      <path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17z" />
    </>
  ),
  unlink: (
    <>
      <path d="M9 15l6-6" />
      <path d="M11 6l1.5-1.5a3.5 3.5 0 0 1 5 5L16 11" />
      <path d="M13 18l-1.5 1.5a3.5 3.5 0 0 1-5-5L8 13" />
      <path d="M4 4l16 16" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2" />
      <path d="M9.5 3h5" />
    </>
  ),
};

export function Icon({ name, size = 16, className, title }: IconProps) {
  return (
    <svg
      className={['icon', `icon--${name}`, className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
