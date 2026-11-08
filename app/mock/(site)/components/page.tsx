'use client';

import { useState, type ReactNode } from 'react';
import { AppointmentBlock } from '@/components/sapio/appointment-block';
import { Scissors } from 'lucide-react';
import { Banner } from '@/components/sapio/banner';
import { BottomBar } from '@/components/sapio/bottom-bar';
import { Button } from '@/components/sapio/button';
import { Checklist } from '@/components/sapio/checklist';
import { ChoiceCards } from '@/components/sapio/choice-cards';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { SegmentedNav, SegmentedTabs } from '@/components/sapio/segmented';
import { KeyValueList, Panel } from '@/components/sapio/detail-layout';
import { SegmentTable } from '@/components/sapio/segment-table';
import { SegmentTimeline, TimelineLegend } from '@/components/sapio/segment-timeline';
import { useToast } from '@/components/sapio/toast';
import { DateStrip } from '@/components/sapio/date-strip';
import { HoldBanner } from '@/components/sapio/hold-banner';
import { LockIcon } from '@/components/sapio/lock-icon';
import { OtpField } from '@/components/sapio/otp-field';
import { PeriodSwitch, PlanCards } from '@/components/sapio/plan-cards';
import { PhoneField } from '@/components/sapio/phone-field';
import { QuantityInput } from '@/components/sapio/quantity-input';
import { ResourceCalendar } from '@/components/sapio/resource-calendar';
import { ServiceVariantList } from '@/components/sapio/service-variant-list';
import { SignupSteps } from '@/components/sapio/signup-layout';
import { SlotGrid } from '@/components/sapio/slot-grid';
import { ANY_STAFF, StaffPicker } from '@/components/sapio/staff-picker';
import { StatusBadge } from '@/components/sapio/status-badge';
import { useMockNow } from '@/components/sapio/use-mock-now';
import type { AppointmentStatus } from '@/mock/fixtures';
import { salonServices } from '@/mock/fixtures/salon-services';
import { visibleRange } from '@/mock/occupation';
import { layout, type DraftSegment } from '@/mock/service-edit';
import { timelineOf } from '@/mock/service-preview';
import { normalizePhone } from '@/mock/format';
import { addDays, addMinutes, localToUtc, MOCK_NOW } from '@/mock/time';

const DAY = '2026-11-07';
const at = (time: string) => localToUtc(DAY, time);

function Example({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-(--space-3)">
      <h2 className="heading m-0">{name}</h2>
      {children}
    </section>
  );
}

const DYE = salonServices.find((s) => s.id === 'may-dye')!.variants[0]!;
const DYE_TYPES = [
  { id: 'may-rt-stylist', name: 'Thợ', isStaff: true },
  { id: 'may-rt-chair', name: 'Ghế cắt', isStaff: false },
  { id: 'may-rt-wash', name: 'Giường gội', isStaff: false },
];

