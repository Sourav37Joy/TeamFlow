'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import DashboardTabs, { DashboardTab } from '../../components/DashboardTabs';
import EmptyState from '../../components/EmptyState';
import LoadLabel from '../../components/LoadLabel';
import PersonLink from '../../components/PersonLink';
import ProjectBoard from '../../components/ProjectBoard';
import { Dashboard, failureText, PROJECT_STATUS_TEXT, readDashboard } from '../../lib/api';
import { useSession } from '../../lib/use-session';

// Two tabs over one request. The board and the people panels each get the full width, which is
// what stopped them competing for it, and both read the same evaluation date because they come
// from the same payload (FR-147, FR-149, FR-150).
export default function DashboardPage() {
  const { user, loading } = useSession();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState<DashboardTab>('BOARD');
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

  if (loading) return <DashboardSkeleton />;
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

      <DashboardTabs selected={tab} onSelect={setTab} />

      {error ? <p className="error">{error}</p> : null}
      {dashboard === null ? (
        <DashboardSkeleton />
      ) : tab === 'BOARD' ? (
        <div role="tabpanel" id="panel-board" aria-labelledby="tab-board">
          <ProjectBoard board={dashboard.board} asOf={dashboard.asOf} />
        </div>
      ) : (
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" className="panels">
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

// Occupies the space the board will occupy, so its arrival moves nothing (FR-155).
function DashboardSkeleton() {
  return (
    <div className="board" aria-busy="true" aria-label="Loading the dashboard">
      {[0, 1, 2, 3, 4].map((column) => (
        <section key={column} className="board-column">
          <header className="column-head">
            <span className="skeleton skeleton-line" style={{ width: '40%' }} />
          </header>
          <div className="column-body">
            <span className="skeleton skeleton-card" />
            <span className="skeleton skeleton-card" />
          </div>
        </section>
      ))}
    </div>
  );
}
