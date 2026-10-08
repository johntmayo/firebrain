import React, { useState } from 'react';
import { getPriorityLevel } from '../types';
import type { BulkImportResult } from '../api/client';
import { useApp } from '../context/AppContext';
import { parseMissionLines, type ParsedMission } from '../utils/parseMission';
import { Dialog, PriorityChip, StatChip, CrPips, challengeToCr } from './primitives';

type ParsedTask = ParsedMission;

/**
 * BulkImportModal — rendered once at App level (portaled by Dialog), opened
 * via `openBulkImport()` from anywhere. Never nested inside a pane.
 */
export function BulkImportModal() {
  const { createTask, bulkCreateTasks, showToast, isBulkImportOpen: isOpen, closeBulkImport: onClose } = useApp();
  const [inputText, setInputText] = useState('');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; results: BulkImportResult[] } | null>(null);

  // Grammar lives in utils/parseMission.ts (shared with the Quick add gadget).
  const parseTasks = (text: string): ParsedTask[] => parseMissionLines(text);

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

  const successCount = importProgress?.results.filter((r: BulkImportResult) => r.success).length ?? 0;
  const allSucceeded = importProgress ? successCount === importProgress.total : false;

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={handleClose} disabled={isImporting}>
        Cancel
      </button>
      <button
        type="button"
        className="btn btn--primary"
        onClick={handleImport}
        disabled={parsedTasks.length === 0 || isImporting}
      >
        {isImporting ? 'Importing…' : `Import ${parsedTasks.length || 0} mission${parsedTasks.length !== 1 ? 's' : ''}`}
      </button>
    </>
  );

  return (
    <Dialog open={isOpen} title="Bulk import" onClose={handleClose} footer={footer} busy={isImporting}>
      <div className="form-group">
        <label htmlFor="bulk-input">One mission per line</label>
        <textarea
          id="bulk-input"
          className="form-textarea form-textarea--mono"
          value={inputText}
          onChange={handleInputChange}
          placeholder={`Fix login bug -p1 ~high @today
Write project spec ~medium @nextweek
Call dentist @tomorrow #bring insurance card
Review pull requests -p2 ~low`}
          rows={7}
          disabled={isImporting}
          data-autofocus
        />
      </div>

      <div className="syntax-ref">
        <div className="syntax-ref__title t-2xs">Syntax</div>
        <div className="syntax-ref__grid">
          <code className="num">-p1 / -p2 / -p3</code>
          <span>priority (P1 = top)</span>
          <code className="num">~high / ~medium / ~low</code>
          <span>CR (energy cost: 3 / 2 / 1 cells)</span>
          <code className="num">@today / @tomorrow / @nextweek</code>
          <span>due date</span>
          <code className="num">@2026-05-20 / @5/20/26</code>
          <span>specific date</span>
          <code className="num">#your note text here</code>
          <span>notes (at end of line)</span>
        </div>
      </div>

      {parsedTasks.length > 0 && (
        <div className="form-group">
          <span className="form-label">Preview · <span className="num">{parsedTasks.length}</span> mission{parsedTasks.length !== 1 ? 's' : ''}</span>
          <div className="preview-list">
            {parsedTasks.map((task, i) => (
              <div key={i} className="preview-row">
                <span className="preview-row__title clamp-1">{task.title}</span>
                <div className="preview-row__tags">
                  <PriorityChip level={getPriorityLevel(task.priority)} />
                  {task.challenge && <CrPips cr={challengeToCr(task.challenge)} />}
                  {task.due_date && <StatChip mono>{task.due_date}</StatChip>}
                  {task.notes && <StatChip title={task.notes}>note</StatChip>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {importProgress && (
        <div className="form-group">
          <span className="form-label">Progress</span>
          <div className="progress">
            <div className="progress__track">
              <div className="progress__fill" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }} />
            </div>
            <div className="progress__stats num t-xs">
              <span>{importProgress.current} / {importProgress.total}</span>
              <span className={allSucceeded ? 'is-success' : 'is-warning'}>{successCount} succeeded</span>
            </div>
            {importProgress.results.some(r => !r.success) && (
              <div className="form-hint form-hint--danger t-xs">
                Some missions failed — check your formatting and try again.
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
