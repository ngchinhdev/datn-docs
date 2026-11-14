'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { CheckRow, Field, Form, SaveBar } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';
import type { BonusTier } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import { parseVnd, topupBonus } from '@/mock/money';
import { keyTailFor, tiersProblem } from '@/mock/shop';
import { formatDateTime } from '@/mock/time';

type Method = 'transfer' | 'card' | 'wallet';
const number = new Intl.NumberFormat('vi-VN');
const EXAMPLES = [1_500_000n, 3_000_000n];

interface TierRow {
  min: string;
  percent: string;
}

/** Thanh toán (MH-52): the gateway, what the desk accepts, the wallet's bonus tiers, the fee for giving a package back. */
export function PaymentsScreen({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { ctx, fixture } = useDesk(tenantSlug);
  const { can } = useSubscription();
  const store = useScheduleStore();
  const { config, topupBonusTiers, saveSettings } = store;
  const walletPlan = can('packages_wallet');

  const initial = () => ({
    methods: { ...config.counterMethods },
    tiers: topupBonusTiers.map((t): TierRow => ({
      min: number.format(t.minVnd),
      percent: String(t.percent),
    })),
    fee: number.format(config.packageCancelFee),
  });
  const [form, setForm] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  const tiers: BonusTier[] = form.tiers.map((t) => ({
    minVnd: parseVnd(t.min) ?? 0n,
    percent: /^\d{1,3}$/.test(t.percent) ? Number(t.percent) : -1,
  }));
  const tierError = tiersProblem(tiers);
  const fee = parseVnd(form.fee);
  const feeError = fee === null ? 'Nhập phí hủy bằng số.' : null;
  const invalid = tierError !== null || feeError !== null;

  const tiersText = (list: readonly BonusTier[]) =>
    list.length === 0
      ? 'không tặng'
      : [...list]
          .sort((a, b) => (a.minVnd < b.minVnd ? -1 : 1))
          .map((t) => `từ ${formatVnd(t.minVnd)} tặng ${t.percent}%`)
          .join('; ');

  const methodLabel: Record<Method, string> = {
    transfer: 'Chuyển khoản QR',
    card: 'Thẻ',
    wallet: 'Ví của khách',
  };
  const changes = [
    ...(['transfer', 'card', 'wallet'] as Method[])
      .filter((m) => form.methods[m] !== config.counterMethods[m])
      .map((m) => ({
        short: methodLabel[m].toLowerCase(),
        object: `Nhận tại quầy: ${methodLabel[m]}`,
        detail: `${config.counterMethods[m] ? 'bật' : 'tắt'} → ${form.methods[m] ? 'bật' : 'tắt'}`,
      })),
    ...(tiersText(tiers) !== tiersText(topupBonusTiers)
      ? [
          {
            short: 'mức tặng khi nạp ví',
            object: 'Mức tặng khi nạp ví',
            detail: `${tiersText(topupBonusTiers)} → ${tiersText(tiers)}`,
          },
        ]
      : []),
    ...(fee !== null && fee !== config.packageCancelFee
      ? [
          {
            short: 'phí hủy gói',
            object: 'Phí hủy gói',
            detail: `${formatVnd(config.packageCancelFee)} → ${formatVnd(fee)}`,
          },
        ]
      : []),
  ];
  useUnsavedGuard(changes.length > 0, setLeaveHref);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (invalid || fee === null) return;
    const now = ctx();
    saveSettings(
      {
        topupBonusTiers: [...tiers].sort((a, b) => (a.minVnd < b.minVnd ? -1 : 1)),
        config: { counterMethods: form.methods, packageCancelFee: fee },
      },
      {
        at: now.now,
        actor: { name: now.actor, role: now.role },
        entries: changes.map((c) => ({
          action: 'Sửa thanh toán',
          object: c.object,
          href: 'settings/payments',
          detail: c.detail,
        })),
      },
    );
    setSubmitted(false);
    toast({ text: 'Đã lưu. Màn Thu tiền và Bán gói, nạp ví dùng các giá trị này ngay.' });
  }

  function discard() {
    setForm(initial());
    setSubmitted(false);
  }

  function newKey() {
    const now = ctx();
    const version = config.gateway.keyVersion + 1;
    saveSettings(
      {
        config: {
          gateway: { ...config.gateway, keyVersion: version, keyTail: keyTailFor(version) },
        },
      },
      {
        at: now.now,
        actor: { name: now.actor, role: now.role },
        entries: [
          {
            action: 'Đổi khóa cổng thanh toán',
            object: 'Sapio Pay (giả lập)',
            href: 'settings/payments',
            detail: `Khóa bí mật ${config.gateway.keyTail} → ${keyTailFor(version)}; khóa cũ hết hiệu lực`,
          },
        ],
      },
    );
    setRotating(false);
    toast({ text: 'Đã tạo khóa mới. Khóa cũ hết hiệu lực ngay.' });
  }

  function sendTest() {
    const events = config.gateway.events;
    saveSettings({
      config: {
        gateway: {
          ...config.gateway,
          events: [
            ...events,
            {
              id: `gw-${events.length + 1}`,
              at: ctx().now,
              text: 'Thông báo thử, đúng chữ ký',
              ok: true,
            },
          ],
        },
      },
    });
    toast({ text: 'Đã gửi thử một thông báo; cổng ghi nhận, đúng chữ ký.' });
  }

  const last = config.gateway.events.at(-1);
  const history = [...config.gateway.events].reverse().slice(0, 5);
  const setTier = (i: number, patch: Partial<TierRow>) =>
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Thanh toán' }]}
        title="Thanh toán"
      />
      <Form onSubmit={onSubmit} className="gap-5">
        <section className="sp-panel" aria-labelledby="pm-1">
          <h2 className="sp-panel__title" id="pm-1">
            Cổng thanh toán online
          </h2>
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center gap-2">
              <span className="sp-badge sp-badge--confirmed">Đang chạy</span>
              <span className="text-sm leading-5">Cổng giả lập Sapio Pay · ký HMAC-SHA256</span>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-[260px]">
                <Field id="pg-k" label="Khóa bí mật" help="Chỉ hiện 4 ký tự cuối.">
                  <input id="pg-k" readOnly value={`••••••••••••${config.gateway.keyTail}`} />
                </Field>
              </div>
              <Button size="sm" onClick={() => setRotating(true)}>
                Tạo khóa mới
              </Button>
              <Button size="sm" variant="ghost" onClick={sendTest}>
                Gửi thử một thông báo
              </Button>
            </div>
            <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
              {last
                ? `Lần báo gần nhất: ${formatDateTime(last.at)}, ${last.text}. `
                : 'Cổng chưa báo lần nào. '}
              payOS không có môi trường thử nên đồ án dùng cổng giả lập (D-09).
            </p>
            {history.length > 0 && (
              <div
                className="sp-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Lịch sử cổng, cuộn được"
              >
                <table className="sp-table">
                  <caption className="sp-sr-only">Lịch sử cổng thanh toán</caption>
                  <thead>
                    <tr>
                      <th scope="col">Giờ</th>
                      <th scope="col">Nội dung</th>
                      <th scope="col">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((ev) => (
                      <tr key={ev.id}>
                        <td>
                          <span className="sp-num">{formatDateTime(ev.at)}</span>
                        </td>
                        <td>{ev.text}</td>
                        <td>
                          <span className={`sp-badge sp-badge--${ev.ok ? 'completed' : 'no-show'}`}>
                            {ev.ok ? 'Đúng chữ ký' : 'Sai chữ ký'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="sp-panel" aria-labelledby="pm-2">
          <h2 className="sp-panel__title" id="pm-2">
            Nhận tại quầy
          </h2>
          <div className="flex flex-col gap-[10px]">
            <label className="sp-check">
              <input type="checkbox" checked disabled />
              <span>
                Tiền mặt<span className="sp-check__hint">Luôn bật.</span>
              </span>
            </label>
            <CheckRow
              label="Chuyển khoản QR"
              hint="Tự ghi khi cổng báo (BR-21)."
              checked={form.methods.transfer}
              onChange={(v) => setForm((f) => ({ ...f, methods: { ...f.methods, transfer: v } }))}
            />
            <CheckRow
              label="Thẻ"
              hint="Lễ tân ghi tay sau khi quẹt máy POS."
              checked={form.methods.card}
              onChange={(v) => setForm((f) => ({ ...f, methods: { ...f.methods, card: v } }))}
            />
            <label className="sp-check">
              <input
                type="checkbox"
                checked={walletPlan && form.methods.wallet}
                disabled={!walletPlan}
                onChange={(e) =>
                  setForm((f) => ({ ...f, methods: { ...f.methods, wallet: e.target.checked } }))
                }
              />
              <span>
                Ví của khách<span className="sp-check__hint">Cần gói Chuyên nghiệp.</span>
              </span>
            </label>
          </div>
        </section>

        <section className="sp-panel" aria-labelledby="pm-3">
          <h2 className="sp-panel__title" id="pm-3">
            Ví
          </h2>
          <div
            className="sp-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Mức tặng khi nạp ví, cuộn được"
          >
            <table className="sp-table">
              <caption className="sp-sr-only">Mức tặng khi nạp ví</caption>
              <thead>
                <tr>
                  <th scope="col">Nạp từ</th>
                  <th scope="col" className="sp-table__num">
                    Tặng
                  </th>
                  <th scope="col">
                    <span className="sp-sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {form.tiers.map((t, i) => (
                  <tr key={i}>
                    <td>
                      <span className="sp-field sp-field--sm inline-flex w-40">
                        <span className="sp-field__control">
                          <input
                            className="sp-num"
                            aria-label="Nạp từ"
                            inputMode="numeric"
                            value={t.min}
                            onChange={(e) =>
                              setTier(i, { min: e.target.value.replace(/[^\d.]/g, '') })
                            }
                          />
                          <span className="sp-field__suffix">₫</span>
                        </span>
                      </span>
                    </td>
                    <td className="sp-table__num">
                      <span className="sp-field sp-field--sm inline-flex w-[90px]">
                        <span className="sp-field__control">
                          <input
                            className="sp-num text-right"
                            aria-label="Tặng"
                            inputMode="numeric"
                            value={t.percent}
                            onChange={(e) =>
                              setTier(i, { percent: e.target.value.replace(/\D/g, '') })
                            }
                          />
                          <span className="sp-field__suffix">%</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sp-icon-btn"
                        aria-label="Bỏ mức này"
                        onClick={() =>
                          setForm((f) => ({ ...f, tiers: f.tiers.filter((_, j) => j !== i) }))
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <Button
              size="sm"
              onClick={() =>
                setForm((f) => ({ ...f, tiers: [...f.tiers, { min: '', percent: '' }] }))
              }
            >
              <Plus size={14} aria-hidden="true" />
              Thêm mức
            </Button>
          </div>
          {submitted && tierError && (
            <p role="status" className="sp-fit sp-fit--bad m-0">
              <span>{tierError}</span>
            </p>
          )}
          {!tierError && (
            <p className="m-0 rounded-(--radius-sm) bg-(--fill-tonal) px-3 py-2 text-[13px] leading-[18px]">
              <strong>Ví dụ:</strong>{' '}
              {EXAMPLES.map((a) => {
                const bonus = topupBonus(a, tiers);
                return `nạp ${formatVnd(a)} thì ${bonus > 0n ? `tặng ${formatVnd(bonus)}` : 'không tặng'}`;
              }).join('; ')}
              .
            </p>
          )}
          <p className="sp-panel__note">
            Áp mức cao nhất mà số nạp đạt tới. Tiền tặng không rút được (BR-25).
          </p>
        </section>

        <section className="sp-panel" aria-labelledby="pm-4">
          <h2 className="sp-panel__title" id="pm-4">
            Gói liệu trình
          </h2>
          <div className="w-[180px]">
            <Field
              id="pm-f"
              label="Phí hủy gói"
              suffix="₫"
              help="Trừ khi hoàn gói (BR-27)."
              error={submitted ? feeError : undefined}
            >
              <input
                id="pm-f"
                inputMode="numeric"
                value={form.fee}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fee: e.target.value.replace(/[^\d.]/g, '') }))
                }
              />
            </Field>
          </div>
        </section>

        <SaveBar
          count={changes.length}
          summary={
            <>
              Chưa lưu: {changes.length === 1 ? '1 thay đổi' : `${changes.length} thay đổi`} (
              {changes.map((c) => c.short).join(', ')})
            </>
          }
          onDiscard={discard}
        />
      </Form>

      <ConfirmDialog
        open={rotating}
        title="Tạo khóa bí mật mới?"
        body="Khóa cũ hết hiệu lực ngay. Cổng thật phải được cập nhật khóa mới; ở mock thì không cần làm gì thêm. Việc này được ghi vào nhật ký."
        confirmLabel="Tạo khóa mới"
        tone="danger"
        onClose={() => setRotating(false)}
        onConfirm={newKey}
      />
      <ConfirmDialog
        open={leaveHref !== null}
        title="Rời trang này?"
        body={`Còn ${changes.length} thay đổi chưa lưu. Rời đi thì ${
          changes.length === 1 ? 'thay đổi đó' : 'các thay đổi đó'
        } mất.`}
        confirmLabel="Rời trang"
        tone="danger"
        onClose={() => setLeaveHref(null)}
        onConfirm={() => {
          const href = leaveHref;
          setLeaveHref(null);
          if (href) router.push(href);
        }}
      />
      <span className="sp-sr-only">{fixture.tenant.name}</span>
    </>
  );
}
