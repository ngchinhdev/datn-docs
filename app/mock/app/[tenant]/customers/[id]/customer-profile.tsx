'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { StatusBadge } from '@/components/sapio/status-badge';
import { useToast } from '@/components/sapio/toast';
import { addAudit } from '@/mock/audit';
import { customerRows } from '@/mock/customers';
import { formatPhone, formatVnd } from '@/mock/format';
import { walletBalance } from '@/mock/money';
import { withdrawReal } from '@/mock/money-ops';
import { lookups } from '@/mock/reception';
import { describeSubject } from '@/mock/subject-schema';
import { formatDateTime, formatFullDate, localDate, MOCK_NOW } from '@/mock/time';
import { dayMonth, entryAmountText, ledgerOf, signedVnd } from '@/mock/wallet-view';

const HISTORY_SHORT = 4;

/** Hồ sơ khách (MH-33): visits with their invoices, the wallet ledger, packages, the internal note, the deposit rule. */
export function CustomerProfile({ tenantSlug, id }: { tenantSlug: string; id: string }) {
  const desk = useDesk(tenantSlug);
  const { fixture, world, apply, ctx, role, canManage } = desk;
  const store = useScheduleStore();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const L = useMemo(() => lookups(fixture), [fixture]);
  const customer = world.customers.find((c) => c.id === id);
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState(customer?.note ?? '');
  const [withdrawing, setWithdrawing] = useState(false);
  const [waiving, setWaiving] = useState(false);
  const [waiveReason, setWaiveReason] = useState('');

  const row = useMemo(
    () =>
      customerRows(
        { ...fixture, customers: world.customers, appointments: world.appointments },
        MOCK_NOW,
      ).find((r) => r.id === id),
    [fixture, world.customers, world.appointments, id],
  );

  if (!customer || !row) {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">
          Không tìm thấy khách này.{' '}
          <Link href={appHref('customers')} className="font-medium">
            Về danh sách khách
          </Link>
        </p>
      </div>
    );
  }
  if (role === 'technician') {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">Hồ sơ khách do lễ tân, quản lý và chủ cơ sở xem.</p>
      </div>
    );
  }

  const appts = world.appointments
    .filter((a) => a.customerId === customer.id && a.status !== 'held')
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
  const shown = showAll ? appts : appts.slice(0, HISTORY_SHORT);
  const ledger = ledgerOf(world.money.walletEntries, customer.id);
  const balance = walletBalance(world.money.walletEntries, customer.id);
  const since = customer.consentAt ?? appts.at(-1)?.startAt;
  const k = fixture.policies.depositAfterNoShows;
  const subject = fixture.template.vocabulary.subject;
  const pets = fixture.servedSubjects.filter(
    (s) => s.customerId === customer.id && s.kind === 'other',
  );
  const invoiceOf = (apptId: string) =>
    world.money.invoices.find((i) => i.appointmentId === apptId);

  const sub = [
    formatPhone(customer.phone),
    customer.email,
    since ? `khách từ ${formatFullDate(localDate(since))}` : null,
    `${row.visits} lần đến, ${row.noShows} lần không đến`,
  ]
    .filter(Boolean)
    .join(' · ');

  function saveNote() {
    if (!customer || note === (customer.note ?? '')) return;
    const { note: _old, ...rest } = customer;
    store.replaceCustomer(note.trim() === '' ? rest : { ...rest, note: note.trim() });
    toast({ text: 'Đã lưu ghi chú nội bộ.' });
  }

  function setDeposit(on: boolean, reason: string) {
    if (!customer) return;
    const now = ctx();
    store.replaceCustomer({
      ...customer,
      depositOverride: { on, reason, by: now.actor, at: now.now },
    });
    // BR-63: a rule about money that a person changed is logged.
    store.setMoney((m) => ({
      ...m,
      audit: addAudit(
        m.audit,
        now.now,
        { name: now.actor, role: now.role },
        {
          action: on ? 'Bật bắt buộc cọc' : 'Tắt bắt buộc cọc',
          object: customer.name,
          href: `customers/${customer.id}`,
          detail: reason || 'Bật tay',
        },
      ),
    }));
    toast({ text: on ? 'Lần sau khách phải đặt cọc.' : 'Đã tắt bắt buộc đặt cọc.' });
  }

  const depositHint = `${row.depositRequired ? 'Bật' : 'Tắt'}. Không đến ${row.noShows} lần trong 6 tháng; đủ ${k} lần thì tự bật (BR-10). Tắt tay cần quản lý và lý do.`;
  const staffOf = (a: (typeof appts)[number]) =>
    [...new Set(a.items.map((i) => L.name(i.staffResourceId)))].join(', ');

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Khách hàng', href: appHref('customers') }, { label: customer.name }]}
        title={customer.name}
        sub={sub}
        actions={
          <Link
            href={appHref('sales/new', { customer: customer.id })}
            className="sp-btn sp-btn--primary no-underline"
          >
            Bán gói, nạp ví
          </Link>
        }
      />
      <div className="sp-detail">
        <div className="sp-detail__main flex min-w-0 flex-[1_1_560px] flex-col gap-5">
          <section className="sp-panel" aria-labelledby="cu-h">
            <div className="flex items-center gap-2">
              <h2 className="sp-panel__title" id="cu-h">
                Lịch sử lịch hẹn
              </h2>
              {appts.length > HISTORY_SHORT && (
                <button
                  type="button"
                  className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-sm leading-5 font-medium text-(--brand)"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? 'Thu gọn' : `Xem tất cả ${appts.length}`}
                </button>
              )}
            </div>
            {appts.length === 0 ? (
              <p className="sp-empty m-0">Khách chưa có lịch hẹn nào.</p>
            ) : (
              <div
                className="sp-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Lịch sử lịch hẹn, cuộn được"
              >
                <table className="sp-table">
                  <caption className="sp-sr-only">Lịch sử lịch hẹn</caption>
                  <thead>
                    <tr>
                      <th scope="col">Giờ</th>
                      <th scope="col">Dịch vụ</th>
                      <th scope="col">{fixture.template.vocabulary.staff}</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Hóa đơn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((a) => {
                      const invoice = invoiceOf(a.id);
                      return (
                        <tr key={a.id}>
                          <td>
                            <span className="sp-num">{formatDateTime(a.startAt)}</span>
                          </td>
                          <td>{L.services(a)}</td>
                          <td>{staffOf(a)}</td>
                          <td>
                            <StatusBadge status={a.status} />
                          </td>
                          <td>
                            {invoice && (
                              <Link href={appHref(`invoices/${invoice.id}`)} className="sp-num">
                                {invoice.number}
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="sp-panel" aria-labelledby="cu-w">
            <h2 className="sp-panel__title" id="cu-w">
              Sổ ví
            </h2>
            {ledger.length === 0 ? (
              <p className="sp-empty m-0">Ví chưa có bút toán nào.</p>
            ) : (
              <div
                className="sp-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Sổ ví, cuộn được"
              >
                <table className="sp-table">
                  <caption className="sp-sr-only">Sổ ví</caption>
                  <thead>
                    <tr>
                      <th scope="col">Ngày</th>
                      <th scope="col">Diễn giải</th>
                      <th scope="col" className="sp-table__num">
                        Tiền thật
                      </th>
                      <th scope="col" className="sp-table__num">
                        Tiền tặng
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((e) => {
                      const invoice = e.invoiceId
                        ? world.money.invoices.find((i) => i.id === e.invoiceId)
                        : undefined;
                      return (
                        <tr key={e.id} title={entryAmountText(e)}>
                          <td>
                            <span className="sp-num">{dayMonth(e.at)}</span>
                          </td>
                          <td>
                            {invoice ? (
                              <Link href={appHref(`invoices/${invoice.id}`)}>{e.memo}</Link>
                            ) : (
                              e.memo
                            )}
                          </td>
                          <td className="sp-table__num sp-num">
                            {e.realVnd === 0n ? formatVnd(0n) : signedVnd(e.realVnd)}
                          </td>
                          <td className="sp-table__num sp-num">
                            {e.bonusVnd === 0n ? formatVnd(0n) : signedVnd(e.bonusVnd)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="sp-panel__note">
              Mỗi dòng là một bút toán; muốn sửa thì ghi bút toán đảo (BR-20).
            </p>
          </section>

          {subject && (
            <section className="sp-panel" aria-labelledby="cu-pets">
              <h2 className="sp-panel__title" id="cu-pets">
                {subject.charAt(0).toUpperCase() + subject.slice(1)}
              </h2>
              {pets.length === 0 ? (
                <p className="sp-empty m-0">Chưa có {subject} nào.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm leading-5">
                  {pets.map((p) => (
                    <li key={p.id}>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-(--ink-muted)">
                        {' '}
                        · {describeSubject(fixture.template.subjectSchema, p)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="sp-panel__note">Chỉ xem; khách tự sửa ở trang của họ (BR-17).</p>
            </section>
          )}
        </div>

        <aside
          className="sp-detail__side flex flex-[0_0_360px] flex-col gap-4"
          aria-label="Ví, ghi chú"
        >
          <section className="sp-panel" aria-labelledby="cu-b">
            <h2 className="sp-panel__title" id="cu-b">
              Ví và gói
            </h2>
            <dl className="sp-kv">
              <dt>Số dư ví</dt>
              <dd className="sp-num">{formatVnd(balance.balanceVnd)}</dd>
              <dt>Tiền thật</dt>
              <dd className="sp-num">{formatVnd(balance.realVnd)}</dd>
              <dt>Tiền tặng</dt>
              <dd className="sp-num">{formatVnd(balance.bonusVnd)}</dd>
              <dt>Gói</dt>
              <dd className="sp-num">
                {customer.packages?.filter((p) => !p.refunded).length
                  ? customer.packages
                      .filter((p) => !p.refunded)
                      .map(
                        (p) =>
                          `${p.name} · còn ${p.remainingSessions}/${p.totalSessions} buổi, hạn ${p.expiresAt}`,
                      )
                      .join('; ')
                  : 'không có'}
              </dd>
            </dl>
            <p className="sp-panel__note">
              {balance.realVnd > 0n
                ? 'Rút tiền chỉ lấy phần tiền thật còn lại, không rút tiền tặng (BR-25).'
                : 'Không rút được: chỉ rút phần tiền thật (BR-25).'}
            </p>
            <div className="flex gap-2">
              <Link
                href={appHref('sales/new', { type: 'wallet', customer: customer.id })}
                className="sp-btn sp-btn--secondary sp-btn--sm no-underline"
              >
                Nạp ví
              </Link>
              <Button
                variant="ghost"
                size="sm"
                disabled={balance.realVnd <= 0n || !canManage}
                title={!canManage && balance.realVnd > 0n ? 'Cần quản lý' : undefined}
                onClick={() => setWithdrawing(true)}
              >
                Rút tiền thật
              </Button>
            </div>
          </section>

          <section className="sp-panel" aria-labelledby="cu-x">
            <h2 className="sp-panel__title" id="cu-x">
              Ghi chú và cọc
            </h2>
            <Field
              id="cu-n"
              label="Ghi chú nội bộ"
              area
              help="Khách không bao giờ thấy ghi chú này (BR-62)."
            >
              <textarea
                id="cu-n"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={saveNote}
              />
            </Field>
            <label className="sp-switch">
              <span>
                <span className="block text-sm leading-5 font-medium">Bắt buộc đặt cọc</span>
                <span className="block text-[13px] leading-[18px] text-(--ink-muted)">
                  {depositHint}
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={row.depositRequired}
                disabled={row.depositRequired && !canManage}
                onChange={(e) =>
                  e.target.checked ? setDeposit(true, 'Bật tay') : setWaiving(true)
                }
              />
            </label>
            {row.depositRequired && !canManage && (
              <p className="sp-panel__note">Tắt cần quản lý hoặc chủ cơ sở.</p>
            )}
          </section>

          <section className="sp-panel" aria-labelledby="cu-c">
            <h2 className="sp-panel__title" id="cu-c">
              Đồng ý
            </h2>
            <dl className="sp-kv">
              <dt>Xử lý dữ liệu</dt>
              <dd className="sp-num">
                {customer.consentAt
                  ? `${formatFullDate(localDate(customer.consentAt))}, đặt online`
                  : 'Chưa ghi nhận'}
              </dd>
              <dt>Tin khuyến mãi</dt>
              <dd className="sp-num">{customer.marketingOptIn ? 'Nhận' : 'Không nhận'}</dd>
            </dl>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={withdrawing}
        title={`Rút ${formatVnd(balance.realVnd)} tiền thật của ${customer.name}?`}
        body={`Tiền tặng ${formatVnd(balance.bonusVnd)} ở lại trong ví. Việc rút được ghi vào nhật ký (BR-63).`}
        confirmLabel={`Rút ${formatVnd(balance.realVnd)}`}
        onClose={() => setWithdrawing(false)}
        onConfirm={() => {
          apply((w) => withdrawReal(w, customer.id, ctx()));
          setWithdrawing(false);
          toast({ text: `Đã rút ${formatVnd(balance.realVnd)} tiền thật.` });
        }}
      />
      <ConfirmDialog
        open={waiving}
        title={`Tắt bắt buộc đặt cọc cho ${customer.name}?`}
        body="Lần sau khách đặt lịch không phải cọc. Cần ghi lý do."
        confirmLabel="Tắt bắt buộc cọc"
        confirmDisabled={waiveReason.trim() === ''}
        onClose={() => setWaiving(false)}
        onConfirm={() => {
          setDeposit(false, waiveReason.trim());
          setWaiving(false);
          setWaiveReason('');
        }}
      >
        <Field id="cu-reason" label="Lý do">
          <input
            id="cu-reason"
            value={waiveReason}
            onChange={(e) => setWaiveReason(e.target.value)}
          />
        </Field>
      </ConfirmDialog>
    </>
  );
}
