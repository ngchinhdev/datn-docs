'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field, Form, SaveBar } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';
import type { RefundTiers, TemplatePolicies } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import { earliestBooking, noShowFrom, refundVnd, selfChangeUntil } from '@/mock/policy';
import { addDays, formatTime, localDate, MOCK_NOW } from '@/mock/time';

type PolicyKey = keyof TemplatePolicies;
type TierKey = keyof RefundTiers;

/** An hour on the sample day, 14:00 of today, for the examples that need an appointment. */
const SAMPLE_START = '2026-11-07T07:00:00.000Z';

const POLICY_ROWS: {
  key: PolicyKey;
  label: string;
  unit: string;
  rule: string;
  min: number;
}[] = [
  {
    key: 'minNoticeHours',
    label: 'Đặt trước ít nhất',
    unit: 'giờ',
    rule: 'BR-06. Lễ tân đặt tại quầy không bị giới hạn này (BR-30).',
    min: 0,
  },
  { key: 'maxAdvanceDays', label: 'Đặt xa nhất', unit: 'ngày', rule: 'BR-06.', min: 1 },
  {
    key: 'cancelBeforeHours',
    label: 'Tự đổi, hủy trước',
    unit: 'giờ',
    rule: 'BR-08. Muộn hơn thì trang khách hiện số điện thoại của tiệm.',
    min: 0,
  },
  {
    key: 'maxReschedules',
    label: 'Tự đổi tối đa',
    unit: 'lần mỗi lịch',
    rule: 'BR-08. Đổi theo đề nghị của tiệm không tính.',
    min: 0,
  },
  {
    key: 'noShowAfterMinutes',
    label: 'Đánh dấu không đến sau',
    unit: 'phút',
    rule: 'BR-09. Lễ tân vẫn bấm "Đã đến" được nếu khách tới muộn hơn.',
    min: 1,
  },
  {
    key: 'depositAfterNoShows',
    label: 'Bắt buộc cọc sau',
    unit: 'lần không đến',
    rule: 'BR-10, trong 6 tháng gần nhất.',
    min: 1,
  },
];

const TIER_ROWS: { key: TierKey; label: string }[] = [
  { key: 'over24', label: 'Hủy trước 24 giờ' },
  { key: 'over4', label: 'Từ 4 đến 24 giờ' },
  { key: 'under4', label: 'Dưới 4 giờ, không đến' },
];

const SECTIONS: { id: string; title: string; keys: PolicyKey[] }[] = [
  { id: 'po-1', title: 'Đặt lịch online', keys: ['minNoticeHours', 'maxAdvanceDays'] },
  { id: 'po-2', title: 'Đổi và hủy', keys: ['cancelBeforeHours', 'maxReschedules'] },
  { id: 'po-3', title: 'Không đến', keys: ['noShowAfterMinutes', 'depositAfterNoShows'] },
];

const isInt = (text: string) => /^\d{1,4}$/.test(text.trim());
const num = (text: string) => (isInt(text) ? Number(text) : null);
const dayMonth = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;

/** "13:30", or "13:30 ngày 08/11" when it is not today. */
const timeText = (iso: string) =>
  localDate(iso) === localDate(MOCK_NOW)
    ? formatTime(iso)
    : `${formatTime(iso)} ngày ${dayMonth(localDate(iso))}`;

