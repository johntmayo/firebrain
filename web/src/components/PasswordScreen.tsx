import React, { useState } from 'react';
import { api, setSessionToken } from '../api/client';
import firebrainLogo from '../assets/firebrain_logo.svg';

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

  const disabled = loading || !email || !password;

  return (
    <div className="login">
      <form className="login__panel panel-frame" onSubmit={handleSubmit}>
        <div className="login__brand">
          <img className="app-logo__image" src={firebrainLogo} alt="" />
          <h1 className="t-display">Fire Brain</h1>
          <p className="t-xs">Operator sign-in</p>
        </div>

        <div className="form-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="username"
            placeholder="you@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="inline-notice inline-notice--danger t-xs" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={disabled}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
