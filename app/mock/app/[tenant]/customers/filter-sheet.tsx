'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/sapio/button';
import { Sheet } from '@/components/sapio/sheet';
import {
  filterCustomers,
  type CustomerQuery,
  type CustomerRow,
  type VisitFilter,
} from '@/mock/customers';
import { MOCK_NOW } from '@/mock/time';

export const VISIT_LABEL: Record<VisitFilter, string> = {
  all: 'Tất cả',
  '30': 'Đến trong 30 ngày',
  '90': 'Đến trong 90 ngày',
  lapsed: 'Lâu chưa quay lại (trên 90 ngày)',
};

export type FilterDraft = Pick<CustomerQuery, 'visit' | 'upcoming' | 'deposit' | 'note' | 'staff'>;

const pick = (q: CustomerQuery): FilterDraft => ({
  visit: q.visit,
  upcoming: q.upcoming,
  deposit: q.deposit,
  note: q.note,
  staff: q.staff,
});
const EMPTY: FilterDraft = {
  visit: 'all',
  upcoming: false,
  deposit: false,
  note: false,
  staff: '',
};

/** Filters of the customer list on phones: edited as a draft, applied with the count it gives. */
export function FilterSheet({
  open,
  onClose,
  query,
  rows,
  staff,
  staffNoun,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  query: CustomerQuery;
  rows: CustomerRow[];
  staff: { value: string; label: string }[];
  staffNoun: string;
  onApply: (patch: FilterDraft) => void;
}) {
  const [draft, setDraft] = useState<FilterDraft>(pick(query));
  // Opening the sheet starts from what the list is showing now.
  useEffect(() => {
    if (open) setDraft(pick(query));
  }, [open, query]);

  const count = filterCustomers(rows, { ...query, ...draft }, MOCK_NOW).length;
  const set = (patch: Partial<FilterDraft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Sheet
      open={open}
      title="Bộ lọc"
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => setDraft(EMPTY)}>Đặt lại</Button>
          <Button variant="primary" onClick={() => onApply(draft)}>
            Xem {count.toLocaleString('vi-VN')} khách
          </Button>
        </>
      }
    >
      <fieldset className="m-0 flex flex-col gap-3.5 border-0 p-0">
        <legend className="sp-menu__label pb-2!">Lần đến</legend>
        {(Object.keys(VISIT_LABEL) as VisitFilter[]).map((value) => (
          <label key={value} className="sp-check">
            <input
              type="radio"
              name="filter-visit"
              checked={draft.visit === value}
              onChange={() => set({ visit: value })}
            />
            <span>{VISIT_LABEL[value]}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-3.5 border-0 p-0">
        <legend className="sp-menu__label pb-2!">Khác</legend>
        <label className="sp-check">
          <input
            type="checkbox"
            checked={draft.upcoming}
            onChange={(e) => set({ upcoming: e.target.checked })}
          />
          <span>Có lịch sắp tới</span>
        </label>
        <label className="sp-check">
          <input
            type="checkbox"
            checked={draft.deposit}
            onChange={(e) => set({ deposit: e.target.checked })}
          />
          <span>Bắt buộc cọc</span>
        </label>
        <label className="sp-check">
          <input
            type="checkbox"
            checked={draft.note}
            onChange={(e) => set({ note: e.target.checked })}
          />
          <span>Có ghi chú nội bộ</span>
        </label>
      </fieldset>
      <div className="sp-field">
        <label className="sp-field__label" htmlFor="filter-staff">
          {staffNoun} quen
        </label>
        <div className="sp-field__control">
          <select
            id="filter-staff"
            value={draft.staff}
            onChange={(e) => set({ staff: e.target.value })}
          >
            <option value="">Tất cả</option>
            {staff.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Sheet>
  );
}
