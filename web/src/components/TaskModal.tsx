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
    cancelTask,
    johnEmail,
    stephEmail,
    meganEmail,
    quests,
  } = useApp();
  
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [challenge, setChallenge] = useState<Challenge | ''>('');
  const [assignee, setAssignee] = useState(johnEmail);
  const [dueDate, setDueDate] = useState('');
  const [questId, setQuestId] = useState('');
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
  
  // Populate form for edit/create; include modal/create flags so repeated "new mission"
  // openings always reset form state.
  useEffect(() => {
    if (isModalOpen && selectedTask && !isCreating) {
      setTitle(selectedTask.title);
      setNotes(selectedTask.notes || '');
      setPriority(selectedTask.priority);
      setChallenge(selectedTask.challenge || '');
      setAssignee(selectedTask.assignee);
      setDueDate(selectedTask.due_date ? selectedTask.due_date.substring(0, 10) : '');
      setQuestId(selectedTask.quest_id || '');
    } else {
      // Reset for new mission
      setTitle('');
      setNotes('');
      setPriority('medium');
      setChallenge('medium');
      setAssignee(johnEmail);
      setDueDate('');
      setQuestId('');
    }
  }, [isModalOpen, isCreating, selectedTask, johnEmail]);
  
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
          quest_id: questId || undefined,
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
          quest_id: questId,
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

  const handleDeleteMission = async () => {
    if (!selectedTask || isCreating || saving) return;
    const confirmed = window.confirm('Delete this mission? You can not undo this.');
    if (!confirmed) return;

    setSaving(true);
    try {
      await cancelTask(selectedTask.task_id);
      closeModal();
    } catch {
      // Error already handled in context
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isCreating ? 'New Mission' : 'Mission Details'}</h3>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                type="text"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                className="form-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any extra details..."
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  className="form-select"
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="challenge">Effort</label>
                <select
                  id="challenge"
                  className="form-select"
                  value={challenge}
                  onChange={e => setChallenge(e.target.value as Challenge | '')}
                >
                  <option value="">Not set</option>
                  <option value="low">Low (1pt)</option>
                  <option value="medium">Medium (2pt)</option>
                  <option value="high">High (3pt)</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="assignee">Assignee</label>
                <select
                  id="assignee"
                  className="form-select"
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                >
                  <option value={johnEmail}>John</option>
                  <option value={stephEmail}>Stef</option>
                  <option value={meganEmail}>Megan</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="dueDate">Due Date</label>
                <input
                  id="dueDate"
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="questId">Quest</label>
              <select
                id="questId"
                className="form-select"
                value={questId}
                onChange={e => setQuestId(e.target.value)}
              >
                <option value="">No quest</option>
                {quests.map(q => (
                  <option key={q.quest_id} value={q.quest_id}>
                    {q.is_tracked ? '⚡ ' : ''}{q.title}
                  </option>
                ))}
                {selectedTask?.quest_id && !quests.some(q => q.quest_id === selectedTask.quest_id) && (
                  <option value={selectedTask.quest_id}>
                    (COMPLETED/UNKNOWN QUEST)
                  </option>
                )}
              </select>
            </div>
            
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={closeModal}
              disabled={saving}
            >
              Close
            </button>
            {!isCreating && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteMission}
                disabled={saving}
              >
                Delete
              </button>
            )}
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? 'Saving...' : isCreating ? 'Create Mission' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

