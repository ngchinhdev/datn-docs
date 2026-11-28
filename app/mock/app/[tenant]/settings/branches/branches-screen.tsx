'use client';

import { ChevronRight, Info, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Notice } from '@/components/mock/password-field';
import { usePlatform } from '@/components/mock/platform-store';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useQueryState } from '@/components/mock/use-query-state';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { DataTable, type Column } from '@/components/sapio/data-table';
import { ChipMenu } from '@/components/sapio/filters';
import { Field } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import type { Branch } from '@/mock/fixtures';
import {
  atBranchLimit,
  branchNameTaken,
  cleanName,
  DEFAULT_HOURS,
  isActive,
  phoneProblem,
} from '@/mock/branch-settings';

/** Chi nhánh (MH-42): the branches of the shop, and how many the plan allows (BR-93.2). */
export function BranchesScreen({ tenantSlug }: { tenantSlug: string }) {
  const store = useScheduleStore();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const router = useRouter();
  const { entitlements } = useSubscription();
  const { catalog } = usePlatform();
  const [status, setStatus] = useQueryState('status', '');
  const [adding, setAdding] = useState(false);

  const planName = catalog.plans[entitlements.planCode].name;
  const max = entitlements.limits.branches;
  const all: Branch[] = [store.branch, ...store.extraBranches];
  const active = all.filter(isActive);
  const full = atBranchLimit(active.length, max);
  const rows =
    status === 'archived' ? all.filter((b) => !isActive(b)) : status === 'all' ? all : active;

  const staffTypeIds = new Set(store.resourceTypes.filter((t) => t.isStaff).map((t) => t.id));
  const countsOf = (b: Branch) => {
    const own = store.resources.filter((r) => r.branchId === b.id && isActive(r));
    const staff = own.filter((r) => staffTypeIds.has(r.resourceTypeId)).length;
    return { staff, other: own.length - staff };
  };

  const columns: Column<Branch>[] = [
    {
      key: 'name',
      width: '26%',
      label: 'Chi nhánh',
      cell: (b) => (
        <div className="sp-table__primary">
          <span className="min-w-0">
            <Link href={appHref(`settings/branches/${b.id}`)}>{b.name}</Link>
            {store.branch.id === b.id && (
              <span className="sp-table__secondary">Chi nhánh đầu tiên</span>
            )}
          </span>
        </div>
      ),
    },
    { key: 'address', width: '32%', label: 'Địa chỉ', cell: (b) => b.address },
    {
      key: 'staff',
      width: '11%',
      label: 'Nhân viên',
      numeric: true,
      cell: (b) => <span className="sp-num">{countsOf(b).staff}</span>,
    },
    {
      key: 'resources',
      width: '11%',
      label: 'Tài nguyên',
      numeric: true,
      cell: (b) => <span className="sp-num">{countsOf(b).other}</span>,
    },
    {
      key: 'status',
      width: '14%',
      label: 'Trạng thái',
      cell: (b) =>
        isActive(b) ? (
          <span className="sp-badge sp-badge--confirmed">Đang dùng</span>
        ) : (
          <span className="sp-badge sp-badge--completed">Đã ngừng dùng</span>
        ),
    },
    {
      key: 'go',
      width: '6%',
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
          max === null
            ? `${active.length} chi nhánh đang dùng`
            : `${active.length} chi nhánh đang dùng, gói ${planName} cho tối đa ${max}`
        }
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" />
            Thêm chi nhánh
          </Button>
        }
      />
      {full && (
        <Notice tone="info" role="status" icon={<Info size={18} aria-hidden="true" />}>
          Đã dùng đủ {max} chi nhánh của gói {planName}. Muốn thêm chi nhánh, nâng gói.{' '}
          <Link href={appHref('settings/plan')} className="font-medium">
            Xem gói Sapio
          </Link>
        </Notice>
      )}
      <div className="sp-toolbar">
        <ChipMenu
          label="Trạng thái"
          value={status}
          allLabel="Đang dùng"
          options={[
            { value: 'archived', label: 'Đã ngừng dùng' },
            { value: 'all', label: 'Tất cả' },
          ]}
          onChange={setStatus}
        />
      </div>
      {rows.length === 0 ? (
        <p className="sp-empty m-0">Chưa có chi nhánh nào ngừng dùng.</p>
      ) : (
        <DataTable
          label="Danh sách chi nhánh"
          columns={columns}
          rows={rows}
          rowKey={(b) => b.id}
          minWidth={720}
          cards={(b) => (
            <Link href={appHref(`settings/branches/${b.id}`)} className="sp-cards__item">
              <span className="sp-cards__body">
                <span className="sp-cards__title">{b.name}</span>
                <span className="sp-cards__meta">
                  {b.address} · {countsOf(b).staff} nhân viên, {countsOf(b).other} tài nguyên
                  {!isActive(b) && ' · Đã ngừng dùng'}
                </span>
              </span>
              <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
            </Link>
          )}
          foot={
            <div className="sp-table-foot">
              <span>{rows.length} chi nhánh</span>
            </div>
          }
          phoneFoot={<p className="sp-table-foot m-0">{rows.length} chi nhánh</p>}
        />
      )}

      {adding && (
        <AddBranchDialog
          all={all}
          max={max}
          planName={planName}
          activeCount={active.length}
          upgradeHref={appHref('settings/plan')}
          onClose={() => setAdding(false)}
          onAdd={(input) => {
            const branch: Branch = {
              id: `${store.branch.tenantId}-br-${store.extraBranches.length + 2}`,
              tenantId: store.branch.tenantId,
              name: input.name,
              phone: input.phone,
              address: input.address,
              timeZone: 'Asia/Ho_Chi_Minh',
              businessHours: DEFAULT_HOURS,
              specialDays: [],
            };
            store.saveSettings({ extraBranches: [...store.extraBranches, branch] });
            toast({ text: `Đã thêm ${branch.name}.` });
            setAdding(false);
            router.push(appHref(`settings/branches/${branch.id}`));
          }}
        />
      )}
    </>
  );
}

