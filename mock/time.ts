/** Mock clock: Saturday 07/11/2026 10:20 in Vietnam. Never read the real clock in mock screens. */
export const MOCK_NOW = '2026-11-07T03:20:00Z';
export const BRANCH_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const MINUTE = 60_000;

const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: BRANCH_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const dateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRANCH_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const addMinutes = (iso: string, minutes: number) =>
  new Date(Date.parse(iso) + minutes * MINUTE).toISOString();

export const minutesBetween = (from: string, to: string) =>
  (Date.parse(to) - Date.parse(from)) / MINUTE;

/** `09:30`. */
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));

/** `09:00–10:45`. */
export const formatRange = (start: string, end: string) =>
  `${formatTime(start)}–${formatTime(end)}`;

/** Local date `YYYY-MM-DD` in the branch time zone. */
export const localDate = (iso: string) => dateParts.format(new Date(iso));

/** UTC instant of a local wall-clock time; the branch has no DST, so a fixed +07:00 is exact. */
export const localToUtc = (date: string, time: string) =>
  new Date(`${date}T${time}:00+07:00`).toISOString();

export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 1440 * MINUTE).toISOString().slice(0, 10);

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_LONG = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
export const weekdayShort = (date: string) => WEEKDAY_SHORT[weekdayOf(date)] ?? '';

/** `Thứ Bảy, 07/11`. */
export const formatDay = (date: string) =>
  `${WEEKDAY_LONG[weekdayOf(date)]}, ${date.slice(8, 10)}/${date.slice(5, 7)}`;

/** `07`. */
export const dayOfMonth = (date: string) => date.slice(8, 10);

/** `07:42`. */
export const formatCountdown = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
