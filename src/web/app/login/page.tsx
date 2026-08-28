'use client';

import { useState } from 'react';
import { ApiFailure, SessionUser, signIn, signOut } from '../../lib/api';

// Sign in and sign out, complete. There is nowhere to redirect to yet: the dashboard
// arrives with User Story 8, and Constitution I rules out a placeholder page to land on.
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSession(await signIn(email, password));
      setPassword('');
    } catch (failure) {
      setError(
        failure instanceof ApiFailure ? failure.error.message : 'Sign in could not be completed.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    await signOut();
    setSession(null);
  }

  if (session) {
    return (
      <div className="card" style={{ maxWidth: 420 }}>
        <h2 style={{ marginTop: 0 }}>Signed in</h2>
        <p>
          {session.displayName} &middot; {session.email}
        </p>
        <p>
          Role: <strong>{session.role === 'ADMINISTRATOR' ? 'Administrator' : 'Project Manager'}</strong>
        </p>
        <button type="button" onClick={leave}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 380 }}>
      <h2 style={{ marginTop: 0 }}>Sign in</h2>
      <form onSubmit={submit}>
        {error ? <p className="error">{error}</p> : null}
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
