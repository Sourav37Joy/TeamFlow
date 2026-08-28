import { Board, PROJECT_STATUS_TEXT } from '../lib/api';
import EmptyState from './EmptyState';
import ProjectCard from './ProjectCard';

interface Props {
  board: Board;
  asOf: string;
}

// The portfolio as a board: one column per status, every project a card in the column matching
// its status. Columns are drawn even when they hold nothing, because a missing column reads as
// a bug rather than as an empty state (FR-120, FR-123).
export default function ProjectBoard({ board, asOf }: Props) {
  if (board.totalProjects === 0) {
    return (
      <EmptyState
        title="No projects yet"
        detail="Create a project and it will appear on the board under its status."
        asOf={asOf}
      />
    );
  }

  return (
    <div className="board">
      {board.columns.map((column) => (
        <section
          key={column.status}
          className="board-column"
          aria-label={PROJECT_STATUS_TEXT[column.status]}
        >
          <header className="column-head">
            <h3 className="column-title">{PROJECT_STATUS_TEXT[column.status]}</h3>
            <span className="column-count">{column.count}</span>
          </header>
          <div className="column-body">
            {column.projects.length === 0 ? (
              <p className="column-empty">
                Nothing {PROJECT_STATUS_TEXT[column.status].toLowerCase()}
              </p>
            ) : (
              column.projects.map((card) => <ProjectCard key={card.projectId} card={card} />)
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
