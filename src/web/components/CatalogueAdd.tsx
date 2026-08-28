'use client';

import { useState } from 'react';
import { CatalogueEntry, createRole, createSkill, failureText } from '../lib/api';

interface Props {
  kind: 'skill' | 'role';
  onAdded: (entry: CatalogueEntry) => void;
}

// Naming a skill or a role happens in the middle of describing a person or a project. Both
// roles may do it, and a name that already exists comes back rather than failing, so the flow
// it interrupted is never blocked (FR-083, D-03).
export default function CatalogueAdd({ kind, onAdded }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const entry =
        kind === 'skill' ? await createSkill(name.trim()) : await createRole(name.trim());
      onAdded(entry);
      setName('');
    } catch (failure) {
      setError(failureText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="catalogue-add">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={kind === 'skill' ? 'Add a skill not listed' : 'Add a role not listed'}
        aria-label={kind === 'skill' ? 'New skill name' : 'New role name'}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void add();
          }
        }}
      />
      <button type="button" className="secondary" onClick={() => void add()} disabled={busy}>
        {busy ? 'Adding...' : `Add ${kind}`}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
