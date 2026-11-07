'use client';

import { useState, type ReactNode } from 'react';
import { AppointmentBlock } from '@/components/sapio/appointment-block';
import { BottomBar } from '@/components/sapio/bottom-bar';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { SegmentedNav, SegmentedTabs } from '@/components/sapio/segmented';
import { useToast } from '@/components/sapio/toast';
import { DateStrip } from '@/components/sapio/date-strip';
import { HoldBanner } from '@/components/sapio/hold-banner';
import { PhoneField } from '@/components/sapio/phone-field';
import { ResourceCalendar } from '@/components/sapio/resource-calendar';
import { ServiceVariantList } from '@/components/sapio/service-variant-list';
import { SlotGrid } from '@/components/sapio/slot-grid';
import { ANY_STAFF, StaffPicker } from '@/components/sapio/staff-picker';
import { StatusBadge } from '@/components/sapio/status-badge';
import { useMockNow } from '@/components/sapio/use-mock-now';
import type { AppointmentStatus } from '@/mock/fixtures';
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
  const [holdUntil, setHoldUntil] = useState(addMinutes(MOCK_NOW, 10));
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
            { term: 'Nhuộm tóc · Tóc ngắn', value: '500.000 ₫' },
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
              title="Chị Hà · Nhuộm ngắn"
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
              title="Anh Tuấn · Cắt ngắn"
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
              kind: 'Ghế làm tóc',
              blocks: [
                {
                  id: 'ha',
                  status: 'checked_in',
                  title: 'Chị Hà · Nhuộm ngắn',
                  meta: '09:00–10:45 · Mai',
                  segments: [{ startAt: at('09:00'), endAt: at('10:45'), kind: 'work' }],
                },
              ],
            },
            {
              id: 'chair-2',
              name: 'Ghế 2',
              kind: 'Ghế làm tóc',
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
          noun="Thợ"
          value={staff}
          onChange={setStaff}
          context="Thợ làm được Nhuộm tóc · Thứ Bảy 07/11"
          anyEarliest="10:45"
          options={[
            {
              id: 'mai',
              displayName: 'Mai',
              title: 'Thợ chính',
              specialty: 'chuyên nhuộm',
              earliest: '12:00',
            },
            {
              id: 'hung',
              displayName: 'Hùng',
              title: 'Thợ',
              specialty: 'nhuộm, tạo kiểu',
              earliest: null,
              nextDay: 'Sớm nhất CN 08/11',
            },
          ]}
        />
      </Example>

      <Example name="ServiceVariantList">
        <ServiceVariantList
          name="Nhuộm tóc"
          selected={variant}
          onSelect={setVariant}
          variants={[
            { id: 'short', name: 'Tóc ngắn', meta: '105 phút', price: '500.000 ₫' },
            { id: 'long', name: 'Tóc dài', meta: '120 phút', price: '700.000 ₫' },
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
          help="Mã xác nhận gửi qua tin nhắn."
          error={
            touched && !normalizePhone(phone)
              ? 'Số điện thoại chưa đúng. Ví dụ: 0912 345 678.'
              : null
          }
        />
      </Example>

      <Example name="BottomBar">
        <BottomBar
          title="09:45 · Thứ Bảy 07/11"
          subtitle="Thợ được xếp tự động"
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
