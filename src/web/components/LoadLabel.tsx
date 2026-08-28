import { LoadLabel as Label, LOAD_LABEL_TEXT } from '../lib/api';

interface Props {
  label: Label;
  utilizationPercent?: number;
}

// The label is the server's, never recomputed here. Overallocated is styled as a warning
// because it is the one state that needs acting on (FR-034, Constitution II).
export default function LoadLabel({ label, utilizationPercent }: Props) {
  return (
    <span className={`badge badge-${label.toLowerCase()}`}>
      {LOAD_LABEL_TEXT[label]}
      {utilizationPercent === undefined ? '' : ` ${utilizationPercent}%`}
    </span>
  );
}
