import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Priority, Challenge, CreateTaskInput, UpdateTaskInput, TodaySlot } from '../types';
import { ALL_SLOTS, SLOT_CONFIG } from '../types';

export function TaskModal() {
  const { 
    isModalOpen, 
    selectedTask, 
    isCreating, 
    closeModal, 
    createTask, 
    updateTask,
    assignToday,
    clearToday,
    todayTasks,
    currentUser,
    viewingLoadoutUser,
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
  const [selectedSlot, setSelectedSlot] = useState<TodaySlot | ''>('');
  
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
      // Set current slot if task is assigned to today
      setSelectedSlot(selectedTask.today_slot || '');
    } else {
      // Reset for new task
      setTitle('');
      setNotes('');
      setPriority('medium');
      setChallenge('');
      setAssignee(johnEmail);
      setDueDate('');
      setSelectedSlot('');
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
  
  const handleSlotChange = async (slot: TodaySlot | '') => {
    if (!selectedTask) return;
    
    const isViewingOwnLoadout = viewingLoadoutUser === currentUser;
    if (!isViewingOwnLoadout) {
      return; // Can't assign if viewing other user's loadout
    }
    
    setSelectedSlot(slot);
    
    if (slot === '') {
      // Clear from today
      if (selectedTask.today_slot) {
        await clearToday(selectedTask.task_id);
      }
    } else {
      // Assign to slot
      const occupyingTask = todayTasks.get(slot);
      if (occupyingTask && occupyingTask.task_id !== selectedTask.task_id) {
        // Slot is occupied - perform swap
        await assignToday(selectedTask.task_id, slot, occupyingTask.task_id);
      } else if (!occupyingTask) {
        // Slot is empty
        await assignToday(selectedTask.task_id, slot);
      }
    }
  };
  
  const isViewingOwnLoadout = viewingLoadoutUser === currentUser;
  const canAssignToSlots = !isCreating && selectedTask && isViewingOwnLoadout;
  
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isCreating ? '◈ NEW QUEST' : '◇ EDIT QUEST'}</h3>
          <button className="modal-close" onClick={closeModal}>
            ×
          </button>
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
                placeholder="Enter quest objective..."
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
                  <option value="one">ONE</option>
                  <option value="three">THREE</option>
                  <option value="five">FIVE</option>
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
            
            {canAssignToSlots && (
              <div className="form-group">
                <label>ASSIGN TO 1-3-5</label>
                <div className="slot-selector">
                  <button
                    type="button"
                    className={`slot-select-btn ${selectedSlot === '' ? 'active' : ''}`}
                    onClick={() => handleSlotChange('')}
                  >
                    NONE
                  </button>
                  {ALL_SLOTS.map(slot => {
                    const config = SLOT_CONFIG[slot];
                    const isOccupied = todayTasks.has(slot) && todayTasks.get(slot)?.task_id !== selectedTask?.task_id;
                    const isCurrent = selectedTask?.today_slot === slot;
                    
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`slot-select-btn slot-${config.size} ${isCurrent ? 'active' : ''} ${isOccupied ? 'occupied' : ''}`}
                        onClick={() => handleSlotChange(slot)}
                        disabled={isOccupied}
                        title={isOccupied ? `Slot ${slot} is occupied` : `Assign to ${slot}`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                {selectedTask?.today_slot && (
                  <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Currently assigned to: <strong>{selectedTask.today_slot}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={closeModal}
              disabled={saving}
            >
              ABORT
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? 'PROCESSING...' : isCreating ? 'DEPLOY QUEST' : 'CONFIRM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

