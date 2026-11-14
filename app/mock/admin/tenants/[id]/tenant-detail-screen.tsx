'use client';

import { CalendarPlus, ExternalLink, Lock, LockOpen } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { usePlatform, useTenantViews } from '@/components/mock/platform-store';
import { usePlatformActions } from '@/components/mock/use-platform-actions';
import { Button } from '@/components/sapio/button';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { tenantFixtures } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import { INDUSTRY_LABEL, STATE_BADGE, stateLabel, type TenantView } from '@/mock/platform';
import { formatDateTime, formatFullDate, formatTime, localDate } from '@/mock/time';
import { ExtendDialog, LockDialog, UnlockDialog } from './tenant-dialogs';

const num = new Intl.NumberFormat('vi-VN');

function Figure({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="flex min-w-[120px] flex-[1_1_120px] flex-col gap-0.5 rounded-(--radius-md) border border-(--line) p-3">
      <span className="text-[13px] leading-[18px] font-medium text-(--ink-muted)">{label}</span>
      <span className="sp-num text-[22px] leading-7 font-bold">{num.format(value)}</span>
      {note && <span className="text-[13px] leading-[18px] text-(--ink-muted)">{note}</span>}
    </div>
  );
}

/** One line under "Dùng đến": the end and how far it is. */
function untilLine(view: TenantView): string {
  if (!view.endsOn) return '—';
  const end = `23:59, ${formatFullDate(view.endsOn)}`;
  if (view.state === 'expired') return `${end} · hết hạn ${view.daysSince} ngày`;
  return `${end} · còn ${view.daysLeft} ngày`;
}

