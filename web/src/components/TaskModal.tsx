import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Priority, Challenge, CreateTaskInput, UpdateTaskInput } from '../types';

export function TaskModal() {
  const {
    isModalOpen,
    selectedTask,
    isCreating,
    closeModal,
    createTask,
    updateTask,
    johnEmail,
    stephEmail,
  } = useApp();
  
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [challenge, setChallenge] = useState<Challenge | ''>('');
  const [assignee, setAssignee] = useState(johnEmail);
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);
  
  // Populate form when editing
  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setNotes(selectedTask.notes || '');
      setPriority(selectedTask.priority);
      setChallenge(selectedTask.challenge || '');
      setAssignee(selectedTask.assignee);
      setDueDate(selectedTask.due_date || '');
    } else {
      // Reset for new mission
      setTitle('');
      setNotes('');
      setPriority('medium');
      setChallenge('');
      setAssignee(johnEmail);
      setDueDate('');
    }
  }, [selectedTask, johnEmail]);
  
  if (!isModalOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setSaving(true);
    
    try {
      if (isCreating) {
        const input: CreateTaskInput = {
          title: title.trim(),
          notes: notes.trim() || undefined,
          priority,
          challenge: challenge || undefined,
          assignee,
          due_date: dueDate || undefined,
        };
        await createTask(input);
      } else if (selectedTask) {
        const input: UpdateTaskInput = {
          task_id: selectedTask.task_id,
          title: title.trim(),
          notes: notes.trim(),
          priority,
          challenge: challenge || undefined,
          assignee,
          due_date: dueDate,
        };
        await updateTask(input);
      }
    } catch {
      // Error already handled in context
    } finally {
      setSaving(false);
    }
  };
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };
  
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isCreating ? '◈ NEW MISSION' : '◇ EDIT MISSION'}</h3>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="title">OBJECTIVE *</label>
              <input
                id="title"
                type="text"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter mission objective..."
                autoFocus
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="notes">INTEL</label>
              <textarea
                id="notes"
                className="form-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional intel..."
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="priority">THREAT LEVEL</label>
                <select
                  id="priority"
                  className="form-select"
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                >
                  <option value="urgent">◆ CRITICAL</option>
                  <option value="high">◇ HIGH</option>
                  <option value="medium">○ MEDIUM</option>
                  <option value="low">· LOW</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="challenge">ESTIMATED CHALLENGE</label>
                <select
                  id="challenge"
                  className="form-select"
                  value={challenge}
                  onChange={e => setChallenge(e.target.value as Challenge | '')}
                >
                  <option value="">NONE</option>
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="assignee">OPERATOR</label>
                <select
                  id="assignee"
                  className="form-select"
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                >
                  <option value={johnEmail}>JOHN</option>
                  <option value={stephEmail}>STEF</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="dueDate">DEADLINE</label>
                <input
                  id="dueDate"
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            </div>
            
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={closeModal}
              disabled={saving}
            >
              CLOSE
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? 'PROCESSING...' : isCreating ? 'DEPLOY MISSION' : 'CONFIRM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

