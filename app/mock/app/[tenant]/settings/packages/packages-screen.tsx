'use client';

import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GatedPage } from '@/components/mock/locked-feature';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useServiceStore } from '@/components/mock/service-store';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { Button } from '@/components/sapio/button';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { Field, SwitchRow } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { SidePanel } from '@/components/sapio/side-panel';
import { useToast } from '@/components/sapio/toast';
import { cn } from '@/lib/utils';
import type { PackageProduct } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import { parseVnd } from '@/mock/money';
import { packageSaving, percentText, soldCount } from '@/mock/shop';

let packageSequence = 0;
const number = new Intl.NumberFormat('vi-VN');

interface Draft {
  /** `null` for a new package. */
  id: string | null;
  name: string;
  variantId: string;
  sessions: string;
  price: string;
  days: string;
  selling: boolean;
}

/** Gói liệu trình (MH-51): the packages the shop sells; a change counts for the ones sold after it (BR-38). */
export function PackagesScreen({ tenantSlug }: { tenantSlug: string }) {
  const { can } = useSubscription();
  if (!can('packages_wallet')) {
    return (
      <GatedPage
        feature="packages_wallet"
        tenantSlug={tenantSlug}
        path={['settings', 'packages']}
        inSettings
      />
    );
  }
  return <PackagesList tenantSlug={tenantSlug} />;
}

