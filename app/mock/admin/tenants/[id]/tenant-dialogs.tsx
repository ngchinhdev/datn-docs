'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field } from '@/components/sapio/form';
import {
  EXTEND_MAX_DAYS,
  EXTEND_PRESETS,
  LOCK_REASON_MIN,
  extension,
  extensionDaysError,
  lockReasonError,
  unlockReasonError,
  type TenantView,
} from '@/mock/platform';
import { formatFullDate } from '@/mock/time';

/** MH-58, hộp khóa cơ sở: the owner reads the reason and gets it by email (BR-90). */
export function LockDialog({
  view,
  onConfirm,
  onClose,
}: {
  view: TenantView;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const error = lockReasonError(reason);
  const { totals } = view.tenant;
  return (
    <ConfirmDialog
      open
      tone="danger"
      title={`Khóa ${view.tenant.name}?`}
      confirmLabel="Khóa cơ sở"
      backLabel="Hủy"
      confirmDisabled={error !== null}
      onClose={onClose}
      onConfirm={() => onConfirm(reason)}
    >
      <ul className="m-0 flex flex-col gap-1 ps-5 text-sm leading-5">
        <li>
          {totals.members} thành viên ra khỏi khu quản trị ngay; chủ cơ sở thấy lý do bên dưới.
        </li>
        <li>
          Trang đặt lịch báo tạm dừng, không nói lý do. {totals.upcoming} lịch sắp tới vẫn giữ;
          khách vẫn xem và hủy được.
        </li>
        <li>
          Gói vẫn chạy{view.endsOn ? ` đến ${formatFullDate(view.endsOn)}` : ''}, không trừ, không
          cộng ngày. Khóa nhầm thì mở khóa rồi gia hạn thủ công.
        </li>
      </ul>
      <Field
        id="lk-why"
        label="Lý do (chủ cơ sở thấy)"
        area
        help={`Bắt buộc, ít nhất ${LOCK_REASON_MIN} ký tự. Gửi kèm trong email báo cho chủ cơ sở.`}
        error={reason === '' ? null : error}
      >
        <textarea
          id="lk-why"
          rows={4}
          value={reason}
          aria-invalid={reason !== '' && error !== null}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}

/** The lock comes off with a reason only the platform reads, and an email to the owner (BR-90). */
export function UnlockDialog({
  view,
  onConfirm,
  onClose,
}: {
  view: TenantView;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const error = unlockReasonError(reason);
  return (
    <ConfirmDialog
      open
      title={`Mở khóa ${view.tenant.name}?`}
      confirmLabel="Mở khóa"
      backLabel="Hủy"
      confirmDisabled={error !== null}
      onClose={onClose}
      onConfirm={() => onConfirm(reason)}
    >
      <p className="m-0 text-sm leading-5">
        Khu quản trị và trang đặt lịch chạy lại ngay; chủ cơ sở nhận email báo đã mở khóa.
      </p>
      <Field
        id="ul-why"
        label="Lý do (chỉ quản trị thấy)"
        area
        help="Bắt buộc. Ghi vào nhật ký, chủ cơ sở không thấy."
      >
        <textarea id="ul-why" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </ConfirmDialog>
  );
}

/** MH-58, hộp gia hạn thủ công: the new end is worked out as the number of days changes (BR-91). */
export function ExtendDialog({
  view,
  now,
  planName,
  onConfirm,
  onClose,
}: {
  view: TenantView;
  now: string;
  planName: string;
  onConfirm: (days: number, reason: string) => void;
  onClose: () => void;
}) {
  const [preset, setPreset] = useState<number | 'other'>(EXTEND_PRESETS[0]);
  const [other, setOther] = useState('');
  const [reason, setReason] = useState('');
  const days = preset === 'other' ? (other.trim() === '' ? null : Number(other)) : preset;
  const daysError = extensionDaysError(days);
  const result =
    daysError === null && days !== null ? extension(view.subscription, days, now) : null;
  const reasonError = reason.trim() === '' ? 'Nhập lý do.' : null;
  const expired = view.state === 'expired';
  const trial = view.subscription.periodEndsOn === null;

  return (
    <ConfirmDialog
      open
      title={`Gia hạn thủ công cho ${view.tenant.name}`}
      confirmLabel={result ? `Gia hạn đến ${formatFullDate(result.newEnd).slice(0, 5)}` : 'Gia hạn'}
      backLabel="Hủy"
      confirmDisabled={result === null || reasonError !== null}
      onClose={onClose}
      onConfirm={() => {
        if (days !== null) onConfirm(days, reason);
      }}
    >
      <fieldset className="m-0 border-0 p-0">
        <legend className="sp-field__label mb-1.5">Thêm</legend>
        <div className="sp-segmented" role="group" aria-label="Số ngày thêm">
          {EXTEND_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              className="sp-segmented__item"
              aria-pressed={preset === n}
              onClick={() => setPreset(n)}
            >
              {n} ngày
            </button>
          ))}
          <button
            type="button"
            className="sp-segmented__item"
            aria-pressed={preset === 'other'}
            onClick={() => setPreset('other')}
          >
            Số khác
          </button>
        </div>
      </fieldset>
      {preset === 'other' && (
        <div className="w-40">
          <Field id="gh-days" label="Số ngày" suffix="ngày" error={daysError}>
            <input
              id="gh-days"
              inputMode="numeric"
              value={other}
              onChange={(e) => setOther(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>
      )}
      <dl className="sp-kv m-0">
        <dt>Gói</dt>
        <dd className="sp-num">{planName} (giữ gói hiện tại)</dd>
        <dt>{trial ? 'Hết dùng thử cũ' : 'Hạn cũ'}</dt>
        <dd className="sp-num">
          {view.endsOn ? formatFullDate(view.endsOn) : '—'}
          {expired ? ', đã hết' : ''}
        </dd>
        <dt>{trial ? 'Hết dùng thử mới' : 'Hạn mới'}</dt>
        <dd className="sp-num">{result ? `23:59, ${formatFullDate(result.newEnd)}` : '—'}</dd>
      </dl>
      <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
        Gói đã hết hạn thì tính từ hôm nay (hôm nay là ngày thứ nhất); còn hạn thì cộng nối vào hạn
        cũ. Tối đa {EXTEND_MAX_DAYS} ngày mỗi lần.
      </p>
      <Field
        id="gh-why"
        label="Lý do (chỉ quản trị thấy)"
        area
        help="Bắt buộc. Không tạo khoản thu trong sổ; ghi nhật ký (BR-75)."
      >
        <textarea id="gh-why" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </ConfirmDialog>
  );
}
