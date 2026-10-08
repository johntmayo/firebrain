import React from 'react';
import { useApp } from '../context/AppContext';
import { Notice } from './primitives';

/** The notice stack. Each notice has its own timer and a dismiss button. */
export function Toast() {
  const { notices, dismissNotice } = useApp();

  if (notices.length === 0) return null;

  return (
    <div className="notice-stack" aria-live="polite">
      {notices.map(n => (
        <Notice key={n.id} type={n.type} message={n.message} onDismiss={() => dismissNotice(n.id)} />
      ))}
    </div>
  );
}
