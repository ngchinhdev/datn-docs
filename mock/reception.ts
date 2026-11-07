// View models for the receptionist screens. Pure functions over fixtures; no React.
import type { CalendarColumn } from '@/components/sapio/resource-calendar';
import type { BlockSegment } from '@/components/sapio/appointment-block';
import type { Appointment, ResourceBooking, TenantFixture } from './fixtures';
import { formatVnd } from './format';
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

export function appointmentEnd(appt: Appointment) {
  return appt.bookings.reduce((end, b) => (b.endAt > end ? b.endAt : end), appt.startAt);
}

export function holdSecondsLeft(appt: Appointment, now: string) {
  return appt.holdExpiresAt ? (Date.parse(appt.holdExpiresAt) - Date.parse(now)) / 1000 : 0;
}

/** Holds that ran out are gone from every view (BR-07). */
export const isLive = (appt: Appointment, now: string) =>
  appt.status !== 'held' || holdSecondsLeft(appt, now) > 0;

function otherResources(appt: Appointment, L: Lookups) {
  return unique(appt.bookings.filter((b) => !L.isStaff(b.resourceId)).map((b) => b.resourceId)).map(
    L.name,
  );
}

/** Staff view: the staff's work segments, gaps between them drawn as waits (BR-05). */
function staffSegments(appt: Appointment, staffId: string): BlockSegment[] {
  const work = appt.bookings.filter((b) => b.resourceId === staffId).sort(byStart);
  const segments: BlockSegment[] = [];
  work.forEach((b, i) => {
    const prev = work[i - 1];
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
  const start = inner[0]?.startAt ?? '';
  const end = inner.at(-1)?.endAt ?? '';
  return outer.some((s) => s.kind === 'wait' && s.startAt <= start && s.endAt >= end);
};

export function staffColumns(
  fixture: TenantFixture,
  appts: Appointment[],
  now: string,
  selectedId: string | null,
  onSelect: (id: string) => void,
): CalendarColumn[] {
  const L = lookups(fixture);
  return fixture.staff.map((s) => {
    const mine = appts.filter(
      (a) => isLive(a, now) && a.bookings.some((b) => b.resourceId === s.resourceId),
    );
    const segs = new Map(mine.map((a) => [a.id, staffSegments(a, s.resourceId)]));
    const blocks: Block[] = mine.map((appt) => {
      const segments = segs.get(appt.id) ?? [];
      const inset = mine.some((o) => o.id !== appt.id && within(segments, segs.get(o.id) ?? []));
      const covered = mine.some((o) => o.id !== appt.id && within(segs.get(o.id) ?? [], segments));
      const staffName = L.name(s.resourceId);
      const others = otherResources(appt, L).join(', ');
      const start = segments[0]?.startAt ?? appt.startAt;
      const end = segments.at(-1)?.endAt ?? appt.startAt;
      const short = Date.parse(end) - Date.parse(start) <= 30 * 60_000;
      const range = formatRange(start, end);
      let title = `${L.who(appt)} · ${L.services(appt)}`;
      let meta: string | undefined = `${range} · ${others}`;
      if (appt.status === 'held') {
        title = 'Đang giữ chỗ · đặt online';
        meta = `${range} · ${others} · còn ${formatCountdown(holdSecondsLeft(appt, now))}`;
      } else if (appt.status === 'no_show') {
        meta = `Không đến · ${others} đã trả`;
      } else if (short) {
        title = `${title} · ${others}`;
        meta = undefined;
      }
      return {
        id: appt.id,
        status: appt.status,
        title,
        ...(meta ? { meta } : {}),
        inset,
        selected: appt.id === selectedId,
        onSelect: () => onSelect(appt.id),
        segments: segments.map((seg) =>
          seg.kind === 'wait' && seg.note && !covered
            ? { ...seg, note: `${seg.note} · ${staffName} rảnh` }
            : { ...seg, note: undefined },
        ) as BlockSegment[],
      };
    });
    return {
      id: s.resourceId,
      name: s.profile.displayName,
      kind: `${s.profile.title} · ${mine.length} lịch`,
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
          return {
            id: `${appt.id}-${run.startAt}`,
            status: appt.status,
            title: held
              ? 'Đang giữ chỗ'
              : `${L.who(appt)} · ${item ? (L.variant(item.serviceVariantId)?.shortName ?? '') : ''}`,
            meta: held
              ? `${range} · ${staffName} · còn ${formatCountdown(holdSecondsLeft(appt, now))}`
              : `${range} · ${staffName}`,
            selected: appt.id === selectedId,
            onSelect: () => onSelect(appt.id),
            segments: [
              {
                startAt: run.startAt,
                endAt: run.endAt,
                kind: 'work',
                ...(waitLabel ? { note: `Bận suốt, kể cả lúc ${waitLabel}` } : {}),
              },
            ],
          };
        }),
      );
      return { id: r.id, name: r.name, kind: typeName(r.resourceTypeId), blocks };
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
      const names = here
        .sort((a, b) => Number(L.isStaff(b.resourceId)) - Number(L.isStaff(a.resourceId)))
        .map((b) => L.name(b.resourceId))
        .join(', ');
      return {
        range: formatRange(startAt, endAt),
        text: wait
          ? `${names} · ${wait.label ?? 'chờ'}, ${L.name(item.staffResourceId)} rảnh`
          : names,
        wait: Boolean(wait),
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
    due: appt.settled ? 0n : total - deposit,
    commission: unique(appt.items.map((i) => L.name(i.staffResourceId))).join(', '),
    channel: { online: 'Trang đặt lịch', walk_in: 'Tại quầy', phone: 'Điện thoại' }[appt.channel],
  };
}
