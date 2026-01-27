import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { CreateQuestInput, UpdateQuestInput } from '../types';

export function QuestModal() {
  const { 
    isQuestModalOpen, 
    selectedQuest, 
    isCreatingQuest, 
    closeQuestModal, 
    createQuest, 
    updateQuest,
    toggleQuestTracked,
    trackedQuests,
    currentUser,
    johnEmail,
    stephEmail,
  } = useApp();
  
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [assignee, setAssignee] = useState(johnEmail);
  const [saving, setSaving] = useState(false);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isQuestModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isQuestModalOpen]);
  
  // Populate form when editing
  useEffect(() => {
    if (selectedQuest) {
      setTitle(selectedQuest.title);
      setNotes(selectedQuest.notes || '');
      setAssignee(selectedQuest.assignee);
    } else {
      // Reset for new quest
      setTitle('');
      setNotes('');
      setAssignee(johnEmail);
    }
  }, [selectedQuest, johnEmail]);
  
  if (!isQuestModalOpen) return null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setSaving(true);
    
    try {
      if (isCreatingQuest) {
        const input: CreateQuestInput = {
          title: title.trim(),
          notes: notes.trim() || undefined,
          assignee,
        };
        await createQuest(input);
      } else if (selectedQuest) {
        const input: UpdateQuestInput = {
          quest_id: selectedQuest.quest_id,
          title: title.trim(),
          notes: notes.trim(),
          assignee,
        };
        await updateQuest(input);
      }
    } catch {
      // Error already handled in context
    } finally {
      setSaving(false);
    }
  };
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeQuestModal();
    }
  };

  const handleToggleTracked = async () => {
    if (!selectedQuest) return;
    
    const isCurrentlyTracked = selectedQuest.is_tracked;
    const canTrack = !isCurrentlyTracked && trackedQuests.length < 3;
    
    if (!canTrack && !isCurrentlyTracked) {
      // Show error toast will be handled by context
      return;
    }
    
    try {
      await toggleQuestTracked(selectedQuest.quest_id);
    } catch {
      // Error handled in context
    }
  };
  
  const canTrack = !selectedQuest?.is_tracked && trackedQuests.length < 3;
  const isViewingOwnQuest = selectedQuest && selectedQuest.assignee === currentUser;
  
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isCreatingQuest ? '⚔ NEW QUEST' : '⚔ EDIT QUEST'}</h3>
          <button className="modal-close" onClick={closeQuestModal}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="quest-title">OBJECTIVE *</label>
              <input
                id="quest-title"
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
              <label htmlFor="quest-notes">INTEL</label>
              <textarea
                id="quest-notes"
                className="form-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional intel..."
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="quest-assignee">OPERATOR</label>
              <select
                id="quest-assignee"
                className="form-select"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
              >
                <option value={johnEmail}>JOHN</option>
                <option value={stephEmail}>STEF</option>
              </select>
            </div>
            
            {!isCreatingQuest && selectedQuest && isViewingOwnQuest && (
              <div className="form-group">
                <label>TRACKING STATUS</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className={`btn ${selectedQuest.is_tracked ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={handleToggleTracked}
                    disabled={!canTrack && !selectedQuest.is_tracked}
                    style={{ flex: 1 }}
                  >
                    {selectedQuest.is_tracked ? '⚡ TRACKED' : '○ UNTRACKED'}
                  </button>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ({trackedQuests.length}/3 tracked)
                  </span>
                </div>
                {!canTrack && !selectedQuest.is_tracked && (
                  <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'var(--accent-secondary)' }}>
                    Maximum 3 tracked quests. Untrack another quest first.
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={closeQuestModal}
              disabled={saving}
            >
              ABORT
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? 'PROCESSING...' : isCreatingQuest ? 'DEPLOY QUEST' : 'CONFIRM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

