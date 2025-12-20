import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import { TaskCard } from './TaskCard';
import { ALL_SLOTS, SLOT_CONFIG, type TodaySlot } from '../types';

export function TodayPlanner() {
  const { todayTasks, isJohn } = useApp();
  
  const bigSlots: TodaySlot[] = ['B1'];
  const mediumSlots: TodaySlot[] = ['M1', 'M2', 'M3'];
  const smallSlots: TodaySlot[] = ['S1', 'S2', 'S3', 'S4', 'S5'];
  
  return (
    <div className="pane pane-today">
      <div className="pane-header today-header">
        <h2>
          <span className="icon">⚔</span>
          THE LOADOUT
        </h2>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>1-3-5</span>
      </div>
      
      <div className="pane-content">
        {!isJohn && (
          <div className="permission-warning">
            ◈ VIEW ONLY — OPERATOR LOCK ACTIVE
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
      </div>
    </div>
  );
}

interface TodaySlotProps {
  slot: TodaySlot;
  task: import('../types').Task | undefined;
}

function TodaySlot({ slot, task }: TodaySlotProps) {
  const { isJohn, clearToday } = useApp();
  const config = SLOT_CONFIG[slot];
  
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slot}`,
    data: { slot, currentTask: task },
    disabled: !isJohn,
  });
  
  const handleClearSlot = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task && isJohn) {
      clearToday(task.task_id);
    }
  };
  
  return (
    <div
      ref={setNodeRef}
      className={`slot ${config.size} ${task ? 'filled' : 'empty'} ${isOver && isJohn ? 'drag-over' : ''}`}
    >
      <span className="slot-label">{slot}</span>
      
      {task ? (
        <div style={{ position: 'relative', height: '100%' }}>
          <TaskCard task={task} showDragHandle={isJohn} inSlot />
          {isJohn && (
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