/** Chính sách (MH-49): the rules the customer pages follow, each with a sentence worked out from the number typed. */
export function PoliciesScreen({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { ctx } = useDesk(tenantSlug);
  const { staffSeesCustomerPhone, setStaffSeesCustomerPhone, policies, saveSettings, config } =
    useScheduleStore();
  const savedTiers = config.refundTiers;
  const initial = () => ({
    policies: Object.fromEntries(
      POLICY_ROWS.map((r) => [r.key, String(policies[r.key])]),
    ) as Record<PolicyKey, string>,
    tiers: Object.fromEntries(TIER_ROWS.map((r) => [r.key, String(savedTiers[r.key])])) as Record<
      TierKey,
      string
    >,
    phone: staffSeesCustomerPhone,
  });
  const [form, setForm] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);

  const policyBad = (key: PolicyKey) => {
    const row = POLICY_ROWS.find((r) => r.key === key)!;
    const n = num(form.policies[key]);
    return n === null || n < row.min;
  };
  const tierBad = (key: TierKey) => {
    const n = num(form.tiers[key]);
    return n === null || n > 100;
  };

  // What is different from what is saved, in the words of the save bar and the log.
  const changes = [
    ...POLICY_ROWS.filter((r) => form.policies[r.key] !== String(policies[r.key])).map((r) => ({
      label: r.label,
      detail: `${policies[r.key]} → ${form.policies[r.key]} ${r.unit}`,
    })),
    ...TIER_ROWS.filter((r) => form.tiers[r.key] !== String(savedTiers[r.key])).map((r) => ({
      label: `Hoàn cọc: ${r.label.toLowerCase()}`,
      detail: `${savedTiers[r.key]}% → ${form.tiers[r.key]}%`,
    })),
    ...(form.phone !== staffSeesCustomerPhone
      ? [
          {
            label: 'Kỹ thuật viên thấy số điện thoại khách',
            detail: `${staffSeesCustomerPhone ? 'bật' : 'tắt'} → ${form.phone ? 'bật' : 'tắt'}`,
          },
        ]
      : []),
  ];
  const invalid =
    POLICY_ROWS.some((r) => policyBad(r.key)) || TIER_ROWS.some((r) => tierBad(r.key));
  useUnsavedGuard(changes.length > 0, setLeaveHref);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (invalid) {
      const first =
        POLICY_ROWS.find((r) => policyBad(r.key))?.key ??
        TIER_ROWS.find((r) => tierBad(r.key))?.key;
      document.getElementById(`po-${first}`)?.focus();
      return;
    }
    const now = ctx();
    saveSettings(
      {
        policies: Object.fromEntries(
          POLICY_ROWS.map((r) => [r.key, Number(form.policies[r.key])]),
        ) as unknown as TemplatePolicies,
        config: {
          refundTiers: Object.fromEntries(
            TIER_ROWS.map((r) => [r.key, Number(form.tiers[r.key])]),
          ) as unknown as RefundTiers,
        },
      },
      {
        at: now.now,
        actor: { name: now.actor, role: now.role },
        entries: changes.map((c) => ({
          action: 'Sửa chính sách',
          object: c.label,
          href: 'settings/policies',
          detail: c.detail,
        })),
      },
    );
    setStaffSeesCustomerPhone(form.phone);
    setSubmitted(false);
    // BR-38: the new numbers count from now; bookings already made keep what they were given.
    toast({ text: 'Đã lưu. Áp cho lịch đặt từ lúc này; lịch đã đặt giữ điều khoản cũ.' });
  }

  function discard() {
    setForm(initial());
    setSubmitted(false);
  }

  const value = (key: PolicyKey) => num(form.policies[key]) ?? 0;
  const examples: Record<PolicyKey, string> = {
    minNoticeHours: `bây giờ là ${formatTime(MOCK_NOW)} thì khách đặt được từ ${timeText(
      earliestBooking(MOCK_NOW, value('minNoticeHours')),
    )}.`,
    maxAdvanceDays: `hôm nay ${dayMonth(localDate(MOCK_NOW))} thì xa nhất là ${dayMonth(
      addDays(localDate(MOCK_NOW), value('maxAdvanceDays')),
    )}.`,
    cancelBeforeHours: `lịch ${formatTime(SAMPLE_START)} thì khách tự đổi được tới ${timeText(
      selfChangeUntil(SAMPLE_START, value('cancelBeforeHours')),
    )}.`,
    maxReschedules: `đổi lần thứ ${value('maxReschedules') + 1} thì khách phải gọi tiệm.`,
    noShowAfterMinutes: `lịch ${formatTime(SAMPLE_START)} thì từ ${timeText(
      noShowFrom(SAMPLE_START, value('noShowAfterMinutes')),
    )} lễ tân thấy nút "Không đến".`,
    depositAfterNoShows: `không đến lần thứ ${value('depositAfterNoShows')} thì lần đặt sau phải cọc.`,
  };

  const tiers: RefundTiers = {
    over24: num(form.tiers.over24) ?? 0,
    over4: num(form.tiers.over4) ?? 0,
    under4: num(form.tiers.under4) ?? 0,
  };
  const tenHoursBefore = new Date(Date.parse(SAMPLE_START) - 10 * 3_600_000).toISOString();
  const refundExample = `cọc 100.000 ₫, khách hủy khi còn 10 giờ tới giờ hẹn thì được hoàn ${formatVnd(
    refundVnd(100_000n, SAMPLE_START, tenHoursBefore, tiers),
  )}.`;

  const row = (key: PolicyKey): ReactNode => {
    const r = POLICY_ROWS.find((x) => x.key === key)!;
    return (
      <div
        key={key}
        className="grid grid-cols-1 items-start gap-4 border-t border-(--line) py-3 md:grid-cols-[220px_1fr]"
      >
        <div className="w-[200px]">
          <Field
            id={`po-${key}`}
            label={r.label}
            suffix={r.unit}
            error={submitted && policyBad(key) ? `Nhập số nguyên từ ${r.min} trở lên.` : undefined}
          >
            <input
              id={`po-${key}`}
              inputMode="numeric"
              value={form.policies[key]}
              aria-invalid={submitted && policyBad(key) ? true : undefined}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  policies: { ...f.policies, [key]: e.target.value.replace(/\D/g, '') },
                }))
              }
            />
          </Field>
        </div>
        <div className="flex flex-col gap-[6px] md:pt-[22px]">
          <span className="text-[13px] leading-[18px] text-(--ink-muted)">{r.rule}</span>
          <p className="m-0 rounded-(--radius-sm) bg-(--fill-tonal) px-3 py-2 text-[13px] leading-[18px]">
            <strong>Ví dụ:</strong> {examples[key]}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Chính sách' }]}
        title="Chính sách"
        sub="Các con số này áp cho mọi chi nhánh"
      />
      <Form onSubmit={onSubmit} className="gap-5">
        {SECTIONS.map((section) => (
          <section key={section.id} className="sp-panel" aria-labelledby={section.id}>
            <h2 className="sp-panel__title" id={section.id}>
              {section.title}
            </h2>
            {section.keys.map(row)}
            {section.id === 'po-1' && (
              <p className="sp-panel__note">
                Giữ chỗ 10 phút khi khách đang đặt là cố định (BR-07).
              </p>
            )}
          </section>
        ))}

        <section className="sp-panel" aria-labelledby="po-4">
          <h2 className="sp-panel__title" id="po-4">
            Hoàn cọc khi khách hủy
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {TIER_ROWS.map((r) => (
              <Field
                key={r.key}
                id={`po-${r.key}`}
                label={r.label}
                suffix="%"
                error={submitted && tierBad(r.key) ? 'Nhập số từ 0 đến 100.' : undefined}
              >
                <input
                  id={`po-${r.key}`}
                  inputMode="numeric"
                  value={form.tiers[r.key]}
                  aria-invalid={submitted && tierBad(r.key) ? true : undefined}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tiers: { ...f.tiers, [r.key]: e.target.value.replace(/\D/g, '') },
                    }))
                  }
                />
              </Field>
            ))}
          </div>
          <p className="m-0 rounded-(--radius-sm) bg-(--fill-tonal) px-3 py-2 text-[13px] leading-[18px]">
            <strong>Ví dụ:</strong> {refundExample}
          </p>
          <p className="sp-panel__note">BR-23. Tiệm chủ động hủy thì luôn hoàn 100% (BR-24).</p>
        </section>

        <section className="sp-panel" aria-labelledby="po-5">
          <h2 className="sp-panel__title" id="po-5">
            Kỹ thuật viên
          </h2>
          <label className="sp-switch">
            <span>
              <span className="block text-sm leading-5 font-medium">
                Kỹ thuật viên thấy số điện thoại khách
              </span>
              <span className="block text-[13px] leading-[18px] text-(--ink-muted)">
                Tắt thì màn "Lịch của tôi" chỉ hiện tên khách (BR-36).
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.checked }))}
            />
          </label>
        </section>

        <SaveBar
          count={changes.length}
          summary={
            <>
              Chưa lưu: {changes.map((c) => `${c.label} ${c.detail}`).join('; ')}. Áp cho lịch đặt
              từ lúc lưu.
            </>
          }
          onDiscard={discard}
        />
      </Form>
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
    </>
  );
}
