// View models for the receptionist screens. Pure functions over fixtures; no React.
import type { CalendarColumn } from '@/components/sapio/resource-calendar';
import type { BlockSegment } from '@/components/sapio/appointment-block';
import type { Appointment, ResourceBooking, TenantFixture } from './fixtures';
import { formatVnd } from './format';
import { staffOf } from './move';
import { formatCountdown, formatRange, localDate } from './time';

type Block = CalendarColumn['blocks'][number];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const unique = <T>(xs: T[]) => [...new Set(xs)];
const byStart = (a: { startAt: string }, b: { startAt: string }) =>
  a.startAt.localeCompare(b.startAt);

export function lookups(fixture: TenantFixture) {
  const staffTypeIds = new Set(fixture.resourceTypes.filter((t) => t.isStaff).map((t) => t.id));
  const resource = (id: string) => fixture.resources.find((r) => r.id === id);
  const isStaff = (id: string) => staffTypeIds.has(resource(id)?.resourceTypeId ?? '');
  const name = (id: string) => resource(id)?.name ?? id;
  const variant = (id: string) =>
    fixture.services
      .flatMap((s) => s.variants.map((v) => ({ ...v, service: s })))
      .find((v) => v.id === id);
  const customer = (appt: Appointment) => fixture.customers.find((c) => c.id === appt.customerId);
  const who = (appt: Appointment) => customer(appt)?.callName ?? 'Khách đang đặt online';
  const services = (appt: Appointment) =>
    appt.items.map((i) => variant(i.serviceVariantId)?.shortName ?? '').join(', ');
  return { isStaff, name, variant, customer, who, services, resource };
}

export type Lookups = ReturnType<typeof lookups>;

export function dayAppointments(appointments: Appointment[], date: string) {
  return appointments
    .filter((a) => a.status !== 'cancelled' && localDate(a.startAt) === date)
    .sort(byStart);
}

/** When the customer is done: the end of the last segment they see, not the cleanup (BR-51). */
export function appointmentEnd(appt: Appointment) {
  return appt.bookings
    .filter((b) => b.kind === 'work' || b.kind === 'wait')
    .reduce((end, b) => (b.endAt > end ? b.endAt : end), appt.startAt);
}

const isBuffer = (b: ResourceBooking) => b.kind === 'prep' || b.kind === 'cleanup';

export function holdSecondsLeft(appt: Appointment, now: string) {
  return appt.holdExpiresAt ? (Date.parse(appt.holdExpiresAt) - Date.parse(now)) / 1000 : 0;
}

/** Holds that ran out are gone from every view (BR-07). */
export const isLive = (appt: Appointment, now: string) =>
  appt.status !== 'held' || holdSecondsLeft(appt, now) > 0;

/** Items this staff member does; all items when `staffId` is omitted. */
const itemsOf = (appt: Appointment, staffId?: string) =>
  appt.items.flatMap((item, i) => (!staffId || item.staffResourceId === staffId ? [i] : []));

function otherResources(appt: Appointment, L: Lookups, staffId?: string) {
  const mine = itemsOf(appt, staffId);
  return unique(
    appt.bookings
      .filter((b) => !L.isStaff(b.resourceId) && mine.includes(b.itemIndex))
      .map((b) => b.resourceId),
  ).map(L.name);
}

/**
 * Staff view: the staff's work segments, gaps between them drawn as waits (BR-05), preparation
 * and cleanup as dashed buffers (BR-04).
 */
function staffSegments(appt: Appointment, staffId: string): BlockSegment[] {
  const work = appt.bookings.filter((b) => b.resourceId === staffId).sort(byStart);
  const segments: BlockSegment[] = [];
  work.forEach((b, i) => {
    const prev = work[i - 1];
    if (isBuffer(b)) {
      segments.push({
        startAt: b.startAt,
        endAt: b.endAt,
        kind: 'buffer',
        ...(b.label ? { note: capitalize(b.label) } : {}),
      });
      return;
    }
    if (prev && prev.endAt < b.startAt) {
      const label = appt.bookings.find(
        (x) => x.kind === 'wait' && x.startAt <= prev.endAt && x.endAt >= b.startAt,
      )?.label;
      segments.push({
        startAt: prev.endAt,
        endAt: b.startAt,
        kind: 'wait',
        ...(label ? { note: capitalize(label) } : {}),
      });
    }
    const last = segments.at(-1);
    if (last && last.kind === 'work' && last.endAt === b.startAt) last.endAt = b.endAt;
    else segments.push({ startAt: b.startAt, endAt: b.endAt, kind: 'work' });
  });
  return segments;
}

const within = (inner: BlockSegment[], outer: BlockSegment[]) => {
  const seen = inner.filter((s) => s.kind !== 'buffer');
  const start = seen[0]?.startAt ?? '';
  const end = seen.at(-1)?.endAt ?? '';
  return outer.some((s) => s.kind === 'wait' && s.startAt <= start && s.endAt >= end);
};

