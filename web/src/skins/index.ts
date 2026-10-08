/**
 * Skin registry (docs/CHASSIS_BRIEF.md §7–§8).
 *
 * A skin is a CSS file `skins/<id>.css` that overrides chassis tokens under
 * `html[data-skin="<id>"]` (plus, optionally, frame artwork via pseudo-elements
 * on PanelFrame / Slot / ItemCard) and this metadata entry. The CSS files are
 * collected by `skins/skins.css`, which `styles/index.css` imports once.
 *
 * Graphite is the `:root` default in `styles/tokens.css`; its entry here only
 * carries metadata for the Settings picker.
 */
export type SkinId = 'graphite' | 'scifi';

export type SkinMotion = 'snappy' | 'soft' | 'heavy';

export interface SkinMeta {
  id: SkinId;
  name: string;
  blurb: string;
  /** Swatches for the Settings preview card — hex colours only. */
  preview: { ground: string; surface: string; accent: string; text: string; p1: string };
  motion: SkinMotion;
}

export const SKIN_LIST: SkinMeta[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    blurb: 'Neutral dark chassis. The planning model with no game styling.',
    preview: { ground: '#121316', surface: '#1b1d21', accent: '#6ea8fe', text: '#eceef1', p1: '#f06a8a' },
    motion: 'soft',
  },
  {
    id: 'scifi',
    name: 'Sci-fi',
    blurb: 'Deep-space HUD. Cyan readouts, hard edges, scanline ground.',
    preview: { ground: '#070b14', surface: '#0d1526', accent: '#35e0ff', text: '#e4f0ff', p1: '#ff4fa8' },
    motion: 'snappy',
  },
];

export const DEFAULT_SKIN: SkinId = 'graphite';

export function isSkinId(id: string | null | undefined): id is SkinId {
  return SKIN_LIST.some(s => s.id === id);
}

export function getSkinMeta(id: SkinId): SkinMeta {
  return SKIN_LIST.find(s => s.id === id) ?? SKIN_LIST[0];
}
