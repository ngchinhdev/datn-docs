'use client';

import { ArrowLeft, Check, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { paymentCode, useBookingDraft, type BookingDraft } from '@/components/mock/booking-draft';
import { downloadIcs } from '@/components/mock/download-ics';
import { useCustomerSession } from '@/components/mock/customer-session';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useBookingCommit } from '@/components/mock/use-booking-commit';
import { Button } from '@/components/sapio/button';
import { ChainPlan } from '@/components/sapio/chain-plan';
import { HoldBanner } from '@/components/sapio/hold-banner';
import { StaticQr } from '@/components/sapio/static-qr';
import { useToast } from '@/components/sapio/toast';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { cn } from '@/lib/utils';
import { nearestSlots, stillFree, type BookingSlot } from '@/mock/booking';
import { addAutoRefund } from '@/mock/money-refunds';
import { formatDay, formatTime, localDate, addMinutes } from '@/mock/time';
import { formatPhone, formatVnd } from '@/mock/format';

/** Where to go back to the booking page with its choices kept. */
export const bookingUrl = (
  slug: string,
  draft: Pick<BookingDraft, 'newCustomer'>,
  step: string,
  extra: Record<string, string> = {},
) => {
  const params = new URLSearchParams({ step, giu: '1', ...extra });
  if (draft.newCustomer) params.set('khach', 'moi');
  return `/mock/${slug}/book?${params.toString()}`;
};

type Phase = 'waiting' | 'paid' | 'lost';

interface Outcome {
  /** The booking as it was when the money arrived. */
  draft: BookingDraft;
  /** The money came after the hold ran out (BR-29). */
  late: boolean;
  /** ISO 8601, UTC: when the money arrived. */
  paidAt: string;
  /** The slot that was booked. */
  slot: BookingSlot;
  /** Nearest free times, when the time was lost. */
  nearest: BookingSlot[];
}