export function staffColumns(
  fixture: TenantFixture,
  appts: Appointment[],
  now: string,
  selectedId: string | null,
  onSelect: (id: string) => void,
  date?: string,
): CalendarColumn[] {
  const L = lookups(fixture);
  return fixture.staff.map((s) => {
    const off = fixture.staffTimeOff.find(
      (t) => t.resourceId === s.resourceId && t.date === date && t.status === 'approved' && !t.from,
    );
    const mine = appts.filter(
      (a) => isLive(a, now) && a.bookings.some((b) => b.resourceId === s.resourceId),
    );
    const segs = new Map(mine.map((a) => [a.id, staffSegments(a, s.resourceId)]));
    const blocks: Block[] = mine.map((appt) => {
      const segments = segs.get(appt.id) ?? [];
      const inset = mine.some((o) => o.id !== appt.id && within(segments, segs.get(o.id) ?? []));
      const covered = mine.some((o) => o.id !== appt.id && within(segs.get(o.id) ?? [], segments));
      const staffName = L.name(s.resourceId);
      const others = otherResources(appt, L, s.resourceId).join(', ');
      const seen = segments.filter((seg) => seg.kind !== 'buffer');
      const start = seen[0]?.startAt ?? appt.startAt;
      const end = seen.at(-1)?.endAt ?? appt.startAt;
      const short = Date.parse(end) - Date.parse(start) <= 30 * 60_000;
      const range = formatRange(start, end);
      const mineItems = itemsOf(appt, s.resourceId);
      const services = appt.items
        .filter((_, i) => mineItems.includes(i))
        .map((i) => L.variant(i.serviceVariantId)?.shortName ?? '')
        .join(', ');
      let title = `${L.who(appt)} · ${services}`;
      let meta: string | undefined = `${range} · ${others}`;
      // BR-32: the person was changed and the customer has not answered.
      const unconfirmed = appt.items.some(
        (i) => i.staffResourceId === s.resourceId && i.swapUnconfirmed,
      );
      if (appt.status === 'held') {
        title = 'Đang giữ chỗ · đặt online';
        meta = `${range} · ${others} · còn ${formatCountdown(holdSecondsLeft(appt, now))}`;
      } else if (appt.status === 'no_show') {
        meta = `Không đến · ${others} đã trả`;
      } else if (short) {
        title = `${title} · ${others}`;
        meta = undefined;
      }
      if (unconfirmed) {
        if (meta) meta = `${meta} · Chưa xác nhận đổi người`;
        else title = `${title} · Chưa xác nhận đổi người`;
      }
      return {
        id: appt.id,
        appointmentId: appt.id,
        draggable: appt.status === 'confirmed' && staffOf(appt).length === 1,
        status: appt.status,
        title,
        ...(meta ? { meta } : {}),
        inset,
        selected: appt.id === selectedId,
        onSelect: () => onSelect(appt.id),
        segments: segments.map((seg) =>
          seg.kind === 'wait' && seg.note && !covered
            ? { ...seg, note: `${seg.note} · ${staffName} rảnh` }
            : seg.kind === 'buffer'
              ? seg
              : { ...seg, note: undefined },
        ) as BlockSegment[],
      };
    });
    return {
      id: s.resourceId,
      name: s.profile.displayName,
      kind: `${s.profile.title} · ${mine.length} lịch`,
      label: `${s.profile.displayName}, ${s.profile.title}, ${off ? 'nghỉ' : `${mine.length} lịch hẹn`}`,
      ...(off ? { offLabel: `Nghỉ · ${off.reason}` } : {}),
      blocks,
    };
  });
}

/** Contiguous runs of one resource's bookings within one appointment. */
function runs(bookings: ResourceBooking[]) {
  const out: { startAt: string; endAt: string; parts: ResourceBooking[] }[] = [];
  for (const b of [...bookings].sort(byStart)) {
    const last = out.at(-1);
    if (last && last.endAt >= b.startAt) {
      if (b.endAt > last.endAt) last.endAt = b.endAt;
      last.parts.push(b);
    } else out.push({ startAt: b.startAt, endAt: b.endAt, parts: [b] });
  }
  return out;
}

/** The resource is busy throughout, so waits read as work; prep and cleanup stay dashed. */
function runSegments(parts: ResourceBooking[], waitLabel: string | undefined): BlockSegment[] {
  const segments: BlockSegment[] = [];
  for (const part of parts) {
    const kind = isBuffer(part) ? 'buffer' : 'work';
    const last = segments.at(-1);
    if (kind === 'work' && last?.kind === 'work') last.endAt = part.endAt;
    else {
      segments.push({
        startAt: part.startAt,
        endAt: part.endAt,
        kind,
        ...(kind === 'buffer' && part.label ? { note: capitalize(part.label) } : {}),
      });
    }
  }
  const work = segments.find((seg) => seg.kind === 'work');
  if (work && waitLabel) work.note = `Bận suốt, kể cả lúc ${waitLabel}`;
  return segments;
}

