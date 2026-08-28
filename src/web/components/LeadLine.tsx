import Link from 'next/link';
import { ProjectLead } from '../lib/api';
import Avatar from './Avatar';

interface Props {
  lead: ProjectLead | null;
  size?: number;
  linked?: boolean;
}

// A project with no lead says so. Showing a blank, or substituting whoever happens to be most
// allocated, would put a claim on the screen that nobody made (FR-140).
export default function LeadLine({ lead, size = 22, linked = true }: Props) {
  if (!lead) return <span className="lead-line-empty">No lead set</span>;

  return (
    <span className="lead-line">
      <Avatar name={lead.name} avatarUrl={lead.avatarUrl} size={size} />
      {linked ? (
        <Link className="lead-name" href={`/employees/${lead.employeeId}`}>
          {lead.name}
        </Link>
      ) : (
        <span className="lead-name">{lead.name}</span>
      )}
    </span>
  );
}
