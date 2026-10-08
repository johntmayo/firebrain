import React, { useEffect, useState } from 'react';
import { useTheme, UI_SCALE_PRESETS, type UiScale } from '../context/ThemeContext';
import type { SkinMeta } from '../skins';
import type { OperatorInfo } from '../utils/operators';
import { Dialog, Icon, OperatorBadge, SegmentedControl, type SegmentOption } from './primitives';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  operator: OperatorInfo;
  onLogout: () => void;
}

const UI_SCALE_OPTIONS: SegmentOption<string>[] = UI_SCALE_PRESETS.map(s => ({
  value: String(s),
  label: `${Math.round(s * 100)}%`,
  title: `UI scale ${Math.round(s * 100)}%`,
}));

const SOUND_OPTIONS: SegmentOption<'on' | 'off'>[] = [
  { value: 'on', label: 'On', title: 'Play click sounds on drag, drop and clear' },
  { value: 'off', label: 'Off', title: 'Mute all sounds' },
];

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(REDUCED_MOTION_QUERY).matches
      : false
  ));
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Miniature "panel on ground" built from the skin's preview swatches. */
function SkinPreview({ preview }: { preview: SkinMeta['preview'] }) {
  const vars = {
    '--pv-ground': preview.ground,
    '--pv-surface': preview.surface,
    '--pv-accent': preview.accent,
    '--pv-text': preview.text,
    '--pv-p1': preview.p1,
  } as React.CSSProperties;
  return (
    <span className="skin-card__preview" style={vars} aria-hidden="true">
      <span className="skin-card__pv-panel">
        <span className="skin-card__pv-head">
          <span className="skin-card__pv-title" />
          <span className="skin-card__pv-count" />
        </span>
        <span className="skin-card__pv-row">
          <span className="skin-card__pv-bar skin-card__pv-bar--p1" />
          <span className="skin-card__pv-line skin-card__pv-line--wide" />
        </span>
        <span className="skin-card__pv-row">
          <span className="skin-card__pv-bar" />
          <span className="skin-card__pv-line" />
        </span>
      </span>
      <span className="skin-card__pv-swatches">
        <i style={{ background: preview.ground }} />
        <i style={{ background: preview.surface }} />
        <i style={{ background: preview.accent }} />
        <i style={{ background: preview.text }} />
        <i style={{ background: preview.p1 }} />
      </span>
    </span>
  );
}

/**
 * SettingsModal — Appearance (skin, UI scale), Sound, Account.
 * Every change applies instantly and persists via ThemeContext; there is no
 * Save button. Esc / backdrop / ✕ close (Dialog handles focus and keys).
 */
export function SettingsModal({ open, onClose, operator, onLogout }: SettingsModalProps) {
  const { skin, setSkin, availableSkins, uiScale, setUiScale, soundEnabled, setSoundEnabled } = useTheme();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Dialog open={open} onClose={onClose} title="Settings" className="settings-dialog">
      <div className="settings">
        <section className="settings-section" aria-labelledby="settings-appearance">
          <h4 id="settings-appearance" className="settings-section__title t-xs">
            <Icon name="palette" size={14} /> Appearance
          </h4>

          <div className="settings-field">
            <div className="settings-field__label t-xs">Skin</div>
            <div role="radiogroup" aria-label="Skin" className="skin-picker">
              {availableSkins.map(meta => {
                const selected = meta.id === skin;
                return (
                  <button
                    key={meta.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-skin-id={meta.id}
                    className={`skin-card ${selected ? 'is-selected' : ''}`.trim()}
                    onClick={() => setSkin(meta.id)}
                  >
                    <SkinPreview preview={meta.preview} />
                    <span className="skin-card__text">
                      <span className="skin-card__name">{meta.name}</span>
                      <span className="skin-card__blurb t-xs">{meta.blurb}</span>
                    </span>
                    {selected && <Icon name="check" size={14} className="skin-card__check" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="settings-field settings-field--row">
            <div className="settings-field__label t-xs">UI scale</div>
            <SegmentedControl
              ariaLabel="UI scale"
              options={UI_SCALE_OPTIONS}
              value={String(uiScale)}
              onChange={v => setUiScale(Number(v) as UiScale)}
            />
          </div>

          {reducedMotion && (
            <p className="settings-note t-xs">Reduced motion: following your system setting.</p>
          )}
        </section>

        <section className="settings-section" aria-labelledby="settings-sound">
          <h4 id="settings-sound" className="settings-section__title t-xs">
            <Icon name="energy" size={14} /> Sound
          </h4>
          <div className="settings-field settings-field--row">
            <div className="settings-field__label t-xs">Click sounds</div>
            <SegmentedControl
              ariaLabel="Sound"
              options={SOUND_OPTIONS}
              value={soundEnabled ? 'on' : 'off'}
              onChange={v => setSoundEnabled(v === 'on')}
            />
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-account">
          <h4 id="settings-account" className="settings-section__title t-xs">
            <Icon name="settings" size={14} /> Account
          </h4>
          <div className="settings-account">
            <OperatorBadge operator={operator} title="" />
            <span className="settings-account__text">
              <span className="settings-account__name">{operator.name}</span>
              <span className="settings-account__email t-xs">{operator.email}</span>
            </span>
            <button type="button" className="btn btn--secondary settings-account__logout" onClick={onLogout}>
              <Icon name="logout" size={14} /> Log out
            </button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