export function resourceColumns(
  fixture: TenantFixture,
  appts: Appointment[],
  now: string,
  selectedId: string | null,
  onSelect: (id: string) => void,
): CalendarColumn[] {
  const L = lookups(fixture);
  const typeName = (id: string) => fixture.resourceTypes.find((t) => t.id === id)?.name ?? '';
  // A no-show gives its resources back.
  const live = appts.filter((a) => isLive(a, now) && a.status !== 'no_show');
  return fixture.resources
    .filter((r) => !L.isStaff(r.id))
    .map((r) => {
      const blocks: Block[] = live.flatMap((appt) =>
        runs(appt.bookings.filter((b) => b.resourceId === r.id)).map((run) => {
          const item = appt.items[run.parts[0]?.itemIndex ?? 0];
          const staffName = item ? L.name(item.staffResourceId) : '';
          const waitLabel = run.parts.find((p) => p.kind === 'wait')?.label;
          const range = formatRange(run.startAt, run.endAt);
          const held = appt.status === 'held';
          // A short part with a buffer beside it has room for one line: the resource goes in the title.
          const seen = run.parts.filter((part) => !isBuffer(part));
          const seenMinutes =
            ((seen.at(-1) ? Date.parse(seen.at(-1)!.endAt) : 0) -
              (seen[0] ? Date.parse(seen[0].startAt) : 0)) /
            60_000;
          const oneLine = !held && seen.length < run.parts.length && seenMinutes <= 30;
          const title = held
            ? 'Đang giữ chỗ'
            : `${L.who(appt)} · ${item ? (L.variant(item.serviceVariantId)?.shortName ?? '') : ''}${oneLine ? ` · ${staffName}` : ''}`;
          return {
            id: `${appt.id}-${run.startAt}`,
            status: appt.status,
            title,
            ...(oneLine
              ? {}
              : {
                  meta: held
                    ? `${range} · ${staffName} · còn ${formatCountdown(holdSecondsLeft(appt, now))}`
                    : `${range} · ${staffName}`,
                }),
            selected: appt.id === selectedId,
            onSelect: () => onSelect(appt.id),
            segments: runSegments(run.parts, waitLabel),
          };
        }),
      );
      return {
        id: r.id,
        name: r.name,
        kind: typeName(r.resourceTypeId),
        label: `${r.name}, ${typeName(r.resourceTypeId)}, ${blocks.length} lịch hẹn`,
        blocks,
      };
    });
}

/** Non-staff resources with nothing booked at `now`. */
export function freeResourcesAt(fixture: TenantFixture, appts: Appointment[], now: string) {
  const L = lookups(fixture);
  const busy = new Set(
    appts
      .filter((a) => isLive(a, now) && a.status !== 'no_show')
      .flatMap((a) => a.bookings)
      .filter((b) => b.startAt <= now && now < b.endAt)
      .map((b) => b.resourceId),
  );
  return fixture.resources.filter((r) => !L.isStaff(r.id) && !busy.has(r.id)).map((r) => r.name);
}

export interface DetailLine {
  range: string;
  text: string;
  wait: boolean;
  /** Preparation or cleanup: the resource is busy but the customer is not there (BR-51). */
  buffer: boolean;
}

export function appointmentDetail(fixture: TenantFixture, appt: Appointment) {
  const L = lookups(fixture);
  const items = appt.items.map((item, index) => {
    const v = L.variant(item.serviceVariantId);
    const mine = appt.bookings.filter((b) => b.itemIndex === index);
    const intervals = unique(mine.map((b) => `${b.startAt}|${b.endAt}`)).sort();
    const lines: DetailLine[] = intervals.map((key) => {
      const [startAt = '', endAt = ''] = key.split('|');
      const here = mine.filter((b) => b.startAt === startAt && b.endAt === endAt);
      const wait = here.find((b) => b.kind === 'wait');
      const buffer = here.find(isBuffer);
      const names = here
        .sort((a, b) => Number(L.isStaff(b.resourceId)) - Number(L.isStaff(a.resourceId)))
        .map((b) => L.name(b.resourceId))
        .join(', ');
      return {
        range: formatRange(startAt, endAt),
        text: wait
          ? `${names} · ${wait.label ?? 'chờ'}, ${L.name(item.staffResourceId)} rảnh`
          : buffer
            ? `${names} · ${buffer.kind === 'prep' ? `${buffer.label ?? 'chuẩn bị'}, trước giờ hẹn` : 'dọn sau khi dùng'}`
            : names,
        wait: Boolean(wait),
        buffer: Boolean(buffer && !wait),
      };
    });
    return {
      title: v ? `${v.service.name} · ${v.name}` : '',
      price: formatVnd(item.priceVnd),
      lines,
    };
  });
  const total = appt.items.reduce((sum, i) => sum + i.priceVnd, 0n);
  const deposit = appt.depositVnd ?? 0n;
  return {
    items,
    total,
    deposit,
    // Nothing is collected for a settled, cancelled or no-show appointment.
    due:
      appt.settled || appt.status === 'cancelled' || appt.status === 'no_show'
        ? 0n
        : total - deposit,
    commission: unique(appt.items.map((i) => L.name(i.staffResourceId))).join(', '),
    channel: { online: 'Trang đặt lịch', walk_in: 'Tại quầy', phone: 'Điện thoại' }[appt.channel],
  };
}
