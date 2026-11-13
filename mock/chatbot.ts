/*
 * What Cài đặt › Chatbot shows: the limits (BR-67), the greeting, and a sample exchange whose
 * numbers come from the system, never from the assistant's own mind. Pure; imports only types and
 * pure modules, so Node can run it (scripts/check-shop.ts).
 */
import { ANY_STAFF, freeSlots } from './availability.ts';
import type { ChatbotSettings, TenantFixture } from './fixtures/types.ts';
import { formatDuration, formatVnd } from './format.ts';
import { visibleMinutes } from './occupation.ts';
import { bookingWindow } from './policy.ts';
import { branchPhone } from './site.ts';
import { localDate, formatTime } from './time.ts';

/** The greeting is one or two sentences: at most this many characters. */
export const GREETING_MAX = 200;

/** Why the settings cannot be saved, or `null` (BR-67). */
export function chatbotProblem(
  s: Pick<ChatbotSettings, 'greeting' | 'perCustomerPerDay' | 'perShopPerMonth'>,
) {
  if (s.greeting.trim() === '') return 'Nhập lời chào.';
  if (s.greeting.length > GREETING_MAX) return `Lời chào tối đa ${GREETING_MAX} ký tự.`;
  if (!Number.isInteger(s.perCustomerPerDay) || s.perCustomerPerDay < 1) {
    return 'Giới hạn mỗi khách mỗi ngày từ 1 lượt trở lên.';
  }
  if (!Number.isInteger(s.perShopPerMonth) || s.perShopPerMonth < 1) {
    return 'Giới hạn cả cơ sở mỗi tháng từ 1 lượt trở lên.';
  }
  return null;
}

/** BR-67: the sentence under the limits, from the number typed. */
export const limitExample = (perCustomerPerDay: number) =>
  `khách hỏi tới lượt thứ ${perCustomerPerDay + 1} trong ngày thì trợ lý mời gọi tiệm hoặc đặt trên trang.`;

/** The first service of the shop that can be booked online, with its first variant. */
function firstOnline(fixture: TenantFixture) {
  const service =
    fixture.services.find((s) => s.bookableOnline && s.variants.length > 0) ?? fixture.services[0];
  return service && service.variants[0] ? { service, variant: service.variants[0] } : null;
}

/**
 * A question and the answer the assistant gives from the data: the free times left this afternoon
 * (BR-06 applied), the price and the length of the service (BR-67). With no time left it sends the
 * customer to the phone number of the branch.
 */
export function chatbotPreview(
  fixture: TenantFixture,
  now: string,
): { question: string; answer: string } {
  const found = firstOnline(fixture);
  if (!found)
    return {
      question: 'Bên bạn có dịch vụ gì?',
      answer: 'Mình chưa có dịch vụ nào để giới thiệu.',
    };
  const { service, variant } = found;
  const name = variant.shortName.toLowerCase();
  const slots = freeSlots({
    fixture,
    variant,
    serviceId: service.id,
    date: localDate(now),
    staffResourceId: ANY_STAFF,
    channel: 'online',
    now,
    ...bookingWindow(fixture.policies, now),
  });
  const times = [...new Set(slots.map((s) => formatTime(s.startAt)))];
  const afternoon = times.filter((t) => t >= '12:00');
  const offered = (afternoon.length > 0 ? afternoon : times).slice(0, 3);
  const phone = branchPhone(fixture.tenant.slug, fixture.branches[0]?.phone).display;
  return {
    question: `Chiều nay còn giờ ${name} không?`,
    answer:
      offered.length === 0
        ? `Hôm nay hết giờ trống rồi. Bạn xem ngày mai trên trang đặt lịch hoặc gọi ${phone} nhé.`
        : `${afternoon.length > 0 ? 'Chiều nay' : 'Hôm nay'} còn ${offered.join(', ')}. ${variant.shortName} ${formatVnd(variant.priceVnd)}, ${formatDuration(visibleMinutes(variant))}. Bạn muốn giờ nào?`,
  };
}
