'use client';

import { useMemo, useState } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { usePlatform, useTenantViews } from '@/components/mock/platform-store';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { CheckRow, Field, Form, SaveBar, SwitchRow } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { PLATFORM_ADMIN } from '@/mock/fixtures/platform';
import { formatVnd } from '@/mock/format';
import {
  FEATURE_SWITCHES,
  addPlatformLog,
  catalogOf,
  draftErrors,
  draftOf,
  parsePrice,
  planChanges,
  planImpacts,
  planUsage,
  priceRows,
  pricingNote,
  type CatalogDraft,
  type PlanDraft,
} from '@/mock/platform';
import { PLAN_CODES, type PlanCode } from '@/mock/subscription';

const vnd = new Intl.NumberFormat('vi-VN');

/** Gói và giá (MH-62): the two plans and the discount of each period; saving is asked again when it takes something away (BR-83). */
export function PlansScreen() {
  const { catalog, patch } = usePlatform();
  const { now } = useAccountStore();
  const views = useTenantViews();
  const toast = useToast();
  const [draft, setDraft] = useState<CatalogDraft>(() => draftOf(catalog));
  const [confirming, setConfirming] = useState(false);

  const errors = draftErrors(draft);
  // A draft with an error stands for no catalog yet: the table and the bar keep the saved one.
  const next = useMemo(
    () => (errors.any ? catalog : catalogOf(draft, catalog)),
    [errors.any, draft, catalog],
  );
  const changes = planChanges(catalog, next);
  const impacts = planImpacts(catalog, next, views);
  const note = pricingNote(catalog, next, views);
  const rows = priceRows(next);
  const saved = priceRows(catalog);

  const setPlan = (code: PlanCode, change: Partial<PlanDraft>) =>
    setDraft((d) => ({ ...d, plans: { ...d.plans, [code]: { ...d.plans[code], ...change } } }));

  function save() {
    patch((d) => ({
      catalog: next,
      log: addPlatformLog(d.log, now, PLATFORM_ADMIN, {
        action: 'Đổi gói và giá',
        object: 'Gói và giá',
        detail: changes.join('; '),
        tenantId: null,
      }),
    }));
    setDraft(draftOf(next));
    setConfirming(false);
    toast({ text: 'Đã lưu gói và giá. Trang giới thiệu và trang Gói Sapio hiện giá mới.' });
  }

  const unsaved = changes.length > 0 || errors.any;
  const summary = errors.any
    ? 'Còn ô chưa hợp lệ, sửa rồi mới lưu được.'
    : `Chưa lưu: ${changes.join(', ')}.${note ? ` ${note}` : ''}`;

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <PageHeader
        title="Gói và giá"
        sub="Trang giới thiệu, trang Gói Sapio và phần tính tiền nâng gói đọc từ đây (BR-83, BR-84)."
      />
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          if (errors.any || changes.length === 0) return;
          if (impacts.length > 0) setConfirming(true);
          else save();
        }}
      >
        <div className="flex flex-wrap items-stretch gap-(--space-4)">
          {PLAN_CODES.map((code) => {
            const d = draft.plans[code];
            const e = errors.plans[code];
            const usage = planUsage(views, code);
            const oldPrice = catalog.plans[code].monthlyPriceVnd;
            const price = parsePrice(d.price);
            const id = `pl-${code}`;
            return (
              <section
                key={code}
                className="sp-panel min-w-0 flex-[1_1_0]"
                aria-labelledby={`${id}-h`}
              >
                <h2 className="sp-panel__title" id={`${id}-h`}>
                  {catalog.plans[code].name}
                </h2>
                <div className="flex flex-col gap-3.5">
                  <div className="flex gap-3">
                    <div className="w-[calc(50%-6px)]">
                      <Field id={`${id}-name`} label="Tên gói" error={e.name}>
                        <input
                          id={`${id}-name`}
                          value={d.name}
                          onChange={(ev) => setPlan(code, { name: ev.target.value })}
                        />
                      </Field>
                    </div>
                    <div className="w-[calc(50%-6px)]">
                      <Field
                        id={`${id}-price`}
                        label="Giá tháng"
                        suffix="₫"
                        error={e.price}
                        help={
                          price !== null && price !== oldPrice
                            ? `Đang sửa · giá cũ ${formatVnd(oldPrice)}`
                            : undefined
                        }
                      >
                        <input
                          id={`${id}-price`}
                          inputMode="numeric"
                          value={d.price}
                          onChange={(ev) => {
                            const parsed = parsePrice(ev.target.value);
                            setPlan(code, {
                              price:
                                parsed === null
                                  ? ev.target.value.replace(/\D/g, '')
                                  : vnd.format(parsed),
                            });
                          }}
                        />
                      </Field>
                    </div>
                  </div>
                  <Field
                    id={`${id}-note`}
                    label="Dòng mô tả"
                    help="Hiện dưới giá ở trang giới thiệu và trang Gói Sapio."
                  >
                    <input
                      id={`${id}-note`}
                      value={d.note}
                      onChange={(ev) => setPlan(code, { note: ev.target.value })}
                    />
                  </Field>
                  <div className="flex items-end gap-3">
                    <div className="w-[140px]">
                      <Field id={`${id}-br`} label="Chi nhánh tối đa" error={e.branches}>
                        <input
                          id={`${id}-br`}
                          inputMode="numeric"
                          disabled={d.unlimited}
                          value={d.unlimited ? '' : d.branches}
                          onChange={(ev) =>
                            setPlan(code, { branches: ev.target.value.replace(/\D/g, '') })
                          }
                        />
                      </Field>
                    </div>
                    <div className="pb-2">
                      <CheckRow
                        label="Không giới hạn"
                        checked={d.unlimited}
                        onChange={(checked) =>
                          setPlan(code, {
                            unlimited: checked,
                            ...(checked ? {} : { branches: d.branches || '1' }),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5 border-t border-(--line) pt-1">
                    <span className="sp-field__label pt-2.5">Tính năng</span>
                    {FEATURE_SWITCHES.map((sw) => (
                      <SwitchRow
                        key={sw.id}
                        label={sw.label}
                        checked={d[sw.id]}
                        onChange={(checked) => setPlan(code, { [sw.id]: checked })}
                      />
                    ))}
                  </div>
                  <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
                    Đang dùng: {usage.paid} cơ sở trả phí
                    {code === 'pro'
                      ? `, ${usage.trial} cơ sở dùng thử (dùng thử có đủ tính năng của gói này, BR-81)`
                      : ''}
                    .
                  </p>
                </div>
              </section>
            );
          })}
        </div>
        <div className="flex flex-wrap items-stretch gap-(--space-4)">
          <section className="sp-panel min-w-0 flex-[1.3_1_0]" aria-labelledby="pl-per">
            <h2 className="sp-panel__title" id="pl-per">
              Giá theo kỳ
            </h2>
            <div
              className="sp-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Giá theo kỳ, cuộn được"
            >
              <table className="sp-table">
                <caption className="sp-sr-only">Giá theo kỳ</caption>
                <thead>
                  <tr>
                    <th scope="col">Kỳ</th>
                    <th scope="col">Giảm</th>
                    {PLAN_CODES.map((code) => (
                      <th key={code} scope="col" className="sp-table__num">
                        {next.plans[code].name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.months}>
                      <td>{row.months} tháng</td>
                      <td>
                        {row.months === 1 ? (
                          <span className="sp-muted">0%</span>
                        ) : (
                          <div className="w-24">
                            <Field
                              id={`pl-d${row.months}`}
                              label={`Giảm cho ${row.months} tháng`}
                              suffix="%"
                              error={errors.discounts[row.months as 3 | 12]}
                            >
                              <input
                                id={`pl-d${row.months}`}
                                inputMode="numeric"
                                value={draft.discounts[row.months as 3 | 12]}
                                onChange={(ev) =>
                                  setDraft((d) => ({
                                    ...d,
                                    discounts: {
                                      ...d.discounts,
                                      [row.months]: ev.target.value.replace(/\D/g, ''),
                                    },
                                  }))
                                }
                              />
                            </Field>
                          </div>
                        )}
                      </td>
                      {PLAN_CODES.map((code) => {
                        const old = saved[i]?.prices[code];
                        return (
                          <td key={code} className="sp-table__num sp-num">
                            {formatVnd(row.prices[code])}
                            {old !== undefined && old !== row.prices[code] && (
                              <span className="text-[13px] text-(--ink-muted)">
                                {' '}
                                ({formatVnd(old)})
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
              Giá kỳ = giá tháng × số tháng × (1 − giảm), làm tròn tới nghìn đồng. Số trong ngoặc là
              giá đang áp.
            </p>
          </section>
          <section className="sp-panel min-w-0 flex-[1_1_0]" aria-labelledby="pl-rule">
            <h2 className="sp-panel__title" id="pl-rule">
              Khi lưu
            </h2>
            <ul className="m-0 flex flex-col gap-1.5 ps-5 text-sm leading-5">
              <li>
                Đổi giá, giảm theo kỳ: chỉ áp cho lần thanh toán sau. Kỳ đã trả giữ nguyên giá và
                hạn.
              </li>
              <li>Bật thêm tính năng: có hiệu lực ngay cho mọi cơ sở của gói.</li>
              <li>
                Tắt một tính năng hoặc giảm số chi nhánh: hỏi lại, kèm số cơ sở bị ảnh hưởng; dữ
                liệu cũ của tính năng chỉ còn đọc (BR-87).
              </li>
              <li>Mỗi lần lưu ghi Nhật ký nền tảng.</li>
            </ul>
          </section>
        </div>
        <SaveBar
          count={unsaved ? Math.max(changes.length, 1) : 0}
          summary={summary}
          saveDisabled={errors.any}
          onDiscard={() => setDraft(draftOf(catalog))}
        />
      </Form>
      {confirming && (
        <ConfirmDialog
          open
          tone="danger"
          title="Lưu thay đổi lấy đi tính năng?"
          body="Dữ liệu cũ của tính năng đó giữ nguyên nhưng chỉ còn đọc (BR-87)."
          facts={impacts.map((i) => ({
            term: `${catalog.plans[i.planCode].name} · ${i.label}`,
            value: `${i.tenants} cơ sở bị ảnh hưởng`,
          }))}
          confirmLabel="Lưu và áp dụng"
          backLabel="Quay lại"
          onClose={() => setConfirming(false)}
          onConfirm={save}
        />
      )}
    </div>
  );
}
