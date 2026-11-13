'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { useQueryState } from '@/components/mock/use-query-state';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { matchesPerson } from '@/mock/customers';
import { formatPhone, formatVnd } from '@/mock/format';
import { packageExpiry, parseVnd, topupBonus, walletBalance } from '@/mock/money';
import { newDraft } from '@/mock/money-ops';

const CHIPS = [200_000n, 500_000n, 1_000_000n, 2_000_000n];
const number = new Intl.NumberFormat('vi-VN');

/** Bán gói, nạp ví (MH-30): pick a customer and what they buy, then collect it on the checkout page (MH-29). */
export function SalesScreen({ tenantSlug }: { tenantSlug: string }) {
  const { fixture, world, apply, ctx, role } = useDesk(tenantSlug);
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const [type, setType] = useQueryState('type', 'package');
  const [customerId, setCustomerId] = useQueryState('customer', '');
  const [query, setQuery] = useState('');
  const [packageId, setPackageId] = useState(
    fixture.packageCatalog.find((p) => p.selling)?.id ?? '',
  );
  const [amountText, setAmountText] = useState('1.000.000');

  const customer = world.customers.find((c) => c.id === customerId);
  const hits = useMemo(
    () =>
      query.trim() === ''
        ? []
        : world.customers.filter((c) => matchesPerson(c.name, c.phone, query)).slice(0, 6),
    [world.customers, query],
  );
  const wallet = isWallet(type);
  // BR-38: a package taken off sale is not sold any more.
  const onSale = fixture.packageCatalog.filter((p) => p.selling);
  const product = onSale.find((p) => p.id === packageId);
  const variantOf = (id: string) =>
    fixture.services.flatMap((s) => s.variants.map((v) => ({ v, s }))).find((x) => x.v.id === id);
  const amount = parseVnd(amountText);
  const bonus = amount ? topupBonus(amount, fixture.topupBonusTiers) : 0n;
  const balance = customer
    ? walletBalance(world.money.walletEntries, customer.id)
    : { realVnd: 0n, bonusVnd: 0n, balanceVnd: 0n };
  const tier = fixture.topupBonusTiers[0];
  const canSubmit =
    Boolean(customer) && (wallet ? Boolean(amount && amount > 0n) : Boolean(product));
  const total = wallet ? (amount ?? 0n) : (product?.priceVnd ?? 0n);

  function submit() {
    if (!customer || role === 'technician') return;
    const lines = wallet
      ? [
          {
            kind: 'wallet_topup' as const,
            description: 'Nạp ví',
            detail: bonus > 0n ? `Tặng ${formatVnd(bonus)}` : 'Không có tiền tặng',
            quantity: 1,
            unitPriceVnd: amount ?? 0n,
            bonusVnd: bonus,
          },
        ]
      : product
        ? [
            {
              kind: 'package_sale' as const,
              description: product.name,
              detail: `Hạn đến ${packageExpiry(ctx().now, product.validDays)}`,
              quantity: 1,
              unitPriceVnd: product.priceVnd,
              productId: product.id,
            },
          ]
        : [];
    if (lines.length === 0) return;
    const made = newDraft(world, { customerId: customer.id, lines }, ctx());
    apply(() => made.world);
    router.push(appHref(`checkout/${made.invoice.id}`));
  }

  if (role === 'technician') {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">Bán gói và nạp ví do lễ tân, quản lý và chủ cơ sở làm.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Hóa đơn', href: appHref('invoices') }, { label: 'Bán gói, nạp ví' }]}
        title="Bán gói, nạp ví"
      />
      <div className="sp-detail">
        <div className="sp-detail__main flex min-w-0 flex-[1_1_560px] flex-col gap-5">
          <div className="flex flex-wrap items-end gap-4">
            <div role="group" aria-label="Loại bán" className="sp-segmented">
              <button
                type="button"
                className="sp-segmented__item"
                aria-pressed={!wallet}
                onClick={() => setType('package')}
              >
                Bán gói
              </button>
              <button
                type="button"
                className="sp-segmented__item"
                aria-pressed={wallet}
                onClick={() => setType('wallet')}
              >
                Nạp ví
              </button>
            </div>
            <div className="relative min-w-[260px] flex-[1_1_320px]">
              <Field
                id="s-c"
                label="Khách"
                help={customer ? undefined : 'Tìm theo số hoặc tên (BR-61).'}
              >
                <input
                  id="s-c"
                  type="search"
                  autoComplete="off"
                  value={customer ? `${customer.name} · ${formatPhone(customer.phone)}` : query}
                  onFocus={() => {
                    if (customer) {
                      setCustomerId('');
                      setQuery('');
                    }
                  }}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </Field>
              {hits.length > 0 && !customer && (
                <ul
                  aria-label="Khách tìm thấy"
                  className="sp-panel absolute right-0 left-0 z-10 m-0 mt-1 list-none gap-0 p-1"
                >
                  {hits.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-(--surface-hover)"
                        onClick={() => {
                          setCustomerId(c.id);
                          setQuery('');
                        }}
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="sp-num text-(--ink-muted)">{formatPhone(c.phone)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {wallet ? (
            <section className="sp-panel" aria-labelledby="s-amt-p">
              <h2 className="sp-panel__title" id="s-amt-p">
                Số tiền nạp
              </h2>
              <div className="flex flex-wrap gap-2">
                {CHIPS.map((c) => (
                  <button
                    key={String(c)}
                    type="button"
                    className="sp-chip"
                    aria-pressed={amount === c}
                    onClick={() => setAmountText(number.format(c))}
                  >
                    {formatVnd(c)}
                  </button>
                ))}
              </div>
              <div className="w-[200px]">
                <Field id="s-amt" label="Số khác" suffix="₫">
                  <input
                    id="s-amt"
                    inputMode="numeric"
                    value={amountText}
                    onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ''))}
                  />
                </Field>
              </div>
              {tier && (
                <p role="status" className={`sp-fit ${bonus > 0n ? 'sp-fit--ok' : ''}`}>
                  <span>
                    {bonus > 0n
                      ? `Nạp từ ${formatVnd(tier.minVnd)} tặng ${tier.percent}%: thêm ${formatVnd(bonus)} tiền tặng.`
                      : `Nạp từ ${formatVnd(tier.minVnd)} thì tặng ${tier.percent}%.`}
                  </span>
                </p>
              )}
              <p className="sp-panel__note">
                Mức tặng cấu hình ở Cài đặt › Thanh toán (MH-52). Tiền tặng không rút được (BR-25).
              </p>
            </section>
          ) : (
            <section className="sp-panel" aria-labelledby="s-pk">
              <h2 className="sp-panel__title" id="s-pk">
                Chọn gói
              </h2>
              {onSale.length === 0 ? (
                <p className="sp-empty m-0">Cơ sở chưa có gói nào để bán.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {onSale.map((p) => {
                    const info = variantOf(p.serviceVariantId);
                    const selected = p.id === packageId;
                    return (
                      <label
                        key={p.id}
                        className="sp-check sp-check--card flex items-start gap-3 rounded-(--radius-md) bg-(--surface-raised) px-[14px] py-3"
                        style={{
                          boxShadow: selected
                            ? '0 0 0 1.5px var(--brand)'
                            : '0 0 0 1px var(--line)',
                        }}
                      >
                        <input
                          type="radio"
                          name="pk"
                          checked={selected}
                          onChange={() => setPackageId(p.id)}
                        />
                        <span className="flex-auto">
                          <span className="block text-[15px] leading-[22px] font-medium">
                            {p.name}
                          </span>
                          <span className="sp-check__hint">
                            {info?.s.name}
                            {info && info.s.variants.length > 1 ? ` · ${info.v.name}` : ''} · hạn{' '}
                            {p.validDays} ngày
                            {info ? ` · giá lẻ ${formatVnd(info.v.priceVnd)}/buổi` : ''}
                          </span>
                        </span>
                        <span className="sp-num text-[15px] leading-[22px] font-semibold">
                          {formatVnd(p.priceVnd)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="sp-panel__note">
                Gói và giá cấu hình ở Cài đặt › Gói liệu trình (MH-51).
              </p>
            </section>
          )}
        </div>

        <aside className="sp-detail__side flex-[0_0_360px]" aria-label="Tóm tắt">
          <section className="sp-panel" aria-labelledby="s-sum">
            <h2 className="sp-panel__title" id="s-sum">
              Tóm tắt
            </h2>
            <dl className="sp-kv">
              {wallet ? (
                <>
                  <dt>Tiền thật</dt>
                  <dd className="sp-num">+{formatVnd(amount ?? 0n)}</dd>
                  <dt>Tiền tặng</dt>
                  <dd className="sp-num">+{formatVnd(bonus)}</dd>
                  <dt>Số dư sau nạp</dt>
                  <dd className="sp-num">
                    {formatVnd(balance.balanceVnd + (amount ?? 0n) + bonus)}
                  </dd>
                </>
              ) : (
                <>
                  <dt>Gói</dt>
                  <dd className="sp-num">{product?.name ?? ''}</dd>
                  <dt>Hết hạn</dt>
                  <dd className="sp-num">
                    {product ? packageExpiry(ctx().now, product.validDays) : ''}
                  </dd>
                  <dt>Giá lẻ lúc mua</dt>
                  <dd className="sp-num">
                    {product && variantOf(product.serviceVariantId)
                      ? `${formatVnd(variantOf(product.serviceVariantId)!.v.priceVnd)}/buổi`
                      : ''}
                  </dd>
                </>
              )}
              <dt className="border-t border-(--line) pt-2 font-semibold text-(--ink)">Thu</dt>
              <dd className="sp-num border-t border-(--line) pt-2 text-[17px] font-bold">
                {formatVnd(total)}
              </dd>
            </dl>
            <p className="sp-panel__note">
              {wallet
                ? 'Ví dùng tiền thật trước, tiền tặng sau. Số dư là tổng bút toán, không sửa tay được (BR-20).'
                : product
                  ? `Tiền gói vào "tiền trả trước", chưa là doanh thu. Mỗi buổi dùng chuyển ${formatVnd(product.priceVnd / BigInt(product.totalSessions))} sang doanh thu (BR-26). Hoàn gói tính theo BR-27.`
                  : ''}
            </p>
            <Button variant="primary" size="lg" block disabled={!canSubmit} onClick={submit}>
              Thu {formatVnd(total)}
            </Button>
            <p className="sp-panel__note">
              {customer
                ? 'Bấm Thu thì sang màn Thu tiền (MH-29) với dòng này.'
                : 'Chọn khách trước.'}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

const isWallet = (type: string) => type === 'wallet';
