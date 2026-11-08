import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ChoiceOption {
  value: string;
  title: string;
  /** The consequence in concrete words, not a pitch. */
  description: string;
  icon: ReactNode;
  disabled?: boolean;
  /** Small label next to the title, e.g. "Sắp có". */
  tag?: string;
}

/**
 * Big cards for a choice with few options (ChoiceCard README). Each card is a real radio, so
 * the arrow keys move between them; `labelledBy` is the id of the question.
 */
export function ChoiceCards({
  name,
  labelledBy,
  value,
  onChange,
  options,
}: {
  name: string;
  labelledBy: string;
  value: string | null;
  onChange: (value: string) => void;
  options: ChoiceOption[];
}) {
  return (
    <div className="sp-choices" role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'sp-choice',
            option.disabled && 'cursor-not-allowed! opacity-60 hover:bg-transparent!',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
          />
          <span className="sp-choice__mark" aria-hidden="true">
            <Check />
          </span>
          <span className="sp-choice__icon" aria-hidden="true">
            {option.icon}
          </span>
          <span className="sp-choice__title">
            {option.title}
            {option.tag && (
              <span className="sp-badge sp-badge--pending ms-(--space-2)">{option.tag}</span>
            )}
          </span>
          <span className="sp-choice__desc">{option.description}</span>
        </label>
      ))}
    </div>
  );
}
