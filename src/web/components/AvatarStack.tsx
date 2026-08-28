import { BoardPerson } from '../lib/api';
import Avatar from './Avatar';

interface Props {
  people: BoardPerson[];
  beyond?: number;
  size?: number;
}

// The faces on a project, overlapped so a card can show several without becoming a list. The
// count of anybody past the cap is stated rather than dropped (FR-135).
export default function AvatarStack({ people, beyond = 0, size = 26 }: Props) {
  if (people.length === 0) return <span className="muted">Nobody assigned</span>;

  const named = people.map((person) => person.name).join(', ');

  return (
    <span className="avatar-stack" title={beyond > 0 ? `${named} and ${beyond} more` : named}>
      {people.map((person) => (
        <Avatar
          key={person.employeeId}
          name={person.name}
          avatarUrl={person.avatarUrl}
          size={size}
        />
      ))}
      {beyond > 0 ? <span className="avatar-stack-more">+{beyond}</span> : null}
    </span>
  );
}
