import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Task } from '../types';

interface ActiveTimer {
  taskId: string;
  startTime: Date;
  durationMinutes: number;
  remainingSeconds: number;
}

interface TimerContextType {
  activeTimers: Map<string, ActiveTimer>;
  startTimer: (task: Task) => void;
  pauseTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => void;
  getTimerProgress: (taskId: string) => { progress: number; remainingSeconds: number } | null;
}

const TimerContext = createContext<TimerContextType | null>(null);

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
  const [activeTimers, setActiveTimers] = useState<Map<string, ActiveTimer>>(new Map());

  // Timer update interval
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers(prev => {
        const updated = new Map(prev);
        let hasChanges = false;

        updated.forEach((timer, taskId) => {
          const elapsedSeconds = Math.floor((Date.now() - timer.startTime.getTime()) / 1000);
          const totalSeconds = timer.durationMinutes * 60;
          const newRemaining = Math.max(0, totalSeconds - elapsedSeconds);

          if (newRemaining !== timer.remainingSeconds) {
            updated.set(taskId, { ...timer, remainingSeconds: newRemaining });
            hasChanges = true;

            // Auto-stop timer when it reaches 0
            if (newRemaining === 0) {
              updated.delete(taskId);
            }
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const startTimer = useCallback((task: Task) => {
    if (!task.timer_start || !task.timer_duration || !task.timer_active) {
      return;
    }

    const startTime = new Date(task.timer_start);
    const totalSeconds = task.timer_duration * 60;
    const elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    if (remainingSeconds > 0) {
      setActiveTimers(prev => new Map(prev).set(task.task_id, {
        taskId: task.task_id,
        startTime,
        durationMinutes: task.timer_duration,
        remainingSeconds
      }));
    }
  }, []);

  const pauseTimer = useCallback((taskId: string) => {
    setActiveTimers(prev => {
      const updated = new Map(prev);
      updated.delete(taskId);
      return updated;
    });
  }, []);

  const stopTimer = useCallback((taskId: string) => {
    setActiveTimers(prev => {
      const updated = new Map(prev);
      updated.delete(taskId);
      return updated;
    });
  }, []);

  const getTimerProgress = useCallback((taskId: string) => {
    const timer = activeTimers.get(taskId);
    if (!timer) return null;

    const totalSeconds = timer.durationMinutes * 60;
    const progress = ((totalSeconds - timer.remainingSeconds) / totalSeconds) * 100;

    return {
      progress: Math.min(100, Math.max(0, progress)),
      remainingSeconds: timer.remainingSeconds
    };
  }, [activeTimers]);

  const value: TimerContextType = {
    activeTimers,
    startTimer,
    pauseTimer,
    stopTimer,
    getTimerProgress
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}
