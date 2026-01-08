import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface ActiveTimer {
  taskId: string;
  taskTitle: string;
  startTime: number; // timestamp
  durationMinutes: number;
}

interface TimerContextType {
  activeTimer: ActiveTimer | null;
  startTimer: (taskId: string, taskTitle: string, durationMinutes: number) => void;
  stopTimer: () => void;
  getTimerProgress: () => { progress: number; remainingSeconds: number; taskTitle: string } | null;
}

const TimerContext = createContext<TimerContextType | null>(null);

const TIMER_STORAGE_KEY = 'firebrain-active-timer';

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
}

interface TimerProviderProps {
  children: ReactNode;
}

export function TimerProvider({ children }: TimerProviderProps) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(() => {
    // Load from localStorage on init
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) {
        const timer: ActiveTimer = JSON.parse(saved);
        // Check if timer hasn't expired (within 24 hours)
        const elapsed = (Date.now() - timer.startTime) / 1000 / 60; // minutes
        if (elapsed < timer.durationMinutes + 60) { // +1 hour grace period
          return timer;
        }
      }
    } catch (e) {
      // Invalid data, clear it
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
    return null;
  });

  // Save to localStorage whenever activeTimer changes
  useEffect(() => {
    if (activeTimer) {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(activeTimer));
    } else {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  }, [activeTimer]);

  // Timer update interval - auto-stop when complete
  useEffect(() => {
    if (!activeTimer) return;

    const interval = setInterval(() => {
      const elapsedMinutes = (Date.now() - activeTimer.startTime) / 1000 / 60;
      if (elapsedMinutes >= activeTimer.durationMinutes) {
        // Timer completed
        setActiveTimer(null);
        // Could add completion sound/notification here
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const startTimer = useCallback((taskId: string, taskTitle: string, durationMinutes: number) => {
    // Stop any existing timer
    setActiveTimer({
      taskId,
      taskTitle,
      startTime: Date.now(),
      durationMinutes
    });
  }, []);

  const stopTimer = useCallback(() => {
    setActiveTimer(null);
  }, []);

  const getTimerProgress = useCallback(() => {
    if (!activeTimer) return null;

    const elapsedMinutes = (Date.now() - activeTimer.startTime) / 1000 / 60;
    const remainingMinutes = Math.max(0, activeTimer.durationMinutes - elapsedMinutes);
    const progress = ((activeTimer.durationMinutes - remainingMinutes) / activeTimer.durationMinutes) * 100;
    const remainingSeconds = Math.floor(remainingMinutes * 60);

    return {
      progress: Math.min(100, Math.max(0, progress)),
      remainingSeconds,
      taskTitle: activeTimer.taskTitle
    };
  }, [activeTimer]);

  const value: TimerContextType = {
    activeTimer,
    startTimer,
    stopTimer,
    getTimerProgress
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}
