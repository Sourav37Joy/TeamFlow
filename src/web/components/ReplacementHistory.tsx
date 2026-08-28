import { ReplacementHistoryRow } from '../lib/api';

interface Props {
  history: ReplacementHistoryRow[];
  emptyText: string;
}

// Who handed what to whom, when it took effect, and who made the change. Repeated handovers
// append, so the sequence reads in order (FR-051, SC-008).
export default function ReplacementHistory({ history, emptyText }: Props) {
  if (history.length === 0) return <p className="muted">{emptyText}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Effective</th>
          <th>Handed over by</th>
          <th>Taken over by</th>
          <th>Project and role</th>
          <th>Performed by</th>
        </tr>
      </thead>
      <tbody>
        {history.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.effectiveDate}</td>
            <td>{entry.outgoingEmployeeName}</td>
            <td>{entry.incomingEmployeeName ?? <span className="muted">Record removed</span>}</td>
            <td>
              {entry.projectName ? (
                `${entry.projectName} - ${entry.roleName}`
              ) : (
                <span className="muted">Record removed</span>
              )}
            </td>
            <td>{entry.performedByName}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
