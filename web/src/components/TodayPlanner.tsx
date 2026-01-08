import React, { useState, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import { TimerDropdown } from './TimerDropdown';
import { ALL_SLOTS, SLOT_CONFIG, type TodaySlot } from '../types';
import { useTimer } from '../context/TimerContext';

export function TodayPlanner() {
  const { 
    todayTasks, 
    accomplishedToday, 
    currentUser,
    johnEmail,
    stephEmail,
    viewingLoadoutUser,
    setViewingLoadoutUser
  } = useApp();
  
  const bigSlots: TodaySlot[] = ['B1'];
  const mediumSlots: TodaySlot[] = ['M1', 'M2', 'M3'];
  const smallSlots: TodaySlot[] = ['S1', 'S2', 'S3', 'S4', 'S5'];
  
  // Format today's date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const isViewingOwnLoadout = viewingLoadoutUser === currentUser;
  const viewingUserName = viewingLoadoutUser === johnEmail ? 'JOHN' : 
                         viewingLoadoutUser === stephEmail ? 'STEF' : 
                         viewingLoadoutUser.split('@')[0].toUpperCase();
  
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
          </div>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>1-3-5</span>
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
  const { activeTimer } = useTimer();
  const [showTimerDropdown, setShowTimerDropdown] = useState(false);
  const timerButtonRef = useRef<HTMLButtonElement>(null);

  const config = SLOT_CONFIG[slot];
  const isViewingOwnLoadout = viewingLoadoutUser === currentUser;
  const isActiveTimer = activeTimer && task && activeTimer.taskId === task.task_id;
  
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
        <div style={{ position: 'relative', height: '100%' }}>
          <TaskCard task={task} showDragHandle={isViewingOwnLoadout} inSlot />

          {/* Timer Icon */}
          <button
            ref={timerButtonRef}
            className={`btn-timer-icon ${isActiveTimer ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowTimerDropdown(!showTimerDropdown);
            }}
            title={isActiveTimer ? "Timer active" : "Start timer"}
          >
            ⏱️
          </button>

          {/* Timer Dropdown */}
          <TimerDropdown
            taskId={task.task_id}
            taskTitle={task.title}
            isOpen={showTimerDropdown}
            onClose={() => setShowTimerDropdown(false)}
            triggerRef={timerButtonRef}
          />

          {isViewingOwnLoadout && (
            <button
              className="btn-clear-slot"
              onClick={handleClearSlot}
              title="Remove from Today"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <span>[ EMPTY SLOT ]</span>
      )}
    </div>
  );
}

