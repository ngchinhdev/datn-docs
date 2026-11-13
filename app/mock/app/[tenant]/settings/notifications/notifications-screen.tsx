'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Form, SaveBar, SwitchRow } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { SegmentedTabs } from '@/components/sapio/segmented';
import { useToast } from '@/components/sapio/toast';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';
import type { NotificationSettings } from '@/mock/fixtures';
import { buildEmails } from '@/mock/emails';
import { MOCK_NOW } from '@/mock/time';

type Key = keyof NotificationSettings;

const LABEL: Record<Key, string> = {
  reminder24h: 'Nhắc trước 24 giờ',
  reminder2h: 'Nhắc trước 2 giờ',
  staffNewAppointment: 'Báo lịch mới cho người được xếp',
  staffNewLeave: 'Báo đơn nghỉ mới cho quản lý',
};

/** Thông báo (MH-53): the emails customers get, which of them can be turned off (BR-66), and what staff are told. */
export function NotificationsScreen({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { fixture, ctx } = useDesk(tenantSlug);
  const { config, saveSettings } = useScheduleStore();
  const saved = config.notifications;
  const [form, setForm] = useState<NotificationSettings>(saved);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState('remind24');

  // The preview reads a real booking of the shop; the reminders show even while they are off.
  const emails = useMemo(() => buildEmails(fixture, MOCK_NOW, { all: true }), [fixture]);
  const email = emails.find((e) => e.id === previewId) ?? emails[0];
  const previewOff =
    (previewId === 'remind24' && !form.reminder24h) ||
    (previewId === 'remind2' && !form.reminder2h);

  const changes = (Object.keys(LABEL) as Key[])
    .filter((k) => form[k] !== saved[k])
    .map((k) => ({
      label: LABEL[k],
      detail: `${saved[k] ? 'bật' : 'tắt'} → ${form[k] ? 'bật' : 'tắt'}`,
    }));
  useUnsavedGuard(changes.length > 0, setLeaveHref);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const now = ctx();
    saveSettings(
      { config: { notifications: form } },
      {
        at: now.now,
        actor: { name: now.actor, role: now.role },
        entries: changes.map((c) => ({
          action: 'Sửa thông báo',
          object: c.label,
          href: 'settings/notifications',
          detail: c.detail,
        })),
      },
    );
    toast({ text: 'Đã lưu. Email nhắc theo cài đặt mới từ lúc này.' });
  }

  const row = (label: string, hint: string, key: Key | null, preview?: string, locked = false) => (
    <div key={label} className="flex items-center gap-2 border-t border-(--line) py-[10px]">
      <div className="min-w-0 flex-auto">
        <SwitchRow
          label={label}
          hint={hint}
          checked={key ? form[key] : true}
          onChange={(v) => key && setForm((f) => ({ ...f, [key]: v }))}
          full={false}
          disabled={locked}
        />
      </div>
      {preview && (
        <Button size="sm" variant="ghost" onClick={() => setPreviewId(preview)}>
          Xem trước
        </Button>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Thông báo' }]}
        title="Thông báo"
      />
      <div className="flex flex-wrap items-start gap-6">
        <Form onSubmit={onSubmit} className="min-w-0 flex-[1_1_420px] gap-5">
          <section className="sp-panel" aria-labelledby="nt-1">
            <h2 className="sp-panel__title" id="nt-1">
              Email gửi khách
            </h2>
            {row(
              'Mã xác nhận',
              'Bắt buộc, gửi khi khách đặt lịch hoặc đăng nhập (BR-16, BR-66).',
              null,
              'code',
              true,
            )}
            {row('Đã đặt lịch', 'Bắt buộc. Kèm tệp lịch .ics (BR-66).', null, 'booked', true)}
            {row(
              'Nhắc trước 24 giờ',
              'Gửi lúc 24 giờ trước giờ hẹn; lịch đặt sát giờ hơn thì bỏ qua.',
              'reminder24h',
              'remind24',
            )}
            {row('Nhắc trước 2 giờ', 'Tắt được (BR-66).', 'reminder2h', 'remind2')}
            {row('Đổi giờ, hủy, hoàn cọc', 'Bắt buộc (BR-66).', null, 'moved', true)}
            {row(
              'Hỏi ý đổi người',
              'Bắt buộc khi khách chọn đích danh (BR-32, BR-33, BR-66).',
              null,
              'asked',
              true,
            )}
            <p className="sp-panel__note">
              Email gửi từ no-reply@sapio.vn, tên người gửi là tên cơ sở. Gửi qua hàng đợi; lỗi thì
              thử lại 3 lần (outbox). Chỉ hai email nhắc tắt được; các email còn lại là bắt buộc.
            </p>
          </section>

          <section className="sp-panel" aria-labelledby="nt-2">
            <h2 className="sp-panel__title" id="nt-2">
              Gửi cho nhân viên
            </h2>
            <SwitchRow
              label="Báo lịch mới cho người được xếp"
              hint="Hiện trong ứng dụng, không gửi email."
              checked={form.staffNewAppointment}
              onChange={(v) => setForm((f) => ({ ...f, staffNewAppointment: v }))}
            />
            <SwitchRow
              label="Báo đơn nghỉ mới cho quản lý"
              checked={form.staffNewLeave}
              onChange={(v) => setForm((f) => ({ ...f, staffNewLeave: v }))}
            />
          </section>

          <SaveBar
            count={changes.length}
            summary={<>Chưa lưu: {changes.map((c) => `${c.label} ${c.detail}`).join('; ')}</>}
            onDiscard={() => setForm(saved)}
          />
        </Form>

        <div className="flex w-[380px] max-w-full flex-none flex-col gap-2">
          <span className="text-[13px] leading-[18px] font-semibold text-(--ink-muted)">
            Xem trước: {email?.label ?? ''}
          </span>
          {emails.length > 0 && (
            <SegmentedTabs
              label="Mẫu email"
              items={emails.map((e) => ({ value: e.id, label: e.label }))}
              value={previewId}
              onChange={setPreviewId}
            />
          )}
          {previewOff && (
            <p className="sp-fit sp-fit--bad m-0">
              <span>Email này đang tắt: khách không nhận. Bật rồi lưu để gửi.</span>
            </p>
          )}
          {email ? (
            <div
              className={`sp-tenant-${fixture.tenant.id} overflow-hidden rounded-xl bg-(--surface-raised) shadow-[0_0_0_1px_var(--line),var(--shadow-card)]`}
            >
              <div className="bg-(--fill-tonal) px-[14px] py-[10px] text-xs leading-[18px] text-(--ink-muted)">
                <strong className="text-(--ink)">{email.from.split(' <')[0]}</strong> &lt;
                {email.from.split(' <')[1]?.replace('>', '')}&gt;
                <div className="text-sm leading-5 font-semibold text-(--ink)">{email.subject}</div>
              </div>
              <div className="flex flex-col gap-[10px] p-4 text-sm leading-5">
                <p className="m-0">
                  {email.greeting}, {email.lead}
                </p>
                {email.code && (
                  <p className="sp-num m-0 text-2xl font-semibold tracking-[0.2em]">{email.code}</p>
                )}
                {email.rows.length > 0 && (
                  <dl className="sp-kv m-0">
                    {email.rows.map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt>{k}</dt>
                        <dd className="whitespace-pre-line">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {email.highlight && <p className="m-0 font-medium">{email.highlight}</p>}
                {email.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {email.actions.map((a, i) => (
                      <span
                        key={a.label}
                        className={`sp-btn ${i === 0 ? 'sp-btn--accent' : 'sp-btn--secondary'} sp-btn--sm`}
                      >
                        {a.label}
                      </span>
                    ))}
                  </div>
                )}
                {email.notes.map((n) => (
                  <p key={n} className="m-0 text-[13px] text-(--ink-muted)">
                    {n}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="sp-empty m-0">Chưa có lịch mẫu để dựng email.</p>
          )}
          <div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                toast({ text: `Đã gửi thử "${email?.label ?? ''}" tới email của bạn (giả lập).` })
              }
            >
              Gửi thử tới email của tôi
            </Button>
          </div>
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
