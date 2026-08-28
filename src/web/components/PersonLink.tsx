import Link from 'next/link';
import Avatar from './Avatar';

interface Props {
  id: string;
  name: string;
  avatarUrl?: string | null;
  subtitle?: string | null;
  size?: number;
}

// A person, wherever they are named: face, name, and a way through to their record (FR-031).
export default function PersonLink({ id, name, avatarUrl, subtitle, size }: Props) {
  return (
    <span className="person">
      <Avatar name={name} avatarUrl={avatarUrl} size={size} />
      <span className="person-text">
        <Link href={`/employees/${id}`}>{name}</Link>
        {subtitle ? <span className="muted">{subtitle}</span> : null}
      </span>
    </span>
  );
}
