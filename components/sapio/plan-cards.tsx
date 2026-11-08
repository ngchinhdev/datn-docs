'use client';

import { Check, Minus, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface PlanFeature {
  label: string;
  on: boolean;
}

export interface PlanCardData {
  id: string;
  name: string;
  /** Tag next to the name: "Đang dùng thử", "Gói trước đây". */
  badge?: string;
  /** "399.000 ₫". */
  price: string;
  /** " / tháng". */
  unit: string;
  /** Under the price: the limit, or what the period costs in all. */
  note: string;
  /** The same list in the same order on every card. */
  features: PlanFeature[];
  /** The plan the account is on (or was on); drawn with the brand outline. */
  current?: boolean;
  action: {
    label: string;
    variant: 'primary' | 'secondary';
    onClick: () => void;
    disabled?: boolean;
    /** Line under the button: why it is off, or when the change takes effect. */
    hint?: string;
  };
}

/** The plans side by side (Plan README). Prices and features come from the plan data. */
export function PlanCards({ plans }: { plans: PlanCardData[] }) {
  return (
    <div className="sp-plans">
      {plans.map((plan) => {
        const titleId = `plan-${plan.id}`;
        const hintId = `${titleId}-reason`;
        return (
          <section
            key={plan.id}
            className={cn('sp-plan', plan.current && 'sp-plan--current')}
            aria-labelledby={titleId}
          >
            <div className="sp-plan__head">
              <h3 className="sp-plan__name" id={titleId}>
                {plan.name}
              </h3>
              {plan.badge && <span className="sp-badge sp-badge--pending">{plan.badge}</span>}
            </div>
            <div>
              <span className="whitespace-nowrap">
                <span className="sp-plan__price">{plan.price}</span>
                <span className="sp-plan__unit">{plan.unit}</span>
              </span>
              <div className="sp-plan__note">{plan.note}</div>
            </div>
            <ul className="sp-plan__features">
              {plan.features.map((feature) => (
                <li key={feature.label} data-off={feature.on ? undefined : ''}>
                  {feature.on ? <Check aria-hidden="true" /> : <Minus aria-hidden="true" />}
                  <span>
                    {!feature.on && <span className="sp-sr-only">Không có: </span>}
                    {feature.label}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              variant={plan.action.variant}
              disabled={plan.action.disabled}
              aria-describedby={plan.action.hint ? hintId : undefined}
              onClick={plan.action.onClick}
            >
              <QrCode size={18} aria-hidden="true" />
              {plan.action.label}
            </Button>
            {plan.action.hint && (
              <p id={hintId} className="sp-plan__note m-0">
                {plan.action.hint}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

export interface PeriodOption {
  value: string;
  label: string;
  /** Discount shown in the brand color: "−10%". */
  discount?: string;
}

/**
 * Period of the purchase, one choice for all cards: a group of toggle buttons, one pressed. The
 * pressed state is what `.sp-segmented` styles; `role="radio"` would need `aria-checked` styling
 * that the stylesheet does not have.
 */
export function PeriodSwitch({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: PeriodOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="sp-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className="sp-segmented__item"
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.discount && (
            <>
              {' '}
              <span className="sp-segmented__count font-semibold text-(--brand)!">
                {option.discount}
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
