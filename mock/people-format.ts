import { formatTime, localDate, MOCK_NOW } from './time';

/** First and last word's initials: "Lê Thu Hà" gives "LH". */
export function initialsOfName(name: string) {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.charAt(0) ?? '';
  const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase();
}

/** `Hôm nay, 09:00` for today, otherwise `28/10, 14:00`; the mock clock decides what today is. */
export function formatWhen(iso: string) {
  const date = localDate(iso);
  const time = formatTime(iso);
  if (date === localDate(MOCK_NOW)) return `Hôm nay, ${time}`;
  return `${date.slice(8, 10)}/${date.slice(5, 7)}, ${time}`;
}

/** `hôm nay 09:00`, `28/10 14:00`: the same moment inside a sentence. */
export function formatWhenInline(iso: string) {
  return formatWhen(iso).replace(', ', ' ').replace('Hôm', 'hôm');
}
