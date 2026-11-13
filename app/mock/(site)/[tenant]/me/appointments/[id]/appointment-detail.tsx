'use client';

import { Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCustomerSession } from '@/components/mock/customer-session';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { Sheet } from '@/components/sapio/sheet';
import { StatusBadge } from '@/components/sapio/status-badge';
import { useToast } from '@/components/sapio/toast';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { formatPhone, formatVnd } from '@/mock/format';
import {
  canSelfService,
  refundPercent,
  refundVnd,
  replyDeadline,
  timeLeftText,
} from '@/mock/policy';
import { bookingCode, heldItems, modeOf, openQuestion } from '@/mock/reschedule';
import { branchPhone } from '@/mock/site';
import { formatDay, formatTime, localDate } from '@/mock/time';
import type { LeaveHandling } from '@/mock/fixtures';

const REASONS = ['Bận việc đột xuất', 'Đặt nhầm giờ', 'Khác'];

/** MH-18: one booking of the logged-in customer, with the things they may do to it by themselves. */
export function AppointmentDetail({ tenantSlug, id }: { tenantSlug: string; id: string }) {
  const fixture = useLiveFixture(tenantSlug);
  const { tenant, branches, resources, staff } = fixture;
  const branch = branches[0]!;
  const store = useScheduleStore();
  const router = useRouter();
  const toast = useToast();
  const now = useMockNow();
  const { customerId } = useCustomerSession();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  const appt = store.appointments.find((a) => a.id === id);
  if (!appt || appt.customerId !== customerId) {
    return (
      <div className="sp-empty flex flex-col gap-(--space-2)">
        <h1 className="title m-0">Không tìm thấy lịch hẹn</h1>
        <Link href={`/mock/${tenantSlug}/me`} className="body font-medium text-(--accent)">
          Về lịch hẹn của tôi
        </Link>
      </div>
    );
  }

  const asksSubject = fixture.template.vocabulary.subject !== null;
  const mode = modeOf(appt);
  const items = heldItems(fixture, appt, store.servedSubjects, asksSubject || mode === 'group');
  const nameOf = (rid: string) => resources.find((r) => r.id === rid)?.name ?? '';
  const titleOf = (rid: string) => staff.find((s) => s.resourceId === rid)?.profile.title ?? '';
  const phone = branchPhone(tenantSlug, fixture.branches[0]?.phone);
  const end = appt.bookings.reduce(
    (m, b) => (b.kind !== 'cleanup' && b.endAt > m ? b.endAt : m),
    appt.startAt,
  );
  const day = formatDay(localDate(appt.startAt));
  const live = appt.status === 'confirmed' || appt.status === 'checked_in';
  const price = items.reduce((m, it) => m + it.priceVnd, 0n);
  const policy = fixture.policies;
  const selfOk = live && canSelfService(appt.startAt, now, policy.cancelBeforeHours);
  const used = appt.selfChanges ?? 0;
  const left = Math.max(0, policy.maxReschedules - used);
  const deposit = appt.depositVnd ?? 0n;
  const percent = refundPercent(appt.startAt, now);
  const refund = refundVnd(deposit, appt.startAt, now);

  const question = live ? openQuestion(appt.id, store.leaves, store.requeues) : null;
  /** What the customer answered the shop, if they did (BR-33). */
  const answered: LeaveHandling | undefined = [
    ...store.leaves.map((l) => l.handling?.[appt.id]),
    ...store.requeues.map((r) => r.handling[appt.id]),
  ].find((h) => h?.kind === 'agreed' || h?.kind === 'rescheduled');

  const peopleLine = (() => {
    const names = items.map((it) =>
      it.staffChoice === 'any'
        ? `${nameOf(appt.items[items.indexOf(it)]?.staffResourceId ?? '')}, xếp tự động`
        : `${nameOf(it.staffChoice)}, bạn chọn`,
    );
    return [...new Set(names)].join(' · ');
  })();

  function reschedule(reply: boolean) {
    router.push(`/mock/${tenantSlug}/book?step=datetime&doi=${appt!.id}${reply ? '&hoi=1' : ''}`);
  }

  function agree() {
    if (!question) return;
    const agreed: LeaveHandling = {
      kind: 'agreed',
      staffResourceId: question.handling.staffResourceId,
    };
    if (question.source === 'leave') {
      store.replaceLeave({
        ...question.leave,
        handling: { ...question.leave.handling, [appt!.id]: agreed },
      });
    } else {
      store.replaceRequeue({
        ...question.requeue,
        handling: { ...question.requeue.handling, [appt!.id]: agreed },
      });
    }
    toast({ text: `Đã đồng ý đổi sang ${nameOf(question.handling.staffResourceId)}.` });
  }

  function cancel() {
    store.replaceAppointment({ ...appt!, status: 'cancelled' });
    // A question of the shop still open for this booking is settled by the cancellation.
    if (question) {
      const cancelled: LeaveHandling = { kind: 'customer_cancelled' };
      if (question.source === 'leave') {
        store.replaceLeave({
          ...question.leave,
          handling: { ...question.leave.handling, [appt!.id]: cancelled },
        });
      } else {
        store.replaceRequeue({
          ...question.requeue,
          handling: { ...question.requeue.handling, [appt!.id]: cancelled },
        });
      }
    }
    setCancelling(false);
    toast({
      text:
        deposit > 0n
          ? `Đã hủy lịch. Hoàn ${formatVnd(refund)} về tài khoản đã chuyển.`
          : 'Đã hủy lịch.',
    });
    router.push(`/mock/${tenantSlug}/me`);
  }

  const rows: [string, string][] = [
    [
      'Dịch vụ',
      items
        .map((it) =>
          it.label ? `${it.label} · ${it.service.name}` : `${it.service.name} · ${it.variant.name}`,
        )
        .join('\n'),
    ],
    [fixture.template.vocabulary.staff, peopleLine],
    ['Giá', formatVnd(price)],
    ...(deposit > 0n ? [['Đã cọc', formatVnd(deposit)] as [string, string]] : []),
    ['Mã lịch', bookingCode(fixture, appt)],
  ];

  const proposed = question ? question.handling.staffResourceId : '';
  const deadline = question ? replyDeadline(question.handling.sentAt, appt.startAt) : '';
  const overdue = question ? Date.parse(now) > Date.parse(deadline) : false;
  const dayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

  return (
    <div className="flex flex-col gap-(--space-5)">
      <div className="flex flex-col gap-(--space-2)">
        <Link href={`/mock/${tenantSlug}/me`} className="body-sm font-medium text-(--accent)">
          Lịch hẹn
        </Link>
        <div>
          <StatusBadge status={appt.status} />
        </div>
        <h1 className="title sp-num m-0">
          {formatTime(appt.startAt)}–{formatTime(end)}, {day}
        </h1>
        <p className="body-sm m-0 text-(--ink-muted)">
          {branch.name} · {branch.address} ·{' '}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-(--accent)"
          >
            Chỉ đường
          </a>
        </p>
      </div>

      {question && (
        <section
          aria-labelledby="ask-title"
          className="flex flex-col gap-(--space-3) rounded-(--radius-lg) bg-(--accent-soft) p-(--space-4)"
        >
          <h2 id="ask-title" className="heading m-0">
            {tenant.name} đề nghị đổi {fixture.template.vocabulary.staff.toLowerCase()}
          </h2>
          <p className="body m-0">
            {question.source === 'leave'
              ? `${nameOf(question.leave.resourceId)} nghỉ ngày ${dayMonth(question.leave.date)}.`
              : `${nameOf(question.requeue.resourceId)} đổi ca ngày ${dayMonth(question.requeue.date)}.`}{' '}
            Tiệm đề nghị {nameOf(proposed)} {titleOf(proposed) && `(${titleOf(proposed)}) `}làm
            thay, cùng giờ, giữ giá {formatVnd(price)}.
          </p>
          <p className="body-sm m-0 text-(--ink-muted)">
            {overdue
              ? 'Đã quá hạn trả lời. Tiệm sẽ gọi cho bạn.'
              : `Trả lời trước ${formatTime(deadline)}, ${formatDay(localDate(deadline))}. Sau đó tiệm sẽ gọi cho bạn.`}{' '}
            Chọn lại giờ lần này không tính vào số lần đổi.
          </p>
          <div className="flex flex-col gap-(--space-2)">
            <Button variant="accent" size="lg" block onClick={agree}>
              Đồng ý đổi sang {nameOf(proposed)}
            </Button>
            <Button variant="secondary" size="lg" block onClick={() => reschedule(true)}>
              Chọn lại giờ
            </Button>
          </div>
        </section>
      )}

      {!question && answered && (
        <p role="status" className="body m-0 rounded-(--radius-md) bg-(--fill-tonal) p-(--space-4)">
          {answered.kind === 'agreed'
            ? `Bạn đã đồng ý đổi sang ${nameOf(answered.staffResourceId)}. Tiệm sẽ xác nhận khi xử lý xong.`
            : answered.kind === 'rescheduled'
              ? `Bạn đã chọn giờ mới ${formatTime(answered.startAt)}, ${formatDay(localDate(answered.startAt))}. Tiệm đã ghi nhận.`
              : ''}
        </p>
      )}

      <dl className="m-0 flex flex-col rounded-(--radius-lg) bg-(--surface-raised) px-(--space-4) shadow-[0_0_0_1px_var(--line)]">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between gap-(--space-4) border-b border-(--line) py-(--space-3) last:border-b-0"
          >
            <dt className="body-sm flex-none whitespace-nowrap text-(--ink-muted)">{k}</dt>
            <dd className="body sp-num m-0 min-w-0 text-right break-words whitespace-pre-line">
              {v}
            </dd>
          </div>
        ))}
      </dl>

      {live && selfOk && (
        <div className="flex flex-col gap-(--space-2)">
          <Button
            variant="secondary"
            size="lg"
            block
            disabled={left === 0}
            onClick={() => reschedule(false)}
          >
            Đổi giờ{left > 0 ? ` · còn ${left} lần` : ' · đã hết lượt'}
          </Button>
          <Button variant="ghost" size="lg" block onClick={() => setCancelling(true)}>
            Hủy lịch
          </Button>
          {items.length > 1 && (
            <p className="body-sm m-0 text-(--ink-muted)">
              Chỉ đổi giờ hoặc hủy được cả lịch. Muốn bỏ một dịch vụ hoặc một người, bạn gọi tiệm.
            </p>
          )}
          {left === 0 && (
            <p className="body-sm m-0 text-(--ink-muted)">
              Đã đổi giờ {policy.maxReschedules} lần. Cần đổi nữa, bạn gọi tiệm.
            </p>
          )}
        </div>
      )}

      {live && !selfOk && (
        <div className="flex flex-col gap-(--space-3)">
          <p className="body m-0">
            Còn dưới {policy.cancelBeforeHours} giờ tới giờ hẹn nên không tự đổi giờ hay hủy trên
            trang được. Cần thay đổi, bạn gọi tiệm.
          </p>
          <a
            href={`tel:${phone.tel}`}
            className="sp-btn sp-btn--accent sp-btn--lg sp-btn--block inline-flex items-center justify-center gap-(--space-2) no-underline"
          >
            <Phone size={18} aria-hidden="true" />
            Gọi {phone.display}
          </a>
          <p className="body-sm m-0 text-(--ink-muted)">
            Hủy lúc này hoặc không đến thì không hoàn cọc.
          </p>
        </div>
      )}

      <Sheet
        open={cancelling}
        title={`Hủy lịch ${formatTime(appt.startAt)}, ${day}?`}
        onClose={() => setCancelling(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelling(false)}>
              Giữ lịch
            </Button>
            <Button variant="accent" onClick={cancel}>
              {deposit > 0n ? `Hủy, hoàn ${formatVnd(refund)}` : 'Hủy lịch'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-(--space-4)">
          <dl className="m-0 flex flex-col">
            {[
              ['Còn tới giờ hẹn', timeLeftText(appt.startAt, now)],
              ...(deposit > 0n
                ? [
                    ['Đã cọc', formatVnd(deposit)],
                    ['Hoàn lại', `${formatVnd(refund)} (${percent}%)`],
                  ]
                : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-(--space-4) py-(--space-1)">
                <dt className="body-sm text-(--ink-muted)">{k}</dt>
                <dd className="body sp-num m-0 text-right">{v}</dd>
              </div>
            ))}
          </dl>
          {deposit > 0n && (
            <p className="body-sm m-0 text-(--ink-muted)">
              Hủy trước 24 giờ hoàn 100%, từ 4 đến 24 giờ hoàn 50%. Tiền về tài khoản đã chuyển
              trong 1 đến 3 ngày.
            </p>
          )}
          <Field id="cancel-reason" size="md" label="Lý do" optional>
            <select id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Chọn lý do</option>
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
      </Sheet>
    </div>
  );
}
