'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field } from '@/components/sapio/form';
import { cleanName } from '@/mock/branch-settings';
import {
  LIMITS,
  minutesProblem,
  OTHER_GROUP,
  priceProblem,
  PRICE_PROBLEM,
  serviceNameTaken,
  type NewServiceInput,
} from '@/mock/service-settings';
import type { Service } from '@/mock/fixtures';

const vnd = new Intl.NumberFormat('vi-VN');
const digits = (text: string) => text.replace(/\D/g, '');

/**
 * "Thêm dịch vụ" (BR-94.9): the name, the group and the first variant with one Làm segment for the
 * staff. The checks run in the order of the API (`api/services.md` #7): the form first, then the
 * name (BR-94.8).
 */
export function AddServiceDialog({
  services,
  groups,
  defaultGroup,
  onAdd,
  onClose,
}: {
  services: readonly Service[];
  groups: readonly string[];
  /** The group being filtered, or `''` for none. */
  defaultGroup: string;
  onAdd: (input: NewServiceInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState(defaultGroup);
  const [variantName, setVariantName] = useState('Tiêu chuẩn');
  const [price, setPrice] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [submitted, setSubmitted] = useState(false);
  const [taken, setTaken] = useState(false);

  const nameProblem = cleanName(name) === '' ? 'Nhập tên dịch vụ.' : null;
  const variantProblem = cleanName(variantName) === '' ? 'Nhập tên biến thể.' : null;
  const priceBad = price === '' ? PRICE_PROBLEM : priceProblem(BigInt(digits(price)));
  const minutesBad =
    minutes === '' ? 'Nhập số phút từ 5 đến 480, bước 5.' : minutesProblem(Number(minutes));

  function submit() {
    setSubmitted(true);
    if (nameProblem || variantProblem || priceBad || minutesBad) return;
    if (serviceNameTaken(services, name)) {
      setTaken(true);
      return;
    }
    onAdd({
      name,
      group,
      variantName,
      priceVnd: BigInt(digits(price)),
      minutes: Number(minutes),
    });
  }

  return (
    <ConfirmDialog
      open
      title="Thêm dịch vụ"
      body="Dịch vụ mới chưa nhận đặt online. Bật ở danh sách khi sẵn sàng."
      confirmLabel="Thêm dịch vụ"
      backLabel="Hủy"
      onClose={onClose}
      onConfirm={submit}
    >
      <Field
        id="ns-name"
        label="Tên dịch vụ"
        error={taken ? 'Đã có dịch vụ tên này.' : submitted ? nameProblem : undefined}
      >
        <input
          id="ns-name"
          maxLength={LIMITS.serviceName}
          placeholder="Ví dụ: Cắt tóc"
          autoComplete="off"
          value={name}
          aria-invalid={taken || (submitted && Boolean(nameProblem)) ? true : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setTaken(false);
          }}
        />
      </Field>
      <Field id="ns-group" label="Nhóm">
        <select id="ns-group" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Không nhóm ({OTHER_GROUP})</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="ns-variant"
        label="Biến thể đầu tiên"
        help="Thêm biến thể và chỉnh các đoạn ở trang chi tiết."
        error={submitted ? variantProblem : undefined}
      >
        <input
          id="ns-variant"
          maxLength={LIMITS.variantName}
          autoComplete="off"
          value={variantName}
          aria-invalid={submitted && Boolean(variantProblem) ? true : undefined}
          onChange={(e) => setVariantName(e.target.value)}
        />
      </Field>
      <div className="flex gap-3">
        <Field id="ns-price" label="Giá" suffix="₫" error={submitted ? priceBad : undefined}>
          <input
            id="ns-price"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={price}
            aria-invalid={submitted && Boolean(priceBad) ? true : undefined}
            onChange={(e) => {
              const d = digits(e.target.value);
              setPrice(d === '' ? '' : vnd.format(BigInt(d)));
            }}
          />
        </Field>
        <Field
          id="ns-minutes"
          label="Thời lượng"
          suffix="phút"
          help="Một đoạn Làm do nhân viên thực hiện."
          error={submitted ? minutesBad : undefined}
        >
          <input
            id="ns-minutes"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={minutes}
            aria-invalid={submitted && Boolean(minutesBad) ? true : undefined}
            onChange={(e) => setMinutes(digits(e.target.value))}
          />
        </Field>
      </div>
    </ConfirmDialog>
  );
}
