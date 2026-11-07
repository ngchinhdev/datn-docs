import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type PageItem = number | 'gap';

/** Page numbers: all up to 7, otherwise the first, the last and the ones near the current. */
export function pageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, 'gap', total];
  if (current >= total - 3) {
    return [1, 'gap', ...Array.from({ length: 5 }, (_, i) => total - 4 + i)];
  }
  return [1, 'gap', current - 1, current, current + 1, 'gap', total];
}

/** `nav.sp-pagination`; links, so the page is in the URL. Below 768px: "Trang 1/65" between two arrows. */
export function Pagination({
  page,
  pages,
  hrefFor,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
}) {
  const step = (to: number, label: string, icon: React.ReactNode, disabled: boolean) =>
    disabled ? (
      <button
        type="button"
        className="sp-pagination__page sp-pagination__step max-md:size-11!"
        aria-label={label}
        disabled
      >
        {icon}
      </button>
    ) : (
      <Link
        href={hrefFor(to)}
        scroll={false}
        className="sp-pagination__page sp-pagination__step max-md:size-11!"
        aria-label={label}
      >
        {icon}
      </Link>
    );

  return (
    <nav className={cn('sp-pagination max-md:justify-center')} aria-label="Phân trang">
      {step(page - 1, 'Trang trước', <ChevronLeft size={16} aria-hidden="true" />, page <= 1)}
      {pageItems(page, pages).map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} className="sp-pagination__gap" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            scroll={false}
            className="sp-pagination__page"
            aria-current={item === page ? 'page' : undefined}
            aria-label={item === pages && pages > 7 ? `Trang ${item}, trang cuối` : undefined}
          >
            {item}
          </Link>
        ),
      )}
      <span className="sp-pagination__compact" aria-hidden="true">
        Trang {page}/{pages}
      </span>
      {step(page + 1, 'Trang sau', <ChevronRight size={16} aria-hidden="true" />, page >= pages)}
    </nav>
  );
}

/** "20 / trang"; changing it sends the list back to page 1 (the caller does that). */
export function PageSizeSelect({
  value,
  options,
  onChange,
}: {
  value: number;
  options: readonly number[];
  onChange: (size: number) => void;
}) {
  return (
    <span className="sp-select sp-page-size">
      <select
        aria-label="Số dòng mỗi trang"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size} / trang
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  );
}

/** Footer of a table card: what is shown on the left, pages and size on the right. */
export function TableFoot({
  summary,
  page,
  pages,
  hrefFor,
  size,
  sizes,
  onSize,
}: {
  summary: string;
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  size: number;
  sizes: readonly number[];
  onSize: (size: number) => void;
}) {
  return (
    <div className="sp-table-foot">
      <span className="sp-num">{summary}</span>
      <div className="sp-table-foot__right">
        <Pagination page={page} pages={pages} hrefFor={hrefFor} />
        <PageSizeSelect value={size} options={sizes} onChange={onSize} />
      </div>
    </div>
  );
}
