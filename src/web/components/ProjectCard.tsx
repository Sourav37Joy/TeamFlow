import Link from 'next/link';
import { ProjectCardRow, PROJECT_STATUS_TEXT, STAFFING_STATUS_TEXT } from '../lib/api';
import AvatarStack from './AvatarStack';
import LeadLine from './LeadLine';

interface Props {
  card: ProjectCardRow;
}

// One project, answering the standing questions without being opened: what it is, what state
// it is in, who leads it, how many people are on it, and whether it is short (FR-130).
export default function ProjectCard({ card }: Props) {
  const people = card.headcount === 1 ? 'person' : 'people';

  return (
    <Link className="project-card" href={`/projects/${card.projectId}`}>
      <div className="project-card-head">
        <h4 className="project-card-name" title={card.projectName}>
          {card.projectName}
        </h4>
        <span className={`status status-${card.status.toLowerCase()}`}>
          {PROJECT_STATUS_TEXT[card.status]}
        </span>
      </div>

      <div className="project-card-meta">
        <div className="project-card-row">
          <LeadLine lead={card.lead} linked={false} />
        </div>

        {card.totalShortfall > 0 ? (
          <div className="short-roles">
            {card.shortRoles.map((role) => (
              <span key={role.requirementId} className="pill">
                {role.roleName} {role.filledHeadcount}/{role.requiredHeadcount}
              </span>
            ))}
          </div>
        ) : (
          // Never described as fully staffed when nothing was ever asked for (FR-134).
          <span className="staffing-note">{STAFFING_STATUS_TEXT[card.staffingStatus]}</span>
        )}
      </div>

      <div className="project-card-foot">
        <span className="headcount">
          <strong>{card.headcount}</strong> {people}
          {card.totalShortfall > 0 ? `, short ${card.totalShortfall}` : ''}
        </span>
        <AvatarStack people={card.people} beyond={card.peopleBeyond} />
      </div>
    </Link>
  );
}
