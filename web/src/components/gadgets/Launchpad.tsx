import React from 'react';
import { Tooltip } from '../primitives';
import { Gadget } from './Gadget';

const LINKS = [
  {
    id: 'geocode',
    label: 'Geocode',
    icon: '/resources/images/geocode.svg',
    url: 'https://johntmayo.github.io/geocoder/',
    teach: 'Geocode — address ↔ coordinates lookup. Opens in a new tab.',
  },
  {
    id: 'note_taken',
    label: 'Note taken',
    icon: '/resources/images/note_taken.svg',
    url: 'https://note-taken-26lwg4cuvkzymg2ncgbveb.streamlit.app/',
    teach: 'Note taken — capture scratch notes outside the planner. Opens in a new tab.',
  },
] as const;

/**
 * Launchpad gadget — the external tools that used to be the whole drawer,
 * now a row of launch buttons. Each opens in a new tab.
 */
export function Launchpad() {
  return (
    <Gadget
      id="launchpad"
      name="Launchpad"
      icon="grid"
      teach="Launchpad — external tools you reach for mid-mission. Every button opens a new tab; the planner stays put."
    >
      <div className="launchpad">
        {LINKS.map(link => (
          <Tooltip key={link.id} content={link.teach} block>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="launchpad__link"
              data-link={link.id}
            >
              <img src={link.icon} alt="" className="launchpad__icon" />
              <span className="launchpad__label t-xs">{link.label}</span>
              <span className="launchpad__ext t-2xs" aria-hidden="true">↗</span>
            </a>
          </Tooltip>
        ))}
        <div className="launchpad__hint t-2xs">Each opens in a new tab</div>
      </div>
    </Gadget>
  );
}
