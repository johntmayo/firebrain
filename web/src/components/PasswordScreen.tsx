import React, { useState } from 'react';
import { api, setSessionToken } from '../api/client';

interface PasswordScreenProps {
  onAuthenticated: () => void;
}

export function PasswordScreen({ onAuthenticated }: PasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.login(email, password);
      setSessionToken(result.token);
      localStorage.setItem('firebrain_user_email', result.userEmail);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
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
      background: 'var(--ground)',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        background: 'var(--surface)',
        padding: '2.5rem',
        borderRadius: '24px',
        border: '1px solid var(--border-light)',
        minWidth: '340px',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(26, 24, 20, 0.1)',
      }}>
        <h2 style={{
          marginTop: 0,
          marginBottom: '0.5rem',
          fontSize: '1.6rem',
          textAlign: 'center',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontStyle: 'italic',
          letterSpacing: '-0.02em',
        }}>
          Fire Brain
        </h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          marginBottom: '2rem',
          marginTop: 0,
        }}>
          Sign in to continue
        </p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--lavender)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--lavender)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          
          {error && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '0.65rem 1rem',
              background: 'var(--error-bg)',
              border: '1.5px solid rgba(217, 59, 59, 0.2)',
              borderRadius: '12px',
              color: 'var(--error)',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: '100%',
              padding: '0.8rem',
              background: loading || !email || !password 
                ? 'var(--surface-sunken)' 
                : 'var(--text-primary)',
              border: 'none',
              borderRadius: '9999px',
              color: loading || !email || !password 
                ? 'var(--text-muted)' 
                : 'var(--text-on-dark)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
