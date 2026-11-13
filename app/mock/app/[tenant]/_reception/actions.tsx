'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { useToast } from '@/components/sapio/toast';
import type { Appointment, TenantFixture } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import { appointmentDetail, lookups } from '@/mock/reception';
import { DEFAULT_REFUND_TIERS, noShowFrom, refundVnd } from '@/mock/policy';
import { termsOfAppointment } from '@/mock/terms';
import { formatTime } from '@/mock/time';
import type { RefundTiers } from '@/mock/fixtures';

type Pending = { kind: 'no-show' | 'cancel'; id: string } | null;
type Canceller = 'customer' | 'business';

/** "Chị Hà" inside a sentence reads "chị Hà". */
const inSentence = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** BR-23 when the customer cancels, BR-24 when the business does. */
export function refundOnCancel(
  deposit: bigint,
  startAt: string,
  now: string,
  by: Canceller,
  tiers: RefundTiers = DEFAULT_REFUND_TIERS,
) {
  if (by === 'business') return deposit;
  return refundVnd(deposit, startAt, now, tiers);
}

export interface AllowedActions {
  checkIn: boolean;
  collect: boolean;
  noShow: boolean;
  cancel: boolean;
  edit: boolean;
}

/** D-14: money and irreversible actions ask first; check-in runs at once with undo. */
export function useAppointmentActions(
  fixture: TenantFixture,
  appointments: Appointment[],
  replace: (appt: Appointment) => void,
  now: string,
) {
  const L = lookups(fixture);
  const toast = useToast();
  const router = useRouter();
  const appHref = useAppHref(fixture.tenant.slug);
  // On trial nobody can be checked in (BR-81): the appointments are sample data to configure around.
  const { canBook } = useSubscription();
  const [pending, setPending] = useState<Pending>(null);
  const [canceller, setCanceller] = useState<Canceller>('customer');
  const target = pending ? appointments.find((a) => a.id === pending.id) : undefined;

  function allowed(a: Appointment): AllowedActions {
    const due = appointmentDetail(fixture, a).due;
    return {
      checkIn: canBook && a.status === 'confirmed',
      collect: a.status === 'checked_in' || (a.status === 'completed' && !a.settled && due > 0n),
      // BR-09: only once the minutes of the policy have passed since the start time, without a check-in.
      noShow:
        a.status === 'confirmed' &&
        now >= noShowFrom(a.startAt, fixture.policies.noShowAfterMinutes),
      cancel: a.status === 'confirmed',
      edit: a.status === 'confirmed' || a.status === 'checked_in',
    };
  }

  function checkIn(a: Appointment) {
    replace({ ...a, status: 'checked_in', checkedInAt: now });
    toast({
      text: `Đã check-in ${inSentence(L.who(a))} lúc ${formatTime(now)}.`,
      undo: () => replace(a),
    });
  }

  const ask = (kind: NonNullable<Pending>['kind'], a: Appointment) => {
    setCanceller('customer');
    setPending({ kind, id: a.id });
  };
  const close = () => setPending(null);

  let dialog = null;
  if (target && pending) {
    const who = inSentence(L.who(target));
    const d = appointmentDetail(fixture, target);
    const staff = [...new Set(target.items.map((i) => L.name(i.staffResourceId)))].join(', ');
    const time = formatTime(target.startAt);
    if (pending.kind === 'no-show') {
      dialog = (
        <ConfirmDialog
          open
          tone="danger"
          title={`Đánh dấu ${who} không đến?`}
          body={`Lịch ${time} với ${staff}. ${
            d.deposit > 0n
              ? `Tiền cọc ${formatVnd(d.deposit)} không hoàn.`
              : 'Lịch này không có tiền cọc.'
          }`}
          confirmLabel="Đánh dấu không đến"
          onClose={close}
          onConfirm={() => {
            replace({ ...target, status: 'no_show' });
            close();
            toast({ text: `Đã đánh dấu ${who} không đến lịch ${time}.` });
          }}
        />
      );
    } else {
      // BR-38: the refund tiers are the ones the customer was promised.
      const refund = refundOnCancel(
        d.deposit,
        target.startAt,
        now,
        canceller,
        termsOfAppointment(target, fixture.tenant.slug).refund,
      );
      dialog = (
        <ConfirmDialog
          open
          tone="danger"
          title={`Hủy lịch ${time} của ${who}?`}
          body={`Với ${staff}. ${
            d.deposit > 0n
              ? `Đã cọc ${formatVnd(d.deposit)}, hoàn ${formatVnd(refund)}.`
              : 'Lịch này không có tiền cọc.'
          }`}
          confirmLabel="Hủy lịch"
          onClose={close}
          onConfirm={() => {
            replace({ ...target, status: 'cancelled' });
            close();
            toast({
              text: `Đã hủy lịch ${time} của ${who}.${
                d.deposit > 0n ? ` Hoàn cọc ${formatVnd(refund)}.` : ''
              }`,
            });
          }}
        >
          {d.deposit > 0n && (
            <Choice
              label="Ai hủy"
              value={canceller}
              onChange={setCanceller}
              options={[
                ['customer', 'Khách hủy'],
                ['business', 'Cơ sở hủy'],
              ]}
            />
          )}
        </ConfirmDialog>
      );
    }
  }

  return {
    allowed,
    /** `false` while the plan does not take bookings. */
    bookingOpen: canBook,
    checkIn,
    /** MH-29: the invoice of the appointment is collected on its own page. */
    collect: (a: Appointment) => router.push(appHref(`checkout/${a.id}`)),
    noShow: (a: Appointment) => ask('no-show', a),
    cancel: (a: Appointment) => ask('cancel', a),
    dialog,
  };
}

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex flex-col gap-(--space-2)">
      <span className="body-sm text-(--ink-muted)">{label}</span>
      <div role="group" aria-label={label} className="sp-segmented sp-segmented--block">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            className="sp-segmented__item"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
