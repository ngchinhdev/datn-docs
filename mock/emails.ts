/*
 * The emails a customer gets (MH-23), written from the sample bookings: the words, the times and
 * the money come from the same functions the pages use. Pure; imports only types and pure
 * modules, so Node can run it (scripts/check-availability.ts).
 */
import { formatVnd } from './format.ts';
import type { Appointment, ServedSubject, TenantFixture } from './fixtures/types.ts';
import { refundPercent, refundVnd, replyDeadline } from './policy.ts';
import { heldItems, modeOf, openQuestion } from './reschedule.ts';
import { addMinutes, formatDay, formatTime, localDate } from './time.ts';

/** The code the mock shows in the confirmation email and accepts on the pages (BR-16). */
export const MOCK_CODE = '482193';

export type EmailAction =
  { label: string; to: 'detail' | 'reply' | 'answer' | 'rebook' } | { label: string; to: 'ics' };

export interface EmailSample {
  id: string;
  /** "Mã xác nhận (BR-16)": the name of the template. */
  label: string;
  /** The `From:` line. */
  from: string;
  subject: string;
  /** The booking the email is about, so the buttons can point at it. */
  appointmentId: string | null;
  greeting: string;
  /** A line before the details. */
  lead: string;
  /** A big one-time code, for the confirmation email. */
  code?: string;
  rows: [string, string][];
  /** A line set apart under the rows, e.g. what the shop proposes. */
  highlight?: string;
  actions: EmailAction[];
  notes: string[];
}

const hhmm = (iso: string) => formatTime(iso);
const dayMonth = (iso: string) => {
  const date = localDate(iso);
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
};
/** `Thứ Ba 10/11`. */
const dayText = (iso: string) => formatDay(localDate(iso)).replace(',', '');
const firstName = (name: string) => name.trim().split(/\s+/).at(-1) ?? name;
const refundCode = (id: string) => {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 100_000;
  return `RF-${hash.toString(36).toUpperCase().padStart(5, '0')}`;
};

/** The bookings the samples use: the customer who has a question open, and one with a plain future booking. */
export function pickSamples(fixture: TenantFixture, now: string) {
  const live = (a: Appointment) =>
    a.customerId !== null && a.status === 'confirmed' && a.startAt >= now;
  const asked = fixture.appointments.find(
    (a) => live(a) && openQuestion(a.id, fixture.staffTimeOff, []) !== null,
  );
  const customerId = asked?.customerId ?? fixture.customers.find((c) => c.email)?.id ?? null;
  const mine = fixture.appointments
    .filter((a) => live(a) && a.customerId === customerId)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const booked = asked ?? mine[0] ?? null;
  const plain = mine.find((a) => a.id !== booked?.id) ?? booked;
  return { asked: asked ?? null, booked, plain, customerId };
}

