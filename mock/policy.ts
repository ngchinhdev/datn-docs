/*
 * What a customer may do by themselves with a booking, and what a cancellation returns
 * (BR-08, BR-23, BR-33). Pure; imports only types, so Node can run it (scripts/check-availability.ts).
 */
import type { BookingTerms, RefundTiers } from './fixtures/types.ts';

/** What the shop allows a customer to do alone: X and N of BR-08. */
export interface SelfServicePolicy {
  /** A customer changes or cancels by themselves only this many hours before the time. */
  cancelBeforeHours: number;
  /** How many times a customer may change the time of one booking by themselves. */
  maxReschedules: number;
}

const HOUR = 3_600_000;

export const hoursLeft = (startAt: string, now: string) =>
  (Date.parse(startAt) - Date.parse(now)) / HOUR;

/** BR-08: false once the booking is closer than the hours the shop sets. */
export const canSelfService = (startAt: string, now: string, cancelBeforeHours: number) =>
  hoursLeft(startAt, now) >= cancelBeforeHours;

/**
 * BR-08: why a customer cannot move the time of a booking by themselves right now, or `null`
 * when they can. Answering a question of the shop is not a change of their own: it counts
 * neither against the hours nor against the number of times (BR-33).
 */
export function selfChangeBlock(
  appt: { status: string; startAt: string; selfChanges?: number },
  now: string,
  policy: SelfServicePolicy,
  answering: boolean,
): string | null {
  if (appt.status !== 'confirmed' && appt.status !== 'checked_in') {
    return 'Lịch này không còn đổi giờ được.';
  }
  if (answering) return null;
  if (!canSelfService(appt.startAt, now, policy.cancelBeforeHours)) {
    return `Còn dưới ${policy.cancelBeforeHours} giờ tới giờ hẹn nên không tự đổi giờ được. Bạn gọi tiệm.`;
  }
  const used = appt.selfChanges ?? 0;
  if (used >= policy.maxReschedules) {
    return `Lịch này đã đổi giờ ${used} lần, hết lượt tự đổi. Bạn gọi tiệm.`;
  }
  return null;
}

/** BR-23, the default tiers. */
export const DEFAULT_REFUND_TIERS: RefundTiers = { over24: 100, over4: 50, under4: 0 };

/** BR-23: the percent of the deposit that goes back: 24 hours or more, from 4 to 24 hours, under 4 hours. */
export function refundPercent(
  startAt: string,
  now: string,
  tiers: RefundTiers = DEFAULT_REFUND_TIERS,
): number {
  const left = hoursLeft(startAt, now);
  if (left >= 24) return tiers.over24;
  if (left >= 4) return tiers.over4;
  return tiers.under4;
}

/** Whole VND: `bigint` division, so no fraction is ever created. */
export const refundVnd = (
  depositVnd: bigint,
  startAt: string,
  now: string,
  tiers: RefundTiers = DEFAULT_REFUND_TIERS,
) => (depositVnd * BigInt(refundPercent(startAt, now, tiers))) / 100n;

export const termsFrom = (policy: SelfServicePolicy, refund: RefundTiers): BookingTerms => ({
  cancelBeforeHours: policy.cancelBeforeHours,
  maxReschedules: policy.maxReschedules,
  refund,
});

// ---- Sentences of Cài đặt › Chính sách, from the numbers being typed ----

const GRID_MINUTES = 15;

/** BR-06: the first time a customer can start, from `minNoticeHours` on, on the 15-minute grid. ISO 8601, UTC. */
export function earliestBooking(now: string, minNoticeHours: number): string {
  const at = Date.parse(now) + minNoticeHours * HOUR;
  const step = GRID_MINUTES * 60_000;
  return new Date(Math.ceil(at / step) * step).toISOString();
}

/** BR-08: how long before the time a customer can still change or cancel by themselves. ISO 8601, UTC. */
export const selfChangeUntil = (startAt: string, cancelBeforeHours: number) =>
  new Date(Date.parse(startAt) - cancelBeforeHours * HOUR).toISOString();

/** BR-09: when a booking that has not checked in may be marked no-show. ISO 8601, UTC. */
export const noShowFrom = (startAt: string, minutes: number) =>
  new Date(Date.parse(startAt) + minutes * 60_000).toISOString();

/** BR-33: 24 hours after sending, but no later than 2 hours before the booking. ISO 8601, UTC. */
export function replyDeadline(sentAt: string, startAt: string): string {
  const byDay = Date.parse(sentAt) + 24 * HOUR;
  const byBooking = Date.parse(startAt) - 2 * HOUR;
  return new Date(Math.min(byDay, byBooking)).toISOString();
}

/** `2 ngày 4 giờ`, `5 giờ 30 phút`, `40 phút`: how long is left. */
export function timeLeftText(startAt: string, now: string): string {
  const minutes = Math.max(0, Math.floor((Date.parse(startAt) - Date.parse(now)) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return hours > 0 ? `${days} ngày ${hours} giờ` : `${days} ngày`;
  if (hours > 0) return rest > 0 ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
  return `${rest} phút`;
}

/** BR-06: the earliest and the latest time a customer may ask to start, from the shop's policy. */
export function bookingWindow(
  policy: { minNoticeHours: number; maxAdvanceDays: number },
  now: string,
): { notBefore: string; notAfter: string } {
  const at = Date.parse(now);
  return {
    notBefore: new Date(at + policy.minNoticeHours * HOUR).toISOString(),
    notAfter: new Date(at + policy.maxAdvanceDays * 24 * HOUR).toISOString(),
  };
}
