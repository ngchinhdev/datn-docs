// View models for the industry template pages (MH-59). Pure functions over fixtures; no React.
import type { TimelineSegment, TimelineType } from '@/components/sapio/segment-timeline';
import type {
  IndustryTemplate,
  SampleServiceVariant,
  TemplateContent,
  TemplatePolicies,
  TemplateStatus,
} from './fixtures';
import { sampleMinutes } from './signup';

export const statusLabel: Record<TemplateStatus, string> = {
  open: 'Đang mở',
  soon: 'Sắp có',
  hidden: 'Ẩn',
};

export const contentOf = (t: IndustryTemplate): TemplateContent => ({
  name: t.name,
  status: t.status,
  cardDescription: t.cardDescription,
  previewNote: t.previewNote,
  vocabulary: t.vocabulary,
  defaultPolicies: t.defaultPolicies,
  sampleServices: t.sampleServices,
});

export const serviceCount = (t: IndustryTemplate) => t.sampleServices.length;
export const placedTypes = (t: IndustryTemplate) => t.resourceTypes.filter((r) => !r.isStaff);

/** "3 dịch vụ · 2 loại tài nguyên · hỏi thông tin bé", or `null` when there is nothing yet. */
export function contentSummary(t: IndustryTemplate): string | null {
  if (t.sampleServices.length === 0) return null;
  const parts = [
    `${t.sampleServices.length} dịch vụ`,
    `${placedTypes(t).length} loại tài nguyên`,
    ...(t.vocabulary.subject ? [`hỏi thông tin ${t.vocabulary.subject}`] : []),
  ];
  return parts.join(' · ');
}

/** What the segments of one sample variant look like on a timeline: a row for staff, one for the rest. */
export function sampleTimeline(
  template: IndustryTemplate,
  variant: SampleServiceVariant,
): { segments: TimelineSegment[]; types: TimelineType[]; visible: [number, number] } {
  const staffNames = new Set(template.resourceTypes.filter((t) => t.isStaff).map((t) => t.name));
  let cursor = 0;
  const segments: TimelineSegment[] = variant.segments.map((segment) => {
    const from = cursor;
    cursor += segment.minutes;
    const typeIds = [
      ...(segment.types.some((t) => staffNames.has(t)) ? ['staff'] : []),
      ...(segment.types.some((t) => !staffNames.has(t)) ? ['other'] : []),
    ];
    return { name: segment.name, kind: segment.kind, from, to: cursor, typeIds };
  });
  const seen = segments.filter((s) => s.kind === 'work');
  const visible: [number, number] = [
    seen[0]?.from ?? 0,
    seen.at(-1)?.to ?? Math.max(...segments.map((s) => s.to), 0),
  ];
  const staff = [...staffNames][0] ?? 'Nhân viên';
  const others = [
    ...new Set(
      variant.segments.flatMap((s) => s.types.filter((t) => !staffNames.has(t))).map(firstWord),
    ),
  ];
  const types: TimelineType[] = [
    { id: 'staff', label: staff.startsWith('Nhân viên') ? 'Nhân viên' : staff },
    ...(others.length ? [{ id: 'other', label: others.join(', ') }] : []),
  ];
  return { segments, types, visible };
}

const firstWord = (name: string) => name.split(' ')[0] ?? name;

export const sampleDuration = sampleMinutes;

export interface PolicyField {
  key: keyof TemplatePolicies;
  label: string;
  unit: string;
  /** The rule the value belongs to. */
  rule: string;
}

export const POLICY_FIELDS: PolicyField[] = [
  { key: 'minNoticeHours', label: 'Đặt trước ít nhất', unit: 'giờ', rule: 'BR-06' },
  { key: 'maxAdvanceDays', label: 'Đặt xa nhất', unit: 'ngày', rule: 'BR-06' },
  { key: 'cancelBeforeHours', label: 'Tự đổi, hủy trước ít nhất', unit: 'giờ', rule: 'BR-08' },
  { key: 'maxReschedules', label: 'Tự đổi tối đa', unit: 'lần mỗi lịch', rule: 'BR-08' },
  { key: 'noShowAfterMinutes', label: 'Đánh dấu không đến sau', unit: 'phút', rule: 'BR-09' },
  {
    key: 'depositAfterNoShows',
    label: 'Bắt buộc cọc khi không đến',
    unit: 'lần trong 6 tháng',
    rule: 'BR-10',
  },
];

export interface VocabularyField {
  key: keyof IndustryTemplate['vocabulary'];
  where: string;
  example: string;
}

export const VOCABULARY_FIELDS: VocabularyField[] = [
  { key: 'staff', where: 'Nhân viên', example: 'Chọn {x}, lịch theo {x}' },
  { key: 'subject', where: 'Đối tượng được phục vụ', example: 'Thông tin của {x}, 3 {x}' },
  { key: 'subjectQuestion', where: 'Câu hỏi chọn đối tượng', example: 'Tiêu đề bước đặt lịch' },
  { key: 'addSubject', where: 'Nút thêm', example: 'Nút ở bước chọn {subject}' },
  { key: 'subjectExample', where: 'Ví dụ tên', example: 'Chữ mờ trong ô tên' },
];

/** One line per field that differs, for the list of changes in a draft. */
export function changeLines(before: TemplateContent, after: TemplateContent): string[] {
  const lines: string[] = [];
  if (before.name !== after.name) lines.push('Thẻ: tên ngành');
  if (before.status !== after.status) {
    lines.push(`Thẻ: trạng thái ${statusLabel[before.status]} → ${statusLabel[after.status]}`);
  }
  if (before.cardDescription !== after.cardDescription) lines.push('Thẻ: mô tả');
  if (before.previewNote !== after.previewNote) lines.push('Bảng xem trước: câu dưới bảng');
  for (const field of VOCABULARY_FIELDS) {
    if (before.vocabulary[field.key] !== after.vocabulary[field.key]) {
      lines.push(`Từ ngữ: ${field.where.toLowerCase()}`);
    }
  }
  for (const field of POLICY_FIELDS) {
    const a = before.defaultPolicies[field.key];
    const b = after.defaultPolicies[field.key];
    if (a !== b) {
      lines.push(`Chính sách: ${field.label.toLowerCase()} ${a} → ${b} ${field.unit}`);
    }
  }
  return lines;
}
