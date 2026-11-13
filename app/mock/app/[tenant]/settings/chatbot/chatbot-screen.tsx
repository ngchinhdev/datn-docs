'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { GatedPage } from '@/components/mock/locked-feature';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field, Form, SaveBar, SwitchRow } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';
import { chatbotPreview, chatbotProblem, GREETING_MAX, limitExample } from '@/mock/chatbot';
import { siteHost } from '@/mock/site';
import { plans } from '@/mock/subscription';
import { MOCK_NOW } from '@/mock/time';

const number = new Intl.NumberFormat('vi-VN');

/** Chatbot (MH-54): on and off, the greeting, the two limits (BR-67); the page of the Cơ bản plan explains the lock. */
export function ChatbotScreen({ tenantSlug }: { tenantSlug: string }) {
  const { can } = useSubscription();
  if (!can('chatbot')) {
    return (
      <GatedPage
        feature="chatbot"
        tenantSlug={tenantSlug}
        path={['settings', 'chatbot']}
        inSettings
      />
    );
  }
  return <ChatbotSettingsForm tenantSlug={tenantSlug} />;
}

function ChatbotSettingsForm({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { fixture, ctx } = useDesk(tenantSlug);
  const { subscription } = useSubscription();
  const { config, saveSettings } = useScheduleStore();
  const saved = config.chatbot;
  const [enabled, setEnabled] = useState(saved.enabled);
  const [greeting, setGreeting] = useState(saved.greeting);
  const [perDay, setPerDay] = useState(String(saved.perCustomerPerDay));
  const [perMonth, setPerMonth] = useState(number.format(saved.perShopPerMonth));
  const [submitted, setSubmitted] = useState(false);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);

  const dayValue = /^\d{1,5}$/.test(perDay) ? Number(perDay) : 0;
  const monthDigits = perMonth.replace(/\./g, '');
  const monthValue = /^\d{1,7}$/.test(monthDigits) ? Number(monthDigits) : 0;
  const problem = chatbotProblem({
    greeting,
    perCustomerPerDay: dayValue,
    perShopPerMonth: monthValue,
  });
  const reply = useMemo(() => chatbotPreview(fixture, MOCK_NOW), [fixture]);

  const changes = [
    ...(enabled !== saved.enabled
      ? [
          {
            label: 'Hiện trợ lý trên trang đặt lịch',
            detail: `${saved.enabled ? 'bật' : 'tắt'} → ${enabled ? 'bật' : 'tắt'}`,
          },
        ]
      : []),
    ...(greeting !== saved.greeting ? [{ label: 'Lời chào', detail: `"${greeting}"` }] : []),
    ...(dayValue !== saved.perCustomerPerDay
      ? [
          {
            label: 'Giới hạn mỗi khách mỗi ngày',
            detail: `${saved.perCustomerPerDay} → ${dayValue} lượt`,
          },
        ]
      : []),
    ...(monthValue !== saved.perShopPerMonth
      ? [
          {
            label: 'Giới hạn cả cơ sở mỗi tháng',
            detail: `${number.format(saved.perShopPerMonth)} → ${number.format(monthValue)} lượt`,
          },
        ]
      : []),
  ];
  useUnsavedGuard(changes.length > 0, setLeaveHref);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (problem) return;
    const now = ctx();
    saveSettings(
      {
        config: {
          chatbot: {
            ...saved,
            enabled,
            greeting: greeting.trim(),
            perCustomerPerDay: dayValue,
            perShopPerMonth: monthValue,
          },
        },
      },
      {
        at: now.now,
        actor: { name: now.actor, role: now.role },
        entries: changes.map((c) => ({
          action: 'Sửa chatbot',
          object: c.label,
          href: 'settings/chatbot',
          detail: c.detail,
        })),
      },
    );
    setSubmitted(false);
    toast({ text: 'Đã lưu cài đặt chatbot.' });
  }

  function discard() {
    setEnabled(saved.enabled);
    setGreeting(saved.greeting);
    setPerDay(String(saved.perCustomerPerDay));
    setPerMonth(number.format(saved.perShopPerMonth));
    setSubmitted(false);
  }

  const shop = fixture.tenant.name;
  const dayBad = submitted && dayValue < 1;
  const monthBad = submitted && monthValue < 1;
  const greetingBad = submitted && (greeting.trim() === '' || greeting.length > GREETING_MAX);

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Chatbot' }]}
        title="Chatbot"
        sub={`Gói ${plans[subscription.planCode].name}`}
      />
      <div className="flex flex-wrap items-start gap-6">
        <Form onSubmit={onSubmit} className="min-w-0 flex-[1_1_420px] gap-5">
          <section className="sp-panel" aria-labelledby="cb-1">
            <h2 className="sp-panel__title" id="cb-1">
              Bật trên trang cơ sở
            </h2>
            <SwitchRow
              label="Hiện trợ lý trên trang đặt lịch"
              hint={`Nút trò chuyện ở góc dưới trang ${siteHost(config.branding.slug)}.`}
              checked={enabled}
              onChange={setEnabled}
            />
          </section>

          <section className="sp-panel" aria-labelledby="cb-2">
            <h2 className="sp-panel__title" id="cb-2">
              Lời chào
            </h2>
            <Field
              id="cb-g"
              label="Câu đầu tiên"
              area
              help={`${greeting.length}/${GREETING_MAX} ký tự. Tối đa ${GREETING_MAX} ký tự.`}
              error={
                greetingBad
                  ? greeting.trim() === ''
                    ? 'Nhập lời chào.'
                    : `Lời chào tối đa ${GREETING_MAX} ký tự.`
                  : undefined
              }
            >
              <textarea
                id="cb-g"
                rows={2}
                value={greeting}
                aria-invalid={greetingBad ? true : undefined}
                onChange={(e) => setGreeting(e.target.value)}
              />
            </Field>
          </section>

          <section className="sp-panel" aria-labelledby="cb-3">
            <h2 className="sp-panel__title" id="cb-3">
              Giới hạn
            </h2>
            <div className="flex flex-wrap gap-3">
              <div className="w-[180px]">
                <Field
                  id="cb-t"
                  label="Mỗi khách mỗi ngày"
                  suffix="lượt"
                  error={dayBad ? 'Nhập số từ 1 trở lên.' : undefined}
                >
                  <input
                    id="cb-t"
                    inputMode="numeric"
                    value={perDay}
                    onChange={(e) => setPerDay(e.target.value.replace(/\D/g, ''))}
                  />
                </Field>
              </div>
              <div className="w-[200px]">
                <Field
                  id="cb-m"
                  label="Cả cơ sở mỗi tháng"
                  suffix="lượt"
                  error={monthBad ? 'Nhập số từ 1 trở lên.' : undefined}
                >
                  <input
                    id="cb-m"
                    inputMode="numeric"
                    value={perMonth}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setPerMonth(digits === '' ? '' : number.format(Number(digits)));
                    }}
                  />
                </Field>
              </div>
            </div>
            {dayValue > 0 && (
              <p className="m-0 rounded-(--radius-sm) bg-(--fill-tonal) px-3 py-2 text-[13px] leading-[18px]">
                <strong>Ví dụ:</strong> {limitExample(dayValue)}
              </p>
            )}
            <p className="sp-panel__note">
              Tháng này đã dùng {number.format(saved.usedThisMonth)} /{' '}
              {number.format(saved.perShopPerMonth)} lượt (BR-67).
            </p>
          </section>

          <section className="sp-panel" aria-labelledby="cb-4">
            <h2 className="sp-panel__title" id="cb-4">
              Trợ lý làm được
            </h2>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-[18px] text-sm leading-5">
              <li>Xem dịch vụ, giá, giờ mở cửa, chính sách: lấy từ dữ liệu của cơ sở.</li>
              <li>
                Tìm giờ trống và giữ chỗ 10 phút; khách xác nhận bằng mã email như đặt trên trang.
              </li>
              <li>
                Không tự nói giá hay giờ: mọi con số lấy từ hệ thống, không có thì mời khách gọi
                tiệm.
              </li>
            </ul>
          </section>

          <SaveBar
            count={changes.length}
            summary={<>Chưa lưu: {changes.map((c) => c.label.toLowerCase()).join(', ')}</>}
            saveDisabled={submitted && problem !== null}
            note={submitted && problem ? problem : undefined}
            onDiscard={discard}
          />
        </Form>

        <div className="flex w-[320px] max-w-full flex-none flex-col gap-2">
          <span className="text-[13px] leading-[18px] font-semibold text-(--ink-muted)">
            Xem trước
          </span>
          <div
            className={`sp-tenant-${fixture.tenant.id} overflow-hidden rounded-2xl bg-(--surface) text-sm leading-5 shadow-[0_0_0_1px_var(--line),var(--shadow-card)]`}
          >
            <div className="bg-(--surface-raised) px-[14px] py-[10px] font-semibold shadow-[0_1px_0_var(--line)]">
              Trợ lý {shop.replace(/^(Salon|Spa thú cưng)\s+/, '')}
            </div>
            <div className="flex flex-col gap-2 p-[14px]">
              <p className="m-0 max-w-[85%] self-start rounded-[14px] bg-(--fill-tonal) px-3 py-2">
                {greeting || '…'}
              </p>
              <p className="m-0 max-w-[85%] self-end rounded-[14px] bg-(--accent) px-3 py-2 text-(--on-accent)">
                {reply.question}
              </p>
              <p className="m-0 max-w-[85%] self-start rounded-[14px] bg-(--fill-tonal) px-3 py-2">
                {reply.answer}
              </p>
            </div>
          </div>
          {!enabled && (
            <p className="sp-panel__note m-0">Đang tắt: khách không thấy nút trò chuyện.</p>
          )}
        </div>
      </div>
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
