export interface SlotGroup {
  /** "Buổi sáng", "Buổi chiều", "Buổi tối". */
  label: string;
  slots: { value: string; label: string }[];
}

export interface SlotGridProps {
  groups: SlotGroup[];
  selected: string | null;
  onSelect: (value: string) => void;
  /** Shown when no group has a slot, e.g. "Hết giờ trống ngày này. Xem ngày khác?". */
  emptyMessage: string;
}

export function SlotGrid({ groups, selected, onSelect, emptyMessage }: SlotGridProps) {
  const visible = groups.filter((g) => g.slots.length > 0);
  if (visible.length === 0) return <p className="sp-empty m-0">{emptyMessage}</p>;

  return (
    <div className="sp-stack">
      {visible.map((group) => (
        <div key={group.label} className="flex flex-col gap-(--space-2)">
          <span className="label text-(--ink-muted)">{group.label}</span>
          <div
            className="sp-slots"
            role="group"
            aria-label={`Giờ trống ${group.label.toLowerCase()}`}
          >
            {group.slots.map((slot) => (
              <button
                key={slot.value}
                type="button"
                className="sp-slot"
                aria-pressed={slot.value === selected}
                onClick={() => onSelect(slot.value)}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
