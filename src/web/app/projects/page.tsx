'use client';

import { useCallback, useEffect, useState } from 'react';
import AssignmentForm from '../../components/AssignmentForm';
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';
import {
  addRequirement,
  ApiFailure,
  AssignmentRow,
  CatalogueEntry,
  createProject,
  deleteProject,
  EmployeeRow,
  failureText,
  listEmployees,
  listProjects,
  listRoles,
  listSkills,
  ProjectDetail,
  ProjectRow,
  PROJECT_STATUSES,
  ProjectStatus,
  readProject,
  removeRequirement,
  RequirementInput,
  updateProject,
  updateRequirement,
} from '../../lib/api';
import { useSession } from '../../lib/use-session';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function ProjectsPage() {
  const { user, loading } = useSession();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [roles, setRoles] = useState<CatalogueEntry[]>([]);
  const [skills, setSkills] = useState<CatalogueEntry[]>([]);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [assigning, setAssigning] = useState<{ projectId: string; roleId?: string } | null>(null);
  const [confirming, setConfirming] = useState<{
    project: ProjectRow;
    message: string;
    wouldRemove: AssignmentRow[];
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await listProjects({ q, status });
      setProjects(result.projects);
    } catch (failure) {
      setError(failureText(failure));
    }
  }, [q, status]);

  useEffect(() => {
    if (!user) return;
    Promise.all([listRoles(), listSkills(), listEmployees()])
      .then(([roleList, skillList, employeeList]) => {
        setRoles(roleList.roles);
        setSkills(skillList.skills);
        setEmployees(employeeList.employees);
      })
      .catch((failure) => setError(failureText(failure)));
  }, [user]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function openDetail(project: ProjectRow) {
    if (detail?.id === project.id) {
      setDetail(null);
      return;
    }
    try {
      setDetail(await readProject(project.id));
    } catch (failure) {
      setError(failureText(failure));
    }
  }

  async function refreshDetail() {
    if (detail) setDetail(await readProject(detail.id));
  }

  async function remove(project: ProjectRow, confirmed: boolean) {
    setBusy(true);
    setError(null);
    try {
      await deleteProject(project.id, confirmed);
      setConfirming(null);
      if (detail?.id === project.id) setDetail(null);
      await load();
    } catch (failure) {
      if (failure instanceof ApiFailure && failure.error.code === 'CONFIRMATION_REQUIRED') {
        setConfirming({
          project,
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

  if (loading) return <p className="muted">Loading projects...</p>;
  if (!user) return null;

  return (
    <section>
      <header className="page-head">
        <h2>Projects</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          New project
        </button>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="filters">
        <div>
          <label htmlFor="project-search">Search by name</label>
          <input
            id="project-search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Atlas rollout..."
          />
        </div>
        <div>
          <label htmlFor="project-status">Status</label>
          <select
            id="project-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Any status</option>
            {PROJECT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {creating || editing ? (
        <ProjectForm
          roles={roles}
          skills={skills}
          project={editing}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await load();
            await refreshDetail();
          }}
        />
      ) : null}

      {assigning ? (
        <AssignmentForm
          employees={employees}
          projects={projects}
          roles={roles}
          prefill={{ projectId: assigning.projectId, roleId: assigning.roleId }}
          onCancel={() => setAssigning(null)}
          onSaved={async () => {
            setAssigning(null);
            await refreshDetail();
          }}
        />
      ) : null}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr>
              <td colSpan={3} className="muted">
                No projects match this search.
              </td>
            </tr>
          ) : null}
          {projects.map((project) => (
            <tr key={project.id}>
              <td>
                <strong>{project.name}</strong>
              </td>
              <td>
                <span className={`status status-${project.status.toLowerCase()}`}>
                  {STATUS_LABELS[project.status]}
                </span>
              </td>
              <td className="row-actions">
                <button type="button" className="link" onClick={() => void openDetail(project)}>
                  {detail?.id === project.id ? 'Hide' : 'Roles and people'}
                </button>
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setCreating(false);
                    setEditing(project);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="link danger-text"
                  onClick={() => void remove(project, false)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {detail ? (
        <ProjectPanel
          detail={detail}
          roles={roles}
          skills={skills}
          onAssign={(roleId) => setAssigning({ projectId: detail.id, roleId })}
          onChanged={refreshDetail}
        />
      ) : null}

      {confirming ? (
        <ConfirmDeleteDialog
          title={`Delete ${confirming.project.name}?`}
          message={confirming.message}
          wouldRemove={confirming.wouldRemove}
          busy={busy}
          onProceed={() => void remove(confirming.project, true)}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </section>
  );
}

interface PanelProps {
  detail: ProjectDetail;
  roles: CatalogueEntry[];
  skills: CatalogueEntry[];
  onAssign: (roleId?: string) => void;
  onChanged: () => Promise<void>;
}

// The declared roles and the register read from the project's side: what the project asked
// for, and who is actually on it (FR-002, FR-005, FR-024).
function ProjectPanel({ detail, roles, skills, onAssign, onChanged }: PanelProps) {
  const [roleId, setRoleId] = useState('');
  const [requiredSkillId, setRequiredSkillId] = useState('');
  const [headcount, setHeadcount] = useState('1');
  const [error, setError] = useState<string | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await addRequirement(detail.id, {
        roleId,
        requiredSkillId,
        headcount: Number(headcount),
      });
      setRoleId('');
      setRequiredSkillId('');
      setHeadcount('1');
      await onChanged();
    } catch (failure) {
      setError(failureText(failure));
    }
  }

  async function change(
    requirementId: string,
    body: { headcount?: number; requiredSkillId?: string },
  ) {
    setError(null);
    try {
      await updateRequirement(detail.id, requirementId, body);
      await onChanged();
    } catch (failure) {
      setError(failureText(failure));
    }
  }

  async function drop(requirementId: string) {
    setError(null);
    try {
      await removeRequirement(detail.id, requirementId);
      await onChanged();
    } catch (failure) {
      setError(failureText(failure));
    }
  }

  return (
    <div className="card panel">
      <h3>{detail.name} - declared roles</h3>
      {error ? <p className="error">{error}</p> : null}

      {detail.requirements.length === 0 ? (
        <p className="muted">This project declares no role requirements yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Required skill</th>
              <th>Headcount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {detail.requirements.map((requirement) => (
              <tr key={requirement.id}>
                <td>{requirement.roleName}</td>
                <td>
                  <select
                    value={requirement.requiredSkillId}
                    onChange={(event) =>
                      void change(requirement.id, { requiredSkillId: event.target.value })
                    }
                    aria-label={`${requirement.roleName} required skill`}
                  >
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    defaultValue={requirement.headcount}
                    onBlur={(event) => {
                      const next = Number(event.target.value);
                      if (next !== requirement.headcount)
                        void change(requirement.id, { headcount: next });
                    }}
                    aria-label={`${requirement.roleName} headcount`}
                  />
                </td>
                <td className="row-actions">
                  <button
                    type="button"
                    className="link"
                    onClick={() => onAssign(requirement.roleId)}
                  >
                    Fill this role
                  </button>
                  <button
                    type="button"
                    className="link danger-text"
                    onClick={() => void drop(requirement.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={add} className="inline-form">
        <select
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
          required
          aria-label="Role to declare"
        >
          <option value="">Declare another role</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <select
          value={requiredSkillId}
          onChange={(event) => setRequiredSkillId(event.target.value)}
          required
          aria-label="Skill the role depends on"
        >
          <option value="">Skill it depends on</option>
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={headcount}
          onChange={(event) => setHeadcount(event.target.value)}
          aria-label="Headcount"
          required
        />
        <button type="submit">Declare role</button>
      </form>

      <h3>People on this project</h3>
      {detail.assignments.length === 0 ? (
        <p className="muted">Nobody is assigned to this project yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Allocation</th>
              <th>Starts</th>
              <th>Ends</th>
            </tr>
          </thead>
          <tbody>
            {detail.assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td>{assignment.employeeName}</td>
                <td>{assignment.roleName}</td>
                <td>{assignment.allocationPercent}%</td>
                <td>{assignment.startDate}</td>
                <td>{assignment.endDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button type="button" className="secondary" onClick={() => onAssign(undefined)}>
        Assign somebody else
      </button>
    </div>
  );
}

interface FormProps {
  roles: CatalogueEntry[];
  skills: CatalogueEntry[];
  project: ProjectRow | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}

function ProjectForm({ roles, skills, project, onCancel, onSaved }: FormProps) {
  const [name, setName] = useState(project?.name ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'PLANNED');
  const [drafts, setDrafts] = useState<RequirementInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (project) {
        await updateProject(project.id, { name, status });
      } else {
        await createProject({
          name,
          status,
          requirements: drafts.filter(
            (draft) => draft.roleId !== '' && draft.requiredSkillId !== '',
          ),
        });
      }
      await onSaved();
    } catch (failure) {
      setError(failureText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card form">
      <h3>{project ? `Edit ${project.name}` : 'New project'}</h3>
      {error ? <p className="error">{error}</p> : null}

      <form onSubmit={submit}>
        <div className="grid">
          <div>
            <label htmlFor="project-name">Name</label>
            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="project-status-field">Status</label>
            <select
              id="project-status-field"
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {project ? (
          <p className="muted">
            Declared roles are managed under &quot;Roles and people&quot; on the project.
          </p>
        ) : (
          <>
            <h4>Roles this project requires</h4>
            {drafts.map((draft, index) => (
              <div key={index} className="skill-row">
                <select
                  value={draft.roleId}
                  onChange={(event) =>
                    setDrafts(
                      drafts.map((entry, position) =>
                        position === index ? { ...entry, roleId: event.target.value } : entry,
                      ),
                    )
                  }
                  aria-label="Role"
                >
                  <option value="">Choose a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.requiredSkillId}
                  onChange={(event) =>
                    setDrafts(
                      drafts.map((entry, position) =>
                        position === index
                          ? { ...entry, requiredSkillId: event.target.value }
                          : entry,
                      ),
                    )
                  }
                  aria-label="Required skill"
                >
                  <option value="">Skill it depends on</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={draft.headcount}
                  onChange={(event) =>
                    setDrafts(
                      drafts.map((entry, position) =>
                        position === index
                          ? { ...entry, headcount: Number(event.target.value) }
                          : entry,
                      ),
                    )
                  }
                  aria-label="Headcount"
                />
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
              onClick={() =>
                setDrafts([...drafts, { roleId: '', requiredSkillId: '', headcount: 1 }])
              }
            >
              Add a required role
            </button>
          </>
        )}

        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Saving...' : project ? 'Save changes' : 'Create project'}
          </button>
          <button type="button" className="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
