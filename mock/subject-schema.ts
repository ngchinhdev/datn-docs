import type { ServedSubject, Service, SubjectField, TenantFixture } from './fixtures';

/** What the customer typed, field by field, as text. */
export type SubjectValues = Record<string, string>;

/** `required` can depend on other fields: a dog's weight is needed, a cat's is not. */
export function isRequired(field: SubjectField, values: SubjectValues): boolean {
  if (typeof field.required === 'boolean') return field.required;
  return Object.entries(field.required).every(([key, value]) => values[key] === value);
}

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** Parses a number typed with a comma or a dot; `NaN` when it is not one. */
export const parseDecimal = (text: string) => Number(text.trim().replace(',', '.'));

export interface SubjectCheck {
  /** Message per field key (`name` for the subject's name); empty when valid. */
  errors: Record<string, string>;
  /** Attributes ready to store, only valid and non-empty values. */
  attributes: Record<string, string>;
}

/** BR-71: attributes must follow the industry schema before the subject is saved. */
export function checkSubject(
  schema: SubjectField[],
  noun: string,
  name: string,
  values: SubjectValues,
): SubjectCheck {
  const errors: Record<string, string> = {};
  const attributes: Record<string, string> = {};
  if (!name.trim()) errors.name = `Nhập tên ${noun}.`;

  for (const field of schema) {
    const raw = (values[field.key] ?? '').trim();
    const required = isRequired(field, values);
    if (!raw) {
      if (required) {
        errors[field.key] =
          field.type === 'enum' ? `Chọn ${lower(field.label)}.` : `Nhập ${lower(field.label)}.`;
      }
      continue;
    }
    if (field.type === 'enum') {
      if (field.options.some((o) => o.value === raw)) attributes[field.key] = raw;
      else errors[field.key] = `Chọn ${lower(field.label)} trong danh sách.`;
    } else if (field.type === 'number') {
      const n = parseDecimal(raw);
      if (Number.isNaN(n) || n <= 0) {
        errors[field.key] = `${field.label} phải là số lớn hơn 0.`;
      } else {
        attributes[field.key] = String(n);
      }
    } else {
      attributes[field.key] = raw;
    }
  }
  return { errors, attributes };
}

/** "Chó · Poodle · 6 kg": the values of a subject in schema order. */
export function describeSubject(schema: SubjectField[], subject: ServedSubject): string {
  return schema
    .map((field) => {
      const value = subject.attributes[field.key];
      if (!value) return null;
      if (field.type === 'enum')
        return field.options.find((o) => o.value === value)?.label ?? value;
      if (field.type === 'number' && field.unit) return `${value} ${field.unit}`;
      return value;
    })
    .filter(Boolean)
    .join(' · ');
}

/** "loài và cân nặng": the fields that decide the price of a service, in the words of the schema. */
export function priceFactors(schema: SubjectField[], service: Service): string {
  const keys = new Set(service.variants.flatMap((v) => Object.keys(v.match)));
  const labels = schema.filter((f) => keys.has(f.key)).map((f) => lower(f.label));
  if (labels.length < 2) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} và ${labels.at(-1)}`;
}

/** "Tên, loài, giống và cân nặng": what the add-subject form asks for. */
export function askedFields(fixture: TenantFixture): string {
  const labels = ['Tên', ...fixture.template.subjectSchema.map((f) => lower(f.label))];
  return `${labels.slice(0, -1).join(', ')} và ${labels.at(-1)}`;
}
