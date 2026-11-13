'use client';

import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field } from '@/components/sapio/form';
import type { Customer, Invoice, MoneyState } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import {
  PACKAGE_CANCEL_FEE,
  packageRefund,
  parseVnd,
  refundable,
  splitWalletRefund,
} from '@/mock/money';
import { METHOD_LABEL, type RefundInput } from '@/mock/money-ops';

const number = new Intl.NumberFormat('vi-VN');
const min = (a: bigint, b: bigint) => (a < b ? a : b);

/**
 * Yêu cầu hoàn tiền (MH-34): pick the payment that gives the money back, the amount (no more than
 * it still holds), and the reason. A package sale is given back by BR-27. The manager decides later.
 */
export function RefundRequestDialog({
  open,
  invoice,
  money,
  customer,
  onSubmit,
  onClose,
}: {
  open: boolean;
  invoice: Invoice;
  money: MoneyState;
  customer: Customer | undefined;
  /** Returns the problem in words, or `null` when the request was made. */
  onSubmit: (input: RefundInput) => string | null;
  onClose: () => void;
}) {
  const payments = money.payments.filter((p) => p.invoiceId === invoice.id && p.status === 'paid');
  const options = payments.map((p) => ({
    payment: p,
    limit: refundable(invoice, p, money.refunds),
  }));
  const firstUsable = options.find((o) => o.limit.maxVnd > 0n)?.payment.id ?? '';
  const [paymentId, setPaymentId] = useState(firstUsable);
  const [amountText, setAmountText] = useState('');
  const [lineId, setLineId] = useState('');
  const [reason, setReason] = useState('');
  const [feeText, setFeeText] = useState(number.format(PACKAGE_CANCEL_FEE));
  const [error, setError] = useState<string | null>(null);

  const chosen = options.find((o) => o.payment.id === paymentId);
  const max = chosen?.limit.maxVnd ?? 0n;

  // BR-27: the package sale on this invoice and what is left of it.
  const saleLine = invoice.lines.find((l) => l.kind === 'package_sale');
  const pkg = useMemo(
    () =>
      saleLine
        ? customer?.packages?.find(
            (p) => p.priceVnd === saleLine.unitPriceVnd && p.name === saleLine.description,
          )
        : undefined,
    [saleLine, customer],
  );
  const fee = parseVnd(feeText) ?? 0n;
  const packageAmount =
    saleLine && pkg
      ? min(
          packageRefund(
            pkg.priceVnd ?? saleLine.unitPriceVnd,
            pkg.unitPriceVnd ?? 0n,
            pkg.usedSessions,
            fee,
          ),
          max,
        )
      : null;

  const typed = amountText.trim() === '' ? null : parseVnd(amountText);
  const line = invoice.lines.find((l) => l.id === lineId);
  const returnsSession = Boolean(line?.packageId);
  const amount = packageAmount ?? (typed === null ? (returnsSession ? 0n : max) : typed);
  const walletSplit =
    chosen?.payment.method === 'wallet' && amount > 0n
      ? splitWalletRefund(chosen.payment, money.refunds, min(amount, max))
      : null;

  const problem =
    !chosen || max <= 0n
      ? 'Chọn một khoản còn hoàn được.'
      : amount > max
        ? `Tối đa ${formatVnd(max)}.`
        : amount <= 0n && !returnsSession
          ? 'Nhập số tiền lớn hơn 0.'
          : reason.trim() === ''
            ? 'Nhập lý do.'
            : null;

  const label = (m: keyof typeof METHOD_LABEL) => (m === 'wallet' ? 'Ví' : METHOD_LABEL[m]);
  const hint = (o: (typeof options)[number]) => {
    if (o.limit.blocked && o.limit.maxVnd <= 0n) return o.limit.blocked;
    const m = o.payment.method;
    if (m === 'cash') return 'Hoàn tiền mặt tại quầy';
    if (m === 'wallet') {
      const s = splitWalletRefund(o.payment, money.refunds, o.limit.maxVnd);
      return `Trả lại vào ví: tiền thật ${formatVnd(s.realVnd)}, tiền tặng ${formatVnd(s.bonusVnd)}`;
    }
    if (m === 'transfer') return 'Hoàn về tài khoản đã chuyển';
    if (m === 'card') return 'Hoàn về thẻ, ghi tay';
    return 'Hoàn về cổng thanh toán (giả lập)';
  };

  return (
    <ConfirmDialog
      open={open}
      title={`Yêu cầu hoàn tiền · ${invoice.number}`}
      confirmLabel="Gửi yêu cầu"
      backLabel="Hủy"
      confirmDisabled={problem !== null}
      onClose={onClose}
      onConfirm={() => {
        const result = onSubmit({
          invoiceId: invoice.id,
          paymentId,
          amountVnd: amount,
          reason,
          ...(lineId ? { lineId } : {}),
          ...(saleLine && pkg ? { packageId: pkg.id, feeVnd: fee } : {}),
        });
        if (result) setError(result);
        else {
          setError(null);
          setReason('');
          setAmountText('');
          onClose();
        }
      }}
    >
      <div className="sp-field sp-field--sm">
        <span className="sp-field__label" id="rq-pay">
          Hoàn từ khoản nào
        </span>
        <div role="radiogroup" aria-labelledby="rq-pay" className="flex flex-col gap-2">
          {options.map((o) => {
            const off = o.limit.maxVnd <= 0n;
            return (
              <label key={o.payment.id} className="sp-check">
                <input
                  type="radio"
                  name="rq-payment"
                  disabled={off}
                  checked={paymentId === o.payment.id}
                  onChange={() => {
                    setPaymentId(o.payment.id);
                    setAmountText('');
                  }}
                />
                <span>
                  {o.payment.purpose === 'deposit' ? 'Cọc online' : label(o.payment.method)}{' '}
                  {formatVnd(o.payment.amountVnd)}
                  <span className="sp-check__hint">{hint(o)}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {saleLine && pkg ? (
        <div className="flex flex-col gap-2">
          <dl className="sp-kv m-0">
            <dt>Giá gói</dt>
            <dd className="sp-num">{formatVnd(pkg.priceVnd ?? saleLine.unitPriceVnd)}</dd>
            <dt>
              Đã dùng {pkg.usedSessions} buổi × {formatVnd(pkg.unitPriceVnd ?? 0n)}
            </dt>
            <dd className="sp-num">
              −{formatVnd(BigInt(pkg.usedSessions) * (pkg.unitPriceVnd ?? 0n))}
            </dd>
            <dt>Phí hủy</dt>
            <dd className="sp-num">−{formatVnd(fee)}</dd>
            <dt className="font-semibold text-(--ink)">Hoàn (BR-27)</dt>
            <dd className="sp-num font-semibold">{formatVnd(packageAmount ?? 0n)}</dd>
          </dl>
          <div className="w-44">
            <Field id="rq-fee" label="Phí hủy" suffix="₫">
              <input
                id="rq-fee"
                inputMode="numeric"
                value={feeText}
                onChange={(e) => setFeeText(e.target.value.replace(/[^\d.]/g, ''))}
              />
            </Field>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <div className="w-[180px]">
            <Field
              id="rq-a"
              label="Số tiền"
              suffix="₫"
              help={`Tối đa ${formatVnd(max)}`}
              error={amount > max ? `Tối đa ${formatVnd(max)}` : undefined}
            >
              <input
                id="rq-a"
                inputMode="numeric"
                value={amountText === '' ? (returnsSession ? '0' : number.format(max)) : amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ''))}
              />
            </Field>
          </div>
          <div className="min-w-0 flex-1">
            <Field
              id="rq-l"
              label="Cho dòng"
              optional
              help={returnsSession ? 'Dòng dùng buổi gói: buổi được trả lại khi duyệt.' : undefined}
            >
              <select id="rq-l" value={lineId} onChange={(e) => setLineId(e.target.value)}>
                <option value="">Cả hóa đơn</option>
                {invoice.lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.description}
                    {l.packageId ? ' (dùng buổi gói)' : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      )}

      {walletSplit && (
        <p className="sp-num m-0 text-[13px] leading-[18px] text-(--ink-muted)">
          Duyệt thì ví nhận lại {formatVnd(walletSplit.realVnd)} tiền thật,{' '}
          {formatVnd(walletSplit.bonusVnd)} tiền tặng.
        </p>
      )}

      <Field
        id="rq-r"
        label="Lý do"
        help="Bắt buộc. Quản lý thấy lý do khi duyệt (BR-28)."
        error={error}
      >
        <input id="rq-r" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
        Yêu cầu chờ quản lý duyệt. Tiền chưa ra khỏi quầy cho tới lúc đó.
      </p>
    </ConfirmDialog>
  );
}
