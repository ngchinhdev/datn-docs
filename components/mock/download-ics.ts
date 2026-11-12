import { MOCK_NOW } from '@/mock/time';

const icsStamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Saves one event as an `.ics` file, for "Thêm vào lịch điện thoại". */
export function downloadIcs(o: { start: string; end: string; title: string; location: string }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sapio mock//VI',
    'BEGIN:VEVENT',
    `UID:${icsStamp(o.start)}@sapio.mock`,
    `DTSTAMP:${icsStamp(new Date(MOCK_NOW).toISOString())}`,
    `DTSTART:${icsStamp(o.start)}`,
    `DTEND:${icsStamp(o.end)}`,
    `SUMMARY:${o.title}`,
    `LOCATION:${o.location.replace(/,/g, '\,')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lich-hen.ics';
  a.click();
  URL.revokeObjectURL(url);
}
