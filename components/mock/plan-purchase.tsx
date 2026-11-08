'use client';

import { useState, type ReactNode } from 'react';
import { useSubscription } from '@/components/mock/subscription-store';
import { ConfirmDialog, type ConfirmFact } from '@/components/sapio/confirm-dialog';
import { PeriodSwitch, PlanCards, type PlanCardData } from '@/components/sapio/plan-cards';
import { useToast } from '@/components/sapio/toast';
import { formatVnd } from '@/mock/format';
import {
  PERIODS,
  PLAN_CODES,
  daysLeft,
  downgradeBlock,
  periodEnd,
  periodPrice,
  planFeatureList,
  planHasAll,
  plans,
  upgradeCharge,
  type PeriodMonths,
  type Plan,
  type Purchase,
} from '@/mock/subscription';
import { addDays, formatFullDate, MOCK_TODAY } from '@/mock/time';

/** The fake QR of the payment: the mock has no payment provider behind it (D-09). */
function FakeQr() {
  return (
    <div
      role="img"
      aria-label="Mã QR giả lập, không quét được"
      className="mx-auto grid size-40 place-items-center rounded-(--radius-md) border-2 border-dashed border-(--line-strong) text-sm font-medium text-(--ink-muted)"
    >
      QR giả lập
    </div>
  );
}

interface Described {
  title: string;
  facts: ConfirmFact[];
  confirmLabel: string;
  /** `false` for a downgrade, which asks for no payment. */
  pays: boolean;
  toast: string;
}

/** What the confirm box says for each kind of purchase, in the words of BR-84 and BR-85. */
function describe(p: Purchase, current: Plan, periodEndsOn: string | null): Described {
  const plan = plans[p.planCode];
  const today = MOCK_TODAY;
  switch (p.kind) {
    case 'buy': {
      const end = periodEnd(today, p.months);
      return {
        title: `Chọn gói ${plan.name}?`,
        facts: [
          { term: 'Gói', value: plan.name },
          { term: 'Thời hạn', value: `${p.months} tháng` },
          { term: 'Dùng đến hết', value: formatFullDate(end) },
          { term: 'Tổng tiền', value: formatVnd(periodPrice(plan, p.months)), total: true },
        ],
        confirmLabel: 'Giả lập thanh toán thành công',
        pays: true,
        toast: `Đã kích hoạt gói ${plan.name} đến ${formatFullDate(end)}.`,
      };
    }
    case 'renew': {
      const start = addDays(periodEndsOn ?? addDays(today, -1), 1);
      const end = periodEnd(start, p.months);
      return {
        title: `Gia hạn gói ${plan.name}?`,
        facts: [
          { term: 'Gói', value: plan.name },
          { term: 'Thời hạn', value: `${p.months} tháng` },
          { term: 'Dùng đến hết', value: formatFullDate(end) },
          { term: 'Tổng tiền', value: formatVnd(periodPrice(plan, p.months)), total: true },
        ],
        confirmLabel: 'Giả lập thanh toán thành công',
        pays: true,
        toast: `Đã gia hạn gói ${plan.name} đến ${formatFullDate(end)}.`,
      };
    }
    case 'upgrade': {
      const end = periodEndsOn ?? today;
      const left = daysLeft(end, today);
      return {
        title: `Nâng lên gói ${plan.name}?`,
        facts: [
          {
            term: 'Gói hiện tại',
            value: `${current.name} · ${formatVnd(current.monthlyPriceVnd)}/tháng`,
          },
          { term: `Gói ${plan.name}`, value: `${formatVnd(plan.monthlyPriceVnd)}/tháng` },
          {
            term: 'Còn lại của kỳ này',
            value: `${left} ngày (đến ${formatFullDate(end).slice(0, 5)})`,
          },
          {
            term: 'Trả thêm hôm nay',
            value: formatVnd(upgradeCharge(current, plan, left)),
            total: true,
          },
        ],
        confirmLabel: 'Giả lập thanh toán thành công',
        pays: true,
        toast: `Đã nâng lên gói ${plan.name}. Hạn dùng vẫn đến ${formatFullDate(end)}.`,
      };
    }
    case 'downgrade': {
      const from = formatFullDate(addDays(periodEndsOn ?? today, 1));
      return {
        title: `Hạ xuống gói ${plan.name}?`,
        facts: [
          { term: 'Gói hiện tại', value: current.name },
          { term: 'Có hiệu lực từ', value: from },
          { term: 'Giá từ kỳ sau', value: `${formatVnd(plan.monthlyPriceVnd)}/tháng` },
        ],
        confirmLabel: 'Hạ gói từ kỳ sau',
        pays: false,
        toast: `Gói ${plan.name} có hiệu lực từ ${from}. Hiện bạn vẫn dùng gói ${current.name}.`,
      };
    }
  }
}

