'use client';

import { Warning } from '../lib/api';

interface Props {
  title: string;
  warnings: Warning[];
  busy?: boolean;
  onProceed: () => void;
  onCancel: () => void;
}

// A warning states the number it is warning about and offers to go ahead. Overallocation is a
// real state of the world a manager must be able to record, so nothing here refuses the save -
// it only makes sure the consequence was seen first (FR-021, Constitution VIII).
export default function WarningDialog({ title, warnings, busy, onProceed, onCancel }: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog">
        <h3>{title}</h3>
        <ul className="warnings">
          {warnings.map((warning) => (
            <li key={warning.code}>
              <p>{warning.message}</p>
              {warning.resultingPercent !== undefined && warning.capacityPercent !== undefined ? (
                <p className="figure">
                  Resulting total <strong>{warning.resultingPercent}%</strong> against a capacity of{' '}
                  {warning.capacityPercent}%{warning.onDate ? ` from ${warning.onDate}` : ''}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="actions">
          <button type="button" onClick={onProceed} disabled={busy}>
            {busy ? 'Saving...' : 'Save anyway'}
          </button>
          <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
