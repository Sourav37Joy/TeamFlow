'use client';

export const DASHBOARD_TABS = ['BOARD', 'OVERVIEW'] as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export const DASHBOARD_TAB_TEXT: Record<DashboardTab, string> = {
  BOARD: 'Board',
  OVERVIEW: 'Overview',
};

interface Props {
  selected: DashboardTab;
  onSelect: (tab: DashboardTab) => void;
}

// Left and right arrows move between tabs, which is what a tablist is expected to do and what
// keeps the control usable without a pointer (FR-151).
function neighbour(current: DashboardTab, step: number): DashboardTab {
  const at = DASHBOARD_TABS.indexOf(current);
  const next = (at + step + DASHBOARD_TABS.length) % DASHBOARD_TABS.length;
  return DASHBOARD_TABS[next] as DashboardTab;
}

export default function DashboardTabs({ selected, onSelect }: Props) {
  return (
    <div className="tabs" role="tablist" aria-label="Dashboard view">
      {DASHBOARD_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`tab-${tab.toLowerCase()}`}
          className="tab"
          aria-selected={tab === selected}
          aria-controls={`panel-${tab.toLowerCase()}`}
          tabIndex={tab === selected ? 0 : -1}
          onClick={() => onSelect(tab)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') onSelect(neighbour(selected, 1));
            if (event.key === 'ArrowLeft') onSelect(neighbour(selected, -1));
          }}
        >
          {DASHBOARD_TAB_TEXT[tab]}
        </button>
      ))}
    </div>
  );
}
