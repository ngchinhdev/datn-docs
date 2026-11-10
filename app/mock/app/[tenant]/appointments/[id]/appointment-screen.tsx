'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { useTechnician } from '@/components/mock/use-technician';
import { useAppHref } from '@/components/mock/use-app-href';
import { Button } from '@/components/sapio/button';
import { StatusBadge, statusLabel } from '@/components/sapio/status-badge';
import { useToast } from '@/components/sapio/toast';
import { useMediaQuery } from '@/components/sapio/use-media-query';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { cn } from '@/lib/utils';
import { formatPhone, formatVnd } from '@/mock/format';
import { appointmentDetail, appointmentEnd, lookups } from '@/mock/reception';
import { staffRoleOf } from '@/mock/selection';
import { advanceItem, itemPhase, nextPartText } from '@/mock/technician';
import { formatDay, formatRange, formatTime, localDate } from '@/mock/time';
import { useAppointmentActions } from '../../_reception/actions';
import { useReception } from '../../_reception/use-reception';
import { useMoveFlow } from '../../_reception/use-move-flow';

/**
 * Chi tiết lịch hẹn (MH-28): the page for phones, with the same content as the panel beside the
 * calendar. From 768px the panel is used, so this address opens the calendar with it selected.
 */
export function AppointmentScreen({ tenantSlug, id }: { tenantSlug: string; id: string }) {
  const fixture = useLiveFixture(tenantSlug);
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const now = useMockNow();
  const wide = useMediaQuery('(min-width: 768px)', false);
  const { appointments, replace, notify } = useReception();
  const toast = useToast();
  const { staffSeesCustomerPhone } = useScheduleStore();
  const me = useTechnician();
  const isTech = staffRoleOf(useSearchParams().get('role')) === 'technician';
  const L = lookups(fixture);
  const appt = appointments.find((a) => a.id === id);
  const actions = useAppointmentActions(fixture, appointments, replace, now);
  const flow = useMoveFlow({
    fixture,
    date: (a) => localDate(a.startAt),
    now,
    replace,
    notify,
  });

  const date = appt ? localDate(appt.startAt) : '';
  const apptId = appt?.id;
  useEffect(() => {
    if (wide && apptId && !isTech) {
      router.replace(appHref('calendar', { date, select: apptId }));
    }
  }, [wide, apptId, date, isTech, router, appHref]);

  const back = isTech
    ? appHref('my/schedule', date ? { date } : {})
    : appHref('calendar', date ? { date } : {});
  // A technician sees only appointments they do part of (BR-36).
  const mine = appt
    ? appt.items.flatMap((item, i) => (item.staffResourceId === me.resourceId ? [i] : []))
    : [];
  if (!appt || (isTech && mine.length === 0)) {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">
          {appt ? 'Lịch hẹn này không phải của bạn.' : 'Không tìm thấy lịch hẹn này.'}{' '}
          <Link href={back} className="font-medium">
            {isTech ? 'Về lịch của tôi' : 'Về lịch'}
          </Link>
        </p>
      </div>
    );
  }

  const customer = L.customer(appt);
  const d = appointmentDetail(fixture, appt);
  const allowed = actions.allowed(appt);
  const staff = [...new Set(appt.items.map((i) => L.name(i.staffResourceId)))].join(', ');
  const badge =
    appt.status === 'checked_in' && appt.checkedInAt
      ? `${statusLabel.checked_in} ${formatTime(appt.checkedInAt)}`
      : appt.status === 'completed' && !appt.settled && d.due > 0n
        ? 'Hoàn thành · chờ thanh toán'
        : undefined;
  const named = appt.items.filter((i) => i.staffChoice === 'chosen');
  const showPhone = !isTech || staffSeesCustomerPhone;
  const phases = mine.map((i) => itemPhase(appt, i, now));
  const nextStep = isTech
    ? (['back', 'working', 'due'] as const).find((p) => phases.includes(p))
    : undefined;
  const step = nextStep ? mine[phases.indexOf(nextStep)] : undefined;
  const press = (action: 'start' | 'resume' | 'finish') => {
    if (step === undefined) return;
    replace(advanceItem(appt, step, action, now));
    toast({
      text: `${{ start: 'Đã bắt đầu', resume: 'Đã bắt đầu phần tiếp của', finish: 'Đã xong' }[action]} ${L.who(appt)}.`,
      undo: () => replace(appt),
    });
  };

  return (
    <div className="sp-shell__content flex flex-col gap-(--space-4)">
      <header className="flex items-center gap-(--space-2)">
        <Link href={back} className="sp-icon-btn size-11! no-underline" aria-label="Quay lại lịch">
          <ChevronLeft aria-hidden="true" />
        </Link>
        <div className="flex min-w-0 flex-col">
          <span className="title">Lịch hẹn</span>
          <span className="body-sm sp-num text-(--ink-muted)">
            {formatRange(appt.startAt, appointmentEnd(appt))} · {staff}
          </span>
        </div>
      </header>

      <div className="flex items-center justify-between gap-(--space-2)">
        <StatusBadge status={appt.status} {...(badge ? { label: badge } : {})} />
        <span className="body-sm sp-num text-(--ink-muted)">{formatDay(date)}</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <h1 className="m-0 text-[22px] leading-[30px] font-semibold">
          {L.customerName(appt)}
        </h1>
        {customer && (
          <span className="body-sm">
            {!showPhone ? (
              <span className="text-(--ink-muted)">Số điện thoại ẩn</span>
            ) : customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="sp-num text-[15px] leading-[22px] font-medium"
              >
                {formatPhone(customer.phone)}
              </a>
            ) : (
              <span className="text-(--ink-muted)">Không có số điện thoại</span>
            )}
            {customer.visitCount ? (
              <span className="text-(--ink-muted)"> · khách lần thứ {customer.visitCount}</span>
            ) : null}
          </span>
        )}
      </div>

      {d.items.map((item, index) =>
        isTech && !mine.includes(index) ? null : (
          <section key={item.title} className="sp-panel" aria-labelledby={`ap-item-${index}`}>
            <div className="flex justify-between gap-(--space-2)">
              <h2 className="sp-panel__title" id={`ap-item-${index}`}>
                {item.title}
              </h2>
              <span className="sp-num font-semibold">{item.price}</span>
            </div>
            {item.lines.map((line) => (
              <div key={line.range} className="body-sm flex items-center gap-(--space-3)">
                <span
                  aria-hidden="true"
                  className={cn(
                    'sp-kind',
                    line.buffer ? 'sp-kind--buffer' : line.wait ? 'sp-kind--wait' : 'sp-kind--work',
                  )}
                />
                <span className="sp-num w-24 flex-none text-(--ink-muted)">{line.range}</span>
                <span>{line.text}</span>
              </div>
            ))}
            {named.some((n) => n.serviceVariantId === appt.items[index]?.serviceVariantId) && (
              <p className="sp-panel__note">
                {L.name(appt.items[index]?.staffResourceId ?? '')} do khách chọn đích danh.
              </p>
            )}
          </section>
        ),
      )}

      {isTech && !staffSeesCustomerPhone && (
        <p className="sp-panel__note">
          Số điện thoại khách ẩn theo cài đặt của cơ sở. Cần liên hệ thì nhờ lễ tân.
        </p>
      )}

      {!isTech && appt.items.some((i) => i.swapUnconfirmed) && (
        <div className="flex flex-col items-start gap-(--space-2) rounded-(--radius-md) bg-(--status-no-show-soft) p-(--space-3)">
          <span className="body-sm font-semibold">Chưa xác nhận đổi người</span>
          <span className="body-sm">
            Khách chưa trả lời email. Quá hạn trả lời thì gọi khách; lịch không tự hủy (BR-33).
          </span>
          <Button
            size="sm"
            onClick={() =>
              replace({
                ...appt,
                items: appt.items.map((i) => ({ ...i, swapUnconfirmed: false })),
              })
            }
          >
            Khách đã đồng ý
          </Button>
        </div>
      )}

      {!isTech && (
        <dl className="sp-kv text-sm leading-5">
          {d.deposit > 0n && (
            <>
              <dt>Đã cọc</dt>
              <dd>{formatVnd(d.deposit)}</dd>
            </>
          )}
          <dt>Còn phải thu</dt>
          <dd>{formatVnd(d.due)}</dd>
          <dt>Đặt qua</dt>
          <dd>{d.channel}</dd>
        </dl>
      )}

      {appt.note && (
        <section aria-labelledby="ap-note" className="flex flex-col gap-1">
          <h2 id="ap-note" className="sp-field__label m-0">
            Ghi chú nội bộ
          </h2>
          <p className="m-0 text-sm leading-5">{appt.note}</p>
        </section>
      )}

      {isTech && step !== undefined && nextStep && (
        <Button
          variant="primary"
          block
          className="h-12!"
          onClick={() =>
            press(nextStep === 'due' ? 'start' : nextStep === 'back' ? 'resume' : 'finish')
          }
        >
          {nextStep === 'due' ? 'Bắt đầu' : nextStep === 'back' ? 'Bắt đầu phần tiếp' : 'Xong'}
        </Button>
      )}
      {isTech && nextStep === 'back' && step !== undefined && (
        <p className="sp-panel__note">Đến giờ quay lại: {nextPartText(fixture, appt, step)}.</p>
      )}
      {!isTech && Object.values(allowed).some(Boolean) && (
        <div className="flex flex-col gap-(--space-2)">
          {allowed.checkIn && (
            <Button variant="primary" block className="h-12!" onClick={() => actions.checkIn(appt)}>
              Check-in
            </Button>
          )}
          {allowed.collect && (
            <Button variant="primary" block className="h-12!" onClick={() => actions.collect(appt)}>
              {appt.status === 'completed' ? 'Thu tiền' : 'Hoàn thành và thu tiền'}
            </Button>
          )}
          {allowed.edit && (
            <div className="grid grid-cols-2 gap-(--space-2)">
              <Button className="h-11!" onClick={() => flow.openMove(appt)}>
                Đổi giờ
              </Button>
              <Button className="h-11!" onClick={() => notify('Thêm dịch vụ: chưa có trong mock.')}>
                Thêm dịch vụ
              </Button>
            </div>
          )}
          {allowed.noShow && (
            <Button
              variant="ghost"
              className="h-11! text-(--danger)!"
              onClick={() => actions.noShow(appt)}
            >
              Đánh dấu không đến
            </Button>
          )}
          {allowed.cancel && (
            <Button
              variant="ghost"
              className="h-11! text-(--danger)!"
              onClick={() => actions.cancel(appt)}
            >
              Hủy lịch
            </Button>
          )}
        </div>
      )}
      {actions.dialog}
      {flow.dialogs}
    </div>
  );
}
