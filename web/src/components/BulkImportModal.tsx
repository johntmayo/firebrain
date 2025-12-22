import React, { useState } from 'react';
import type { Priority, CreateTaskInput } from '../types';
import type { BulkImportResult } from '../api/client';
import { useApp } from '../context/AppContext';

interface ParsedTask extends CreateTaskInput {
  originalText: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const { createTask, bulkCreateTasks, showToast } = useApp();
  const [inputText, setInputText] = useState('');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; results: BulkImportResult[] } | null>(null);

  const parseTasks = (text: string): ParsedTask[] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => parseTaskLine(line.trim())).filter(task => task.title);
  };

  const parseTaskLine = (line: string): ParsedTask => {
    let title = line;
    let priority: Priority = 'medium';
    let due_date = '';
    let notes = '';

    // Extract priority markers (case insensitive)
    const priorityMatch = line.match(/-\s*(urgent|high|medium|low)$/i);
    if (priorityMatch) {
      priority = priorityMatch[1].toLowerCase() as Priority;
      title = line.replace(priorityMatch[0], '').trim();
    }

    // Extract due date markers
    const dateMatch = title.match(/@\s*(\w+)/);
    if (dateMatch) {
      const dateValue = dateMatch[1].toLowerCase();
      if (dateValue === 'today') {
        due_date = new Date().toISOString().split('T')[0];
      } else if (dateValue === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        due_date = tomorrow.toISOString().split('T')[0];
      } else if (dateValue === 'nextweek' || dateValue === 'next-week') {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        due_date = nextWeek.toISOString().split('T')[0];
      }
      // Also support YYYY-MM-DD format
      else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        due_date = dateValue;
      }
      title = title.replace(dateMatch[0], '').trim();
    }

    // Extract notes (everything after #)
    const notesMatch = title.match(/#\s*(.+)$/);
    if (notesMatch) {
      notes = notesMatch[1].trim();
      title = title.replace(notesMatch[0], '').trim();
    }

    return {
      title,
      priority,
      due_date: due_date || undefined,
      notes: notes || undefined,
      originalText: line
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    setParsedTasks(parseTasks(text));
  };

  const handleImport = async () => {
    if (parsedTasks.length === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: parsedTasks.length, results: [] });

    try {
      // Use bulk import for multiple tasks, fallback to individual for single task
      if (parsedTasks.length === 1) {
        await createTask(parsedTasks[0]);
        setImportProgress({ current: 1, total: 1, results: [{ index: 0, success: true, task: {} as any }] });
        showToast(`Successfully imported 1 task!`, 'success');
      } else {
        const result = await bulkCreateTasks(parsedTasks);
        setImportProgress({
          current: result.total,
          total: result.total,
          results: result.results
        });

        if (result.error_count === 0) {
          showToast(`Successfully imported ${result.success_count} tasks!`, 'success');
        } else {
          showToast(`Imported ${result.success_count} tasks, ${result.error_count} failed`, result.error_count > 0 ? 'error' : 'success');
        }
      }

      // Clear the form after successful import
      setTimeout(() => {
        setInputText('');
        setParsedTasks([]);
        setImportProgress(null);
        onClose();
      }, 2000);

    } catch (error) {
      showToast('Failed to import tasks', 'error');
      setImportProgress(null);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setInputText('');
      setParsedTasks([]);
      setImportProgress(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const priorityColors: Record<Priority, string> = {
    urgent: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-gray-400'
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>◆ BULK TASK IMPORT</h3>
          <button className="modal-close" onClick={handleClose} disabled={isImporting}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="bulk-input">PASTE TASKS BELOW</label>
            <textarea
              id="bulk-input"
              className="form-input"
              value={inputText}
              onChange={handleInputChange}
              placeholder={`Example format:
Buy groceries - High Priority
Call dentist @tomorrow
Write blog post #draft the outline first
Fix bug in login flow - Urgent`}
              rows={8}
              disabled={isImporting}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
            />
            <div className="text-xs text-muted mt-2">
              Use -priority, @date, #notes syntax. One task per line.
            </div>
          </div>

          {/* Preview Section */}
          {parsedTasks.length > 0 && (
            <div className="form-group">
              <label>PREVIEW ({parsedTasks.length} tasks)</label>
              <div className="bg-tertiary p-3 rounded-md max-h-48 overflow-y-auto">
                {parsedTasks.map((task, index) => (
                  <div key={index} className="mb-2 pb-2 border-b border-border-subtle last:border-b-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{task.title}</span>
                      <span className={`text-xs px-1 ${priorityColors[task.priority]}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                    {task.due_date && (
                      <div className="text-xs text-secondary">📅 {task.due_date}</div>
                    )}
                    {task.notes && (
                      <div className="text-xs text-secondary">📝 {task.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import Progress */}
          {importProgress && (
            <div className="form-group">
              <label>IMPORT PROGRESS</label>
              <div className="bg-tertiary p-3 rounded-md">
                <div className="flex justify-between text-sm mb-2">
                  <span>{importProgress.current} / {importProgress.total} completed</span>
                  <span className={importProgress.results.filter(r => r.success).length === importProgress.total ? 'text-success' : 'text-warning'}>
                    {importProgress.results.filter(r => r.success).length} successful
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-accent-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>

                {importProgress.results.some(r => !r.success) && (
                  <div className="mt-3 text-xs text-error">
                    Some tasks failed to import. Check your input format.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isImporting}
          >
            CANCEL
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={parsedTasks.length === 0 || isImporting}
          >
            {isImporting ? 'IMPORTING...' : `IMPORT ${parsedTasks.length || 0} TASKS`}
          </button>
        </div>
      </div>
    </div>
  );
}