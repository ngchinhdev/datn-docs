'use client';

import { Lock, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { GatedPage } from '@/components/mock/locked-feature';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { SidePanel } from '@/components/sapio/side-panel';
import { useToast } from '@/components/sapio/toast';
import type { CommissionPeriod, CommissionRule } from '@/mock/fixtures';
import {
  closePeriod,
  periodState,
  periodSummary,
  periodTotals,
  ruleIsPending,
  ruleLevelLabel,
  ruleScopeLabel,
  type PeriodState,
} from '@/mock/commission';
import { isApplied, saveRule } from '@/mock/commission-rules';
import { formatVnd } from '@/mock/format';
import { lookups } from '@/mock/reception';
import { roleLabel } from '@/mock/selection';
import { formatDateTime, formatFullDate, MOCK_TODAY } from '@/mock/time';

interface Draft {
  editId?: string;
  /** `all`, `retail` or `service:<id>`. */
  scope: string;
  level: string;
  percent: string;
  from: string;
}

const STATE: Record<PeriodState, [string, string]> = {
  open: ['sp-badge--confirmed', 'Đang mở'],
  ended: ['sp-badge--pending', 'Hết kỳ, chưa chốt'],
  closed: ['sp-badge--completed', 'Đã chốt'],
};

/** Hoa hồng (MH-56): the rules, the monthly periods and closing one. Only the owner sees it (BR-44). */
export function CommissionScreen({ tenantSlug }: { tenantSlug: string }) {
  const { can } = useSubscription();
  if (!can('commission')) {
    return (
      <GatedPage
        feature="commission"
        tenantSlug={tenantSlug}
        path={['commission']}
        inSettings={false}
      />
    );
  }
  return <Commission tenantSlug={tenantSlug} />;
}

function Commission({ tenantSlug }: { tenantSlug: string }) {
  const desk = useDesk(tenantSlug);
  const { fixture, role } = desk;
  const store = useScheduleStore();
  const { money } = store;
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const L = lookups(fixture);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (role !== 'owner') {
    return (
      <div className="sp-shell__content">
        <p className="sp-empty m-0">
          <Lock size={16} aria-hidden="true" className="me-1 inline" />
          Quy tắc và các kỳ hoa hồng chỉ chủ cơ sở xem. Kỹ thuật viên xem hoa hồng của mình ở mục
          Hoa hồng trên điện thoại (BR-44).
        </p>
      </div>
    );
  }

  const periods = [...money.periods].sort((a, b) => (a.id < b.id ? 1 : -1));
  const ended = periods.filter((p) => periodState(p, MOCK_TODAY) === 'ended');
  const toClose: CommissionPeriod | undefined =
    ended.find((p) => p.id === picked) ?? [...ended].sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  const rules = [...money.commissionRules].sort(
    (a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || (a.id < b.id ? 1 : -1),
  );
  const labelOf = (rule: CommissionRule) =>
    `${ruleScopeLabel(rule, fixture.services)} · ${ruleLevelLabel(rule, fixture.staffLevels)}`;

  function scopeOf(rule: CommissionRule) {
    return rule.scope === 'service' ? `service:${rule.serviceId}` : rule.scope;
  }
  function openAdd() {
    setError(null);
    setDraft({ scope: 'all', level: '', percent: '', from: MOCK_TODAY });
  }
  function openEdit(rule: CommissionRule) {
    setError(null);
    setDraft({
      editId: rule.id,
      scope: scopeOf(rule),
      level: rule.level === undefined ? '' : String(rule.level),
      percent: String(rule.percent),
      from: rule.effectiveFrom < MOCK_TODAY ? MOCK_TODAY : rule.effectiveFrom,
    });
  }
  function save() {
    if (!draft) return;
    const [kind, serviceId] = draft.scope.split(':') as ['all' | 'retail' | 'service', string?];
    const result = saveRule(
      money,
      {
        scope: kind,
        serviceId,
        level: draft.level === '' ? undefined : Number(draft.level),
        percent: draft.percent === '' ? Number.NaN : Number(draft.percent),
        effectiveFrom: draft.from,
        editId: draft.editId,
      },
      { now: desk.now(), actor: { name: desk.actor, role: roleLabel(role) }, label: labelOf },
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    store.setMoney(result.money);
    setDraft(null);
    toast({
      text: draft.editId ? 'Đã lưu quy tắc, ghi vào nhật ký.' : 'Đã thêm quy tắc, ghi vào nhật ký.',
    });
  }
  function close() {
    if (!toClose) return;
    const result = closePeriod(money, toClose.id, {
      now: desk.now(),
      actor: { name: desk.actor, role: roleLabel(role) },
    });
    setConfirming(false);
    if (result.error) {
      toast({ text: result.error });
      return;
    }
    store.setMoney(result.money);
    setPicked(null);
    toast({ text: `Đã chốt kỳ ${toClose.label}, ghi vào nhật ký.` });
  }

  const editing = draft?.editId
    ? money.commissionRules.find((r) => r.id === draft.editId)
    : undefined;
  const editingApplied = editing ? isApplied(editing, MOCK_TODAY) : false;
  const totals = toClose ? periodTotals(money.commission, toClose.id) : [];

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <PageHeader
        title="Hoa hồng"
        sub="Kỳ theo tháng; chốt kỳ thì số không đổi nữa (BR-42)"
        actions={
          <Button variant="primary" onClick={openAdd}>
            <Plus size={16} aria-hidden="true" />
            Thêm quy tắc
          </Button>
        }
      />
      <div className="sp-detail">
        <div className="sp-detail__main flex min-w-0 flex-[1_1_640px] flex-col gap-5">
          <section className="sp-panel" aria-labelledby="cm-r">
            <h2 className="sp-panel__title" id="cm-r">
              Quy tắc
            </h2>
            <div
              className="sp-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Quy tắc hoa hồng, cuộn được"
            >
              <table className="sp-table">
                <caption className="sp-sr-only">Quy tắc hoa hồng</caption>
                <thead>
                  <tr>
                    <th scope="col">Áp cho</th>
                    <th scope="col">Cấp</th>
                    <th scope="col" className="sp-table__num">
                      Tỉ lệ
                    </th>
                    <th scope="col">Hiệu lực</th>
                    <th scope="col">
                      <span className="sp-sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td>{ruleScopeLabel(rule, fixture.services)}</td>
                      <td>{ruleLevelLabel(rule, fixture.staffLevels)}</td>
                      <td className="sp-table__num sp-num">{rule.percent}%</td>
                      <td>
                        <span className="sp-num">từ {formatFullDate(rule.effectiveFrom)}</span>{' '}
                        {ruleIsPending(rule, MOCK_TODAY) && (
                          <span className="sp-badge sp-badge--hold">Chưa áp</span>
                        )}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Sửa quy tắc ${labelOf(rule)}, từ ${formatFullDate(rule.effectiveFrom)}`}
                          onClick={() => openEdit(rule)}
                        >
                          Sửa
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="sp-panel__note">
              Quy tắc cụ thể hơn thắng: dịch vụ và cấp &gt; dịch vụ &gt; mọi dịch vụ. Quy tắc mới
              chỉ áp cho hóa đơn thu từ ngày hiệu lực (BR-41). Tính trên số thực thu sau giảm giá;
              buổi gói tính trên doanh thu của buổi (BR-40, BR-26).
            </p>
          </section>

          <section className="sp-panel" aria-labelledby="cm-p">
            <h2 className="sp-panel__title" id="cm-p">
              Kỳ
            </h2>
            <div
              className="sp-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Kỳ hoa hồng, cuộn được"
            >
              <table className="sp-table">
                <caption className="sp-sr-only">Kỳ hoa hồng</caption>
                <thead>
                  <tr>
                    <th scope="col">Kỳ</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col" className="sp-table__num">
                      Tổng
                    </th>
                    <th scope="col" className="sp-table__num">
                      Thu hồi
                    </th>
                    <th scope="col">Chốt lúc</th>
                    <th scope="col">
                      <span className="sp-sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => {
                    const state = periodState(p, MOCK_TODAY);
                    const sum = periodSummary(money.commission, p.id);
                    const first = periodTotals(money.commission, p.id)[0]?.staffResourceId;
                    return (
                      <tr key={p.id}>
                        <td>
                          <Link
                            href={appHref(
                              `commission/periods/${p.id}`,
                              first ? { staff: first } : {},
                            )}
                          >
                            {p.label}
                          </Link>
                        </td>
                        <td>
                          <span className={`sp-badge ${STATE[state][0]}`}>{STATE[state][1]}</span>
                        </td>
                        <td className="sp-table__num sp-num">{formatVnd(sum.totalVnd)}</td>
                        <td className="sp-table__num sp-num">
                          {sum.clawbackVnd < 0n ? `−${formatVnd(-sum.clawbackVnd)}` : formatVnd(0n)}
                        </td>
                        <td>
                          {p.closedAt && (
                            <span className="sp-num">
                              {formatDateTime(p.closedAt)}
                              {p.closedBy ? ` · ${p.closedBy}` : ''}
                            </span>
                          )}
                        </td>
                        <td>
                          {state === 'ended' && (
                            <Button size="sm" variant="secondary" onClick={() => setPicked(p.id)}>
                              Chốt kỳ
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {draft ? (
          <SidePanel
            title={editing ? `Sửa quy tắc ${labelOf(editing)}` : 'Thêm quy tắc'}
            onClose={() => setDraft(null)}
            footer={
              <>
                <Button onClick={() => setDraft(null)}>Hủy</Button>
                <Button variant="primary" onClick={save}>
                  {editingApplied ? 'Thêm quy tắc mới' : 'Lưu'}
                </Button>
              </>
            }
          >
            <Field id="cr-s" label="Áp cho">
              <select
                id="cr-s"
                disabled={Boolean(editing)}
                value={draft.scope}
                onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
              >
                <option value="all">Mọi dịch vụ</option>
                {fixture.services.map((s) => (
                  <option key={s.id} value={`service:${s.id}`}>
                    {s.name}
                  </option>
                ))}
                <option value="retail">Bán lẻ</option>
              </select>
            </Field>
            <Field id="cr-l" label="Cấp">
              <select
                id="cr-l"
                disabled={Boolean(editing)}
                value={draft.level}
                onChange={(e) => setDraft({ ...draft, level: e.target.value })}
              >
                <option value="">Mọi cấp</option>
                {fixture.staffLevels.map((name, i) => (
                  <option key={name} value={String(i + 1)}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="cr-p" label="Tỉ lệ" suffix="%" {...(error ? { error } : {})}>
              <input
                id="cr-p"
                inputMode="numeric"
                value={draft.percent}
                aria-invalid={error ? true : undefined}
                onChange={(e) => setDraft({ ...draft, percent: e.target.value.replace(/\D/g, '') })}
              />
            </Field>
            <Field
              id="cr-d"
              label="Hiệu lực từ"
              help="Không trước hôm nay. Hóa đơn thu trước ngày này giữ tỉ lệ cũ (BR-41)."
            >
              <input
                id="cr-d"
                type="date"
                min={MOCK_TODAY}
                value={draft.from}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              />
            </Field>
            {editingApplied && (
              <p className="sp-panel__note m-0">
                Quy tắc này đang áp. Lưu sẽ thêm một quy tắc mới từ ngày chọn; quy tắc cũ giữ nguyên
                cho các hóa đơn trước đó.
              </p>
            )}
            <p className="sp-panel__note m-0">Mỗi lần lưu ghi nhật ký (BR-63).</p>
          </SidePanel>
        ) : (
          toClose && (
            <aside className="sp-detail__side flex-[0_0_380px]">
              <section className="sp-panel" aria-labelledby="cm-c">
                <h2 className="sp-panel__title" id="cm-c">
                  Chốt kỳ {toClose.label}?
                </h2>
                <dl className="sp-kv">
                  {totals.map((t) => (
                    <div key={t.staffResourceId} className="contents">
                      <dt>{L.name(t.staffResourceId)}</dt>
                      <dd className="sp-num">{formatVnd(t.totalVnd)}</dd>
                    </div>
                  ))}
                  <dt className="border-t border-(--line) pt-2 font-semibold text-(--ink)">Tổng</dt>
                  <dd className="sp-num border-t border-(--line) pt-2 text-[17px] font-bold">
                    {formatVnd(periodSummary(money.commission, toClose.id).totalVnd)}
                  </dd>
                </dl>
                <p className="sp-panel__note">
                  Chốt xong không sửa được. Hoàn tiền về sau ghi khoản thu hồi vào kỳ của ngày duyệt
                  hoàn, kỳ này giữ nguyên (BR-42). Ghi nhật ký (BR-63).
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => setConfirming(true)}
                >
                  <Lock size={16} aria-hidden="true" />
                  Chốt kỳ {toClose.label}
                </Button>
              </section>
            </aside>
          )
        )}
      </div>
      <ConfirmDialog
        open={confirming && Boolean(toClose)}
        title={`Chốt kỳ ${toClose?.label ?? ''}?`}
        body="Chốt xong, số của kỳ này không đổi nữa."
        facts={
          toClose
            ? [
                ...totals.map((t) => ({
                  term: L.name(t.staffResourceId),
                  value: formatVnd(t.totalVnd),
                })),
                {
                  term: 'Tổng',
                  value: formatVnd(periodSummary(money.commission, toClose.id).totalVnd),
                  total: true,
                },
              ]
            : []
        }
        confirmLabel="Chốt kỳ"
        onConfirm={close}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}
