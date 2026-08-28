'use client';

import { useState } from 'react';
import {
  ApiFailure,
  AssignmentRow,
  CatalogueEntry,
  createAssignment,
  EmployeeRow,
  failureText,
  ProjectRow,
  updateAssignment,
  Warning,
} from '../lib/api';
import WarningDialog from './WarningDialog';

interface Props {
  employees: EmployeeRow[];
  projects: ProjectRow[];
  roles: CatalogueEntry[];
  prefill?: { employeeId?: string; projectId?: string; roleId?: string };
  assignment?: AssignmentRow;
  onSaved: (assignment: AssignmentRow) => void;
  onCancel: () => void;
}

// Reachable from a project's role requirement with the project and role already chosen, and
// from a person's record with the person already chosen (FR-017).
export default function AssignmentForm({
  employees,
  projects,
  roles,
  prefill,
  assignment,
  onSaved,
  onCancel,
}: Props) {
  const editing = assignment !== undefined;
  const [employeeId, setEmployeeId] = useState(assignment?.employeeId ?? prefill?.employeeId ?? '');
  const [projectId, setProjectId] = useState(assignment?.projectId ?? prefill?.projectId ?? '');
  const [roleId, setRoleId] = useState(assignment?.roleId ?? prefill?.roleId ?? '');
  const [allocationPercent, setAllocationPercent] = useState(
    String(assignment?.allocationPercent ?? 50),
  );
  const [startDate, setStartDate] = useState(assignment?.startDate ?? '');
  const [endDate, setEndDate] = useState(assignment?.endDate ?? '');

  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(acknowledgeWarnings: boolean) {
    setBusy(true);
    setError(null);
    try {
      const percent = Number(allocationPercent);
      const result = editing
        ? await updateAssignment(assignment.id, {
            roleId,
            allocationPercent: percent,
            startDate,
            endDate,
            acknowledgeWarnings,
          })
        : await createAssignment({
            employeeId,
            projectId,
            roleId,
            allocationPercent: percent,
            startDate,
            endDate,
            acknowledgeWarnings,
          });

      setWarnings([]);
      if (result.assignment) onSaved(result.assignment);
    } catch (failure) {
      // The server allows the write but wants the warning acknowledged first, so the figures
      // it returned are shown and the same save is offered again (Constitution VIII).
      if (failure instanceof ApiFailure && failure.error.code === 'WARNINGS_NOT_ACKNOWLEDGED') {
        setWarnings(failure.error.warnings ?? []);
      } else {
        setError(failureText(failure));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card form">
      <h3>{editing ? 'Edit assignment' : 'New assignment'}</h3>
      {error ? <p className="error">{error}</p> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(false);
        }}
      >
        <div className="grid">
          <div>
            <label htmlFor="assignment-employee">Person</label>
            {editing ? (
              <p className="fixed">{assignment.employeeName}</p>
            ) : (
              <select
                id="assignment-employee"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                required
              >
                <option value="">Choose a person</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.roleTitle}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="assignment-project">Project</label>
            {editing ? (
              <p className="fixed">{assignment.projectName}</p>
            ) : (
              <select
                id="assignment-project"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                required
              >
                <option value="">Choose a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="assignment-role">Role filled</label>
            <select
              id="assignment-role"
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              required
            >
              <option value="">Choose a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="assignment-percent">Allocation %</label>
            <input
              id="assignment-percent"
              type="number"
              min={1}
              max={100}
              value={allocationPercent}
              onChange={(event) => setAllocationPercent(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="assignment-start">Starts</label>
            <input
              id="assignment-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="assignment-end">Ends</label>
            <input
              id="assignment-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </div>
        </div>

        {editing ? (
          <p className="muted">
            The person and the project are fixed on an existing assignment. The role, percentage,
            and dates can all be changed.
          </p>
        ) : null}

        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Saving...' : editing ? 'Save changes' : 'Create assignment'}
          </button>
          <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>

      {warnings.length > 0 ? (
        <WarningDialog
          title="This is allowed, but check it first"
          warnings={warnings}
          busy={busy}
          onProceed={() => void save(true)}
          onCancel={() => setWarnings([])}
        />
      ) : null}
    </div>
  );
}
