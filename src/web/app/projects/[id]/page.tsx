'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import AssignmentForm from '../../../components/AssignmentForm';
import Avatar from '../../../components/Avatar';
import CandidateList from '../../../components/CandidateList';
import EmptyState from '../../../components/EmptyState';
import LeadLine from '../../../components/LeadLine';
import PersonLink from '../../../components/PersonLink';
import ReplacementDialog from '../../../components/ReplacementDialog';
import {
  ApiFailure,
  AssignmentRow,
  Candidate,
  CatalogueEntry,
  deleteAssignment,
  EmployeeRow,
  failureText,
  listEmployees,
  listProjects,
  listRoles,
  PROJECT_STATUS_TEXT,
  ProjectDetail,
  ProjectRow,
  readProject,
  requirementCandidates,
  RequirementShortlist,
  RequirementStaffingRow,
  STAFFING_STATUS_TEXT,
  updateProject,
} from '../../../lib/api';
import { useSession } from '../../../lib/use-session';

export default function ProjectRecordPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { user, loading } = useSession();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [roles, setRoles] = useState<CatalogueEntry[]>([]);
  const [asOf, setAsOf] = useState('');

  const [filling, setFilling] = useState<{ roleId?: string; employeeId?: string } | null>(null);
  const [editing, setEditing] = useState<AssignmentRow | null>(null);
  const [replacing, setReplacing] = useState<AssignmentRow | null>(null);
  const [shortlist, setShortlist] = useState<RequirementShortlist | null>(null);
  const [shortlistFor, setShortlistFor] = useState<RequirementStaffingRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProject(await readProject(projectId, asOf || undefined));
    } catch (failure) {
      setError(failureText(failure));
    }
  }, [projectId, asOf]);

  useEffect(() => {
    if (!user) return;
    Promise.all([listEmployees(), listRoles(), listProjects()])
      .then(([employeeList, roleList, projectList]) => {
        setEmployees(employeeList.employees);
        setRoles(roleList.roles);
        setProjects(projectList.projects);
      })
      .catch((failure) => setError(failureText(failure)));
  }, [user]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function suggest(requirement: RequirementStaffingRow) {
    setError(null);
    if (shortlistFor?.requirementId === requirement.requirementId) {
      setShortlistFor(null);
      setShortlist(null);
      return;
    }
    try {
      setShortlistFor(requirement);
      setShortlist(
        await requirementCandidates(projectId, requirement.requirementId, asOf || undefined),
      );
    } catch (failure) {
      setShortlistFor(null);
      setShortlist(null);
      setError(failureText(failure));
      if (failure instanceof ApiFailure) setError(failure.error.message);
    }
  }

  // Accepting a suggestion opens the assignment form already filled in. Nothing is created
  // until the manager saves it (FR-060).
  function accept(candidate: Candidate) {
    if (!shortlistFor) return;
    setFilling({ roleId: shortlistFor.roleId, employeeId: candidate.employeeId });
    setShortlistFor(null);
    setShortlist(null);
  }

  async function drop(assignment: AssignmentRow) {
    setError(null);
    try {
      await deleteAssignment(assignment.id);
      await load();
    } catch (failure) {
      setError(failureText(failure));
    }
  }

  // An empty choice clears the lead outright rather than leaving the last one in place.
  async function setLead(employeeId: string) {
    setError(null);
    try {
      await updateProject(projectId, { leadEmployeeId: employeeId || null });
      await load();
    } catch (failure) {
      setError(failureText(failure));
    }
  }

  if (loading) return <p className="muted">Loading...</p>;
  if (!user) return null;
  if (!project)
    return error ? <p className="error">{error}</p> : <p className="muted">Loading...</p>;

  const staffing = project.staffing;

  return (
    <section>
      <header className="page-head">
        <div>
          <h2>{project.name}</h2>
          <p className="muted">
            <span className={`status status-${project.status.toLowerCase()}`}>
              {PROJECT_STATUS_TEXT[project.status]}
            </span>{' '}
            &middot; {STAFFING_STATUS_TEXT[staffing.staffingStatus]}
            {staffing.totalShortfall > 0 ? ` · short ${staffing.totalShortfall}` : ''}
          </p>
        </div>
        <Link href="/projects">Back to projects</Link>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="card panel">
        <div className="group-head">
          <div>
            <h3>Project lead</h3>
            <LeadLine lead={project.lead} size={28} />
          </div>
          <div>
            <label htmlFor="project-lead">Change the lead</label>
            <select
              id="project-lead"
              value={project.lead?.employeeId ?? ''}
              onChange={(event) => void setLead(event.target.value)}
            >
              <option value="">No lead</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="muted">
          Leading a project is not an assignment. A lead counts towards the headcount only if they
          also hold work on it.
        </p>
      </div>

      {!staffing.producesGaps && staffing.totalShortfall > 0 ? (
        <p className="notice">
          {project.name} is {PROJECT_STATUS_TEXT[project.status].toLowerCase()}, so its shortfall is
          shown here but is not chased on the dashboard.
        </p>
      ) : null}

      <div className="card panel">
        <div className="group-head">
          <h3>Declared roles on {staffing.asOf}</h3>
          <div>
            <label htmlFor="project-as-of">Evaluated on</label>
            <input
              id="project-as-of"
              type="date"
              value={asOf || staffing.asOf}
              onChange={(event) => setAsOf(event.target.value)}
            />
          </div>
        </div>

        {staffing.requirements.length === 0 ? (
          <EmptyState
            title="No requirements declared"
            detail="This project has not said which roles it needs, so there is nothing to be short of. Declare a role on the projects list."
            asOf={staffing.asOf}
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Required skill</th>
                <th>Filled</th>
                <th>Standing</th>
                <th>Who is filling it</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {staffing.requirements.map((requirement) => (
                <tr key={requirement.requirementId}>
                  <td>
                    <strong>{requirement.roleName}</strong>
                  </td>
                  <td>{requirement.requiredSkillName}</td>
                  <td>
                    {requirement.filledHeadcount} of {requirement.requiredHeadcount}
                  </td>
                  <td>
                    {requirement.shortfall > 0 ? (
                      <span className="badge badge-overallocated">
                        Short {requirement.shortfall}
                      </span>
                    ) : requirement.surplus > 0 ? (
                      <span className="badge badge-high_load">Over by {requirement.surplus}</span>
                    ) : (
                      <span className="badge badge-balanced">Met</span>
                    )}
                  </td>
                  <td>
                    {requirement.fillers.length === 0 ? (
                      <span className="muted">Nobody</span>
                    ) : (
                      requirement.fillers.map((filler) => (
                        <span key={filler.assignmentId} className="filler">
                          <Avatar
                            name={filler.employeeName}
                            avatarUrl={filler.employeeAvatarUrl}
                            size={24}
                          />
                          <Link href={`/employees/${filler.employeeId}`}>
                            {filler.employeeName}
                          </Link>{' '}
                          {filler.allocationPercent}%
                        </span>
                      ))
                    )}
                  </td>
                  <td className="row-actions">
                    {requirement.shortfall > 0 ? (
                      <>
                        <button
                          type="button"
                          className="link"
                          onClick={() => setFilling({ roleId: requirement.roleId })}
                        >
                          Fill this role
                        </button>
                        <button
                          type="button"
                          className="link"
                          onClick={() => void suggest(requirement)}
                        >
                          {shortlistFor?.requirementId === requirement.requirementId
                            ? 'Hide suggestions'
                            : 'Suggest candidates'}
                        </button>
                      </>
                    ) : (
                      <span className="muted">No gap</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {shortlistFor && shortlist ? (
          <div className="panel-inset">
            <h4>Candidates for {shortlistFor.roleName}</h4>
            <CandidateList
              candidates={shortlist.candidates}
              requiredSkillName={shortlist.requiredSkillName}
              reason={shortlist.reason}
              message={shortlist.message}
              asOf={shortlist.asOf}
              acceptLabel="Assign"
              onAccept={accept}
            />
          </div>
        ) : null}

        {staffing.unrequestedRoles.length > 0 ? (
          <>
            <h4>Roles nobody asked for</h4>
            <p className="muted">
              Work committed to roles this project never declared. It is real capacity being spent,
              so it is reported rather than hidden.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>People</th>
                  <th>Who</th>
                </tr>
              </thead>
              <tbody>
                {staffing.unrequestedRoles.map((unrequested) => (
                  <tr key={unrequested.roleId}>
                    <td>{unrequested.roleName}</td>
                    <td>{unrequested.headcount}</td>
                    <td>
                      {unrequested.fillers.map((filler) => (
                        <span key={filler.assignmentId} className="filler">
                          <Avatar
                            name={filler.employeeName}
                            avatarUrl={filler.employeeAvatarUrl}
                            size={24}
                          />
                          <Link href={`/employees/${filler.employeeId}`}>
                            {filler.employeeName}
                          </Link>{' '}
                          {filler.allocationPercent}%
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </div>

      <div className="card panel">
        <div className="group-head">
          <h3>Everybody on this project</h3>
          <button type="button" className="secondary" onClick={() => setFilling({})}>
            Assign somebody
          </button>
        </div>

        {project.assignments.length === 0 ? (
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
                <th />
              </tr>
            </thead>
            <tbody>
              {project.assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>
                    <PersonLink
                      id={assignment.employeeId}
                      name={assignment.employeeName}
                      avatarUrl={assignment.employeeAvatarUrl}
                      size={28}
                    />
                  </td>
                  <td>{assignment.roleName}</td>
                  <td>{assignment.allocationPercent}%</td>
                  <td>{assignment.startDate}</td>
                  <td>{assignment.endDate}</td>
                  <td className="row-actions">
                    <button type="button" className="link" onClick={() => setEditing(assignment)}>
                      Edit
                    </button>
                    <button type="button" className="link" onClick={() => setReplacing(assignment)}>
                      Replace
                    </button>
                    <button
                      type="button"
                      className="link danger-text"
                      onClick={() => void drop(assignment)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filling ? (
        <AssignmentForm
          employees={employees}
          projects={projects}
          roles={roles}
          prefill={{ projectId, roleId: filling.roleId, employeeId: filling.employeeId }}
          onCancel={() => setFilling(null)}
          onSaved={async () => {
            setFilling(null);
            await load();
          }}
        />
      ) : null}

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
