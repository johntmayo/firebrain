import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import { ENERGY_POINTS_LIMIT, type EnergyLevel } from '../types';

export function TodayPlanner() {
  const {
    loadoutTasks,
    accomplishedToday,
    currentUser,
    johnEmail,
    stephEmail,
    meganEmail,
    viewingLoadoutUser,
    setViewingLoadoutUser,
    loadoutConfig,
    setEnergyLevel,
  } = useApp();

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const isViewingOwnLoadout = viewingLoadoutUser === currentUser;
  const viewingUserName = viewingLoadoutUser === johnEmail
    ? 'JOHN'
    : viewingLoadoutUser === stephEmail
      ? 'STEF'
      : viewingLoadoutUser === meganEmail
        ? 'MEGAN'
        : viewingLoadoutUser.split('@')[0].toUpperCase();

  const energyLevels: { level: EnergyLevel; label: string }[] = [
    { level: 'light', label: 'Light (7)' },
    { level: 'medium', label: 'Medium (10)' },
    { level: 'heavy', label: 'Heavy (12)' },
  ];

  const energyLimit = loadoutConfig?.points_limit ?? 10;
  const usedPoints = loadoutConfig?.points_used ?? 0;
  const overloadedBy = Math.max(0, usedPoints - energyLimit);
  const isOverloaded = overloadedBy > 0;

  const { isOver: isOverLoadout, setNodeRef: setLoadoutDropRef } = useDroppable({
    id: 'loadout-drop-zone',
    disabled: !isViewingOwnLoadout,
  });

  return (
    <div className="pane pane-today">
      <div className="pane-header today-header">
        <h2>
          <span className="icon">⚔</span>
          THE LOADOUT
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <button
              className={`loadout-user-btn ${viewingLoadoutUser === johnEmail ? 'active' : ''}`}
              onClick={() => setViewingLoadoutUser(johnEmail)}
              title="View John's Loadout"
            >
              JOHN
            </button>
            <button
              className={`loadout-user-btn ${viewingLoadoutUser === stephEmail ? 'active' : ''}`}
              onClick={() => setViewingLoadoutUser(stephEmail)}
              title="View Stef's Loadout"
            >
              STEF
            </button>
            <button
              className={`loadout-user-btn ${viewingLoadoutUser === meganEmail ? 'active' : ''}`}
              onClick={() => setViewingLoadoutUser(meganEmail)}
              title="View Megan's Loadout"
            >
              MEGAN
            </button>
          </div>
          {isViewingOwnLoadout && loadoutConfig && (
            <div className="energy-level-row">
              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.08em', marginRight: '0.35rem' }}>SET ENERGY</span>
              <div className="energy-level-btns">
                {energyLevels.map(({ level, label }) => (
                  <button
                    key={level}
                    type="button"
                    className={`energy-level-btn ${loadoutConfig.energy_level === level ? 'active' : ''}`}
                    onClick={() => setEnergyLevel(level)}
                    title={`${level} day: ${ENERGY_POINTS_LIMIT[level]} points`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className={`loadout-points ${isOverloaded ? 'overload' : ''}`}>
                {usedPoints} / {energyLimit} pts
              </span>
              {isOverloaded && (
                <span className="loadout-overload-chip">OVER +{overloadedBy}</span>
              )}
            </div>
          )}
          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', fontWeight: '500' }}>
            {dateStr.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="pane-content">
        {!isViewingOwnLoadout && (
          <div className="permission-warning">
            ◈ VIEW ONLY — {viewingUserName}'S LOADOUT
          </div>
        )}

        <div className="today-slots">
          <div className="slot-section">
            <div className="slot-section-label">◆ DAILY LOADOUT FLOW</div>
            <div className="loadout-meter" aria-label="daily bandwidth">
              {Array.from({ length: energyLimit }).map((_, i) => (
                <span
                  key={i}
                  className={`meter-dot ${i < Math.min(usedPoints, energyLimit) ? 'filled' : ''}`}
                />
              ))}
            </div>

            <div
              ref={setLoadoutDropRef}
              className={`loadout-list ${isOverLoadout && isViewingOwnLoadout ? 'drag-over' : ''} ${isOverloaded ? 'overloaded' : ''}`}
            >
              {loadoutTasks.length > 0 ? (
                loadoutTasks.map((task, index) => (
                  <div key={task.task_id} className="loadout-row">
                    <span className="loadout-index">{index + 1}</span>
                    <TaskCard
                      task={task}
                      showDragHandle={isViewingOwnLoadout}
                      inSlot
                    />
                  </div>
                ))
              ) : (
                <span>[ DROP MISSIONS HERE ]</span>
              )}
            </div>

            {isViewingOwnLoadout && (
              <div className="loadout-hint">
                Challenge rating drives points (low=1, medium=2, high=3). Overload is allowed.
              </div>
            )}
          </div>
        </div>

        {accomplishedToday.length > 0 && (
          <div className="accomplished-section">
            <div className="accomplished-header">
              <span className="accomplished-icon">✓</span>
              <span>ACCOMPLISHED TODAY</span>
              <span className="accomplished-count">({accomplishedToday.length})</span>
            </div>
            <div className="accomplished-list">
              {accomplishedToday.map(task => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  showDragHandle={false}
                  inSlot={false}
                  completed
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