function PackagesList({ tenantSlug }: { tenantSlug: string }) {
  const { fixture, ctx } = useDesk(tenantSlug);
  const store = useScheduleStore();
  const { services } = useServiceStore();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);

  const variants = useMemo(
    () =>
      services.flatMap((s) =>
        s.variants.map((v) => ({
          id: v.id,
          label: s.variants.length === 1 ? s.name : `${s.name} · ${v.name}`,
          retail: v.priceVnd,
        })),
      ),
    [services],
  );
  const variantOf = (id: string) => variants.find((v) => v.id === id);
  const catalog = store.packageCatalog;

  const open = (p?: PackageProduct) =>
    setDraft(
      p
        ? {
            id: p.id,
            name: p.name,
            variantId: p.serviceVariantId,
            sessions: String(p.totalSessions),
            price: number.format(p.priceVnd),
            days: String(p.validDays),
            selling: p.selling,
          }
        : {
            id: null,
            name: '',
            variantId: variants[0]?.id ?? '',
            sessions: '10',
            price: '',
            days: '180',
            selling: true,
          },
    );

  const sessions = draft && /^\d{1,3}$/.test(draft.sessions) ? Number(draft.sessions) : 0;
  const price = draft ? parseVnd(draft.price) : null;
  const days = draft && /^\d{1,4}$/.test(draft.days) ? Number(draft.days) : 0;
  const problem = !draft
    ? null
    : draft.name.trim() === ''
      ? 'Nhập tên gói.'
      : !variantOf(draft.variantId)
        ? 'Chọn dịch vụ áp dụng.'
        : sessions < 1
          ? 'Số buổi từ 1 trở lên.'
          : price === null || price <= 0n
            ? 'Nhập giá gói lớn hơn 0.'
            : days < 1
              ? 'Hạn dùng từ 1 ngày trở lên.'
              : null;
  const saving =
    draft && price !== null && sessions > 0 && variantOf(draft.variantId)
      ? packageSaving(price, sessions, variantOf(draft.variantId)!.retail)
      : null;

  function save() {
    if (!draft || problem || price === null) return;
    const now = ctx();
    const before = catalog.find((p) => p.id === draft.id);
    const next: PackageProduct = {
      id: before?.id ?? `${fixture.tenant.id}-pkg-new-${(packageSequence += 1)}`,
      selling: draft.selling,
      name: draft.name.trim(),
      serviceVariantId: draft.variantId,
      totalSessions: sessions,
      validDays: days,
      priceVnd: price,
    };
    const changed: string[] = before
      ? [
          before.name !== next.name ? `tên ${before.name} → ${next.name}` : '',
          before.serviceVariantId !== next.serviceVariantId
            ? `dịch vụ ${variantOf(before.serviceVariantId)?.label ?? ''} → ${variantOf(next.serviceVariantId)?.label ?? ''}`
            : '',
          before.totalSessions !== next.totalSessions
            ? `số buổi ${before.totalSessions} → ${next.totalSessions}`
            : '',
          before.priceVnd !== next.priceVnd
            ? `giá ${formatVnd(before.priceVnd)} → ${formatVnd(next.priceVnd)}`
            : '',
          before.validDays !== next.validDays
            ? `hạn ${before.validDays} → ${next.validDays} ngày`
            : '',
          before.selling !== next.selling ? (next.selling ? 'mở bán' : 'ngừng bán') : '',
        ].filter(Boolean)
      : [];
    if (before && changed.length === 0) {
      setDraft(null);
      return;
    }
    store.saveSettings(
      {
        packageCatalog: before
          ? catalog.map((p) => (p.id === next.id ? next : p))
          : [...catalog, next],
      },
      {
        at: now.now,
        actor: { name: now.actor, role: now.role },
        entries: [
          {
            action: before ? 'Sửa gói liệu trình' : 'Thêm gói liệu trình',
            object: next.name,
            href: 'settings/packages',
            detail: before
              ? changed.join('; ')
              : `${next.totalSessions} buổi · ${formatVnd(next.priceVnd)} · ${next.validDays} ngày`,
          },
        ],
      },
    );
    toast({
      text: before
        ? `Đã lưu ${next.name}. Áp cho gói bán từ lúc này; gói khách đã mua giữ giá lúc mua.`
        : `Đã thêm ${next.name}.`,
    });
    setDraft(null);
  }

  const columns: Column<PackageProduct>[] = [
    {
      key: 'name',
      width: '30%',
      label: 'Gói',
      cell: (p) => (
        <div className="sp-table__primary">
          <span className="min-w-0">
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-(--ink) hover:text-(--brand)"
              onClick={() => open(p)}
            >
              {p.name}
            </button>
            <span className="sp-table__secondary">{variantOf(p.serviceVariantId)?.label}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'sessions',
      width: '11%',
      label: 'Số buổi',
      numeric: true,
      cell: (p) => <span className="sp-num">{p.totalSessions}</span>,
    },
    {
      key: 'price',
      width: '15%',
      label: 'Giá',
      numeric: true,
      cell: (p) => <span className="sp-num">{formatVnd(p.priceVnd)}</span>,
    },
    {
      key: 'days',
      width: '14%',
      label: 'Hạn dùng',
      numeric: true,
      cell: (p) => <span className="sp-num">{p.validDays} ngày</span>,
    },
    {
      key: 'sold',
      width: '14%',
      label: 'Đã bán',
      numeric: true,
      cell: (p) => <span className="sp-num">{soldCount(store.customers, p.id)} đã bán</span>,
    },
    {
      key: 'status',
      width: '16%',
      label: 'Trạng thái',
      cell: (p) => (
        <span className={cn('sp-badge', p.selling ? 'sp-badge--confirmed' : 'sp-badge--cancelled')}>
          {p.selling ? 'Đang bán' : 'Ngừng bán'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Gói liệu trình' }]}
        title="Gói liệu trình"
        sub="Bán ở quầy (MH-30); doanh thu ghi theo buổi dùng (BR-26)"
        actions={
          <Button variant="primary" onClick={() => open()}>
            <Plus size={16} aria-hidden="true" />
            Thêm gói
          </Button>
        }
      />
      <div className="flex items-start gap-(--space-5)">
        <section className="min-w-0 flex-auto" aria-label="Gói liệu trình">
          {catalog.length === 0 ? (
            <p className="sp-empty m-0">Chưa có gói nào. Thêm gói đầu tiên để bán ở quầy.</p>
          ) : (
            <DataTable
              label="Gói liệu trình"
              columns={columns}
              rows={catalog}
              rowKey={(p) => p.id}
              minWidth={760}
              onRowOpen={open}
              cards={(p) => (
                <button
                  type="button"
                  className="sp-cards__item w-full text-left"
                  onClick={() => open(p)}
                >
                  <span className="sp-cards__body">
                    <span className="sp-cards__title">{p.name}</span>
                    <span className="sp-cards__meta">
                      {p.totalSessions} buổi · {formatVnd(p.priceVnd)} · {p.validDays} ngày ·{' '}
                      {p.selling ? 'Đang bán' : 'Ngừng bán'}
                    </span>
                  </span>
                </button>
              )}
              foot={
                <div className="sp-table-foot">
                  <span>{catalog.length} gói</span>
                </div>
              }
              phoneFoot={<p className="sp-table-foot m-0">{catalog.length} gói</p>}
            />
          )}
        </section>
        {draft && (
          <SidePanel
            title={draft.id ? draft.name || 'Sửa gói' : 'Thêm gói'}
            onClose={() => setDraft(null)}
            footer={
              <>
                <Button onClick={() => setDraft(null)}>Hủy</Button>
                <Button variant="primary" disabled={problem !== null} onClick={save}>
                  Lưu
                </Button>
              </>
            }
          >
            <Field id="pk-n" label="Tên gói">
              <input
                id="pk-n"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field id="pk-s" label="Dịch vụ áp dụng" help="Một gói dùng cho một biến thể dịch vụ.">
              <select
                id="pk-s"
                value={draft.variantId}
                onChange={(e) => setDraft({ ...draft, variantId: e.target.value })}
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-3">
              <div className="w-[120px]">
                <Field id="pk-q" label="Số buổi">
                  <input
                    id="pk-q"
                    inputMode="numeric"
                    value={draft.sessions}
                    onChange={(e) =>
                      setDraft({ ...draft, sessions: e.target.value.replace(/\D/g, '') })
                    }
                  />
                </Field>
              </div>
              <div className="w-[180px]">
                <Field id="pk-p" label="Giá gói" suffix="₫">
                  <input
                    id="pk-p"
                    inputMode="numeric"
                    value={draft.price}
                    onChange={(e) =>
                      setDraft({ ...draft, price: e.target.value.replace(/[^\d.]/g, '') })
                    }
                  />
                </Field>
              </div>
              <div className="w-[140px]">
                <Field id="pk-d" label="Hạn dùng" suffix="ngày">
                  <input
                    id="pk-d"
                    inputMode="numeric"
                    value={draft.days}
                    onChange={(e) =>
                      setDraft({ ...draft, days: e.target.value.replace(/\D/g, '') })
                    }
                  />
                </Field>
              </div>
            </div>
            {saving && (
              <p
                role="status"
                className={cn(
                  'sp-fit m-0',
                  saving.percentTenths > 0 ? 'sp-fit--ok' : 'sp-fit--bad',
                )}
              >
                <span>
                  {formatVnd(saving.perSession)} mỗi buổi,{' '}
                  {saving.percentTenths > 0
                    ? `rẻ hơn giá lẻ ${formatVnd(variantOf(draft.variantId)!.retail)} là ${percentText(saving.percentTenths)}%.`
                    : `không rẻ hơn giá lẻ ${formatVnd(variantOf(draft.variantId)!.retail)}.`}
                </span>
              </p>
            )}
            {problem && (
              <p role="status" className="sp-fit sp-fit--bad m-0">
                <span>{problem}</span>
              </p>
            )}
            <SwitchRow
              label="Đang bán"
              hint="Tắt thì không bán thêm; gói khách đã mua vẫn dùng tới hết hạn."
              checked={draft.selling}
              onChange={(selling) => setDraft({ ...draft, selling })}
            />
            <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
              Sửa giá hay số buổi chỉ áp cho gói bán từ lúc lưu.
              {draft.id && soldCount(store.customers, draft.id) > 0
                ? ` ${soldCount(store.customers, draft.id)} gói đã bán giữ giá lúc mua (BR-38).`
                : ''}
            </p>
          </SidePanel>
        )}
      </div>
    </>
  );
}