export default function ComponentsPage() {
  const now = useMockNow();
  const [date, setDate] = useState(DAY);
  const [slot, setSlot] = useState<string | null>('09:45');
  const [staff, setStaff] = useState(ANY_STAFF);
  const [variant, setVariant] = useState<string | null>('short');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const toast = useToast();
  const [dialog, setDialog] = useState(false);
  const [part, setPart] = useState('morning');
  const [industry, setIndustry] = useState('salon');
  const [quantity, setQuantity] = useState(3);
  const [otp, setOtp] = useState('');
  const [months, setMonths] = useState('1');
  const [holdUntil, setHoldUntil] = useState(addMinutes(MOCK_NOW, 10));
  const [dyeSegments, setDyeSegments] = useState<DraftSegment[]>(() =>
    DYE.segments.map((s) => ({ ...s })),
  );
  const [picked, setPicked] = useState<number | null>(2);
  const dye = timelineOf({ segments: dyeSegments }, [
    { id: 'may-rt-stylist', tenantId: 'may', name: 'Thợ', isStaff: true },
    { id: 'may-rt-chair', tenantId: 'may', name: 'Ghế cắt', isStaff: false },
    { id: 'may-rt-wash', tenantId: 'may', name: 'Giường gội', isStaff: false },
  ]);
  const statuses: AppointmentStatus[] = [
    'held',
    'confirmed',
    'checked_in',
    'completed',
    'no_show',
    'cancelled',
  ];

  return (
    <div className="sp-tenant-may flex flex-col gap-(--space-8) pb-32">
      <h1 className="title m-0">Component Sapio</h1>

      <Example name="Button">
        <div className="sp-row">
          <Button variant="primary">Check-in</Button>
          <Button>Đổi giờ</Button>
          <Button variant="ghost">Bỏ qua</Button>
          <Button variant="danger">Hủy lịch</Button>
          <Button variant="secondary" size="sm">
            Nhỏ
          </Button>
          <Button variant="accent" size="lg">
            Đặt lịch
          </Button>
          <Button variant="primary" disabled>
            Tắt
          </Button>
        </div>
      </Example>

      <Example name="ConfirmDialog">
        <div>
          <Button variant="primary" onClick={() => setDialog(true)}>
            Hoàn thành và thu tiền
          </Button>
        </div>
        <ConfirmDialog
          open={dialog}
          title="Thu 400.000 ₫ của chị Hà?"
          facts={[
            { term: 'Dịch vụ A · Biến thể 1', value: '500.000 ₫' },
            { term: 'Đã cọc', value: '−100.000 ₫' },
            { term: 'Còn phải thu', value: '400.000 ₫', total: true },
          ]}
          confirmLabel="Thu 400.000 ₫"
          pendingLabel="Đang thu…"
          onConfirm={() => {
            setDialog(false);
            toast({ text: 'Đã thu 400.000 ₫ tiền mặt. Lịch hẹn hoàn thành.' });
          }}
          onClose={() => setDialog(false)}
        />
      </Example>

      <Example name="Toast">
        <div className="sp-row">
          <Button
            onClick={() => toast({ text: 'Đã check-in chị Ngọc lúc 10:20.', undo: () => {} })}
          >
            Có Hoàn tác
          </Button>
          <Button onClick={() => toast({ text: 'Đã thu 400.000 ₫ tiền mặt.' })}>Chỉ báo</Button>
          <Button
            onClick={() =>
              toast({ text: 'Không thu được tiền. Kiểm tra kết nối rồi thử lại.', tone: 'danger' })
            }
          >
            Lỗi
          </Button>
          <Button
            onClick={() =>
              toast({
                text: 'Mất kết nối. Thay đổi chưa được lưu.',
                tone: 'danger',
                persist: true,
              })
            }
          >
            Lỗi cần xử lý, có nút đóng
          </Button>
        </div>
      </Example>

      <Example name="Segmented">
        <SegmentedNav
          label="Kiểu xem"
          items={[
            { href: '/mock/components', label: 'Nhân viên', current: true },
            { href: '/mock/components#tai-nguyen', label: 'Tài nguyên', current: false },
          ]}
        />
        <SegmentedTabs
          label="Buổi"
          size="lg"
          block
          value={part}
          onChange={setPart}
          items={[
            { value: 'morning', label: 'Sáng', count: 3 },
            { value: 'afternoon', label: 'Chiều', count: 12 },
            { value: 'evening', label: 'Tối', count: 0, disabled: true },
          ]}
        />
      </Example>

      <Example name="StatusBadge">
        <div className="sp-row">
          {statuses.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Example>

      <Example name="AppointmentBlock">
        <div className="sp-cal" style={{ ['--cols' as string]: 1 }}>
          <div className="sp-cal__head" />
          <div className="sp-cal__head">
            <div className="sp-cal__name">Mai</div>
          </div>
          <div className="sp-cal__ruler" />
          <div className="sp-cal__col h-[calc(var(--slot-height)*12)]">
            <AppointmentBlock
              dayStart={at('09:00')}
              status="checked_in"
              title="Chị Hà · Dịch vụ A"
              meta="09:00–10:45 · Ghế 1"
              segments={[
                { startAt: at('09:00'), endAt: at('09:30'), kind: 'work' },
                { startAt: at('09:30'), endAt: at('10:15'), kind: 'wait' },
                { startAt: at('10:15'), endAt: at('10:45'), kind: 'work' },
              ]}
            />
            <AppointmentBlock
              dayStart={at('09:00')}
              status="completed"
              inset
              title="Anh Tuấn · Dịch vụ B"
              meta="09:30–10:15 · Ghế 2"
              segments={[{ startAt: at('09:30'), endAt: at('10:15'), kind: 'work' }]}
            />
          </div>
        </div>
      </Example>

      <Example name="ResourceCalendar">
        <ResourceCalendar
          label="Lịch ví dụ"
          date={DAY}
          from="08:00"
          to="12:00"
          open="08:30"
          close="11:30"
          now={MOCK_NOW}
          columns={[
            {
              id: 'chair-1',
              name: 'Ghế 1',
              kind: 'Ghế',
              blocks: [
                {
                  id: 'ha',
                  status: 'checked_in',
                  title: 'Chị Hà · Dịch vụ A',
                  meta: '09:00–10:45 · Mai',
                  segments: [{ startAt: at('09:00'), endAt: at('10:45'), kind: 'work' }],
                },
              ],
            },
            {
              id: 'chair-2',
              name: 'Ghế 2',
              kind: 'Ghế',
              blocks: [
                {
                  id: 'hold',
                  status: 'held',
                  title: 'Đang giữ chỗ',
                  meta: '10:30–11:15 · Lan · còn 07:42',
                  segments: [{ startAt: at('10:30'), endAt: at('11:15'), kind: 'work' }],
                },
              ],
            },
          ]}
        />
      </Example>

      <Example name="DateStrip">
        <DateStrip
          dates={Array.from({ length: 7 }, (_, i) => ({
            date: addDays(DAY, i),
            closed: i === 6,
          }))}
          selected={date}
          onSelect={setDate}
        />
      </Example>

      <Example name="SlotGrid">
        <SlotGrid
          selected={slot}
          onSelect={setSlot}
          emptyMessage="Hết giờ trống ngày này. Xem ngày khác?"
          groups={[
            {
              label: 'Buổi sáng',
              slots: ['09:00', '09:45', '10:30'].map((t) => ({ value: t, label: t })),
            },
            {
              label: 'Buổi chiều',
              slots: ['13:15', '14:00'].map((t) => ({ value: t, label: t })),
            },
          ]}
        />
        <SlotGrid
          selected={null}
          onSelect={() => {}}
          emptyMessage="Hết giờ trống ngày này. Ngày gần nhất còn trống: Chủ Nhật, 08/11."
          groups={[]}
        />
      </Example>

      <Example name="StaffPicker">
        <StaffPicker
          noun="Nhân viên"
          value={staff}
          onChange={setStaff}
          context="Nhân viên làm được Dịch vụ A · Thứ Bảy 07/11"
          anyEarliest="10:45"
          options={[
            {
              id: 'mai',
              displayName: 'Mai',
              title: 'Chức danh A',
              specialty: 'mô tả ngắn',
              earliest: '12:00',
            },
            {
              id: 'hung',
              displayName: 'Hùng',
              title: 'Chức danh B',
              specialty: 'mô tả ngắn',
              earliest: null,
              nextDay: 'Sớm nhất CN 08/11',
            },
          ]}
        />
      </Example>

      <Example name="ServiceVariantList">
        <ServiceVariantList
          name="Dịch vụ A"
          selected={variant}
          onSelect={setVariant}
          variants={[
            { id: 'short', name: 'Biến thể 1', meta: '105 phút', price: '500.000 ₫' },
            { id: 'long', name: 'Biến thể 2', meta: '120 phút', price: '700.000 ₫' },
          ]}
        />
      </Example>

      <Example name="HoldBanner">
        <HoldBanner
          expiresAt={holdUntil}
          now={now}
          note="Ghế 2 · Lan · 10:30 Thứ Bảy, 07/11"
          onExpire={() => {}}
        />
        <div>
          <Button size="sm" onClick={() => setHoldUntil(addMinutes(now, 10 / 60))}>
            Còn 10 giây
          </Button>
        </div>
      </Example>

      <Example name="PhoneField">
        <PhoneField
          id="phone-demo"
          label="Số điện thoại"
          value={phone}
          onChange={setPhone}
          onBlur={() => setTouched(true)}
          help="Để cơ sở liên hệ khi cần."
          error={
            touched && !normalizePhone(phone)
              ? 'Số điện thoại chưa đúng. Ví dụ: 0912 345 678.'
              : null
          }
        />
      </Example>

      <Example name="SignupLayout">
        <div className="max-w-xl rounded-(--radius-md) bg-(--surface) p-(--space-4) shadow-[0_0_0_1px_var(--line)]">
          <SignupSteps current={3} />
        </div>
      </Example>

      <Example name="ChoiceCards">
        <ChoiceCards
          name="gallery-industry"
          labelledBy="gallery-industry-title"
          value={industry}
          onChange={setIndustry}
          options={[
            {
              value: 'salon',
              title: 'Salon tóc',
              description: 'Cắt, gội, nhuộm, uốn. Ghế cắt, giường gội.',
              icon: <Scissors />,
            },
            {
              value: 'nail',
              title: 'Tiệm nail',
              description: 'Sơn gel, đắp bột. Bàn nail, ghế pedicure.',
              icon: <Scissors />,
              disabled: true,
              tag: 'Sắp có',
            },
          ]}
        />
        <p id="gallery-industry-title" className="body-sm m-0 text-(--ink-muted)">
          Cơ sở của bạn thuộc ngành nào?
        </p>
      </Example>

      <Example name="QuantityInput">
        <div className="flex items-center gap-(--space-3)">
          <label htmlFor="gallery-qty" className="body font-medium">
            Ghế cắt
          </label>
          <QuantityInput
            id="gallery-qty"
            noun="ghế cắt"
            value={quantity}
            min={1}
            max={20}
            onChange={setQuantity}
          />
        </div>
      </Example>

      <Example name="OtpField">
        <OtpField
          id="gallery-otp"
          value={otp}
          onChange={setOtp}
          help="Gõ đủ 6 số là tự xác nhận. Thử dán 482193."
        />
      </Example>

      <Example name="Banner">
        <div className="flex flex-col gap-(--space-3)">
          <Banner action={{ label: 'Kích hoạt gói', href: '#' }}>
            <strong>Dùng thử · còn 5 ngày</strong> (đến 23:59 ngày 13/11). Đặt lịch online và tạo
            lịch hẹn mở khi kích hoạt gói.
          </Banner>
          <Banner tone="warning" action={{ label: 'Gia hạn', href: '#' }}>
            Gói Chuyên nghiệp hết hạn 23:59 ngày 28/11. Gia hạn để không gián đoạn.
          </Banner>
        </div>
      </Example>

      <Example name="Checklist">
        <div className="max-w-xl">
          <Checklist
            items={[
              { label: 'Thêm dịch vụ và giá', meta: '5 dịch vụ', done: true, href: '#' },
              { label: 'Thêm nhân viên nhận đặt online', meta: '0 người', done: false, href: '#' },
            ]}
          />
        </div>
      </Example>

      <Example name="PlanCards">
        <PeriodSwitch
          label="Thời hạn"
          value={months}
          onChange={setMonths}
          options={[
            { value: '1', label: '1 tháng' },
            { value: '3', label: '3 tháng', discount: '−10%' },
            { value: '12', label: '12 tháng', discount: '−20%' },
          ]}
        />
        <PlanCards
          plans={[
            {
              id: 'gallery-basic',
              name: 'Cơ bản',
              price: '199.000 ₫',
              unit: ' / tháng',
              note: '1 chi nhánh',
              features: [
                { label: 'Đặt lịch online trên trang riêng', on: true },
                { label: 'Chatbot đặt lịch', on: false },
              ],
              action: { label: 'Chọn Cơ bản', variant: 'secondary', onClick: () => {} },
            },
            {
              id: 'gallery-pro',
              name: 'Chuyên nghiệp',
              badge: 'Đang dùng thử',
              price: '399.000 ₫',
              unit: ' / tháng',
              note: 'Không giới hạn chi nhánh',
              current: true,
              features: [
                { label: 'Đặt lịch online trên trang riêng', on: true },
                { label: 'Chatbot đặt lịch', on: true },
              ],
              action: { label: 'Chọn Chuyên nghiệp', variant: 'primary', onClick: () => {} },
            },
          ]}
        />
      </Example>

      <Example name="SegmentTimeline">
        <div className="sp-panel">
          <SegmentTimeline
            segments={dye.segments}
            types={dye.types}
            cleanup={DYE.cleanupMinutes}
            visible={visibleRange({ segments: dyeSegments })}
            exampleStart="09:00"
            selected={picked}
            onSelect={setPicked}
            label="Trục thời gian của Nhuộm ngắn, ví dụ hẹn lúc 09:00"
          />
          <TimelineLegend />
        </div>
        <div className="sp-panel max-w-[390px]">
          <SegmentTimeline
            mini
            segments={dye.segments}
            types={dye.types.map(({ small: _small, ...type }) => type)}
            cleanup={DYE.cleanupMinutes}
            visible={visibleRange({ segments: dyeSegments })}
            exampleStart="09:00"
            labelWidth={44}
            label="Trục thời gian thu nhỏ, Nhuộm ngắn"
          />
        </div>
      </Example>

      <Example name="SegmentTable">
        <SegmentTable
          caption="Các đoạn của Nhuộm ngắn"
          segments={dyeSegments}
          types={DYE_TYPES}
          selected={picked}
          onSelect={setPicked}
          errors={{}}
          onPatch={(i, patch) =>
            setDyeSegments((list) =>
              list.map((segment, index) =>
                index === i && patch.name !== undefined
                  ? { ...segment, name: patch.name }
                  : segment,
              ),
            )
          }
          onMove={(from, to) =>
            setDyeSegments((list) => {
              const next = [...list];
              const [moved] = next.splice(from, 1);
              if (moved) next.splice(to, 0, moved);
              return layout(next);
            })
          }
          onRemove={(i) => setDyeSegments((list) => layout(list.filter((_, index) => index !== i)))}
        />
      </Example>

      <Example name="DetailLayout: Panel, KeyValueList">
        <div className="max-w-[380px]">
          <Panel title="Tóm tắt" titleId="ex-panel" note="Số liệu của biến thể đang sửa.">
            <KeyValueList
              items={[
                ['Thợ bận', '1 giờ 15 (rảnh 45′ giữa chừng)'],
                ['Ghế cắt bận', '1 giờ 40 (gồm dọn 10′)'],
                ['Giường gội bận', '15 phút'],
              ]}
            />
          </Panel>
        </div>
      </Example>

      <Example name="LockIcon">
        <span className="body inline-flex items-center gap-(--space-2)">
          Chatbot <LockIcon />
        </span>
      </Example>

      <Example name="BottomBar">
        <BottomBar
          title="09:45 · Thứ Bảy 07/11"
          subtitle="Nhân viên được xếp tự động"
          action={
            <Button variant="accent" size="lg">
              Tiếp tục
            </Button>
          }
        />
      </Example>
    </div>
  );
}
