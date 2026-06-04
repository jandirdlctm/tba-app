import type { StatusFilter } from '../types';

interface StatusChipsProps {
  value: StatusFilter;
  onChange: (next: StatusFilter) => void;
}

// Single-select filter chips below the top bar. Filtering itself happens in
// React state on the map page — this component only reports the selection.
const CHIPS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

export default function StatusChips({ value, onChange }: StatusChipsProps) {
  return (
    <div className="chip-row" role="tablist" aria-label="Filter projects by status">
      {CHIPS.map((chip) => {
        const selected = value === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`chip${selected ? ' chip--selected' : ''}`}
            onClick={() => onChange(chip.key)}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
