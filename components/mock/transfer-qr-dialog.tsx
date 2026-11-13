'use client';

import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/sapio/button';
import { StaticQr } from '@/components/sapio/static-qr';
import { formatVnd } from '@/mock/format';
import { addMinutes, formatTime } from '@/mock/time';

/** The transfer waits for the bank for this long; closing the box does not cancel the code (BR-21). */
const VALID_MINUTES = 15;

/** The QR of a transfer (MH-29): waits for the bank to report; the mock has a button for it. */
export function TransferQrDialog({
  open,
  amountVnd,
  code,
  createdAt,
  receiver,
  onSimulate,
  onChangeMethod,
  onClose,
  onWaitInList,
}: {
  open: boolean;
  amountVnd: bigint;
  /** `TF-0188`. */
  code: string;
  /** ISO 8601, UTC. */
  createdAt: string;
  receiver: string;
  /** Mock only: the money arrives. */
  onSimulate: () => void;
  onChangeMethod: () => void;
  /** The box is closed and the code stays valid. */
  onClose: () => void;
  onWaitInList: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const content = code.replace('-', '');
  return (
    <dialog
      ref={ref}
      className="sp-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <h2 id={titleId} className="sp-dialog__title">
        Chuyển khoản {formatVnd(amountVnd)}
      </h2>
      <div className="flex items-center gap-(--space-4)">
        <StaticQr
          value={`${content}|${amountVnd}`}
          label={`Mã QR chuyển ${formatVnd(amountVnd)}`}
        />
        <dl className="sp-kv m-0">
          <dt>Nội dung</dt>
          <dd className="sp-num">{content}</dd>
          <dt>Người nhận</dt>
          <dd>{receiver}</dd>
          <dt>Hết hạn</dt>
          <dd className="sp-num">sau {formatTime(addMinutes(createdAt, VALID_MINUTES))}</dd>
        </dl>
      </div>
      <p role="status" className="sp-num m-0 flex items-center gap-2 text-sm leading-5 font-medium">
        <span aria-hidden="true" className="size-2 rounded-full bg-(--brand)" />
        Đang chờ ngân hàng báo. Tiền về thì tự đóng và ghi hóa đơn.
      </p>
      <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
        Đóng hộp này không hủy mã: tiền về sau vẫn được ghi đúng hóa đơn này, một lần (BR-21).
      </p>
      <div className="sp-dialog__actions">
        <Button onClick={onChangeMethod}>Đổi phương thức</Button>
        <Button onClick={onWaitInList}>Đóng, chờ ở danh sách</Button>
        <Button variant="primary" onClick={onSimulate}>
          Giả lập: tiền về
        </Button>
      </div>
    </dialog>
  );
}
