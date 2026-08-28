'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import LoadLabel from '../../components/LoadLabel';
import PersonLink from '../../components/PersonLink';
import { Dashboard, failureText, PROJECT_STATUS_TEXT, readDashboard } from '../../lib/api';
import { useSession } from '../../lib/use-session';

// The three standing questions on one screen: who is over, who is free, and what is short.
// Every figure comes from the same request, so the panels cannot disagree (FR-072, FR-079).
export default function DashboardPage() {
  const { user, loading } = useSession();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [asOf, setAsOf] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDashboard(await readDashboard(asOf || undefined));
    } catch (failure) {
      setError(failureText(failure));
    }
  }, [asOf]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (loading) return <p className="muted">Loading the dashboard...</p>;
  if (!user) return null;

  return (
    <section>
      <header className="page-head">
        <h2>Planning dashboard</h2>
        <div>
          <label htmlFor="dashboard-as-of">Evaluated on</label>
          <input
            id="dashboard-as-of"
            type="date"
            value={asOf || dashboard?.asOf || ''}
            onChange={(event) => setAsOf(event.target.value)}
          />
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {dashboard === null ? null : (
        <div className="panels">
          <div className="card panel">
            <h3>Overallocated</h3>
            <p className="muted">Most overloaded first.</p>
            {dashboard.overallocated.entries.length === 0 ? (
              <EmptyState
                title="Nothing to action"
                detail="Nobody is committed beyond their capacity on this date."
                asOf={dashboard.asOf}
              />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Committed</th>
                    <th>Over by</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.overallocated.entries.map((entry) => (
                    <tr key={entry.employeeId}>
                      <td>
                        <PersonLink
                          id={entry.employeeId}
                          name={entry.name}
                          avatarUrl={entry.avatarUrl}
                          subtitle={entry.roleTitle}
                          size={32}
                        />
                      </td>
                      <td>
                        <LoadLabel
                          label={entry.loadLabel}
                          utilizationPercent={entry.utilizationPercent}
                        />
                      </td>
                      <td>{entry.overBy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card panel">
            <h3>Spare capacity</h3>
            <p className="muted">Most spare first.</p>
            {dashboard.available.entries.length === 0 ? (
              <EmptyState
                title="Nothing to action"
                detail="Everybody is committed to their full capacity on this date."
                asOf={dashboard.asOf}
              />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Spare</th>
                    <th>Load</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.available.entries.map((entry) => (
                    <tr key={entry.employeeId}>
                      <td>
                        <PersonLink
                          id={entry.employeeId}
                          name={entry.name}
                          avatarUrl={entry.avatarUrl}
                          subtitle={entry.roleTitle}
                          size={32}
                        />
                      </td>
                      <td>
                        <strong>{entry.remainingCapacityPercent}%</strong>
                      </td>
                      <td>
                        <LoadLabel
                          label={entry.loadLabel}
                          utilizationPercent={entry.utilizationPercent}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card panel wide-panel">
            <h3>Open role gaps</h3>
            <p className="muted">
              Planned and active projects only. On hold, completed, and cancelled projects keep a
              readable staffing figure but are not chased here.
            </p>
            {dashboard.gaps.entries.length === 0 ? (
              <EmptyState
                title="Nothing to action"
                detail="No planned or active project is short of anybody on this date."
                asOf={dashboard.asOf}
              />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Short by</th>
                    <th>Short roles</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.gaps.entries.map((entry) => (
                    <tr key={entry.projectId}>
                      <td>
                        <Link href={`/projects/${entry.projectId}`}>{entry.projectName}</Link>
                      </td>
                      <td>
                        <span className={`status status-${entry.status.toLowerCase()}`}>
                          {PROJECT_STATUS_TEXT[entry.status]}
                        </span>
                      </td>
                      <td>
                        <strong>{entry.totalShortfall}</strong>
                      </td>
                      <td>
                        {entry.shortRoles.map((role) => (
                          <span key={role.requirementId} className="pill">
                            {role.roleName} {role.filledHeadcount} of {role.requiredHeadcount}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
