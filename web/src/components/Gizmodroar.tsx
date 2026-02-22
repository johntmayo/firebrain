import React, { useState } from 'react';

const TOOLS = [
  { id: 'stopwatch', label: 'Stopwatch', icon: '/resources/images/stopwatch.svg', url: 'https://e.ggtimer.com/' },
  { id: 'geocode', label: 'Geocode', icon: '/resources/images/geocode.svg', url: 'https://johntmayo.github.io/geocoder/' },
  { id: 'note_taken', label: 'Note taken', icon: '/resources/images/note_taken.svg', url: 'https://note-taken-26lwg4cuvkzymg2ncgbveb.streamlit.app/' },
] as const;

export function Gizmodroar() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`gizmodroar ${expanded ? 'gizmodroar--expanded' : ''}`}>
      <button
        type="button"
        className="gizmodroar-tab"
        onClick={() => setExpanded(!expanded)}
        title={expanded ? 'Collapse tools' : 'Open tools'}
        aria-expanded={expanded}
      >
        <span className="gizmodroar-arrow" aria-hidden>
          {expanded ? '◀' : '▶'}
        </span>
      </button>
      <div className="gizmodroar-drawer">
        <div className="gizmodroar-tools">
          {TOOLS.map((tool) => (
            <a
              key={tool.id}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="gizmodroar-tool"
              title={tool.label}
            >
              <img src={tool.icon} alt="" className="gizmodroar-tool-icon" />
              <span className="gizmodroar-tool-label">{tool.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