/** The confirm box of a purchase and the function that opens it. */
export function usePurchaseDialog() {
  const { subscription, buy } = useSubscription();
  const toast = useToast();
  const [pending, setPending] = useState<Purchase | null>(null);
  const current = plans[subscription.planCode];

  const described = pending ? describe(pending, current, subscription.periodEndsOn) : null;
  const dialog =
    pending && described ? (
      <ConfirmDialog
        open
        title={described.title}
        facts={described.facts}
        confirmLabel={described.confirmLabel}
        onClose={() => setPending(null)}
        onConfirm={() => {
          buy(pending);
          setPending(null);
          toast({ text: described.toast });
        }}
      >
        {described.pays && (
          <>
            <FakeQr />
            <p className="sp-plan__note m-0 text-center">
              Mock không có cổng thanh toán. Bấm nút bên dưới để giả lập đã quét mã và trả tiền.
            </p>
          </>
        )}
      </ConfirmDialog>
    ) : null;

  return { ask: setPending, dialog };
}

const FOOTNOTE =
  'Mua 3 tháng giảm 10%, 12 tháng giảm 20%. Thanh toán bằng QR. Nâng gói có hiệu lực ngay, chỉ trả phần chênh cho số ngày còn lại của kỳ; hạ gói có hiệu lực từ kỳ sau.';

/**
 * Choose a period and a plan (MH-61): the same block on the settings page and on the screen of an
 * expired plan. What the buttons say and do depends on where the tenant stands.
 */
export function PlanPurchase({ heading, headingId }: { heading: string; headingId: string }) {
  const { subscription, entitlements: e, daysLeft: left, branches } = useSubscription();
  const { ask, dialog } = usePurchaseDialog();
  const [months, setMonths] = useState<PeriodMonths>(1);
  const current = plans[subscription.planCode];
  const end = subscription.periodEndsOn;

  const cards: PlanCardData[] = PLAN_CODES.map((code): PlanCardData => {
    const plan = plans[code];
    const total = periodPrice(plan, months);
    const isCurrent = code === subscription.planCode;
    const shared = {
      id: code,
      name: plan.name,
      price: formatVnd(total / BigInt(months)),
      unit: ' / tháng',
      note:
        months === 1
          ? plan.note
          : `${plan.note}. Trả ${formatVnd(total)} một lần cho ${months} tháng`,
      features: planFeatureList.map((f) => ({ label: f.label, on: planHasAll(plan, f.requires) })),
    };

    if (e.mode === 'trial') {
      return {
        ...shared,
        current: code === 'pro',
        ...(code === 'pro' ? { badge: 'Đang dùng thử' } : {}),
        action: {
          label: `Chọn ${plan.name}`,
          variant: code === 'pro' ? 'primary' : 'secondary',
          onClick: () => ask({ kind: 'buy', planCode: code, months }),
        },
      };
    }
    if (e.mode === 'expired') {
      return {
        ...shared,
        current: isCurrent,
        ...(isCurrent ? { badge: 'Gói trước đây' } : {}),
        action: {
          label: `Gia hạn ${plan.name}`,
          variant: isCurrent ? 'primary' : 'secondary',
          onClick: () => ask({ kind: 'buy', planCode: code, months }),
        },
      };
    }
    // Active: renew the current plan, move up now, or move down from the next period.
    if (isCurrent) {
      return {
        ...shared,
        current: true,
        badge: 'Đang dùng',
        action: {
          label: `Gia hạn ${plan.name}`,
          variant: 'primary',
          onClick: () => ask({ kind: 'renew', planCode: code, months }),
        },
      };
    }
    if (plan.monthlyPriceVnd > current.monthlyPriceVnd) {
      const charge = upgradeCharge(current, plan, left ?? 0);
      return {
        ...shared,
        action: {
          label: `Nâng cấp, trả ${formatVnd(charge)}`,
          variant: 'secondary',
          onClick: () => ask({ kind: 'upgrade', planCode: code }),
        },
      };
    }
    const block = downgradeBlock(plan, branches);
    const scheduled = subscription.pendingPlan === code;
    const from = formatFullDate(addDays(end ?? MOCK_TODAY, 1));
    return {
      ...shared,
      ...(scheduled ? { badge: 'Từ kỳ sau' } : {}),
      action: {
        label: `Hạ xuống ${plan.name}`,
        variant: 'secondary',
        disabled: Boolean(block) || scheduled,
        hint: block ?? (scheduled ? `Có hiệu lực từ ${from}` : `Có hiệu lực từ kỳ sau, ${from}`),
        onClick: () => ask({ kind: 'downgrade', planCode: code }),
      },
    };
  });

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-(--space-4)">
      <div className="flex flex-wrap items-center justify-between gap-(--space-3)">
        <h2 id={headingId} className="m-0 text-lg leading-[26px] font-semibold">
          {heading}
        </h2>
        <PeriodSwitch
          label="Thời hạn"
          value={String(months)}
          onChange={(value) => setMonths(Number(value) as PeriodMonths)}
          options={PERIODS.map((p) => ({
            value: String(p.months),
            label: `${p.months} tháng`,
            ...(p.discountPercent ? { discount: `−${p.discountPercent}%` } : {}),
          }))}
        />
      </div>
      <PlanCards plans={cards} />
      <p className="sp-plan__note m-0">{FOOTNOTE}</p>
      {dialog}
    </section>
  );
}

/** For callers that only need to open the box, e.g. the locked-feature page. */
export function PurchaseDialogHost({
  children,
}: {
  children: (ask: (p: Purchase) => void) => ReactNode;
}) {
  const { ask, dialog } = usePurchaseDialog();
  return (
    <>
      {children(ask)}
      {dialog}
    </>
  );
}
