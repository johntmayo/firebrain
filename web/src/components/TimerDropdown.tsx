import React, { useState } from 'react';
import { useTimer } from '../context/TimerContext';

interface TimerDropdownProps {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const DURATIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '25 min', value: 25 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
];

export function TimerDropdown({ taskId, taskTitle, isOpen, onClose, triggerRef }: TimerDropdownProps) {
  const { startTimer } = useTimer();

  const handleSelectDuration = (duration: number) => {
    console.log('Starting timer:', taskId, taskTitle, duration); // Debug
    startTimer(taskId, taskTitle, duration);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent backdrop click when clicking inside dropdown
  };

  if (!isOpen || !triggerRef.current) return null;

  const rect = triggerRef.current.getBoundingClientRect();

  return (
    <>
      {/* Backdrop to close dropdown */}
      <div
        className="timer-dropdown-backdrop"
        onClick={handleBackdropClick}
      />

      <div
        className="timer-dropdown"
        onClick={handleDropdownClick}
        style={{
          top: rect.bottom + 4,
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 140)) // Keep within viewport
        }}
      >
        <div className="timer-dropdown-header">
          <span className="timer-icon-small">⏱️</span>
          Start Timer
        </div>
        <div className="timer-dropdown-options">
          {DURATIONS.map(({ label, value }) => (
            <button
              key={value}
              className="timer-dropdown-option"
              onClick={() => handleSelectDuration(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