/** Khách thuê, chi tiết (MH-58): totals only, no way into the tenant's own data (BR-89). */
export function TenantDetailScreen({ tenantId }: { tenantId: string }) {
  const views = useTenantViews();
  const { catalog, payments, log } = usePlatform();
  const { now } = useAccountStore();
  const actions = usePlatformActions();
  const toast = useToast();
  const [dialog, setDialog] = useState<'lock' | 'unlock' | 'extend' | null>(null);
  const view = views.find((v) => v.tenant.id === tenantId);

  if (!view) {
    return (
      <div className="sp-shell__content sp-shell__content--wide">
        <PageHeader
          title="Không có cơ sở này"
          crumbs={[
            { label: 'Khách thuê', href: '/mock/admin/tenants' },
            { label: 'Không tìm thấy' },
          ]}
        />
        <p className="m-0">
          Không có cơ sở nào mang mã này. <Link href="/mock/admin/tenants">Về danh sách</Link>
        </p>
      </div>
    );
  }

  const { tenant } = view;
  const plan = catalog.plans[view.subscription.planCode];
  const planName = plan.name;
  const own = payments[tenant.id] ?? [];
  const entries = log.filter((e) => e.tenantId === tenant.id).reverse();
  const built = tenantFixtures.some((f) => f.tenant.slug === tenant.slug);
  const month = Number(localDate(now).slice(5, 7));
  const t = tenant.totals;
  const locked = view.lock !== null;
  const host = `${tenant.slug}.sapio.vn`;

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <PageHeader
        crumbs={[{ label: 'Khách thuê', href: '/mock/admin/tenants' }, { label: tenant.name }]}
        title={tenant.name}
        sub={
          built ? (
            <Link href={`/mock/${tenant.slug}`}>
              {host} <ExternalLink size={14} aria-hidden="true" className="inline" />
            </Link>
          ) : (
            host
          )
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog('extend')}>
              <CalendarPlus size={16} aria-hidden="true" />
              Gia hạn thủ công
            </Button>
            {locked ? (
              <Button variant="secondary" onClick={() => setDialog('unlock')}>
                <LockOpen size={16} aria-hidden="true" />
                Mở khóa
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setDialog('lock')}>
                <Lock size={16} aria-hidden="true" />
                Khóa cơ sở
              </Button>
            )}
          </>
        }
      />
      <div className="flex items-center gap-2">
        <span className={`sp-badge ${STATE_BADGE[view.state]}`}>{stateLabel(view)}</span>
        {locked && (
          <span className="inline-flex items-center gap-1 text-xs leading-4 font-semibold text-(--danger)">
            <Lock size={14} aria-hidden="true" />
            Bị khóa
          </span>
        )}
      </div>
      {view.lock && (
        <section className="sp-panel" aria-labelledby="td-lock">
          <h2 className="sp-panel__title" id="td-lock">
            Đang bị khóa
          </h2>
          <dl className="sp-kv m-0">
            <dt>Khóa lúc</dt>
            <dd className="sp-num">{formatDateTime(view.lock.at)}</dd>
            <dt>Lý do chủ cơ sở thấy</dt>
            <dd>{view.lock.reason}</dd>
          </dl>
        </section>
      )}
      <div className="flex flex-wrap items-stretch gap-(--space-4)">
        <div className="flex min-w-0 flex-[1_1_0] flex-col gap-(--space-4)">
          <section className="sp-panel" aria-labelledby="td-info">
            <h2 className="sp-panel__title" id="td-info">
              Thông tin
            </h2>
            <dl className="sp-kv m-0">
              <dt>Ngành</dt>
              <dd className="sp-num">
                {INDUSTRY_LABEL[tenant.industry]} · gói ngành bản {tenant.templateVersion}
              </dd>
              <dt>Chủ cơ sở</dt>
              <dd className="sp-num">
                {tenant.ownerName} · {tenant.ownerEmail}
              </dd>
              <dt>Tạo ngày</dt>
              <dd className="sp-num">{formatFullDate(tenant.createdOn)}</dd>
              <dt>Chủ cơ sở đăng nhập gần nhất</dt>
              <dd className="sp-num">
                {formatTime(tenant.ownerLastLoginAt)},{' '}
                {formatFullDate(localDate(tenant.ownerLastLoginAt))}
              </dd>
            </dl>
          </section>
          <section className="sp-panel" aria-labelledby="td-fig">
            <h2 className="sp-panel__title" id="td-fig">
              Số liệu
            </h2>
            <div className="flex flex-wrap items-stretch gap-3">
              <Figure label="Chi nhánh" value={t.branches} />
              <Figure
                label="Thành viên"
                value={t.members}
                note={`${t.takingBookings} nhận khách`}
              />
              <Figure
                label={`Lịch hẹn tháng ${month}`}
                value={t.appointmentsMonth}
                note={`đến ${formatFullDate(localDate(now)).slice(0, 5)}`}
              />
              <Figure label="Lịch hẹn 30 ngày" value={t.appointments30} />
              <Figure label="Khách đã lưu" value={t.customers} />
              {view.state === 'expired' ? (
                <Figure label="Lịch hẹn sau hạn" value={t.afterExpiry} note="chỉ đọc (BR-82)" />
              ) : (
                <Figure label="Lịch hẹn sắp tới" value={t.upcoming} />
              )}
            </div>
            <p className="sp-panel__note">
              Chỉ có số tổng. Quản trị nền tảng không mở được lịch, khách, hóa đơn của cơ sở; muốn
              xem phải được chủ cơ sở mời vào.
            </p>
          </section>
        </div>
        <div className="flex min-w-0 flex-[1.4_1_0] flex-col gap-(--space-4)">
          <section className="sp-panel" aria-labelledby="td-plan">
            <h2 className="sp-panel__title" id="td-plan">
              Gói
            </h2>
            <dl className="sp-kv m-0">
              <dt>Gói</dt>
              <dd className="sp-num">
                {planName}
                {view.subscription.periodEndsOn ? `, ${tenant.planMonths} tháng` : ' (dùng thử)'}
              </dd>
              <dt>Dùng đến</dt>
              <dd className="sp-num">{untilLine(view)}</dd>
            </dl>
            <div
              className="sp-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Thanh toán gói, cuộn được"
            >
              <table className="sp-table">
                <caption className="sp-sr-only">Thanh toán gói</caption>
                <thead>
                  <tr>
                    <th scope="col">Ngày</th>
                    <th scope="col">Nội dung</th>
                    <th scope="col" className="sp-table__num">
                      Số tiền
                    </th>
                    <th scope="col">Nguồn</th>
                  </tr>
                </thead>
                <tbody>
                  {own.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <span className="text-[13px] text-(--ink-muted)">
                          Chưa có thanh toán nào
                        </span>
                      </td>
                    </tr>
                  ) : (
                    own.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span className="sp-num">{formatFullDate(p.date)}</span>
                        </td>
                        <td>{p.label}</td>
                        <td className="sp-table__num sp-num">
                          {p.amountVnd === 0n ? (
                            <span className="sp-muted">0</span>
                          ) : (
                            formatVnd(p.amountVnd).replace(' ₫', '')
                          )}
                        </td>
                        <td>{p.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="sp-panel" aria-labelledby="td-log">
            <h2 className="sp-panel__title" id="td-log">
              Nhật ký quản trị
            </h2>
            <div
              className="sp-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Thao tác của quản trị nền tảng, cuộn được"
            >
              <table className="sp-table">
                <caption className="sp-sr-only">Thao tác của quản trị nền tảng</caption>
                <thead>
                  <tr>
                    <th scope="col">Lúc</th>
                    <th scope="col">Người</th>
                    <th scope="col">Thao tác</th>
                    <th scope="col">Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td>
                        <span className="sp-num">—</span>
                      </td>
                      <td />
                      <td>
                        <span className="text-[13px] text-(--ink-muted)">Chưa có thao tác nào</span>
                      </td>
                      <td />
                    </tr>
                  ) : (
                    entries.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <span className="sp-num">{formatDateTime(e.at)}</span>
                        </td>
                        <td>{e.by}</td>
                        <td>
                          {e.action}
                          {e.detail ? `: ${e.detail}` : ''}
                        </td>
                        <td>{e.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="sp-panel__note">
              Khóa, mở khóa, gia hạn thủ công đều ghi ở đây và ở Nhật ký nền tảng (BR-75).
            </p>
          </section>
        </div>
      </div>

      {dialog === 'lock' && (
        <LockDialog
          view={view}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => {
            actions.lock(view, reason);
            setDialog(null);
            toast({ text: `Đã khóa ${tenant.name}. Thư báo đã gửi chủ cơ sở.` });
          }}
        />
      )}
      {dialog === 'unlock' && (
        <UnlockDialog
          view={view}
          onClose={() => setDialog(null)}
          onConfirm={(reason) => {
            actions.unlock(view, reason);
            setDialog(null);
            toast({ text: `Đã mở khóa ${tenant.name}.` });
          }}
        />
      )}
      {dialog === 'extend' && (
        <ExtendDialog
          view={view}
          now={now}
          planName={planName}
          onClose={() => setDialog(null)}
          onConfirm={(days, reason) => {
            actions.extend(view, days, reason);
            setDialog(null);
            toast({ text: `Đã gia hạn ${tenant.name} thêm ${days} ngày.` });
          }}
        />
      )}
    </div>
  );
}
