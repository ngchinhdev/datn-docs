'use client';

import type { SubjectField } from '@/mock/fixtures';
import { isRequired, type SubjectValues } from '@/mock/subject-schema';
import { Field } from './form';

/**
 * The fields that describe a person or pet being served, from the industry's schema (BR-71):
 * a name, then each attribute as a choice, a number or a line of text.
 */
export function SubjectFields({
  idPrefix,
  schema,
  noun,
  nameExample,
  name,
  values,
  onName,
  onValue,
  error,
  touch,
  size = 'md',
}: {
  idPrefix: string;
  schema: SubjectField[];
  /** "thú cưng": the thing served, in the name field's label. */
  noun: string;
  nameExample: string | null;
  name: string;
  values: SubjectValues;
  onName: (value: string) => void;
  onValue: (key: string, value: string) => void;
  /** Message to show for a field key (`name` for the name), once it was touched. */
  error: (key: string) => string | undefined;
  touch: (key: string) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <>
      <Field id={`${idPrefix}-name`} label={`Tên ${noun}`} size={size} error={error('name')}>
        <input
          id={`${idPrefix}-name`}
          placeholder={nameExample ? `Ví dụ: ${nameExample}` : undefined}
          value={name}
          aria-invalid={error('name') ? true : undefined}
          onChange={(e) => onName(e.target.value)}
          onBlur={() => touch('name')}
        />
      </Field>
      {schema.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        if (field.type === 'enum') {
          return (
            <div key={field.key} className="sp-field">
              <span className="sp-field__label" id={`${id}-label`}>
                {field.label}
              </span>
              <div
                role="group"
                aria-labelledby={`${id}-label`}
                className={`sp-segmented ${size === 'md' ? 'sp-segmented--lg ' : ''}sp-segmented--block`}
              >
                {field.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="sp-segmented__item"
                    aria-pressed={values[field.key] === option.value}
                    onClick={() => {
                      onValue(field.key, option.value);
                      touch(field.key);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        return (
          <Field
            key={field.key}
            id={id}
            size={size}
            label={field.label}
            optional={!isRequired(field, values)}
            error={error(field.key)}
          >
            <input
              id={id}
              inputMode={field.type === 'number' ? 'decimal' : undefined}
              placeholder={field.example ? `Ví dụ: ${field.example}` : undefined}
              value={values[field.key] ?? ''}
              aria-invalid={error(field.key) ? true : undefined}
              onChange={(e) =>
                onValue(
                  field.key,
                  field.type === 'number' ? e.target.value.replace(/[^\d.,]/g, '') : e.target.value,
                )
              }
              onBlur={() => touch(field.key)}
            />
            {field.type === 'number' && field.unit && (
              <span className="sp-field__suffix">{field.unit}</span>
            )}
          </Field>
        );
      })}
    </>
  );
}
