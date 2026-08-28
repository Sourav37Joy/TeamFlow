'use client';

import { useEffect, useState } from 'react';
import {
  ApiFailure,
  AssignmentRow,
  Candidate,
  EmployeeRow,
  failureText,
  replaceOnAssignment,
  replacementCandidates,
  ReplacementShortlist,
  Warning,
} from '../lib/api';
import Avatar from './Avatar';
import CandidateList from './CandidateList';
import WarningDialog from './WarningDialog';

interface Props {
  assignment: AssignmentRow;
  employees: EmployeeRow[];
  onDone: () => void | Promise<void>;
  onCancel: () => void;
}

// The role, percentage, and end date carry across by default and are shown as they will be
// applied; the percentage and end date can be adjusted before confirming. Cancelling changes
// nothing at all - the write only happens on confirm (FR-044, FR-052).
export default function ReplacementDialog({ assignment, employees, onDone, onCancel }: Props) {
  const [incomingEmployeeId, setIncomingEmployeeId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [allocationPercent, setAllocationPercent] = useState(String(assignment.allocationPercent));
  const [endDate, setEndDate] = useState(assignment.endDate);

  const [shortlist, setShortlist] = useState<ReplacementShortlist | null>(null);
  const [showCandidates, setShowCandidates] = useState(false);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!showCandidates || shortlist) return;
    replacementCandidates(assignment.id)
      .then(setShortlist)
      .catch((failure) => setError(failureText(failure)));
  }, [showCandidates, shortlist, assignment.id]);

  function body(acknowledgeWarnings: boolean) {
    return {
      incomingEmployeeId,
      effectiveDate,
      allocationPercent: Number(allocationPercent),
      endDate,
      acknowledgeWarnings,
    };
  }

  async function confirm(acknowledgeWarnings: boolean) {
    setBusy(true);
    setError(null);
    try {
      const result = await replaceOnAssignment(assignment.id, body(acknowledgeWarnings));
      setWarnings([]);
      if (result.incoming) await onDone();
    } catch (failure) {
      if (failure instanceof ApiFailure && failure.error.code === 'WARNINGS_NOT_ACKNOWLEDGED') {
        setWarnings(failure.error.warnings ?? []);
      } else {
        setError(failureText(failure));
      }
    } finally {
      setBusy(false);
    }
  }

  function take(candidate: Candidate) {
    setIncomingEmployeeId(candidate.employeeId);
    setShowCandidates(false);
  }

  const others = employees.filter((employee) => employee.id !== assignment.employeeId);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Replace a person">
      <div className="dialog wide">
        <h3 className="group-person">
          <Avatar
            name={assignment.employeeName}
            avatarUrl={assignment.employeeAvatarUrl}
            size={40}
          />
          <span>Replace {assignment.employeeName}</span>
        </h3>
        <p className="muted">
          {assignment.projectName} &middot; {assignment.roleName} &middot;{' '}
          {assignment.allocationPercent}% &middot; {assignment.startDate} to {assignment.endDate}
        </p>

        {error ? <p className="error">{error}</p> : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void confirm(false);
          }}
        >
          <div className="grid">
            <div>
              <label htmlFor="replacement-incoming">Taken over by</label>
              <select
                id="replacement-incoming"
                value={incomingEmployeeId}
                onChange={(event) => setIncomingEmployeeId(event.target.value)}
                required
              >
                <option value="">Choose a person</option>
                {others.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.remainingCapacityPercent}% spare
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="replacement-date">Handover takes effect</label>
              <input
                id="replacement-date"
                type="date"
                value={effectiveDate}
                min={assignment.startDate}
                max={assignment.endDate}
                onChange={(event) => setEffectiveDate(event.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="replacement-percent">Allocation % carried across</label>
              <input
                id="replacement-percent"
                type="number"
                min={1}
                max={100}
                value={allocationPercent}
                onChange={(event) => setAllocationPercent(event.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="replacement-end">End date carried across</label>
              <input
                id="replacement-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </div>
          </div>

          <p className="muted">
            {assignment.employeeName} keeps the commitment up to the day before the handover, and
            the incoming person takes it from the handover date. The project&apos;s headcount for{' '}
            {assignment.roleName} does not dip.
          </p>

          <div className="actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Replacing...' : 'Confirm replacement'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setShowCandidates(!showCandidates)}
            >
              {showCandidates ? 'Hide suggestions' : 'Suggest candidates'}
            </button>
            <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>

        {showCandidates && shortlist ? (
          <div className="panel-inset">
            <h4>Suggested candidates</h4>
            <CandidateList
              candidates={shortlist.candidates}
              requiredSkillName={shortlist.requiredSkillName}
              reason={shortlist.reason}
              message={shortlist.message}
              asOf={shortlist.asOf}
              acceptLabel="Choose"
              onAccept={take}
            />
          </div>
        ) : null}

        {warnings.length > 0 ? (
          <WarningDialog
            title="This handover is allowed, but check it first"
            warnings={warnings}
            busy={busy}
            onProceed={() => void confirm(true)}
            onCancel={() => setWarnings([])}
          />
        ) : null}
      </div>
    </div>
  );
}
