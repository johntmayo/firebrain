import React from 'react';
import { Icon, Tooltip, type IconName } from '../primitives';

interface GadgetProps {
  /** Stable id → `data-gadget` and a BEM modifier for per-gadget CSS. */
  id: string;
  name: string;
  /** A chassis icon name, or a ready 14px glyph element for icons the set lacks. */
  icon: IconName | React.ReactElement;
  /** One teaching sentence, shown on hover over the title row. */
  teach: string;
  /** Optional control in the title row's right slot (≥ 32px hit area). */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Gadget — one fixed 240×136 tile on the belt. Title row (icon · name · action)
 * over a body; the tile itself is inert, everything interactive lives inside.
 */
export function Gadget({ id, name, icon, teach, action, children }: GadgetProps) {
  return (
    <section className={`gadget gadget--${id}`} data-gadget={id} aria-label={name}>
      <header className="gadget__head">
        <Tooltip content={teach} className="gadget__title-anchor">
          <span className="gadget__title">
            {typeof icon === 'string' ? <Icon name={icon} size={14} className="gadget__icon" /> : icon}
            <span className="gadget__name t-2xs">{name}</span>
          </span>
        </Tooltip>
        {action && <span className="gadget__action">{action}</span>}
      </header>
      <div className="gadget__body">{children}</div>
    </section>
  );
}
