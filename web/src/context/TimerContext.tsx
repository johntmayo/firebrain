import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

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

  // Force re-renders every second when timer is active
  const [, forceUpdate] = useState(0);

  // Save to localStorage whenever activeTimer changes
  useEffect(() => {
    if (activeTimer) {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(activeTimer));
    } else {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  }, [activeTimer]);

  // Timer update interval - force re-renders and auto-stop when complete
  useEffect(() => {
    if (!activeTimer) return;

    const interval = setInterval(() => {
      const elapsedMinutes = (Date.now() - activeTimer.startTime) / 1000 / 60;
      if (elapsedMinutes >= activeTimer.durationMinutes) {
        // Timer completed
        setActiveTimer(null);
        // Could add completion sound/notification here
      } else {
        // Force re-render to update countdown display
        forceUpdate(prev => prev + 1);
        console.log('Timer tick - forcing update'); // Debug
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const startTimer = useCallback((taskId: string, taskTitle: string, durationMinutes: number) => {
    console.log('TimerContext: Starting timer', { taskId, taskTitle, durationMinutes }); // Debug
    const newTimer = {
      taskId,
      taskTitle,
      startTime: Date.now(),
      durationMinutes
    };
    console.log('TimerContext: Setting activeTimer to:', newTimer); // Debug
    // Stop any existing timer
    setActiveTimer(newTimer);
  }, []);

  const stopTimer = useCallback(() => {
    setActiveTimer(null);
  }, []);

  const getTimerProgress = useCallback(() => {
    if (!activeTimer) return null;

    const elapsedMs = Date.now() - activeTimer.startTime;
    const elapsedMinutes = elapsedMs / 1000 / 60;
    const remainingMinutes = Math.max(0, activeTimer.durationMinutes - elapsedMinutes);
    const progress = ((activeTimer.durationMinutes - remainingMinutes) / activeTimer.durationMinutes) * 100;
    const remainingSeconds = Math.floor(remainingMinutes * 60);

    console.log('getTimerProgress:', {
      elapsedMs,
      elapsedMinutes,
      remainingMinutes,
      progress,
      remainingSeconds
    }); // Debug

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
