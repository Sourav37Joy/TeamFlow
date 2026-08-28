'use client';

import { useCallback, useEffect, useState } from 'react';
import PageSkeleton from '../../components/PageSkeleton';
import AssignmentForm from '../../components/AssignmentForm';
import CatalogueAdd from '../../components/CatalogueAdd';
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';
import PersonLink from '../../components/PersonLink';
import LoadLabel from '../../components/LoadLabel';
import {
  ApiFailure,
  AssignmentRow,
  CatalogueEntry,
  createEmployee,
  deleteEmployee,
  EmployeeRow,
  failureText,
  listEmployees,
  listProjects,
  listRoles,
  listSkills,
  LOAD_LABEL_TEXT,
  LOAD_LABELS,
  ProjectRow,
  removeEmployeeSkill,
  setEmployeeSkill,
  updateEmployee,
} from '../../lib/api';
import { useSession } from '../../lib/use-session';

interface SkillDraft {
  skillId: string;
  rating: number;
}

export default function EmployeesPage() {
  const { user, loading } = useSession();
  const administrator = user?.role === 'ADMINISTRATOR';

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [skills, setSkills] = useState<CatalogueEntry[]>([]);
  const [roles, setRoles] = useState<CatalogueEntry[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [asOf, setAsOf] = useState('');
  const [evaluatedOn, setEvaluatedOn] = useState('');

  const [q, setQ] = useState('');
  const [skillId, setSkillId] = useState('');
  const [loadLabel, setLoadLabel] = useState('');

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [assigning, setAssigning] = useState<EmployeeRow | null>(null);
  const [confirming, setConfirming] = useState<{
    employee: EmployeeRow;
    message: string;
    wouldRemove: AssignmentRow[];
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await listEmployees({ q, skillId, loadLabel, asOf: asOf || undefined });
      setEmployees(result.employees);
      setEvaluatedOn(result.asOf);
    } catch (failure) {
      setError(failureText(failure));
    }
  }, [q, skillId, loadLabel, asOf]);

  useEffect(() => {
    if (!user) return;
    Promise.all([listSkills(), listRoles(), listProjects()])
      .then(([skillList, roleList, projectList]) => {
        setSkills(skillList.skills);
        setRoles(roleList.roles);
        setProjects(projectList.projects);
      })
      .catch((failure) => setError(failureText(failure)));
  }, [user]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function remove(employee: EmployeeRow, confirmed: boolean) {
    setBusy(true);
    setError(null);
    try {
      await deleteEmployee(employee.id, confirmed);
      setConfirming(null);
      await load();
    } catch (failure) {
      if (failure instanceof ApiFailure && failure.error.code === 'CONFIRMATION_REQUIRED') {
        setConfirming({
          employee,
          message: failure.error.message,
          wouldRemove: failure.error.wouldRemove ?? [],
        });
      } else {
        setError(failureText(failure));
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSkeleton label="Loading people" rows={10} />;
  if (!user) return null;

  return (
    <section>
      <header className="page-head">
        <h2>People</h2>
        {administrator ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
          >
            New person
          </button>
        ) : (
          <p className="muted">Employee records are maintained by an Administrator.</p>
        )}
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="filters">
        <div>
          <label htmlFor="employee-search">Search name or role title</label>
          <input
            id="employee-search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Amara, QA Engineer..."
          />
        </div>
        <div>
          <label htmlFor="employee-skill">Holds skill</label>
          <select
            id="employee-skill"
            value={skillId}
            onChange={(event) => setSkillId(event.target.value)}
          >
            <option value="">Any skill</option>
            {skills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="employee-load">Load</label>
          <select
            id="employee-load"
            value={loadLabel}
            onChange={(event) => setLoadLabel(event.target.value)}
          >
            <option value="">Any load</option>
            {LOAD_LABELS.map((label) => (
              <option key={label} value={label}>
                {LOAD_LABEL_TEXT[label]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="employee-as-of">Evaluated on</label>
          <input
            id="employee-as-of"
            type="date"
            value={asOf || evaluatedOn}
            onChange={(event) => setAsOf(event.target.value)}
          />
        </div>
      </div>

      {creating || editing ? (
        <EmployeeForm
          skills={skills}
          employee={editing}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await load();
          }}
          onSkillChanged={load}
          onSkillAdded={(entry) =>
            setSkills((current) =>
              current.some((skill) => skill.id === entry.id)
                ? current
                : [...current, entry].sort((a, b) => a.name.localeCompare(b.name)),
            )
          }
        />
      ) : null}

      {assigning ? (
        <AssignmentForm
          employees={employees}
          projects={projects}
          roles={roles}
          prefill={{ employeeId: assigning.id }}
          onCancel={() => setAssigning(null)}
          onSaved={async () => {
            setAssigning(null);
            await load();
          }}
        />
      ) : null}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role title</th>
            <th>Load</th>
            <th>Spare</th>
            <th>Rated skills</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">
                No people match this search.
              </td>
            </tr>
          ) : null}
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>
                <PersonLink
                  id={employee.id}
                  name={employee.name}
                  avatarUrl={employee.avatarUrl}
                  size={36}
                />
              </td>
              <td>{employee.roleTitle}</td>
              <td>
                <LoadLabel
                  label={employee.loadLabel}
                  utilizationPercent={employee.utilizationPercent}
                />
              </td>
              <td>{employee.remainingCapacityPercent}%</td>
              <td>
                {employee.skills.length === 0 ? (
                  <span className="muted">None rated</span>
                ) : (
                  employee.skills.map((rated) => (
                    <span key={rated.skillId} className="pill">
                      {rated.skillName} {rated.rating}/5
                    </span>
                  ))
                )}
              </td>
              <td className="row-actions">
                <button type="button" className="link" onClick={() => setAssigning(employee)}>
                  Assign
                </button>
                {administrator ? (
                  <>
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setCreating(false);
                        setEditing(employee);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="link danger-text"
                      onClick={() => void remove(employee, false)}
                    >
                      Delete
                    </button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="muted">
        Load and spare capacity are evaluated on {asOf || evaluatedOn}. Open a person to see the
        assignments behind their total.
      </p>

      {confirming ? (
        <ConfirmDeleteDialog
          title={`Delete ${confirming.employee.name}?`}
          message={confirming.message}
          wouldRemove={confirming.wouldRemove}
          busy={busy}
          onProceed={() => void remove(confirming.employee, true)}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </section>
  );
}

interface FormProps {
  skills: CatalogueEntry[];
  employee: EmployeeRow | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
  onSkillChanged: () => Promise<void>;
  onSkillAdded: (entry: CatalogueEntry) => void;
}

function EmployeeForm({
  skills,
  employee,
  onCancel,
  onSaved,
  onSkillChanged,
  onSkillAdded,
}: FormProps) {
  const [name, setName] = useState(employee?.name ?? '');
  const [roleTitle, setRoleTitle] = useState(employee?.roleTitle ?? '');
  const [capacity, setCapacity] = useState(String(employee?.totalCapacityPercent ?? 100));
  const [drafts, setDrafts] = useState<SkillDraft[]>([]);
  const [rated, setRated] = useState(employee?.skills ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const totalCapacityPercent = Number(capacity);
      if (employee) {
        await updateEmployee(employee.id, { name, roleTitle, totalCapacityPercent });
      } else {
        await createEmployee({
          name,
          roleTitle,
          totalCapacityPercent,
          skills: drafts.filter((draft) => draft.skillId !== ''),
        });
      }
      await onSaved();
    } catch (failure) {
      setError(failureText(failure));
    } finally {
      setBusy(false);
    }
  }

  // On an existing person each rating is set on its own, so correcting one never means
  // recreating the record (FR-012).
  async function saveRating(skillId: string, rating: number) {
    if (!employee) return;
    setError(null);
    try {
      const updated = await setEmployeeSkill(employee.id, skillId, rating);
      setRated(updated.skills);
      await onSkillChanged();
    } catch (failure) {
      setError(failureText(failure));
    }
  }

  async function dropRating(skillId: string) {
    if (!employee) return;
    setError(null);
    try {
      const updated = await removeEmployeeSkill(employee.id, skillId);
      setRated(updated.skills);
      await onSkillChanged();
    } catch (failure) {
      setError(failureText(failure));
    }
  }

  const unrated = skills.filter((skill) => !rated.some((entry) => entry.skillId === skill.id));

  return (
    <div className="card form">
      <h3>{employee ? `Edit ${employee.name}` : 'New person'}</h3>
      {error ? <p className="error">{error}</p> : null}

      <form onSubmit={submit}>
        <div className="grid">
          <div>
            <label htmlFor="employee-name">Name</label>
            <input
              id="employee-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="employee-role-title">Role title</label>
            <input
              id="employee-role-title"
              value={roleTitle}
              onChange={(event) => setRoleTitle(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="employee-capacity">Total working capacity %</label>
            <input
              id="employee-capacity"
              type="number"
              min={1}
              max={100}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Saving...' : employee ? 'Save changes' : 'Create person'}
          </button>
          <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>

      <h4>Rated skills</h4>
      {employee ? (
        <>
          {rated.length === 0 ? <p className="muted">Nothing rated yet.</p> : null}
          {rated.map((entry) => (
            <div key={entry.skillId} className="skill-row">
              <span>{entry.skillName}</span>
              <select
                value={String(entry.rating)}
                onChange={(event) => void saveRating(entry.skillId, Number(event.target.value))}
                aria-label={`${entry.skillName} rating`}
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="link danger-text"
                onClick={() => void dropRating(entry.skillId)}
              >
                Remove
              </button>
            </div>
          ))}
          {unrated.length > 0 ? (
            <div className="skill-row">
              <select
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) void saveRating(event.target.value, 3);
                  event.target.value = '';
                }}
                aria-label="Add a rated skill"
              >
                <option value="">Add a skill, rated 3 to start</option>
                {unrated.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {drafts.map((draft, index) => (
            <div key={index} className="skill-row">
              <select
                value={draft.skillId}
                onChange={(event) =>
                  setDrafts(
                    drafts.map((entry, position) =>
                      position === index ? { ...entry, skillId: event.target.value } : entry,
                    ),
                  )
                }
                aria-label="Skill"
              >
                <option value="">Choose a skill</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
              <select
                value={String(draft.rating)}
                onChange={(event) =>
                  setDrafts(
                    drafts.map((entry, position) =>
                      position === index ? { ...entry, rating: Number(event.target.value) } : entry,
                    ),
                  )
                }
                aria-label="Rating"
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="link danger-text"
                onClick={() => setDrafts(drafts.filter((_entry, position) => position !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() => setDrafts([...drafts, { skillId: '', rating: 3 }])}
          >
            Add a skill
          </button>
        </>
      )}

      <CatalogueAdd
        kind="skill"
        onAdded={(entry) => {
          onSkillAdded(entry);
          if (employee) void saveRating(entry.id, 3);
          else setDrafts((current) => [...current, { skillId: entry.id, rating: 3 }]);
        }}
      />
    </div>
  );
}
