const vnd = new Intl.NumberFormat('vi-VN');

/** `500.000 ₫`. Money stays an integer VND `bigint`. */
export const formatVnd = (amount: bigint) => `${vnd.format(amount)} ₫`;

/** `105 phút`. */
export const formatMinutes = (minutes: number) => `${minutes} phút`;

/** Vietnamese mobile number to E.164, or `null` (BR-61). Accepts `0912…`, `+84912…`, `84912…`. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s.-]/g, '');
  const national = digits.replace(/^\+?84/, '0');
  return /^0[35789]\d{8}$/.test(national) ? `+84${national.slice(1)}` : null;
}

/** `0912 345 678`. */
export function formatPhone(e164: string) {
  const national = e164.replace(/^\+84/, '0');
  return `${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7)}`;
}

/** `1 giờ 45`, `2 giờ`, `45 phút`: how long a customer stays. */
export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} phút`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)} giờ${rest ? ` ${rest}` : ''}`;
};
