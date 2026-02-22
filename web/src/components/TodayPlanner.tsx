import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import { SLOT_CONFIG, ENERGY_POINTS_LIMIT, type TodaySlot, type EnergyLevel } from '../types';

export function TodayPlanner() {
  const { 
    todayTasks, 
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
  
  const bigSlots: TodaySlot[] = ['B1'];
  const mediumSlots: TodaySlot[] = ['M1', 'M2', 'M3'];
  const smallSlots: TodaySlot[] = ['S1', 'S2', 'S3', 'S4', 'S5'];
  
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const isViewingOwnLoadout = viewingLoadoutUser === currentUser;
  const viewingUserName = viewingLoadoutUser === johnEmail ? 'JOHN' : 
                         viewingLoadoutUser === stephEmail ? 'STEF' : 
                         viewingLoadoutUser === meganEmail ? 'MEGAN' :
                         viewingLoadoutUser.split('@')[0].toUpperCase();
  
  const energyLevels: { level: EnergyLevel; label: string }[] = [
    { level: 'light', label: 'Light (7)' },
    { level: 'medium', label: 'Medium (10)' },
    { level: 'heavy', label: 'Heavy (12)' },
  ];
  
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
              <span className="loadout-points">
                {loadoutConfig.points_used} / {loadoutConfig.points_limit} pts
              </span>
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
          {/* Big (1) - Primary */}
          <div className="slot-section">
            <div className="slot-section-label">◆ PRIMARY</div>
            {bigSlots.map(slot => (
              <TodaySlot key={slot} slot={slot} task={todayTasks.get(slot)} />
            ))}
          </div>
          
          {/* Medium (3) - Support */}
          <div className="slot-section">
            <div className="slot-section-label">◇ SUPPORT</div>
            {mediumSlots.map(slot => (
              <TodaySlot key={slot} slot={slot} task={todayTasks.get(slot)} />
            ))}
          </div>
          
          {/* Small (5) - Quick-Hit */}
          <div className="slot-section">
            <div className="slot-section-label">○ QUICK-HIT</div>
            <div className="small-slots-grid">
              {smallSlots.map(slot => (
                <TodaySlot key={slot} slot={slot} task={todayTasks.get(slot)} />
              ))}
            </div>
          </div>
        </div>

        {/* Accomplished Today Section */}
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
                  completed={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TodaySlotProps {
  slot: TodaySlot;
  task: import('../types').Task | undefined;
}

function TodaySlot({ slot, task }: TodaySlotProps) {
  const { currentUser, viewingLoadoutUser, clearToday } = useApp();

  const config = SLOT_CONFIG[slot];
  const isViewingOwnLoadout = viewingLoadoutUser === currentUser;
  
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slot}`,
    data: { slot, currentTask: task },
    disabled: !isViewingOwnLoadout, // Disable if viewing other user's loadout
  });
  
  const handleClearSlot = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task && isViewingOwnLoadout) {
      clearToday(task.task_id);
    }
  };
  
  return (
    <div
      ref={setNodeRef}
      className={`slot ${config.size} ${task ? 'filled' : 'empty'} ${isOver && isViewingOwnLoadout ? 'drag-over' : ''}`}
    >
      <span className="slot-label">{slot}</span>
      
      {task ? (
        <TaskCard
          task={task}
          showDragHandle={isViewingOwnLoadout}
          inSlot
        />
      ) : (
        <span>[ EMPTY SLOT ]</span>
      )}
    </div>
  );
}

