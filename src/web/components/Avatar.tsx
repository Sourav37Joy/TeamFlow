interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

// Two letters from the name, so somebody with no usable photograph still reads as a person
// rather than as a hole in the layout.
function initials(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return (words[0] as string).slice(0, 2).toUpperCase();
  return `${(words[0] as string)[0]}${(words[words.length - 1] as string)[0]}`.toUpperCase();
}

// The one place a person's face is rendered. Everywhere that names somebody uses this, so a
// portrait cannot appear on one screen and be missing from the next.
export default function Avatar({ name, avatarUrl, size = 32 }: Props) {
  const style = { width: size, height: size, fontSize: Math.round(size / 2.6) };

  if (!avatarUrl) {
    return (
      <span className="avatar avatar-initials" style={style} aria-hidden="true" title={name}>
        {initials(name)}
      </span>
    );
  }

  // A plain img rather than next/image: these are already 256px squares served from the same
  // origin, so the optimiser would add a request and a dependency for nothing.
  return (
    <img className="avatar" style={style} src={avatarUrl} alt="" aria-hidden="true" title={name} />
  );
}
