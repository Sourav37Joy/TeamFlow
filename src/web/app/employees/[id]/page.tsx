'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AssignmentForm from '../../../components/AssignmentForm';
import Avatar from '../../../components/Avatar';
import EmptyState from '../../../components/EmptyState';
import LoadLabel from '../../../components/LoadLabel';
import ReplacementDialog from '../../../components/ReplacementDialog';
import ReplacementHistory from '../../../components/ReplacementHistory';
import {
  AssignmentRow,
  CatalogueEntry,
  deleteAssignment,
  EmployeeDetail,
  EmployeeRow,
  failureText,
  HeldAssignment,
  listEmployees,
  listProjects,
  listRoles,
  ProjectRow,
  readEmployee,
} from '../../../lib/api';
import { useSession } from '../../../lib/use-session';

const STANDING_TEXT = {
  ACTIVE: 'Counts today',
  EXPIRED: 'Ended',
  FUTURE: 'Not started',
} as const;

export default function EmployeeRecordPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params.id;
  const { user, loading } = useSession();

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [roles, setRoles] = useState<CatalogueEntry[]>([]);
  const [asOf, setAsOf] = useState('');

  const [editing, setEditing] = useState<AssignmentRow | null>(null);
  const [replacing, setReplacing] = useState<AssignmentRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEmployee(await readEmployee(employeeId, asOf || undefined));
    } catch (failure) {
      setError(failureText(failure));
    }
  }, [employeeId, asOf]);

  useEffect(() => {
    if (!user) return;
    Promise.all([listProjects(), listRoles(), listEmployees()])
      .then(([projectList, roleList, employeeList]) => {
        setProjects(projectList.projects);
        setRoles(roleList.roles);
        setEmployees(employeeList.employees);
      })
      .catch((failure) => setError(failureText(failure)));
  }, [user]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function drop(assignment: AssignmentRow) {
    setError(null);
    try {
      await deleteAssignment(assignment.id);
      await load();
    } catch (failure) {
      setError(failureText(failure));
    }
  }

  if (loading) return <p className="muted">Loading...</p>;
  if (!user) return null;
  if (!employee)
    return error ? <p className="error">{error}</p> : <p className="muted">Loading...</p>;

  const active = employee.assignments.filter((row) => row.standing === 'ACTIVE');
  const other = employee.assignments.filter((row) => row.standing !== 'ACTIVE');

  return (
    <section>
      <header className="page-head">
        <div className="person-head">
          <Avatar name={employee.name} avatarUrl={employee.avatarUrl} size={72} />
          <div>
            <h2>{employee.name}</h2>
            <p className="muted">
              {employee.roleTitle} &middot; capacity {employee.totalCapacityPercent}%
            </p>
          </div>
        </div>
        <Link href="/employees">Back to people</Link>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="card panel">
        <div className="group-head">
          <h3>Load on {employee.asOf}</h3>
          <div>
            <label htmlFor="employee-as-of">Evaluated on</label>
            <input
              id="employee-as-of"
              type="date"
              value={asOf || employee.asOf}
              onChange={(event) => setAsOf(event.target.value)}
            />
          </div>
        </div>

        <div className="figures">
          <div>
            <p className="figure-value">{employee.utilizationPercent}%</p>
            <p className="muted">committed</p>
          </div>
          <div>
            <p className="figure-value">{employee.remainingCapacityPercent}%</p>
            <p className="muted">remaining capacity</p>
          </div>
          <div>
            <LoadLabel label={employee.loadLabel} />
          </div>
        </div>

        <h4>What produces that total</h4>
        {active.length === 0 ? (
          <EmptyState
            title="Nothing is active on this date"
            detail={`${employee.name} holds no commitment covering this date, so the total is 0%.`}
            asOf={employee.asOf}
          />
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Role</th>
                  <th>Allocation</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {active.map((row) => (
                  <AssignmentRowCells
                    key={row.id}
                    row={row}
                    onEdit={() => setEditing(row)}
                    onReplace={() => setReplacing(row)}
                    onDelete={() => void drop(row)}
                  />
                ))}
              </tbody>
            </table>
            <p className="muted">
              These {active.length === 1 ? 'is the assignment' : `${active.length} assignments`} sum
              to {employee.utilizationPercent}%.
            </p>
          </>
        )}

        <h4>Ended and not yet started</h4>
        {other.length === 0 ? (
          <p className="muted">Nothing outside this date.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Role</th>
                <th>Allocation</th>
                <th>Starts</th>
                <th>Ends</th>
                <th>Standing</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {other.map((row) => (
                <AssignmentRowCells
                  key={row.id}
                  row={row}
                  standing
                  onEdit={() => setEditing(row)}
                  onReplace={() => setReplacing(row)}
                  onDelete={() => void drop(row)}
                />
              ))}
            </tbody>
          </table>
        )}
        <p className="muted">
          These are excluded from the total for {employee.asOf} and stay on the record with their
          dates.
        </p>
      </div>

      <div className="card panel">
        <h3>Rated skills</h3>
        {employee.skills.length === 0 ? (
          <p className="muted">Nothing rated yet.</p>
        ) : (
          <p>
            {employee.skills.map((rated) => (
              <span key={rated.skillId} className="pill">
                {rated.skillName} {rated.rating}/5
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="card panel">
        <h3>Replacement history</h3>
        <ReplacementHistory
          history={employee.replacementHistory}
          emptyText={`${employee.name} has not handed over or taken over an assignment.`}
        />
      </div>

      {editing ? (
        <AssignmentForm
          employees={employees}
          projects={projects}
          roles={roles}
          assignment={editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      ) : null}

      {replacing ? (
        <ReplacementDialog
          assignment={replacing}
          employees={employees}
          onCancel={() => setReplacing(null)}
          onDone={async () => {
            setReplacing(null);
            await load();
          }}
        />
      ) : null}
    </section>
  );
}

function AssignmentRowCells({
  row,
  standing,
  onEdit,
  onReplace,
  onDelete,
}: {
  row: HeldAssignment;
  standing?: boolean;
  onEdit: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  return (
    <tr>
      <td>
        <Link href={`/projects/${row.projectId}`}>{row.projectName}</Link>
      </td>
      <td>{row.roleName}</td>
      <td>{row.allocationPercent}%</td>
      <td>{row.startDate}</td>
      <td>{row.endDate}</td>
      {standing ? (
        <td>
          <span className="muted">{STANDING_TEXT[row.standing]}</span>
        </td>
      ) : null}
      <td className="row-actions">
        <button type="button" className="link" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="link" onClick={onReplace}>
          Replace
        </button>
        <button type="button" className="link danger-text" onClick={onDelete}>
          Delete
        </button>
      </td>
    </tr>
  );
}