export function buildEmails(fixture: TenantFixture, now: string): EmailSample[] {
  const { asked, booked, plain, customerId } = pickSamples(fixture, now);
  if (!booked || !plain) return [];
  const customer = fixture.customers.find((c) => c.id === customerId);
  const shop = fixture.tenant.name;
  const from = `${shop} <no-reply@sapio.vn>`;
  const hello = `Chào ${firstName(customer?.name ?? 'bạn')}`;
  const subjects: ServedSubject[] = fixture.servedSubjects;
  const named = fixture.template.vocabulary.subject !== null;
  const nameOf = (id: string) => fixture.resources.find((r) => r.id === id)?.name ?? '';

  const describe = (appt: Appointment) => {
    const group = modeOf(appt) === 'group';
    const items = heldItems(fixture, appt, subjects, named || group);
    const end = appt.bookings.reduce(
      (m, b) => (b.kind !== 'cleanup' && b.endAt > m ? b.endAt : m),
      appt.startAt,
    );
    const people = [
      ...new Set(
        items.map((it, i) =>
          it.staffChoice === 'any'
            ? nameOf(appt.items[i]?.staffResourceId ?? '')
            : nameOf(it.staffChoice),
        ),
      ),
    ].join(', ');
    return {
      items,
      when: `${hhmm(appt.startAt)}–${hhmm(end)}, ${dayText(appt.startAt)}`,
      services: items
        .map((it) =>
          it.label ? `${it.label} · ${it.service.name}` : `${it.service.name} · ${it.variant.name}`,
        )
        .join('\n'),
      people,
      price: items.reduce((m, it) => m + it.priceVnd, 0n),
    };
  };

  const policyLine = (appt: Appointment) => {
    const deposit = appt.depositVnd ?? 0n;
    const selfBy = addMinutes(
      appt.startAt,
      -fixture.template.defaultPolicies.cancelBeforeHours * 60,
    );
    const fullBy = addMinutes(appt.startAt, -24 * 60);
    return [
      `Đổi giờ hoặc hủy trên trang lịch hẹn trước ${hhmm(selfBy)} ngày ${dayMonth(selfBy)}.`,
      ...(deposit > 0n ? [`Hủy trước ${hhmm(fullBy)} ngày ${dayMonth(fullBy)} hoàn đủ cọc.`] : []),
    ].join(' ');
  };

  const emails: EmailSample[] = [];
  const b = describe(booked);
  const deposit = booked.depositVnd ?? 0n;

  emails.push({
    id: 'code',
    label: 'Mã xác nhận (BR-16)',
    from,
    subject: `Mã xác nhận đặt lịch: ${MOCK_CODE}`,
    appointmentId: null,
    greeting: '',
    lead: 'Mã xác nhận của bạn:',
    code: MOCK_CODE,
    rows: [],
    actions: [],
    notes: [
      'Mã dùng một lần, hết hạn sau 10 phút. Không đặt lịch thì bỏ qua email này; đừng đưa mã cho ai.',
    ],
  });

  emails.push({
    id: 'booked',
    label: 'Đã đặt lịch',
    from,
    subject: `Đã đặt lịch ${hhmm(booked.startAt)}, ${dayText(booked.startAt)}`,
    appointmentId: booked.id,
    greeting: hello,
    lead: 'lịch của bạn đã được xác nhận.',
    rows: [
      ['Thời gian', b.when],
      ['Dịch vụ', b.services],
      [fixture.template.vocabulary.staff, b.people],
      ...(deposit > 0n
        ? ([
            ['Đã cọc', formatVnd(deposit)],
            ['Còn trả ở tiệm', formatVnd(b.price - deposit)],
          ] as [string, string][])
        : ([['Giá', formatVnd(b.price)]] as [string, string][])),
    ],
    actions: [
      { label: 'Xem lịch hẹn', to: 'detail' },
      { label: 'Thêm vào lịch', to: 'ics' },
    ],
    notes: [policyLine(booked)],
  });

  const p = describe(plain);
  emails.push({
    id: 'remind24',
    label: 'Nhắc trước 24 giờ',
    from,
    subject: `Ngày mai bạn có lịch ${hhmm(plain.startAt)} ở ${shop}`,
    appointmentId: plain.id,
    greeting: hello,
    lead: 'nhắc bạn lịch hẹn ngày mai.',
    rows: [
      ['Thời gian', p.when],
      ['Dịch vụ', p.services],
      [fixture.template.vocabulary.staff, p.people],
    ],
    actions: [{ label: 'Xem lịch hẹn', to: 'detail' }],
    notes: [policyLine(plain)],
  });

  emails.push({
    id: 'remind2',
    label: 'Nhắc trước 2 giờ',
    from,
    subject: `Còn 2 giờ nữa tới lịch ${hhmm(plain.startAt)}`,
    appointmentId: plain.id,
    greeting: hello,
    lead: `lịch của bạn bắt đầu lúc ${hhmm(plain.startAt)}.`,
    rows: [
      ['Thời gian', p.when],
      ['Dịch vụ', p.services],
      [fixture.template.vocabulary.staff, p.people],
    ],
    actions: [{ label: 'Xem lịch hẹn', to: 'detail' }],
    notes: [
      'Còn dưới 4 giờ nên không tự đổi giờ hay hủy trên trang được. Cần thay đổi, bạn gọi tiệm.',
    ],
  });

  const oldStart = addMinutes(plain.startAt, -7 * 24 * 60);
  emails.push({
    id: 'moved',
    label: 'Đã đổi giờ',
    from,
    subject: `Đã đổi giờ: ${hhmm(plain.startAt)}, ${dayText(plain.startAt)}`,
    appointmentId: plain.id,
    greeting: hello,
    lead: 'lịch của bạn đã chuyển sang giờ mới.',
    rows: [
      ['Giờ mới', p.when],
      ['Giờ cũ', `${hhmm(oldStart)}, ${dayText(oldStart)}`],
      ['Dịch vụ', p.services],
      [fixture.template.vocabulary.staff, p.people],
      ['Giá', `${formatVnd(p.price)} · giữ như lúc đặt`],
    ],
    actions: [
      { label: 'Xem lịch hẹn', to: 'detail' },
      { label: 'Thêm vào lịch', to: 'ics' },
    ],
    notes: [policyLine(plain)],
  });

  emails.push({
    id: 'cancelled',
    label: 'Đã hủy',
    from,
    subject: `Đã hủy lịch ${hhmm(booked.startAt)}, ${dayText(booked.startAt)}`,
    appointmentId: booked.id,
    greeting: hello,
    lead: 'lịch hẹn của bạn đã được hủy.',
    rows: [
      ['Lịch đã hủy', b.when],
      ['Dịch vụ', b.services],
    ],
    actions: [{ label: 'Đặt lại', to: 'rebook' }],
    notes: [
      deposit > 0n
        ? 'Tiền cọc được hoàn theo mức hoàn của tiệm; bạn sẽ nhận một email riêng khi tiền đã hoàn.'
        : 'Hẹn gặp lại bạn.',
    ],
  });

  if (deposit > 0n) {
    const percent = refundPercent(booked.startAt, now);
    emails.push({
      id: 'refunded',
      label: 'Đã hoàn cọc',
      from,
      subject: `Đã hoàn cọc ${formatVnd(refundVnd(deposit, booked.startAt, now))}`,
      appointmentId: booked.id,
      greeting: hello,
      lead: `tiệm đã hoàn tiền cọc của lịch ${hhmm(booked.startAt)}, ${dayText(booked.startAt)}.`,
      rows: [
        ['Đã cọc', formatVnd(deposit)],
        ['Hoàn lại', `${formatVnd(refundVnd(deposit, booked.startAt, now))} (${percent}%)`],
        ['Mã hoàn', refundCode(booked.id)],
      ],
      actions: [{ label: 'Đặt lại', to: 'rebook' }],
      notes: ['Tiền về tài khoản đã chuyển. Ngân hàng xử lý trong 1 đến 3 ngày làm việc.'],
    });
  }

  // The question of the shop: a real one when the sample data has it, else the same words for
  // the first booking whose person the customer chose.
  const question = asked ? openQuestion(asked.id, fixture.staffTimeOff, []) : null;
  const target = asked ?? booked;
  const t = describe(target);
  const chosenId = target.items.find((i) => i.staffChoice === 'chosen')?.staffResourceId;
  const absent = question
    ? question.source === 'leave'
      ? question.leave.resourceId
      : question.requeue.resourceId
    : (chosenId ?? target.items[0]?.staffResourceId ?? '');
  const proposed =
    question?.handling.staffResourceId ??
    fixture.staff.find(
      (s) =>
        s.resourceId !== absent &&
        s.profile.bookableOnline &&
        target.items.every((i) =>
          s.skillServiceIds.some((id) =>
            fixture.services.some(
              (sv) => sv.id === id && sv.variants.some((v) => v.id === i.serviceVariantId),
            ),
          ),
        ),
    )?.resourceId ??
    '';
  const date = question?.source === 'leave' ? question.leave.date : localDate(target.startAt);
  const sentAt = question?.handling.sentAt ?? addMinutes(now, -60);
  const by = replyDeadline(sentAt, target.startAt);
  const title = fixture.staff.find((s) => s.resourceId === proposed)?.profile.title;
  emails.push({
    id: 'asked',
    label: 'Hỏi ý đổi người (BR-33)',
    from,
    subject: `${nameOf(absent)} nghỉ ${date.slice(8, 10)}/${date.slice(5, 7)}: bạn có đồng ý đổi sang ${nameOf(proposed)}?`,
    appointmentId: target.id,
    greeting: hello,
    lead: `${nameOf(absent)} xin nghỉ ngày ${date.slice(8, 10)}/${date.slice(5, 7)} nên không làm lịch ${hhmm(target.startAt)} của bạn được. Tiệm đề nghị:`,
    rows: [],
    highlight: `${nameOf(proposed)}${title ? ` (${title})` : ''} làm thay, cùng giờ ${t.when.split(',')[0]}, giữ giá ${formatVnd(t.price)}.`,
    actions: [
      { label: 'Đồng ý', to: 'reply' },
      { label: 'Chọn lại giờ', to: 'answer' },
    ],
    notes: [
      `Vui lòng trả lời trước ${hhmm(by)}, ${dayText(by)}. Sau thời hạn này tiệm sẽ gọi cho bạn; lịch không tự hủy.${(target.depositVnd ?? 0n) > 0n ? ` Muốn hủy thì tiệm hoàn đủ cọc ${formatVnd(target.depositVnd ?? 0n)}.` : ''}`,
    ],
  });

  return emails;
}
