export interface VariantOption {
  id: string;
  name: string;
  /** "Dưới 10 kg · 60 phút". */
  meta: string;
  price: string;
  /** Multiple mode: cannot be added, e.g. the limit of 4 services is reached. */
  disabled?: boolean;
}

export interface ServiceVariantListProps {
  name: string;
  variants: VariantOption[];
  /** One variant (radio), or a list of variants (checkboxes) when `multiple`. */
  selected: string | null | readonly string[];
  onSelect: (variantId: string) => void;
  multiple?: boolean;
  /** Under the variants, e.g. "Nhuộm có thời gian chờ lên màu". */
  note?: string | undefined;
}

export function ServiceVariantList({
  name,
  variants,
  selected,
  onSelect,
  multiple = false,
  note,
}: ServiceVariantListProps) {
  const isSelected = (id: string) =>
    typeof selected === 'string' || selected === null ? id === selected : selected.includes(id);
  return (
    <fieldset className="sp-service m-0 border-0">
      <legend className="sp-service__name float-left p-0">{name}</legend>
      {variants.map((variant) => (
        <label key={variant.id} className="sp-variant">
          <input
            type={multiple ? 'checkbox' : 'radio'}
            name={multiple ? undefined : 'service-variant'}
            value={variant.id}
            checked={isSelected(variant.id)}
            disabled={variant.disabled}
            onChange={() => onSelect(variant.id)}
          />
          <span className="flex flex-col">
            <span className="sp-variant__name">{variant.name}</span>
            <span className="sp-variant__meta">{variant.meta}</span>
          </span>
          <span className="sp-variant__price">{variant.price}</span>
        </label>
      ))}
      {note && <p className="body-sm m-0 text-(--ink-muted)">{note}</p>}
    </fieldset>
  );
}
