'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import LoadLabel from '../../components/LoadLabel';
import PersonLink from '../../components/PersonLink';
import {
  AllocationOverview,
  allocationOverview,
  CatalogueEntry,
  failureText,
  listRoles,
  listSkills,
  PROJECT_STATUS_TEXT,
} from '../../lib/api';
import { useSession } from '../../lib/use-session';

export default function AllocationPage() {
  const { user, loading } = useSession();

  const [overview, setOverview] = useState<AllocationOverview | null>(null);
  const [skills, setSkills] = useState<CatalogueEntry[]>([]);
  const [roles, setRoles] = useState<CatalogueEntry[]>([]);

  const [groupBy, setGroupBy] = useState<'person' | 'project'>('person');
  const [q, setQ] = useState('');
  const [skillId, setSkillId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [asOf, setAsOf] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await allocationOverview({ groupBy, q, skillId, roleId, asOf }));
    } catch (failure) {
      setError(failureText(failure));
    }
  }, [groupBy, q, skillId, roleId, asOf]);

  useEffect(() => {
    if (!user) return;
    Promise.all([listSkills(), listRoles()])
      .then(([skillList, roleList]) => {
        setSkills(skillList.skills);
        setRoles(roleList.roles);
      })
      .catch((failure) => setError(failureText(failure)));
  }, [user]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (loading) return <p className="muted">Loading the allocation overview...</p>;
  if (!user) return null;

  const filtered = q !== '' || skillId !== '' || roleId !== '';

  return (
    <section>
      <header className="page-head">
        <h2>Who is assigned where</h2>
        <div className="toggle">
          <button
            type="button"
            className={groupBy === 'person' ? undefined : 'secondary'}
            onClick={() => setGroupBy('person')}
          >
            By person
          </button>
          <button
            type="button"
            className={groupBy === 'project' ? undefined : 'secondary'}
            onClick={() => setGroupBy('project')}
          >
            By project
          </button>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <div className="filters">
        <div>
          <label htmlFor="overview-search">Search person, project, or role</label>
          <input
            id="overview-search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Atlas, Priya, QA Engineer..."
          />
        </div>
        <div>
          <label htmlFor="overview-skill">Holds skill</label>
          <select
            id="overview-skill"
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
          <label htmlFor="overview-role">Role filled</label>
          <select
            id="overview-role"
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
          >
            <option value="">Any role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="overview-date">Evaluated on</label>
          <input
            id="overview-date"
            type="date"
            value={asOf || overview?.asOf || ''}
            onChange={(event) => setAsOf(event.target.value)}
          />
        </div>
      </div>

      {overview === null ? null : overview.groups.length === 0 ? (
        <EmptyState
          title="Nothing is active on this date"
          detail="No assignment covers this date, or none matches the filters above."
          asOf={overview.asOf}
        />
      ) : (
        <>
          <p className="muted">
            {overview.rowCount} assignment{overview.rowCount === 1 ? '' : 's'} active on{' '}
            {overview.asOf}
            {filtered
              ? '. Group totals are each person or project in full, not just the matching rows.'
              : '.'}
          </p>

          {overview.groups.map((group) =>
            group.kind === 'person' ? (
              <div key={group.id} className="card panel">
                <div className="group-head">
                  <h3 className="group-person">
                    <Avatar name={group.name} avatarUrl={group.avatarUrl} size={40} />
                    <span>
                      <Link href={`/employees/${group.id}`}>{group.name}</Link>{' '}
                      <span className="muted">{group.roleTitle}</span>
                    </span>
                  </h3>
                  <div>
                    <LoadLabel
                      label={group.loadLabel}
                      utilizationPercent={group.totalCommittedPercent}
                    />{' '}
                    <span className="muted">{group.remainingCapacityPercent}% spare</span>
                  </div>
                </div>
                <RowTable rows={group.rows} hide="employee" />
              </div>
            ) : (
              <div key={group.id} className="card panel">
                <div className="group-head">
                  <h3>
                    <Link href={`/projects/${group.id}`}>{group.name}</Link>{' '}
                    <span className={`status status-${group.status.toLowerCase()}`}>
                      {PROJECT_STATUS_TEXT[group.status]}
                    </span>
                  </h3>
                  <span className="muted">
                    {group.assignedHeadcount} {group.assignedHeadcount === 1 ? 'person' : 'people'}{' '}
                    assigned
                  </span>
                </div>
                <RowTable rows={group.rows} hide="project" />
              </div>
            ),
          )}
        </>
      )}
    </section>
  );
}

// Every row reaches the record behind it: the person, the project, or both (FR-031).
function RowTable({
  rows,
  hide,
}: {
  rows: AllocationOverview['groups'][number]['rows'];
  hide: 'employee' | 'project';
}) {
  return (
    <table>
      <thead>
        <tr>
          {hide === 'employee' ? null : <th>Person</th>}
          {hide === 'project' ? null : <th>Project</th>}
          <th>Role</th>
          <th>Allocation</th>
          <th>Starts</th>
          <th>Ends</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {hide === 'employee' ? null : (
              <td>
                <PersonLink
                  id={row.employeeId}
                  name={row.employeeName}
                  avatarUrl={row.employeeAvatarUrl}
                  size={28}
                />
              </td>
            )}
            {hide === 'project' ? null : (
              <td>
                <Link href={`/projects/${row.projectId}`}>{row.projectName}</Link>
              </td>
            )}
            <td>{row.roleName}</td>
            <td>{row.allocationPercent}%</td>
            <td>{row.startDate}</td>
            <td>{row.endDate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
