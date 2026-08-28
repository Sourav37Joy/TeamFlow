interface Props {
  title: string;
  detail?: string | null;
  asOf?: string | null;
}

// An empty result is a finding, not a blank space. It says what is empty and on which date, so
// nobody has to wonder whether the screen is broken (FR-031, FR-077).
export default function EmptyState({ title, detail, asOf }: Props) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {detail ? <p className="muted">{detail}</p> : null}
      {asOf ? <p className="muted">Evaluated on {asOf}.</p> : null}
    </div>
  );
}
