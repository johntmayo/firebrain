import React, { useState } from 'react';
import { api, setSessionToken } from '../api/client';

interface PasswordScreenProps {
  onAuthenticated: () => void;
}

export function PasswordScreen({ onAuthenticated }: PasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.login(password);
      setSessionToken(result.token);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid password');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary, #0a0a0a)',
      color: 'var(--text-primary, #e0e0e0)',
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      <div style={{
        background: 'var(--bg-secondary, #1a1a1a)',
        padding: '2rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #333)',
        minWidth: '300px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      }}>
        <h2 style={{
          marginTop: 0,
          marginBottom: '1.5rem',
          fontSize: '1.2rem',
          textAlign: 'center',
          color: 'var(--accent-primary, #8b5cf6)',
        }}>
          ⚔ FIREBRAIN ACCESS
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--text-secondary, #aaa)',
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--bg-primary, #0a0a0a)',
                border: '1px solid var(--border-color, #333)',
                borderRadius: '4px',
                color: 'var(--text-primary, #e0e0e0)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          
          {error && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '4px',
              color: '#ef4444',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading || !password 
                ? 'var(--bg-tertiary, #2a2a2a)' 
                : 'var(--accent-primary, #8b5cf6)',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--text-primary, #e0e0e0)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'AUTHENTICATING...' : 'ACCESS'}
          </button>
        </form>
      </div>
    </div>
  );
}
