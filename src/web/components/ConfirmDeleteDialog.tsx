'use client';

import { AssignmentRow } from '../lib/api';
import Avatar from './Avatar';

interface Props {
  title: string;
  message: string;
  wouldRemove: AssignmentRow[];
  busy?: boolean;
  onProceed: () => void;
  onCancel: () => void;
}

// A delete that takes assignments with it names every one of them before it happens, so the
// consequence is read rather than discovered (FR-006, FR-013).
export default function ConfirmDeleteDialog({
  title,
  message,
  wouldRemove,
  busy,
  onProceed,
  onCancel,
}: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        {wouldRemove.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Project</th>
                <th>Role</th>
                <th>Allocation</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {wouldRemove.map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <span className="person">
                      <Avatar
                        name={assignment.employeeName}
                        avatarUrl={assignment.employeeAvatarUrl}
                        size={24}
                      />
                      {assignment.employeeName}
                    </span>
                  </td>
                  <td>{assignment.projectName}</td>
                  <td>{assignment.roleName}</td>
                  <td>{assignment.allocationPercent}%</td>
                  <td>
                    {assignment.startDate} to {assignment.endDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <div className="actions">
          <button type="button" className="danger" onClick={onProceed} disabled={busy}>
            {busy ? 'Deleting...' : 'Delete anyway'}
          </button>
          <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
            Keep it
          </button>
        </div>
      </div>
    </div>
  );
}
