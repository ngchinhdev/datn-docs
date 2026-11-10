'use client';

import { Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { AffectedList, type AffectedRow } from '@/components/sapio/affected-list';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { useMockNow } from '@/components/sapio/use-mock-now';
import type { Appointment, LeaveHandling, StaffTimeOff } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import {
  affectedByLeave,
  answerDeadline,
  applyHandling,
  isOverdue,
  isSettled,
  suggest,
  windowText,
  type Fix,
} from '@/mock/leave';
import { itemArrival } from '@/mock/move';
import { formatWhenInline } from '@/mock/people-format';
import { lookups } from '@/mock/reception';
import { formatDateTime, formatDay, formatRange, formatTime } from '@/mock/time';
import { endOf } from '../../_reception/use-move-flow';

const STATUS = {
  pending: ['sp-badge--pending', 'Chờ duyệt'],
  approved: ['sp-badge--confirmed', 'Đã duyệt'],
  rejected: ['sp-badge--cancelled', 'Từ chối'],
} as const;

const whenText = (leave: Pick<StaffTimeOff, 'date' | 'from' | 'to'>) =>
  `${formatDay(leave.date).replace(',', '')}, ${windowText(leave)}`;

/**
 * Xử lý lịch bị ảnh hưởng (MH-40): each appointment a leave request or a cut shift touches, with
 * what could be done for it. The request is approved only when every one has a way (BR-11, BR-34).
 */
export function TimeOffCaseScreen({ tenantSlug, id }: { tenantSlug: string; id: string }) {
  const uid = useId();
  const fixture = useLiveFixture(tenantSlug);
  const {
    appointments,
    leaves,
    requeues,
    replaceLeave,
    replaceRequeue,
    removeRequeue,
    replaceAppointment,
  } = useScheduleStore();
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const now = useMockNow();
  const L = lookups(fixture);

  const leave = leaves.find((l) => l.id === id);
  const requeue = requeues.find((r) => r.id === id);
  const subject = leave ?? requeue;
  const resourceId = subject?.resourceId ?? '';
  const name = L.name(resourceId);
  const handling: Record<string, LeaveHandling> = useMemo(
    () => (leave ? (leave.handling ?? {}) : (requeue?.handling ?? {})),
    [leave, requeue],
  );

  const affected: Appointment[] = useMemo(() => {
    if (leave) return affectedByLeave(appointments, leave);
    if (requeue) {
      return requeue.appointmentIds
        .flatMap((apptId) => appointments.filter((a) => a.id === apptId))
        .filter((a) => a.status === 'confirmed' || a.status === 'checked_in')
        .sort((a, b) => a.startAt.localeCompare(b.startAt));
    }
    return [];
  }, [leave, requeue, appointments]);

  // The calendar as it will be once the decisions so far are carried out, so one decision
  // cannot take the place another one is counting on.
  const settled = useMemo(
    () => Object.fromEntries(Object.entries(handling).filter(([, h]) => isSettled(h))),
    [handling],
  );
  const planned = useMemo(
    () => ({
      ...fixture,
      appointments: applyHandling(fixture, appointments, settled, now).appointments,
    }),
    [fixture, appointments, settled, now],
  );

  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [choosing, setChoosing] = useState<{ appt: Appointment; fix: Fix } | null>(null);
  const [chosenOther, setChosenOther] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  /** Why a decision made earlier no longer fits, per appointment, until a new one is made. */
  const [stale, setStale] = useState<Record<string, string>>({});

  if (!subject) {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">
          Không tìm thấy đơn này.{' '}
          <Link href={appHref('time-off')} className="font-medium">
            Về danh sách nghỉ phép
          </Link>
        </p>
      </div>
    );
  }

  const decided = leave && leave.status !== 'pending' ? leave : null;
  /** The request without the plan for its appointments, which stays only while it is pending. */
  const withoutPlan = (l: StaffTimeOff) => {
    const copy = { ...l };
    delete copy.handling;
    return copy;
  };
  const setHandling = (apptId: string, next: LeaveHandling | null) => {
    const copy = { ...handling };
    if (next) copy[apptId] = next;
    else delete copy[apptId];
    setStale((current) => {
      const { [apptId]: _dropped, ...rest } = current;
      return rest;
    });
    if (leave) replaceLeave({ ...leave, handling: copy });
    else if (requeue) replaceRequeue({ ...requeue, handling: copy });
  };

  const settledCount = affected.filter((a) => isSettled(handling[a.id])).length;
  const remaining = affected.length - settledCount;
  const who = (appt: Appointment) => {
    const text = L.who(appt);
    return text.charAt(0).toLowerCase() + text.slice(1);
  };

  const phoneOf = (appt: Appointment) => L.customer(appt)?.phone ?? '';
  const callButton = (appt: Appointment) => {
    const phone = phoneOf(appt);
    return phone ? (
      <a
        href={`tel:${phone}`}
        className="sp-btn sp-btn--secondary sp-btn--sm no-underline"
        aria-label={`Gọi khách ${L.who(appt)}`}
      >
        <Phone size={14} aria-hidden="true" />
        Gọi khách
      </a>
    ) : null;
  };

  function buildRow(appt: Appointment): AffectedRow {
    const row = buildRowCore(appt);
    const note = stale[appt.id];
    return note && !row.done
      ? {
          ...row,
          fix: (
            <>
              <strong>Cách xử lý trước không còn áp được: {note}</strong> {row.fix}
            </>
          ),
        }
      : row;
  }

  function buildRowCore(appt: Appointment): AffectedRow {
    const h = handling[appt.id];
    const total = appt.items.reduce((sum, i) => sum + i.priceVnd, 0n);
    const deposit = appt.depositVnd ?? 0n;
    const mineItems = appt.items.filter((i) => i.staffResourceId === resourceId);
    const named = mineItems.some((i) => i.staffChoice === 'chosen');
    const staffIds = new Set(fixture.staff.map((s) => s.resourceId));
    const resources = [
      ...new Set(
        appt.bookings.filter((b) => !staffIds.has(b.resourceId)).map((b) => L.name(b.resourceId)),
      ),
    ];
    const services = appt.items
      .map((i) => L.variant(i.serviceVariantId)?.shortName ?? '')
      .join(', ');
    const base = {
      id: appt.id,
      time: formatTime(appt.startAt),
      title: `${L.who(appt)} · ${services}`,
      choice: { text: named ? `Chọn đích danh ${name}` : 'Bất kỳ ai', named },
      meta: `${resources.join(', ')} · ${formatVnd(total)}${deposit > 0n ? ` · đã cọc ${formatVnd(deposit)}` : ''}`,
    };
    const undo = (
      <Button variant="ghost" size="sm" onClick={() => setHandling(appt.id, null)}>
        Hoàn tác
      </Button>
    );
    const cancelButton = (
      <Button size="sm" onClick={() => setCancelling(appt)}>
        Hủy và báo khách
      </Button>
    );

    // Already decided.
    if (h && isSettled(h)) {
      const after = planned.appointments.find((a) => a.id === appt.id);
      const afterResources = after
        ? [
            ...new Set(
              after.bookings
                .filter((b) => !staffIds.has(b.resourceId))
                .map((b) => L.name(b.resourceId)),
            ),
          ].join(', ')
        : '';
      const text =
        h.kind === 'swap'
          ? `Đã đổi sang ${L.name(h.staffResourceId)}, cùng giờ${afterResources ? `, ${afterResources}` : ''}`
          : h.kind === 'agreed'
            ? `Khách đã đồng ý đổi sang ${L.name(h.staffResourceId)}, cùng giờ${afterResources ? `, ${afterResources}` : ''}`
            : h.kind === 'move'
              ? `Đã dời sang ${formatTime(h.startAt)}, ${L.name(h.staffResourceId)}`
              : `Đã hủy, báo khách${deposit > 0n ? `; hoàn cọc ${formatVnd(deposit)} (BR-24)` : ''}`;
      return { ...base, fix: text, tone: 'done', done: true, actions: undo };
    }

    // Asked the customer, who has not answered.
    if (h?.kind === 'asked') {
      const overdue = isOverdue(h.sentAt, appt, now);
      const deadline = answerDeadline(h.sentAt, appt);
      return {
        ...base,
        tone: overdue ? 'bad' : 'waiting',
        done: false,
        fix: overdue
          ? 'Quá hạn trả lời. Gọi khách.'
          : `Đã gửi email hỏi ý ${formatWhenInline(h.sentAt)}, đề nghị đổi sang ${L.name(h.staffResourceId)}. Chờ trả lời đến ${formatWhenInline(deadline)}; quá hạn thì gọi khách.`,
        actions: (
          <>
            {callButton(appt)}
            <Button
              variant={overdue ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() =>
                setHandling(appt.id, { kind: 'agreed', staffResourceId: h.staffResourceId })
              }
            >
              Ghi nhận khách đồng ý
            </Button>
            {overdue && cancelButton}
          </>
        ),
      };
    }

    // Nothing decided yet.
    const fix = suggest({ fixture: planned, appt, leaver: resourceId, now });
    const range = formatRange(itemArrival(appt, 0), endOf(appt));
    if (fix.swap) {
      const target = L.name(fix.swap.staffResourceId);
      const where = fix.swap.resources.length
        ? `, ${fix.swap.resources.join(', ')} vẫn dùng được`
        : '';
      if (named) {
        return {
          ...base,
          tone: 'suggest',
          done: false,
          fix: `Gợi ý: hỏi ý khách, đề nghị đổi sang ${target} (trống ${range}${where})`,
          actions: (
            <>
              {cancelButton}
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setHandling(appt.id, {
                    kind: 'asked',
                    staffResourceId: fix.swap!.staffResourceId,
                    sentAt: now,
                  });
                  toast({
                    text: `Đã gửi email hỏi ý ${who(appt)}. Hạn trả lời ${formatWhenInline(answerDeadline(now, appt))}.`,
                  });
                }}
              >
                Gửi email hỏi ý
              </Button>
            </>
          ),
        };
      }
      return {
        ...base,
        tone: 'suggest',
        done: false,
        fix: `Gợi ý: ${target} trống ${range}${where}`,
        actions: (
          <>
            <Button
              size="sm"
              onClick={() => {
                setChosenOther(fix.swap!.staffResourceId);
                setChoosing({ appt, fix });
              }}
            >
              Người khác
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                setHandling(appt.id, { kind: 'swap', staffResourceId: fix.swap!.staffResourceId })
              }
            >
              Đổi sang {target}
            </Button>
          </>
        ),
      };
    }
    // Nobody at that time: move, or cancel.
    const nearest = fix.nearest;
    return {
      ...base,
      tone: 'bad',
      done: false,
      fix: `Không ai trống ${formatTime(appt.startAt)}${fix.reason ? `: ${fix.reason}` : ''}.${nearest ? ` Gần nhất: ${formatTime(nearest.startAt)} với ${L.name(nearest.staffResourceId)}.` : ''}`,
      actions: (
        <>
          {cancelButton}
          {nearest && (
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                setHandling(appt.id, {
                  kind: 'move',
                  staffResourceId: nearest.staffResourceId,
                  startAt: nearest.startAt,
                })
              }
            >
              Dời sang {formatTime(nearest.startAt)}, {L.name(nearest.staffResourceId)}
            </Button>
          )}
        </>
      ),
    };
  }

  const rows = affected.map(buildRow);

  // ---- Deciding ----
  /**
   * Checks every decision again against the calendar as it is now (BR-11). One that no longer
   * fits is dropped, its row goes back to "chưa xử lý" with the reason, and nothing is applied.
   */
  function carryOut(): boolean {
    const { appointments: result, failed } = applyHandling(fixture, appointments, handling, now);
    if (failed.length > 0) {
      const copy = { ...handling };
      for (const { id: apptId } of failed) delete copy[apptId];
      if (leave) replaceLeave({ ...leave, handling: copy });
      else if (requeue) replaceRequeue({ ...requeue, handling: copy });
      setStale((current) => ({
        ...current,
        ...Object.fromEntries(failed.map(({ id: apptId, reason }) => [apptId, reason])),
      }));
      toast({
        text: `${failed.length} lịch không còn xử lý được theo cách đã chọn. Chọn lại cách xử lý rồi ${leave ? 'duyệt' : 'xếp lại'}.`,
      });
      return false;
    }
    for (const appt of affected) {
      const after = result.find((a) => a.id === appt.id);
      if (after && after !== appt) replaceAppointment(after);
    }
    return true;
  }
  function approve() {
    if (!leave || !carryOut()) return;
    replaceLeave({ ...withoutPlan(leave), status: 'approved', affectedCount: affected.length });
    toast({
      text: `Đã duyệt nghỉ của ${name} ${whenText(leave)}. ${affected.length} lịch đã được xử lý.`,
    });
    router.push(appHref('time-off'));
  }
  function finishRequeue() {
    if (!requeue || !carryOut()) return;
    removeRequeue(requeue.id);
    toast({ text: `Đã xếp lại ${affected.length} lịch của ${name}.` });
    router.push(appHref('time-off'));
  }
  function reject() {
    if (!leave) return;
    replaceLeave({
      ...withoutPlan(leave),
      status: 'rejected',
      rejectReason: reason.trim(),
      affectedCount: affected.length,
    });
    toast({ text: `Đã từ chối đơn nghỉ của ${name}. Nhân viên nhận thông báo kèm lý do.` });
    router.push(appHref('time-off'));
  }

  const title = leave
    ? `${name} xin nghỉ ${whenText(leave)}`
    : `${name} bớt ca ${formatDay(subject.date).replace(',', '')}`;
  const sub = leave
    ? `Lý do: ${leave.reason} · gửi ${formatDateTime(leave.sentAt)}`
    : `${requeue?.reason ?? ''} · tạo ${formatDateTime(requeue?.createdAt ?? now)}`;

  return (
    <div className="sp-shell__content">
      <PageHeader
        crumbs={[
          { label: 'Nghỉ phép', href: appHref('time-off') },
          {
            label: `${name}, ${subject.date.slice(8)}/${subject.date.slice(5, 7)}`,
          },
        ]}
        title={title}
        sub={sub}
        actions={
          leave ? (
            <span className={`sp-badge ${STATUS[leave.status][0]}`}>{STATUS[leave.status][1]}</span>
          ) : undefined
        }
      />

      {decided ? (
        <section className="sp-panel">
          <h2 className="sp-panel__title">
            {decided.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
          </h2>
          <p className="sp-panel__note">
            {decided.status === 'approved'
              ? `${decided.affectedCount ?? 0} lịch bị ảnh hưởng đã được xử lý khi duyệt.`
              : `Lý do từ chối: ${decided.rejectReason ?? 'không ghi'}.`}
          </p>
        </section>
      ) : (
        <>
          <section className="sp-panel gap-3.5!" aria-labelledby={`${uid}-title`}>
            <div className="flex flex-wrap items-baseline justify-between gap-(--space-2)">
              <h2 className="sp-panel__title" id={`${uid}-title`}>
                {affected.length} lịch bị ảnh hưởng · {settledCount} đã xử lý
              </h2>
              <span className="sp-panel__note">
                Khách để &quot;Bất kỳ ai&quot;: đổi người không cần hỏi. Khách chọn đích danh: phải
                hỏi ý (BR-11).
              </span>
            </div>
            <div
              className="sp-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={affected.length}
              aria-valuenow={settledCount}
              aria-label={`Đã xử lý ${settledCount} trên ${affected.length} lịch`}
            >
              <span
                style={{
                  width: `${affected.length ? (settledCount / affected.length) * 100 : 100}%`,
                }}
              />
            </div>
            {rows.length > 0 ? (
              <AffectedList rows={rows} label="Lịch bị ảnh hưởng" />
            ) : (
              <p className="sp-panel__note">Không có lịch nào bị ảnh hưởng.</p>
            )}
          </section>
          <div className="sp-savebar max-md:bottom-22!" role="region" aria-label="Duyệt đơn">
            <span>
              {remaining > 0
                ? `Còn ${remaining} lịch chưa xử lý. ${leave ? 'Duyệt' : 'Xếp lại'} được khi cả ${affected.length} lịch đã có cách xử lý.`
                : leave
                  ? 'Mọi lịch đã có cách xử lý. Duyệt nghỉ để áp dụng.'
                  : 'Mọi lịch đã có cách xử lý. Xếp lại xong để áp dụng.'}
            </span>
            <span className="sp-savebar__actions">
              {leave && (
                <Button variant="ghost" onClick={() => setRejecting(true)}>
                  Từ chối đơn
                </Button>
              )}
              <Button
                variant="primary"
                disabled={remaining > 0}
                onClick={leave ? approve : finishRequeue}
              >
                {leave ? 'Duyệt nghỉ' : 'Xếp lại xong'}
              </Button>
            </span>
          </div>
        </>
      )}

      {cancelling && (
        <ConfirmDialog
          open
          tone="danger"
          title={`Hủy lịch ${formatTime(cancelling.startAt)} của ${who(cancelling)} và báo khách?`}
          body={
            (cancelling.depositVnd ?? 0n) > 0n
              ? `Cơ sở hủy nên hoàn cọc 100%: ${formatVnd(cancelling.depositVnd ?? 0n)} (BR-24).`
              : 'Lịch này không có tiền cọc.'
          }
          confirmLabel="Hủy và báo khách"
          onClose={() => setCancelling(null)}
          onConfirm={() => {
            setHandling(cancelling.id, { kind: 'cancel' });
            setCancelling(null);
          }}
        />
      )}
      {choosing && (
        <ConfirmDialog
          open
          title={`Chọn người thay cho ${who(choosing.appt)}`}
          body={`Lịch ${formatTime(choosing.appt.startAt)}, cùng giờ.`}
          confirmLabel="Đổi sang người này"
          confirmDisabled={
            !choosing.fix.candidates.some((c) => c.ok && c.staffResourceId === chosenOther)
          }
          onClose={() => setChoosing(null)}
          onConfirm={() => {
            setHandling(choosing.appt.id, { kind: 'swap', staffResourceId: chosenOther });
            setChoosing(null);
          }}
        >
          <div role="radiogroup" aria-label="Người thay" className="flex flex-col gap-(--space-2)">
            {choosing.fix.candidates.map((c) => (
              <label key={c.staffResourceId} className="sp-variant" aria-disabled={!c.ok}>
                <input
                  type="radio"
                  name={`${uid}-other`}
                  disabled={!c.ok}
                  checked={chosenOther === c.staffResourceId}
                  onChange={() => setChosenOther(c.staffResourceId)}
                />
                <span>
                  <span className="sp-variant__name">{L.name(c.staffResourceId)}</span>
                  <br />
                  <span className="sp-variant__meta">
                    {c.ok
                      ? `Trống${c.resources.length ? `, ${c.resources.join(', ')}` : ''}`
                      : (c.reason ?? 'Không trống')}
                  </span>
                </span>
                <span />
              </label>
            ))}
          </div>
        </ConfirmDialog>
      )}
      {rejecting && (
        <ConfirmDialog
          open
          tone="danger"
          title={`Từ chối đơn nghỉ của ${name}?`}
          body="Nhân viên nhận thông báo kèm lý do này."
          confirmLabel="Từ chối đơn"
          confirmDisabled={!reason.trim()}
          onClose={() => setRejecting(false)}
          onConfirm={() => {
            reject();
            setRejecting(false);
          }}
        >
          <Field
            id={`${uid}-reason`}
            label="Lý do từ chối"
            area
            error={reasonTouched && !reason.trim() ? 'Nhập lý do để nhân viên biết.' : undefined}
          >
            <textarea
              id={`${uid}-reason`}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setReasonTouched(true)}
            />
          </Field>
        </ConfirmDialog>
      )}
    </div>
  );
}
