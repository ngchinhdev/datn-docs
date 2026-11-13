'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { Button } from '@/components/sapio/button';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { LockIcon } from '@/components/sapio/lock-icon';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import type { Branch } from '@/mock/fixtures';

/** Chi nhánh (MH-42): the branches of the shop; the Cơ bản plan has one (BR-85). */
export function BranchesScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = useLiveFixture(tenantSlug);
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const { can } = useSubscription();
  const multi = can('multi_branch');

  const staffCount = fixture.staff.length;
  const resourceCount = fixture.resources.filter(
    (r) => !fixture.resourceTypes.find((t) => t.id === r.resourceTypeId)?.isStaff,
  ).length;

  const columns: Column<Branch>[] = [
    {
      key: 'name',
      width: '28%',
      label: 'Chi nhánh',
      cell: (b) => (
        <div className="sp-table__primary">
          <span className="min-w-0">
            <Link href={appHref(`settings/branches/${b.id}`)}>{b.name}</Link>
            {fixture.branches[0]?.id === b.id && (
              <span className="sp-table__secondary">Chi nhánh đầu tiên</span>
            )}
          </span>
        </div>
      ),
    },
    { key: 'address', width: '36%', label: 'Địa chỉ', cell: (b) => b.address },
    {
      key: 'staff',
      width: '14%',
      label: 'Nhân viên',
      numeric: true,
      cell: () => <span className="sp-num">{staffCount}</span>,
    },
    {
      key: 'resources',
      width: '14%',
      label: 'Tài nguyên',
      numeric: true,
      cell: () => <span className="sp-num">{resourceCount}</span>,
    },
    {
      key: 'go',
      width: '8%',
      label: 'Mở',
      labelHidden: true,
      cell: (b) => (
        <Link
          href={appHref(`settings/branches/${b.id}`)}
          className="sp-icon-btn"
          aria-label={`Mở ${b.name}`}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Cài đặt', href: appHref('settings') }, { label: 'Chi nhánh' }]}
        title="Chi nhánh"
        sub={
          multi
            ? `${fixture.branches.length} chi nhánh`
            : 'Gói Cơ bản có một chi nhánh. Thêm chi nhánh cần nâng gói (BR-85).'
        }
        actions={
          <Button
            variant="primary"
            disabled={!multi}
            title={multi ? undefined : 'Cần nâng gói'}
            onClick={() => toast({ text: 'Thêm chi nhánh: chưa có trong mock.' })}
          >
            {multi ? <Plus size={16} aria-hidden="true" /> : <LockIcon />}
            Thêm chi nhánh
            {!multi && <span className="sp-sr-only"> (cần nâng gói)</span>}
          </Button>
        }
      />
      <DataTable
        label="Danh sách chi nhánh"
        columns={columns}
        rows={fixture.branches}
        rowKey={(b) => b.id}
        minWidth={640}
        cards={(b) => (
          <Link href={appHref(`settings/branches/${b.id}`)} className="sp-cards__item">
            <span className="sp-cards__body">
              <span className="sp-cards__title">{b.name}</span>
              <span className="sp-cards__meta">
                {b.address} · {staffCount} nhân viên, {resourceCount} tài nguyên
              </span>
            </span>
            <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
          </Link>
        )}
        foot={
          <div className="sp-table-foot">
            <span>{fixture.branches.length} chi nhánh</span>
          </div>
        }
        phoneFoot={<p className="sp-table-foot m-0">{fixture.branches.length} chi nhánh</p>}
      />
    </>
  );
}
