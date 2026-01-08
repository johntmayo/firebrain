import React from 'react';
import { useTimer } from '../context/TimerContext';
import { useApp } from '../context/AppContext';

export function TimerWidget() {
  const { activeTimers } = useTimer();
  const { tasks, pauseTimer, stopTimer } = useApp();

  // Find the active timer with the most time remaining
  const activeTimerEntries = Array.from(activeTimers.entries());
  if (activeTimerEntries.length === 0) return null;

  // Get the first active timer (or we could prioritize by remaining time)
  const [taskId, timer] = activeTimerEntries[0];
  const task = tasks.find(t => t.task_id === taskId);

  if (!task) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = timer.durationMinutes * 60;
  const progress = ((totalSeconds - timer.remainingSeconds) / totalSeconds) * 100;

  return (
    <div className="timer-widget">
      <div className="timer-widget-header">
        <div className="timer-icon">⏱️</div>
        <div className="timer-info">
          <div className="timer-task-title">{task.title}</div>
          <div className="timer-time">{formatTime(timer.remainingSeconds)}</div>
        </div>
      </div>

      <div className="timer-progress-bar">
        <div
          className="timer-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="timer-controls">
        <button
          className="btn-timer-pause"
          onClick={() => pauseTimer(taskId)}
          title="Pause timer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>
        <button
          className="btn-timer-stop"
          onClick={() => stopTimer(taskId)}
          title="Stop timer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
