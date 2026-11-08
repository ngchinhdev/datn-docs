import { dayOfMonth, weekdayShort } from '@/mock/time';

export interface DateStripProps {
  /** Seven local dates `YYYY-MM-DD`. */
  dates: { date: string; closed?: boolean }[];
  /** One date, or several (a range of days off). */
  selected: string | readonly string[];
  onSelect: (date: string) => void;
}

export function DateStrip({ dates, selected, onSelect }: DateStripProps) {
  return (
    <div className="sp-dates" role="group" aria-label="Ngày">
      {dates.map(({ date, closed }) => (
        <button
          key={date}
          type="button"
          className="sp-date"
          aria-pressed={typeof selected === 'string' ? date === selected : selected.includes(date)}
          disabled={closed}
          aria-label={closed ? `${weekdayShort(date)} ${dayOfMonth(date)}, nghỉ` : undefined}
          onClick={() => onSelect(date)}
        >
          {weekdayShort(date)} <b>{dayOfMonth(date)}</b>
        </button>
      ))}
    </div>
  );
}
