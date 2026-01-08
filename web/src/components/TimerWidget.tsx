import React from 'react';
import { useTimer } from '../context/TimerContext';
import { useApp } from '../context/AppContext';

export function TimerWidget() {
  const { getTimerProgress, stopTimer } = useTimer();

  const timerProgress = getTimerProgress();
  if (!timerProgress) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer-widget">
      <div className="timer-widget-header">
        <div className="timer-icon">⏱️</div>
        <div className="timer-info">
          <div className="timer-task-title">{timerProgress.taskTitle}</div>
          <div className="timer-time">{formatTime(timerProgress.remainingSeconds)}</div>
        </div>
      </div>

      <div className="timer-progress-bar">
        <div
          className="timer-progress-fill"
          style={{ width: `${timerProgress.progress}%` }}
        />
      </div>

      <div className="timer-controls">
        <button
          className="btn-timer-stop"
          onClick={() => stopTimer()}
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
