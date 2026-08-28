interface Props {
  label: string;
  rows?: number;
}

// A waiting screen that occupies the space its content will occupy, so the arrival of data
// moves nothing that was already on screen (FR-155).
export default function PageSkeleton({ label, rows = 6 }: Props) {
  return (
    <section aria-busy="true" aria-label={label}>
      <div className="page-head">
        <span className="skeleton skeleton-line" style={{ width: 220, height: 22 }} />
      </div>
      <div className="card panel">
        {Array.from({ length: rows }, (_unused, row) => (
          <span key={row} className="skeleton skeleton-row" />
        ))}
      </div>
    </section>
  );
}
