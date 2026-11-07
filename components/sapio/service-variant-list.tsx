export interface VariantOption {
  id: string;
  name: string;
  /** "Chó dưới 10 kg · 60 phút". */
  meta: string;
  price: string;
}

export interface ServiceVariantListProps {
  name: string;
  variants: VariantOption[];
  selected: string | null;
  onSelect: (variantId: string) => void;
}

export function ServiceVariantList({
  name,
  variants,
  selected,
  onSelect,
}: ServiceVariantListProps) {
  return (
    <fieldset className="sp-service m-0 border-0">
      <legend className="sp-service__name float-left p-0">{name}</legend>
      {variants.map((variant) => (
        <label key={variant.id} className="sp-variant">
          <input
            type="radio"
            name="service-variant"
            value={variant.id}
            checked={variant.id === selected}
            onChange={() => onSelect(variant.id)}
          />
          <span className="flex flex-col">
            <span className="sp-variant__name">{variant.name}</span>
            <span className="sp-variant__meta">{variant.meta}</span>
          </span>
          <span className="sp-variant__price">{variant.price}</span>
        </label>
      ))}
    </fieldset>
  );
}
