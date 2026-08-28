'use client';

import { Candidate } from '../lib/api';
import EmptyState from './EmptyState';
import PersonLink from './PersonLink';

interface Props {
  candidates: Candidate[];
  requiredSkillName: string | null;
  reason: string | null;
  message: string | null;
  asOf: string;
  acceptLabel: string;
  onAccept: (candidate: Candidate) => void;
}

// Every row shows the two components and the score they average to, so a suggestion can be
// argued with. An opaque recommendation is not a recommendation anybody can act on
// (FR-054, Constitution IX).
export default function CandidateList({
  candidates,
  requiredSkillName,
  reason,
  message,
  asOf,
  acceptLabel,
  onAccept,
}: Props) {
  if (candidates.length === 0) {
    return (
      <EmptyState
        title={reason === 'NO_EMPLOYEE_HOLDS_SKILL' ? 'Nobody holds the skill' : 'No candidates'}
        detail={message}
        asOf={asOf}
      />
    );
  }

  return (
    <>
      <p className="muted">
        Ranked by an equal blend of proficiency in {requiredSkillName} and remaining capacity on{' '}
        {asOf}. Both halves of every score are shown.
      </p>
      <table>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Score</th>
            <th>{requiredSkillName} rating</th>
            <th>Skill component</th>
            <th>Spare capacity</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.employeeId}>
              <td>
                <PersonLink
                  id={candidate.employeeId}
                  name={candidate.name}
                  avatarUrl={candidate.avatarUrl}
                  size={28}
                />
              </td>
              <td>
                <span className="score">{candidate.overallScore}</span>
              </td>
              <td>{candidate.skillRating}/5</td>
              <td>{candidate.skillComponent}</td>
              <td>{candidate.capacityComponent}%</td>
              <td>
                <button type="button" className="link" onClick={() => onAccept(candidate)}>
                  {acceptLabel}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
