'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { useToast } from '@/components/sapio/toast';
import type { Appointment, TenantFixture } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import { staffOf } from '@/mock/move';
import { lookups } from '@/mock/reception';
import { formatRange, formatTime } from '@/mock/time';
import { MoveDialog } from './move-dialog';
import type { DragTarget } from './use-calendar-drag';

/** When the customer is done with an appointment (the end of its last work or wait part). */
export const endOf = (appt: Appointment) =>
  appt.bookings
    .filter((b) => b.kind === 'work' || b.kind === 'wait')
    .reduce((end, b) => (b.endAt > end ? b.endAt : end), appt.startAt);

/**
 * What happens after an appointment is given a new time or person, however it got there: a drop on
 * the calendar or "Dời giờ, đổi người". "Bất kỳ ai" changes at once with an undo; a named person is
 * asked about first (BR-32). `dialogs` goes anywhere in the page.
 */
export function useMoveFlow(args: {
  fixture: TenantFixture;
  /** Local date of the appointment being moved, for the dialog's grid. */
  date: (appt: Appointment) => string;
  now: string;
  replace: (appt: Appointment) => void;
  /** Said when an appointment has several people and cannot be moved as one. */
  notify: (text: string) => void;
}) {
  const { fixture, now, replace, notify } = args;
  const L = lookups(fixture);
  const toast = useToast();
  const [swap, setSwap] = useState<{ appt: Appointment; target: DragTarget } | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [moving, setMoving] = useState<Appointment | null>(null);

  const staffName = (id: string) => L.name(id);
  const inSentence = (appt: Appointment) => {
    const who = L.who(appt);
    return who.charAt(0).toLowerCase() + who.slice(1);
  };

  /** Puts the moved appointment on the calendar and offers to take it back for 5 seconds. */
  function commit(appt: Appointment, moved: Appointment, text: string) {
    replace(moved);
    toast({ text, undo: () => replace(appt) });
  }

  function handleDrop(appt: Appointment, target: DragTarget) {
    const moved = target.moved;
    if (!moved) return;
    const changesPerson = target.columnId !== appt.items[0]?.staffResourceId;
    if (changesPerson && appt.items.some((i) => i.staffChoice === 'chosen')) {
      setSendEmail(true);
      setSwap({ appt, target });
      return;
    }
    commit(
      appt,
      moved,
      `Đã dời ${L.who(appt)} sang ${formatTime(moved.startAt)}, ${staffName(target.columnId)}.`,
    );
  }

  function confirmSwap() {
    const moved = swap?.target.moved;
    if (!swap || !moved) return;
    const { appt, target } = swap;
    // Only an email asks the customer to confirm, so only then does the mark stay (BR-32).
    commit(
      appt,
      sendEmail
        ? { ...moved, items: moved.items.map((i) => ({ ...i, swapUnconfirmed: true })) }
        : moved,
      sendEmail
        ? `Đã đổi ${L.who(appt)} sang ${staffName(target.columnId)}. Đã gửi email báo khách. Lịch mang dấu "Chưa xác nhận đổi người".`
        : `Đã đổi ${L.who(appt)} sang ${staffName(target.columnId)}. Chưa báo khách.`,
    );
    setSwap(null);
  }

  function openMove(appt: Appointment) {
    if (staffOf(appt).length > 1) {
      notify('Lịch có nhiều người làm: đổi từng mục chưa có trong mock.');
      return;
    }
    setMoving(appt);
  }

  const swapMoved = swap?.target.moved;
  const dialogs = (
    <>
      {moving && (
        <MoveDialog
          fixture={fixture}
          appt={moving}
          date={args.date(moving)}
          now={now}
          onClose={() => setMoving(null)}
          onApply={(target) => {
            const appt = moving;
            setMoving(null);
            handleDrop(appt, target);
          }}
        />
      )}
      {swap && swapMoved && (
        <ConfirmDialog
          open
          title={`Đổi ${inSentence(swap.appt)} sang ${staffName(swap.target.columnId)}?`}
          body={`${L.who(swap.appt)} chọn đích danh ${staffName(swap.appt.items[0]?.staffResourceId ?? '')} khi đặt. Đổi người thì cần báo khách (BR-32).`}
          facts={[
            {
              term: 'Giờ',
              value: `${formatRange(swap.appt.startAt, endOf(swap.appt))} → ${formatRange(swapMoved.startAt, endOf(swapMoved))}`,
            },
            {
              term: fixture.template.vocabulary.staff.replace(/^./, (c) => c.toUpperCase()),
              value: `${staffName(swap.appt.items[0]?.staffResourceId ?? '')} → ${staffName(swap.target.columnId)}`,
            },
            {
              term: 'Tài nguyên',
              value: `${swap.target.resourcesBefore.join(', ')} → ${swap.target.resourcesAfter.join(', ')}`,
            },
            {
              term: 'Giá',
              value: `Giữ ${formatVnd(swap.appt.items.reduce((sum, i) => sum + i.priceVnd, 0n))} (BR-12)`,
            },
          ]}
          backLabel="Giữ như cũ"
          confirmLabel={`Đổi sang ${staffName(swap.target.columnId)}`}
          onClose={() => setSwap(null)}
          onConfirm={confirmSwap}
        >
          <label className="sp-check">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            <span>
              Gửi email báo {inSentence(swap.appt)}
              <span className="sp-check__hint">
                Email có nút &quot;Đồng ý&quot; và &quot;Chọn lại giờ&quot;. Chưa trả lời thì lịch
                vẫn đổi; lễ tân thấy dấu &quot;Chưa xác nhận đổi người&quot;.
              </span>
            </span>
          </label>
        </ConfirmDialog>
      )}
    </>
  );

  return { handleDrop, openMove, dialogs, inSentence };
}