/**
 * "Thêm chi nhánh". The checks run in the order of the API (`api/branch-settings.md` #2): the form
 * first, then the limit of the plan (BR-93.2), then the name (BR-93.4).
 */
function AddBranchDialog({
  all,
  max,
  planName,
  activeCount,
  upgradeHref,
  onAdd,
  onClose,
}: {
  all: Branch[];
  max: number | null;
  planName: string;
  activeCount: number;
  upgradeHref: string;
  onAdd: (input: { name: string; phone: string; address: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [taken, setTaken] = useState(false);
  const [limit, setLimit] = useState(false);

  const nameProblem = cleanName(name) === '' ? 'Nhập tên chi nhánh.' : null;
  const phoneBad = phoneProblem(phone);
  const addressProblem = cleanName(address) === '' ? 'Nhập địa chỉ chi nhánh.' : null;

  function submit() {
    setSubmitted(true);
    setLimit(false);
    if (nameProblem || phoneBad || addressProblem) return;
    if (atBranchLimit(activeCount, max)) {
      setLimit(true);
      return;
    }
    if (branchNameTaken(all, name)) {
      setTaken(true);
      return;
    }
    onAdd({ name: cleanName(name), phone: phone.trim(), address: cleanName(address) });
  }

  return (
    <ConfirmDialog
      open
      title="Thêm chi nhánh"
      body="Giờ mở cửa mặc định 08:00 đến 20:00, nghỉ Chủ Nhật. Chỉnh sau khi tạo."
      confirmLabel="Thêm chi nhánh"
      backLabel="Hủy"
      onClose={onClose}
      onConfirm={submit}
    >
      <Field
        id="nb-name"
        label="Tên chi nhánh"
        error={taken ? 'Đã có chi nhánh tên này.' : submitted ? nameProblem : undefined}
      >
        <input
          id="nb-name"
          placeholder="Ví dụ: Quận 7"
          autoComplete="off"
          value={name}
          aria-invalid={taken || (submitted && Boolean(nameProblem)) ? true : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setTaken(false);
          }}
        />
      </Field>
      <Field id="nb-phone" label="Số điện thoại" error={submitted ? phoneBad : undefined}>
        <input
          id="nb-phone"
          type="tel"
          placeholder="Ví dụ: 028 3930 1234"
          autoComplete="off"
          value={phone}
          aria-invalid={submitted && Boolean(phoneBad) ? true : undefined}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      <Field id="nb-address" label="Địa chỉ" error={submitted ? addressProblem : undefined}>
        <input
          id="nb-address"
          placeholder="Số nhà, đường, phường, thành phố"
          autoComplete="off"
          value={address}
          aria-invalid={submitted && Boolean(addressProblem) ? true : undefined}
          onChange={(e) => setAddress(e.target.value)}
        />
      </Field>
      {limit && (
        <Notice tone="danger" role="alert" icon={<Info size={18} aria-hidden="true" />}>
          Gói {planName} chỉ cho {max} chi nhánh. Nâng gói để thêm chi nhánh.{' '}
          <Link href={upgradeHref} className="font-medium">
            Xem gói Sapio
          </Link>
        </Notice>
      )}
    </ConfirmDialog>
  );
}
