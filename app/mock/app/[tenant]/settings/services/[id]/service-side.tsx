'use client';

import { KeyValueList, Panel } from '@/components/sapio/detail-layout';
import { ResourceCalendar } from '@/components/sapio/resource-calendar';
import { formatDuration, formatVnd } from '@/mock/format';
import { busyMinutes } from '@/mock/occupation';
import { fromDraft } from '@/mock/service-edit';
import { previewCalendar, PREVIEW_DATE, PREVIEW_START } from '@/mock/service-preview';
import { anyPrice, durationText } from '@/mock/services';
import { MOCK_NOW } from '@/mock/time';
import type { ServiceEditor } from './use-service-editor';

/** The aside of the detail page: what the variant looks like on the calendar, to the customer, in numbers. */
export function ServiceSide({ ed }: { ed: ServiceEditor }) {
  const { fixture, draft, variant, capable, staff } = ed;
  const service = fromDraft(draft);
  const current = service.variants.find((v) => v.id === variant.id) ?? service.variants[0]!;
  const preview = previewCalendar(fixture, service, current, ed.skills);
  const typeName = (id: string) => fixture.resourceTypes.find((t) => t.id === id)?.name ?? '';

  const gap = (typeId: string, gapMinutes: number) =>
    fixture.resourceTypes.find((t) => t.id === typeId)?.isStaff && gapMinutes > 0
      ? ` (rảnh ${gapMinutes}′ giữa chừng)`
      : '';
  const load = busyMinutes(current).map((row) => [
    `${typeName(row.typeId)} bận`,
    `${formatDuration(row.busy)}${gap(row.typeId, row.gap)}${
      row.cleanup > 0 && !fixture.resourceTypes.find((t) => t.id === row.typeId)?.isStaff
        ? ` (gồm dọn ${row.cleanup}′)`
        : ''
    }`,
  ]) as [string, string][];

  const topStaff = capable.find((s) => s.level > 1);
  const staffWord = fixture.template.vocabulary.staff;

  return (
    <>
      {preview && (
        <Panel
          title="Trên lịch lễ tân"
          titleId="pv-cal"
          note={
            current.segments.some((s) => s.kind === 'wait')
              ? `Trong lúc chờ, ${fixture.template.vocabulary.staff.toLowerCase()} nhận được lịch ngắn khác.`
              : `Ví dụ hẹn lúc ${PREVIEW_START}.`
          }
        >
          <ResourceCalendar
            compact
            columns={preview.columns}
            date={PREVIEW_DATE}
            from={preview.from}
            to={preview.to}
            open={preview.from}
            close={preview.to}
            now={MOCK_NOW}
            label={`Xem trước trên lịch lễ tân: hẹn ${PREVIEW_START}`}
          />
        </Panel>
      )}
      <Panel
        title="Khách thấy"
        titleId="pv-cus"
        note={
          topStaff
            ? `Giá khi khách để “Bất kỳ ai”. Chọn ${topStaff.profile.displayName} thì giá đổi thành ${formatVnd(
                current.pricesByLevel?.[topStaff.level - 1] ?? current.priceVnd,
              )} ngay ở bước chọn ${staffWord.toLowerCase()}.`
            : 'Giá khi khách để “Bất kỳ ai”.'
        }
      >
        {service.variants.map((v) => (
          <VariantRow
            key={v.id}
            checked={v.id === variant.id}
            name={v.name}
            meta={`${durationText([v])}${v.depositVnd ? ` · cọc ${formatVnd(v.depositVnd)}` : ''}`}
            price={formatVnd(anyPrice(v, capable))}
          />
        ))}
      </Panel>
      <Panel title="Tóm tắt" titleId="pv-sum">
        <KeyValueList
          items={[
            ...load,
            ['Lịch sắp tới dùng biến thể', String(variantUpcoming(ed))] as [string, string],
          ]}
        />
        <span className="sp-sr-only">{staff.length} nhân viên</span>
      </Panel>
    </>
  );
}

/** Confirmed appointments still to come on this variant. */
function variantUpcoming(ed: ServiceEditor) {
  return ed.fixture.appointments.filter(
    (a) =>
      a.status === 'confirmed' &&
      a.startAt > MOCK_NOW &&
      a.items.some((i) => i.serviceVariantId === ed.variant.id),
  ).length;
}

function VariantRow({
  checked,
  name,
  meta,
  price,
}: {
  checked: boolean;
  name: string;
  meta: string;
  price: string;
}) {
  return (
    <label className="sp-variant cursor-default">
      <input type="radio" checked={checked} disabled readOnly aria-label={name} />
      <span>
        <span className="sp-variant__name">{name}</span>
        <br />
        <span className="sp-variant__meta">{meta}</span>
      </span>
      <span className="sp-variant__price">{price}</span>
    </label>
  );
}
