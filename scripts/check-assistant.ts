/*
 * Checks the booking assistant (mock/assistant.ts, BR-06, BR-07, BR-13, BR-14, BR-67, BR-92, BT7).
 * Run: pnpm check:assistant   (Node 24 runs TypeScript directly)
 */
import {
  MAX_SLOTS,
  ask,
  assistantAvailable,
  initialState,
  limitReached,
  withDayUsedUp,
  type AskInput,
  type AssistantCard,
  type AssistantReply,
  type AssistantState,
} from '../mock/assistant.ts';
import { HOLD_MINUTES, holdState, makeHold, offerAfterExpiry } from '../mock/assistant-hold.ts';
import { freeSlots } from '../mock/availability.ts';
import { salonTocMay } from '../mock/fixtures/salon-toc-may.ts';
import { spaThuCungPawpaw } from '../mock/fixtures/spa-thu-cung-pawpaw.ts';
import type { TenantFixture } from '../mock/fixtures/types.ts';
import { formatDuration, formatVnd } from '../mock/format.ts';
import { bookingWindow } from '../mock/policy.ts';
import { addMinutes, formatTime, MOCK_NOW, MOCK_TODAY } from '../mock/time.ts';

let failures = 0;
const report = (ok: boolean, name: string, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`);
};

/** BR-92: what the assistant writes holds no price and no time; those live in the cards. */
const leaksFigures = (text: string) =>
  /\d[\d.,]*\s*(₫|đ|vnd|nghìn|k\b)/i.test(text) ||
  /\d{1,2}\s*(:|h(?![a-zà-ỹ])|giờ|phút)/i.test(text);

/** Plays a chat: each message goes through `ask` with the state the one before left. */
function chat(
  fixture: TenantFixture,
  messages: (string | AskInput)[],
  start: AssistantState = initialState(MOCK_NOW),
  now = MOCK_NOW,
) {
  let state = start;
  const replies: AssistantReply[] = [];
  for (const m of messages) {
    const result = ask(fixture, state, typeof m === 'string' ? { text: m } : m, now);
    state = result.state;
    replies.push(result.reply);
  }
  return { state, replies, last: replies.at(-1)! };
}

const card = <K extends AssistantCard['kind']>(reply: AssistantReply, kind: K) =>
  reply.cards.find((c): c is Extract<AssistantCard, { kind: K }> => c.kind === kind);

const may = salonTocMay;
const paw = spaThuCungPawpaw;

// ---- Price: the numbers come from the card (BR-92) ----
{
  const { last } = chat(may, ['Nhuộm tóc ngắn bao nhiêu tiền?']);
  const service = card(last, 'service');
  const line = service?.lines[0];
  report(
    service?.lines.length === 1 &&
      line?.priceVnd === 500_000n &&
      line.minutes === 105 &&
      line.depositVnd === 100_000n,
    'BR-92: "Nhuộm tóc ngắn bao nhiêu tiền?" ra thẻ 500.000 ₫, 1 giờ 45 phút, cọc 100.000 ₫',
    line ? `${formatVnd(line.priceVnd)} ${formatDuration(line.minutes)}` : last.intent,
  );
  report(!leaksFigures(last.text), 'BR-92: câu chữ trả lời giá không chứa số tiền', last.text);
  report(
    line?.topPriceVnd === 550_000n,
    'BR-56: thẻ có giá của thợ bậc cao nhất trong số người nhận đặt online',
    String(line?.topPriceVnd),
  );
}

{
  const { last } = chat(may, ['Tôi muốn hỏi giá cắt tóc ngắn']);
  const line = card(last, 'service')?.lines[0];
  report(
    last.intent === 'price' && line?.priceVnd === 150_000n,
    'BR-92: "Tôi muốn hỏi giá cắt tóc ngắn" ra thẻ giá, "tôi" không phải buổi tối',
    last.intent,
  );
  const plain = chat(may, ['toi muon hoi gia cat toc ngan']).last;
  report(
    plain.intent === 'price',
    'BR-92: "toi" không dấu đứng một mình cũng không phải buổi tối',
    plain.intent,
  );
}

// ---- Free times ----
{
  const { last } = chat(may, ['Chiều nay cắt tóc ngắn còn giờ không?']);
  const slots = card(last, 'slots');
  const service = may.services.find((s) => s.id === slots?.serviceId);
  const variant = service?.variants.find((v) => v.id === slots?.variantId);
  const expected = variant
    ? [
        ...new Set(
          freeSlots({
            fixture: may,
            variant,
            serviceId: service!.id,
            date: MOCK_TODAY,
            staffResourceId: 'any',
            channel: 'online',
            now: MOCK_NOW,
            ...bookingWindow(may.policies, MOCK_NOW),
          })
            .map((s) => s.startAt)
            .filter((t) => formatTime(t) >= '12:00'),
        ),
      ].slice(0, MAX_SLOTS)
    : [];
  const got = slots?.slots.map((s) => s.startAt) ?? [];
  report(
    got.length > 0 &&
      got.length <= MAX_SLOTS &&
      got.join() === expected.join() &&
      got.every((t) => formatTime(t) >= '12:00'),
    'BR-06, BR-14: "Chiều nay cắt tóc ngắn còn giờ không?" ra đúng các giờ của freeSlots sau 12:00, tối đa 6',
    got.map(formatTime).join(' '),
  );
  report(!leaksFigures(last.text), 'BR-92: câu chữ trả lời giờ không chứa giờ', last.text);

  const mai = may.staff.find((s) => s.profile.displayName === 'Mai')!;
  const second = chat(may, ['Chiều nay cắt tóc ngắn còn giờ không?', 'Có thợ Mai không?']).last;
  const maiCard = card(second, 'slots');
  report(
    maiCard !== undefined &&
      maiCard.staffName === 'Mai' &&
      maiCard.slots.length > 0 &&
      maiCard.slots.every((s) => s.staffResourceId === mai.resourceId),
    'BR-14: "Có thợ Mai không?" chỉ còn giờ của Mai',
    maiCard?.slots.map((s) => formatTime(s.startAt)).join(' '),
  );
}

// ---- A subject decides the variant (BR-13) ----
{
  const { replies, last } = chat(paw, ['Tắm cho chó bao nhiêu?', 'Poodle, 6 kg']);
  const first = replies[0]!;
  report(
    first.intent === 'ask' &&
      first.cards.length === 0 &&
      first.suggestions.length === paw.services[0]!.variants.length &&
      /cân nặng/.test(first.text),
    'BR-13: Pawpaw "Tắm cho chó bao nhiêu?" hỏi lại cân nặng kèm gợi ý, chưa nói giá',
    first.text,
  );
  const line = card(last, 'service')?.lines[0];
  report(
    card(last, 'service')?.lines.length === 1 &&
      line?.priceVnd === 150_000n &&
      line.name === 'Chó dưới 10 kg',
    'BR-13: "Poodle, 6 kg" ra Tắm chó nhỏ 150.000 ₫',
    line ? `${line.name} ${formatVnd(line.priceVnd)}` : last.intent,
  );
  const cat = chat(paw, ['Tắm cho mèo bao nhiêu?']).last;
  report(
    card(cat, 'service')?.lines[0]?.priceVnd === 180_000n,
    'BR-13: "Tắm cho mèo" ra đúng một biến thể, 180.000 ₫',
  );
  const large = chat(paw, ['Tắm cho chó bao nhiêu?', 'Bé nặng 12 kg']).last;
  report(
    card(large, 'service')?.lines[0]?.priceVnd === 250_000n,
    'BR-13: chó 12 kg ra Tắm chó lớn 250.000 ₫',
  );
}

// ---- Reception (BR-92) ----
{
  const out = chat(may, ['Tóc mình tẩy 2 lần rồi, nhuộm xanh rêu có bị hư không?']).last;
  const reception = card(out, 'reception');
  report(
    out.intent === 'reception' && reception !== undefined && reception.phone.display !== '',
    'BR-92: câu ngoài phạm vi ra thẻ lễ tân với số điện thoại của chi nhánh',
    out.text,
  );
  const twice = chat(may, ['asdf qwer', 'zxcv uiop']);
  report(
    twice.replies[0]!.intent === 'unknown' &&
      card(twice.replies[0]!, 'reception') === undefined &&
      card(twice.last, 'reception') !== undefined,
    'BR-92: không hiểu hai lần liền ra thẻ lễ tân; lần đầu chưa',
  );
  const afterHours = card(
    chat(may, ['Gặp lễ tân'], undefined, '2026-11-07T15:00:00Z').last,
    'reception',
  );
  report(
    afterHours?.open === false && afterHours.reopensTime !== undefined,
    'BR-92: ngoài giờ mở cửa thẻ lễ tân nói giờ mở lại',
    `${afterHours?.reopensDate} ${afterHours?.reopensTime}`,
  );
}

// ---- Out of the assistant's reach ----
{
  const group = chat(may, ['Mình đặt cắt tóc và nhuộm tóc cùng lúc']).last;
  report(
    group.intent === 'link' && group.links.some((l) => l.href.endsWith('/book')),
    'BR-92: nhiều dịch vụ thì đưa link sang trang đặt lịch',
  );
  const cancel = chat(may, ['Mình muốn hủy lịch']).last;
  report(
    cancel.intent === 'link' && cancel.links.some((l) => l.href.endsWith('/me')),
    'BR-92: hủy lịch thì đưa link sang Lịch của tôi',
  );
}

// ---- Turns (BR-67) ----
{
  const limit = may.config.chatbot.perCustomerPerDay;
  let state = initialState(MOCK_NOW);
  for (let i = 0; i < limit; i++) state = chat(may, ['Bảng giá dịch vụ'], state).state;
  report(
    state.usage.sent === limit && limitReached(may.config.chatbot, state, MOCK_NOW) === 'day',
    `BR-67: sau ${limit} câu trong ngày thì hết lượt ngày`,
  );
  const blocked = chat(may, ['Bảng giá dịch vụ'], state);
  report(
    blocked.last.intent === 'limit' &&
      card(blocked.last, 'limit')?.reason === 'day' &&
      blocked.state.usage.sent === limit &&
      blocked.last.cards.length === 1,
    `BR-67: câu thứ ${limit + 1} ra thẻ hết lượt, không xử lý và không tính thêm`,
  );
  const button = chat(may, [{ text: 'Bảng giá dịch vụ', free: true }], state);
  report(
    button.last.intent === 'priceList' && button.state.usage.sent === limit,
    'BR-67: bấm nút trong thẻ không tính lượt và không bị chặn',
  );
  const tomorrow = '2026-11-08T03:20:00Z';
  report(
    limitReached(may.config.chatbot, state, tomorrow) === null,
    'BR-67: lượt ngày tính lại lúc 00:00 giờ chi nhánh',
  );
  const nearly: TenantFixture = {
    ...may,
    config: {
      ...may.config,
      chatbot: { ...may.config.chatbot, usedThisMonth: may.config.chatbot.perShopPerMonth },
    },
  };
  const monthly = chat(nearly, ['Bảng giá dịch vụ']).last;
  report(
    monthly.intent === 'limit' && card(monthly, 'limit')?.reason === 'month',
    'BR-67: lượt tháng của cơ sở hết thì cũng ra thẻ hết lượt',
  );
  const tool = withDayUsedUp(initialState(MOCK_NOW), may.config.chatbot, MOCK_NOW);
  report(
    limitReached(may.config.chatbot, tool, MOCK_NOW) === 'day',
    'BR-67: công cụ mock "Dùng hết lượt hôm nay" đặt số lượt bằng giới hạn',
  );
}

// ---- The button (BR-92) ----
{
  const on = { enabled: true, planHasChatbot: true, suspended: false };
  report(
    assistantAvailable({ ...on, page: 'home' }),
    'BR-92: bật chatbot, gói có, hiện nút ở trang cơ sở',
  );
  report(
    assistantAvailable({ ...on, page: 'service' }) &&
      assistantAvailable({ ...on, page: 'datetime' }),
    'BR-92: hiện nút ở bước Dịch vụ và Ngày giờ',
  );
  report(
    (['info', 'confirm', 'deposit'] as const).every((page) => !assistantAvailable({ ...on, page })),
    'BR-92: ẩn nút ở Thông tin liên hệ, Xác nhận, Trả cọc',
  );
  report(
    !assistantAvailable({ ...on, planHasChatbot: false, page: 'home' }),
    'BR-92: gói Cơ bản không có nút',
  );
  report(
    !assistantAvailable({ ...on, enabled: false, page: 'home' }),
    'BR-92: chatbot tắt không có nút',
  );
  report(
    !assistantAvailable({ ...on, suspended: true, page: 'home' }),
    'BR-79, BR-82: trang tạm dừng không có nút',
  );
}

// ---- The hold (BR-07, BR-92) ----
{
  const asked = chat(may, ['Chiều nay cắt tóc ngắn còn giờ không?', 'Có thợ Mai không?']).last;
  const slots = card(asked, 'slots')!;
  const [first, second] = slots.slots;
  const typed = chat(may, [
    'Chiều nay cắt tóc ngắn còn giờ không?',
    'Có thợ Mai không?',
    `Lấy ${formatTime(first!.startAt)} nhé`,
  ]).last;
  report(
    typed.intent === 'pick' &&
      typed.pick?.slot.startAt === first!.startAt &&
      !leaksFigures(typed.text),
    'BR-92: khách gõ một giờ của thẻ thì trợ lý giữ giờ đó như bấm nút, không tự đặt',
  );
  const base = {
    fixture: may,
    serviceId: slots.serviceId,
    variantId: slots.variantId,
    staffChoice: slots.staffResourceId,
    now: MOCK_NOW,
  };
  const held = makeHold({ ...base, appointmentId: 'h1', slot: first! });
  report(
    held !== null &&
      held.appointment.status === 'held' &&
      held.appointment.customerId === null &&
      held.appointment.holdExpiresAt === addMinutes(MOCK_NOW, HOLD_MINUTES) &&
      held.appointment.startAt === first!.startAt,
    'BR-07: chọn một giờ trong thẻ tạo giữ chỗ 10 phút, chưa có khách, chưa phải lịch xác nhận',
  );
  const withHold: TenantFixture = {
    ...may,
    appointments: [...may.appointments, held!.appointment],
  };
  report(
    makeHold({ ...base, fixture: withHold, appointmentId: 'h2', slot: first! }) === null,
    'BR-01, BR-07: giờ đang được giữ thì người khác không giữ được',
  );
  const swapped = makeHold({
    ...base,
    fixture: withHold,
    appointmentId: 'h2',
    slot: second!,
    replaces: 'h1',
  });
  const backFirst = makeHold({
    ...base,
    fixture: withHold,
    appointmentId: 'h3',
    slot: first!,
    replaces: 'h1',
  });
  report(
    swapped !== null && backFirst !== null,
    'BR-92: giữ giờ khác thì trả giờ cũ (giờ cũ giữ lại được khi thay chính giữ chỗ đó)',
  );
  const live = held!.appointment;
  const later = addMinutes(MOCK_NOW, HOLD_MINUTES);
  report(
    holdState(live, addMinutes(later, -1)) === 'active' &&
      holdState(live, later) === 'returned' &&
      holdState(undefined, MOCK_NOW) === 'returned' &&
      holdState({ ...live, status: 'confirmed' }, later) === 'used',
    'BR-07: giữ chỗ quá 10 phút thì hết hạn; chuyển thành lịch xác nhận thì là đã dùng',
  );
  const afterwards = offerAfterExpiry(
    withHold,
    {
      serviceId: slots.serviceId,
      variantId: slots.variantId,
      staffChoice: slots.staffResourceId,
      slot: first!,
    },
    addMinutes(later, 1),
  );
  report(
    afterwards !== null && afterwards.slots.length > 0 && afterwards.slots.length <= 3,
    'BR-07: hết giờ giữ thì trợ lý đưa các giờ còn trống của thợ đó',
    afterwards?.slots.map((x) => formatTime(x.startAt)).join(' '),
  );
  const booked = withHold.appointments.filter((a) => a.id === 'h1' && a.status === 'confirmed');
  report(booked.length === 0, 'BR-16, BR-92: giữ chỗ không tạo lịch xác nhận');
}

// ---- The assistant books nothing (BR-16, BR-92) ----
{
  const replies = [
    chat(may, [
      'Nhuộm tóc ngắn bao nhiêu?',
      'Chiều nay còn giờ không?',
      'Đặt giúp mình giờ đầu tiên',
    ]),
    chat(paw, ['Tắm cho mèo', 'Ngày mai còn giờ không?']),
  ];
  const wrote = replies.some((r) =>
    r.replies.some((reply) => reply.cards.some((c) => c.kind === 'booked')),
  );
  report(!wrote, 'BR-16, BR-92: không ca nào trợ lý tạo thẻ "Đã đặt lịch" hay lịch hẹn');
}

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} lỗi.`);
process.exit(failures === 0 ? 0 : 1);
