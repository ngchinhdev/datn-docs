'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { useAppHref } from '@/components/mock/use-app-href';
import { Button } from '@/components/sapio/button';
import { StatusBadge, statusLabel } from '@/components/sapio/status-badge';
import { useMediaQuery } from '@/components/sapio/use-media-query';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { cn } from '@/lib/utils';
import { formatPhone, formatVnd } from '@/mock/format';
import { appointmentDetail, appointmentEnd, lookups } from '@/mock/reception';
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
    if (wide && apptId) router.replace(appHref('calendar', { date, select: apptId }));
  }, [wide, apptId, date, router, appHref]);

  const back = appHref('calendar', date ? { date } : {});
  if (!appt) {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">
          Không tìm thấy lịch hẹn này.{' '}
          <Link href={back} className="font-medium">
            Về lịch
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
          {customer?.name ?? 'Khách đang đặt online'}
        </h1>
        {customer && (
          <span className="body-sm">
            {customer.phone ? (
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

      {d.items.map((item, index) => (
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
      ))}

      {appt.items.some((i) => i.swapUnconfirmed) && (
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

      {appt.note && (
        <section aria-labelledby="ap-note" className="flex flex-col gap-1">
          <h2 id="ap-note" className="sp-field__label m-0">
            Ghi chú nội bộ
          </h2>
          <p className="m-0 text-sm leading-5">{appt.note}</p>
        </section>
      )}

      {Object.values(allowed).some(Boolean) && (
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
