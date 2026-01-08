import React from 'react';
import { useTimer } from '../context/TimerContext';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
}

const DURATIONS = [
  { label: '5 minutes', value: 5, desc: 'Quick focus session' },
  { label: '10 minutes', value: 10, desc: 'Short task' },
  { label: '15 minutes', value: 15, desc: 'Medium task' },
  { label: '25 minutes', value: 25, desc: 'Pomodoro style' },
  { label: '30 minutes', value: 30, desc: 'Longer focus' },
  { label: '45 minutes', value: 45, desc: 'Extended work' },
  { label: '60 minutes', value: 60, desc: 'Deep work session' },
];

export function TimerModal({ isOpen, onClose, taskId, taskTitle }: TimerModalProps) {
  const { startTimer } = useTimer();

  const handleSelectDuration = (duration: number) => {
    console.log('Starting timer:', taskId, taskTitle, duration); // Debug
    startTimer(taskId, taskTitle, duration);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal timer-modal">
        <div className="modal-header">
          <h3>⏱️ START TIMER</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="timer-task-info">
            <div className="timer-task-title">{taskTitle}</div>
            <div className="timer-task-desc">Select focus duration:</div>
          </div>

          <div className="timer-duration-grid">
            {DURATIONS.map(({ label, value, desc }) => (
              <button
                key={value}
                className="timer-duration-option"
                onClick={() => handleSelectDuration(value)}
              >
                <div className="duration-label">{label}</div>
                <div className="duration-desc">{desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