/** MH-15: deposit by transfer, with a payment gateway that only exists in the mock (D-09). */
export function PayScreen({ tenantSlug }: { tenantSlug: string }) {
  const { draft, setDraft } = useBookingDraft();
  const router = useRouter();
  const toast = useToast();
  const session = useCustomerSession();
  const { setMoney, saveSettings, config } = useScheduleStore();
  const { commit, release, rival, appointments, fixture } = useBookingCommit(tenantSlug);
  const { tenant } = fixture;
  const branch = fixture.branches[0]!;
  const [from] = useState(draft?.now);
  const now = useMockNow(from);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [rivalBooks, setRivalBooks] = useState(false);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const drafted = draft;
  const releaseRef = useRef(release);
  releaseRef.current = release;
  const routerRef = useRef(router);
  routerRef.current = router;

  // BR-07: the hold is counted from the moment the time was chosen; nothing is added here.
  const expire = useCallback(() => {
    if (phaseRef.current !== 'waiting' || !drafted) return;
    releaseRef.current(drafted);
    routerRef.current.replace(bookingUrl(tenantSlug, drafted, 'datetime', { het: '1' }));
  }, [drafted, tenantSlug]);

  const frame = (children: ReactNode, step = true) => (
    <div
      className={cn(
        `sp-tenant-${tenant.id}`,
        'mx-auto flex w-full max-w-[560px] flex-col gap-(--space-5) pb-(--space-8)',
      )}
    >
      <div className="flex min-h-11 items-center gap-(--space-2)">
        {step && drafted && (
          <Button
            variant="ghost"
            aria-label="Quay lại"
            className="size-11! rounded-(--radius-pill)! p-0!"
            onClick={() => {
              setDraft({ ...drafted, now });
              router.push(bookingUrl(tenantSlug, drafted, 'confirm'));
            }}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Button>
        )}
        <div className="flex grow flex-col">
          <span className="body font-semibold">{tenant.name}</span>
          <span className="body-sm text-(--ink-muted)">{branch.name}</span>
        </div>
        {step && <span className="body-sm sp-num text-(--ink-muted)">Bước 4/4</span>}
      </div>
      {step && (
        <div className="grid grid-cols-4 gap-(--space-1)" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-1 rounded-(--radius-pill) bg-(--accent)" />
          ))}
        </div>
      )}
      {children}
    </div>
  );

  if (outcome) {
    const { draft: d, slot, late, paidAt } = outcome;
    const { contact, display } = d;
    const code = paymentCode(d.id);
    const first = slot.items[0]!.startAt;

    if (phase === 'paid') {
      return frame(
        <>
          <div className="flex flex-col items-start gap-(--space-2)">
            <span
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-(--radius-pill) bg-(--accent-soft) text-(--accent)"
            >
              <Check size={24} />
            </span>
            <h1 className="title m-0">Đã đặt lịch</h1>
            <p className="body-sm m-0 text-(--ink-muted)">
              {late &&
                `Tiền cọc về lúc ${formatTime(paidAt)}, sau khi hết giữ chỗ. Giờ ${formatTime(first)} vẫn còn trống nên lịch được xác nhận. `}
              Đã nhận cọc {formatVnd(d.depositVnd)}. Email xác nhận đã gửi tới {contact.email}.
            </p>
          </div>
          <ChainPlan
            heading={`Lịch của bạn, ${display.day}`}
            items={display.plan}
            footer={`Xong khoảng ${formatTime(slot.endAt)}.`}
          />
          <dl className="m-0 flex flex-col rounded-(--radius-lg) bg-(--surface-raised) px-(--space-4) shadow-[0_0_0_1px_var(--line)]">
            {[
              ['Liên hệ', `${contact.name} · ${formatPhone(contact.phone)} · ${contact.email}`],
              ['Giá', formatVnd(d.priceVnd)],
              ['Đã cọc', `${formatVnd(d.depositVnd)} · mã ${code}`],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-(--space-4) border-b border-(--line) py-(--space-3) last:border-b-0"
              >
                <dt className="body-sm flex-none whitespace-nowrap text-(--ink-muted)">{k}</dt>
                <dd className="body sp-num m-0 min-w-0 text-right break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-(--space-2)">
            <Button
              size="lg"
              block
              onClick={() =>
                downloadIcs({
                  start: slot.startAt,
                  end: slot.endAt,
                  title: `${d.refs
                    .map((r) => fixture.services.find((s) => s.id === r.serviceId)?.name)
                    .join(', ')} · ${tenant.name}`,
                  location: branch.address,
                })
              }
            >
              Thêm vào lịch điện thoại
            </Button>
            <Button size="lg" block onClick={() => router.push(`/mock/${tenantSlug}/me`)}>
              Xem lịch hẹn của bạn
            </Button>
          </div>
        </>,
        false,
      );
    }

    return frame(
      <>
        <div className="flex flex-col items-start gap-(--space-2)">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-(--radius-pill) bg-(--status-no-show-soft) text-(--danger)"
          >
            <Clock size={24} />
          </span>
          <h1 className="title m-0">Giờ {formatTime(first)} vừa có người đặt</h1>
          <p className="body-sm m-0 text-(--ink-muted)">
            Tiền cọc về lúc {formatTime(paidAt)}, sau khi hết giữ chỗ, và giờ này đã có khách khác.
            Lịch chưa được đặt.
          </p>
        </div>
        <div className="body rounded-(--radius-md) bg-(--fill-tonal) px-(--space-4) py-(--space-3)">
          <strong>Đã hoàn {formatVnd(d.depositVnd)}</strong> về tài khoản đã chuyển. Ngân hàng xử lý
          trong 1 đến 3 ngày làm việc. Mã hoàn: RF-{code}.
        </div>
        <section className="flex flex-col gap-(--space-2)" aria-labelledby="nearest-title">
          <h2 id="nearest-title" className="heading m-0">
            Giờ gần nhất còn trống
          </h2>
          {outcome.nearest.length > 0 ? (
            <div className="sp-slots" role="group" aria-label="Giờ trống">
              {outcome.nearest.map((s) => (
                <button
                  key={s.startAt}
                  type="button"
                  className="sp-slot"
                  aria-pressed="false"
                  onClick={() => {
                    // A new time starts again from the confirm step, with a new hold and a new deposit.
                    setDraft({
                      ...d,
                      now: paidAt,
                      state: {
                        ...d.state,
                        date: localDate(s.startAt),
                        slot: s,
                        holdExpiresAt: addMinutes(paidAt, 10),
                      },
                    });
                    router.push(bookingUrl(tenantSlug, d, 'confirm'));
                  }}
                >
                  {formatTime(s.startAt)}
                  {localDate(s.startAt) !== localDate(first) &&
                    ` ${formatDay(localDate(s.startAt)).slice(-5)}`}
                </button>
              ))}
            </div>
          ) : (
            <p className="body-sm m-0 text-(--ink-muted)">Chưa còn giờ trống trong 7 ngày tới.</p>
          )}
          <p className="body-sm m-0 text-(--ink-muted)">
            Chọn giờ khác thì đặt lại từ bước Xác nhận, cọc lần nữa.
          </p>
        </section>
        <Link
          href={bookingUrl(tenantSlug, d, 'datetime')}
          className="body-sm font-medium text-(--accent) hover:underline"
        >
          Chọn ngày khác
        </Link>
      </>,
      false,
    );
  }

  if (!draft) {
    return frame(
      <div className="sp-empty flex flex-col gap-(--space-2)">
        <h1 className="title m-0">Chưa có lịch cần đặt cọc</h1>
        <p className="m-0">Chọn dịch vụ và giờ trước, rồi trả cọc ở bước Xác nhận.</p>
        <Link
          href={`/mock/${tenantSlug}/book`}
          className="body font-medium text-(--accent) hover:underline"
        >
          Đặt lịch
        </Link>
      </div>,
      false,
    );
  }

  const code = paymentCode(draft.id);
  const holder = `SAPIO PAY · ${tenantSlug.replace(/-/g, ' ').toUpperCase()}`;
  const copy = (label: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    toast({ text: `Đã chép ${label}.` });
  };
  const detail = (k: string, v: string, label: string) => (
    <div
      key={k}
      className="flex items-center justify-between gap-(--space-2) border-t border-(--line) py-(--space-2)"
    >
      <span className="flex flex-col">
        <span className="body-sm text-(--ink-muted)">{k}</span>
        <span className="body sp-num font-semibold">{v}</span>
      </span>
      <Button variant="ghost" size="sm" aria-label={`Chép ${label}`} onClick={() => copy(label, v)}>
        Chép
      </Button>
    </div>
  );

  /** The gateway reports the deposit: a line in its history (Cài đặt › Thanh toán). */
  function logDeposit(d: BookingDraft, late: boolean) {
    const events = config.gateway.events;
    saveSettings({
      config: {
        gateway: {
          ...config.gateway,
          events: [
            ...events,
            {
              id: `gw-${events.length + 1}`,
              at: now,
              text: `Báo cọc ${code}, ${formatVnd(d.depositVnd)}${late ? ' (sau khi hết giữ chỗ)' : ''}, đúng chữ ký`,
              ok: true,
            },
          ],
        },
      },
    });
  }

  /** The mock gateway: the money arrives while the hold still runs. */
  function payInTime() {
    const d = draft!;
    logDeposit(d, false);
    const made = commit(d, 'confirmed');
    if (made.customerId) session.loginWithId(made.customerId);
    setOutcome({ draft: d, late: false, paidAt: now, slot: d.slot, nearest: [] });
    setPhase('paid');
    setDraft(null);
  }

  /** The mock gateway: the money arrives after the hold ran out (BR-29). */
  function payLate() {
    const d = draft!;
    logDeposit(d, true);
    const paidAt = addMinutes(d.holdExpiresAt, 1);
    const heldId = `${tenant.id}-a-web${d.id}`;
    const others = appointments.filter((a) => a.id !== heldId);
    if (rivalBooks) others.push(rival(d));
    const found = stillFree(fixture, d.refs, d.mode, d.slot, paidAt, { appointments: others });
    if (found) {
      const made = commit(d, 'confirmed', found);
      if (made.customerId) session.loginWithId(made.customerId);
      setOutcome({ draft: d, late: true, paidAt, slot: found, nearest: [] });
      setPhase('paid');
    } else {
      release(d);
      // BR-29: the time is gone, so the deposit goes back in full without anyone approving it.
      setMoney((m) =>
        addAutoRefund(m, {
          key: d.id,
          amountVnd: d.depositVnd,
          slotLabel: formatTime(d.slot.startAt),
          at: paidAt,
        }),
      );
      const nearest = nearestSlots(fixture, d.refs, d.mode, d.slot.startAt, paidAt, {
        appointments: others,
      });
      setOutcome({ draft: d, late: true, paidAt, slot: d.slot, nearest });
      setPhase('lost');
    }
    setDraft(null);
  }

  return frame(
    <>
      <div>
        <h1 className="title m-0">Đặt cọc {formatVnd(draft.depositVnd)}</h1>
        <p className="body-sm m-0 mt-(--space-1) text-(--ink-muted)">
          Cọc trừ vào tiền dịch vụ khi thanh toán ở tiệm.
        </p>
      </div>
      <HoldBanner
        expiresAt={draft.holdExpiresAt}
        now={now}
        title={`Đang giữ chỗ ${draft.display.slotLine}`}
        note={`${draft.display.people} được giữ cho bạn. Trả cọc trước khi hết giờ.`}
        onExpire={expire}
      />
      <section className="flex flex-col items-center gap-(--space-3) rounded-(--radius-lg) bg-(--surface-raised) p-(--space-4) shadow-[0_0_0_1px_var(--line)]">
        <StaticQr
          value={`SP ${code}|${draft.depositVnd}`}
          label={`Mã QR chuyển ${formatVnd(draft.depositVnd)}, nội dung SP ${code}`}
        />
        <p className="body-sm m-0 text-(--ink-muted)">Quét bằng ứng dụng ngân hàng bất kỳ.</p>
        <div className="flex w-full flex-col">
          {detail('Số tiền', formatVnd(draft.depositVnd), 'số tiền')}
          {detail('Nội dung chuyển khoản', `SP ${code}`, 'nội dung chuyển khoản')}
          {detail('Người nhận', holder, 'người nhận')}
        </div>
      </section>
      <Button
        variant="accent"
        size="lg"
        block
        onClick={() => toast({ text: 'Mock: không mở ứng dụng ngân hàng thật.' })}
      >
        Mở ứng dụng ngân hàng
      </Button>
      <p role="status" className="body-sm sp-num m-0 flex items-center gap-(--space-2) font-medium">
        <span aria-hidden="true" className="size-2 rounded-(--radius-pill) bg-(--accent)" />
        Đang chờ tiền về. Trang tự chuyển khi nhận được.
      </p>
      <p className="body-sm m-0 text-(--ink-muted)">
        Môi trường thử: tiền không chuyển thật (cổng giả lập, D-09). Tiền về sau khi hết giữ chỗ thì
        lịch vẫn được xác nhận nếu giờ còn trống; nếu không, cọc được hoàn đủ.
      </p>
      <section
        aria-labelledby="mock-only"
        className="flex flex-col gap-(--space-3) rounded-(--radius-lg) border border-dashed border-(--line) p-(--space-4)"
      >
        <h2 id="mock-only" className="body m-0 font-semibold">
          Chỉ cho người xem mock
        </h2>
        <p className="body-sm m-0 text-(--ink-muted)">
          Hai nút này thay cho cổng thanh toán; khách thật không có chúng.
        </p>
        <Button variant="secondary" onClick={payInTime}>
          Giả lập: tiền về
        </Button>
        <Button variant="secondary" onClick={payLate}>
          Giả lập: tiền về sau khi hết giữ chỗ
        </Button>
        <label className="body-sm flex items-start gap-(--space-2)">
          <input
            type="checkbox"
            checked={rivalBooks}
            onChange={(e) => setRivalBooks(e.target.checked)}
            className="mt-1"
          />
          <span>Khi chỗ được trả lại, có khách khác đặt đúng giờ này (cho nút thứ hai).</span>
        </label>
      </section>
    </>,
  );
}
