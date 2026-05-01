import React, { useState } from 'react';
import type { Priority, Challenge, CreateTaskInput } from '../types';
import type { BulkImportResult } from '../api/client';
import { useApp } from '../context/AppContext';

interface ParsedTask extends Omit<CreateTaskInput, 'priority'> {
  priority: Priority;
  challenge?: Challenge;
  originalText: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: 'var(--priority-urgent)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
};

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const { createTask, bulkCreateTasks, showToast } = useApp();
  const [inputText, setInputText] = useState('');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; results: BulkImportResult[] } | null>(null);

  const parseTaskLine = (line: string): ParsedTask => {
    let title = line;
    let priority: Priority = 'medium';
    let challenge: Challenge | undefined;
    let due_date = '';
    let notes = '';

    // Extract notes — everything after the last # that isn't part of a word
    const notesMatch = title.match(/#\s*(.+)$/);
    if (notesMatch) {
      notes = notesMatch[1].trim();
      title = title.replace(notesMatch[0], '').trim();
    }

    // Extract priority: -urgent / -high / -medium / -low (case insensitive)
    const priorityMatch = title.match(/-\s*(urgent|high|medium|low)\b/i);
    if (priorityMatch) {
      priority = priorityMatch[1].toLowerCase() as Priority;
      title = title.replace(priorityMatch[0], '').trim();
    }

    // Extract challenge/effort: ~low / ~medium / ~high (case insensitive)
    const challengeMatch = title.match(/~\s*(low|medium|high)\b/i);
    if (challengeMatch) {
      challenge = challengeMatch[1].toLowerCase() as Challenge;
      title = title.replace(challengeMatch[0], '').trim();
    }

    // Extract due date: @today, @tomorrow, @nextweek, @YYYY-MM-DD, @MM/DD/YY
    const dateMatch = title.match(/@\s*([\w/.-]+)/);
    if (dateMatch) {
      const dateValue = dateMatch[1].toLowerCase();
      if (dateValue === 'today') {
        due_date = new Date().toISOString().split('T')[0];
      } else if (dateValue === 'tomorrow') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        due_date = d.toISOString().split('T')[0];
      } else if (dateValue === 'nextweek' || dateValue === 'next-week') {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        due_date = d.toISOString().split('T')[0];
      } else {
        // MM/DD/YY or MM/DD/YYYY
        const slashMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (slashMatch) {
          let [, month, day, year] = slashMatch;
          if (year.length === 2) year = '20' + year;
          const d = new Date(Number(year), Number(month) - 1, Number(day));
          if (!isNaN(d.getTime())) due_date = d.toISOString().split('T')[0];
        } else {
          // YYYY-MM-DD or other parseable formats
          const parsed = new Date(dateValue);
          if (!isNaN(parsed.getTime()) && dateValue.match(/\d/)) {
            due_date = parsed.toISOString().split('T')[0];
          }
        }
      }
      title = title.replace(dateMatch[0], '').trim();
    }

    // Clean up any leftover double-spaces
    title = title.replace(/\s{2,}/g, ' ').trim();

    return {
      title,
      priority,
      challenge,
      due_date: due_date || undefined,
      notes: notes || undefined,
      originalText: line,
    };
  };

  const parseTasks = (text: string): ParsedTask[] =>
    text.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(parseTaskLine)
      .filter(t => t.title);

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
      if (parsedTasks.length === 1) {
        await createTask(parsedTasks[0]);
        setImportProgress({ current: 1, total: 1, results: [{ index: 0, success: true, task: {} as any }] });
        showToast('Successfully imported 1 mission!', 'success');
      } else {
        const result = await bulkCreateTasks(parsedTasks);
        setImportProgress({ current: result.total, total: result.total, results: result.results });
        if (result.error_count === 0) {
          showToast(`Successfully imported ${result.success_count} missions!`, 'success');
        } else {
          showToast(`Imported ${result.success_count} missions, ${result.error_count} failed`, 'error');
        }
      }

      setTimeout(() => {
        setInputText('');
        setParsedTasks([]);
        setImportProgress(null);
        onClose();
      }, 2000);
    } catch (error) {
      showToast(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
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

  const successCount = importProgress?.results.filter((r: BulkImportResult) => r.success).length ?? 0;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Bulk Import</h3>
          <button className="modal-close" onClick={handleClose} disabled={isImporting}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="bulk-input">One mission per line</label>
            <textarea
              id="bulk-input"
              className="form-input"
              value={inputText}
              onChange={handleInputChange}
              placeholder={`Fix login bug -urgent ~high @today
Write project spec ~medium @nextweek
Call dentist @tomorrow #bring insurance card
Review pull requests -high ~low`}
              rows={7}
              disabled={isImporting}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', lineHeight: '1.6' }}
            />
          </div>

          <div className="bulk-syntax-ref">
            <div className="bulk-syntax-title">Syntax</div>
            <div className="bulk-syntax-grid">
              <span className="bulk-syntax-token">-urgent / -high / -medium / -low</span>
              <span className="bulk-syntax-desc">priority</span>
              <span className="bulk-syntax-token">~high / ~medium / ~low</span>
              <span className="bulk-syntax-desc">effort (CR points)</span>
              <span className="bulk-syntax-token">@today / @tomorrow / @nextweek</span>
              <span className="bulk-syntax-desc">due date</span>
              <span className="bulk-syntax-token">@2026-05-20 / @5/20/26</span>
              <span className="bulk-syntax-desc">specific date</span>
              <span className="bulk-syntax-token">#your note text here</span>
              <span className="bulk-syntax-desc">notes (at end of line)</span>
            </div>
          </div>

          {parsedTasks.length > 0 && (
            <div className="form-group">
              <label>Preview — {parsedTasks.length} mission{parsedTasks.length !== 1 ? 's' : ''}</label>
              <div className="bulk-preview-list">
                {parsedTasks.map((task, i) => (
                  <div key={i} className="bulk-preview-row">
                    <span className="bulk-preview-title">{task.title}</span>
                    <div className="bulk-preview-tags">
                      <span
                        className="bulk-preview-tag"
                        style={{ color: PRIORITY_COLORS[task.priority], borderColor: PRIORITY_COLORS[task.priority] }}
                      >
                        {task.priority}
                      </span>
                      {task.challenge && (
                        <span className="bulk-preview-tag bulk-preview-tag--challenge">
                          CR {task.challenge === 'low' ? '1' : task.challenge === 'medium' ? '2' : '3'}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="bulk-preview-tag bulk-preview-tag--date">{task.due_date}</span>
                      )}
                      {task.notes && (
                        <span className="bulk-preview-tag bulk-preview-tag--notes" title={task.notes}>note</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importProgress && (
            <div className="form-group">
              <label>Progress</label>
              <div className="bulk-progress">
                <div className="bulk-progress-bar-track">
                  <div
                    className="bulk-progress-bar-fill"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
                <div className="bulk-progress-stats">
                  <span>{importProgress.current} / {importProgress.total}</span>
                  <span style={{ color: successCount === importProgress.total ? 'var(--success)' : 'var(--warning)' }}>
                    {successCount} succeeded
                  </span>
                </div>
                {importProgress.results.some(r => !r.success) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.25rem' }}>
                    Some missions failed — check your formatting and try again.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isImporting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={parsedTasks.length === 0 || isImporting}
          >
            {isImporting ? 'Importing…' : `Import ${parsedTasks.length || 0} Mission${parsedTasks.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
