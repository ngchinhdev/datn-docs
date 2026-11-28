'use client';

import { Info, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { Notice } from '@/components/mock/password-field';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useDesk } from '@/components/mock/use-desk';
import { Banner } from '@/components/sapio/banner';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field, Form, SaveBar } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { useToast } from '@/components/sapio/toast';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';
import type { Branch, SpecialDay, Weekday } from '@/mock/fixtures';
import {
  branchNameTaken,
  cleanName,
  isActive,
  MAX_WINDOWS,
  phoneProblem,
} from '@/mock/branch-settings';
import type { OpenWindow } from '@/mock/hours';
import {
  branchChanges,
  branchRequeues,
  hoursByDay,
  outsideHours,
  toBusinessHours,
  WEEK,
  WEEKDAY_NAME,
  windowsProblem,
  windowsText,
} from '@/mock/shop';
import { formatDay, MOCK_NOW, MOCK_TODAY } from '@/mock/time';

let requeueSequence = 0;

/** Chi tiết chi nhánh (MH-43): info, opening hours with several windows a day, special days, archive. */
export function BranchDetail({ tenantSlug, id }: { tenantSlug: string; id: string }) {
  const store = useScheduleStore();
  const appHref = useAppHref(tenantSlug);
  const saved = [store.branch, ...store.extraBranches].find((b) => b.id === id);
  if (!saved) {
    return (
      <p className="sp-empty m-0">
        Không tìm thấy chi nhánh này.{' '}
        <Link href={appHref('settings/branches')} className="font-medium">
          Về danh sách chi nhánh
        </Link>
      </p>
    );
  }
  return <BranchForm key={saved.id} tenantSlug={tenantSlug} saved={saved} />;
}

function BranchForm({ tenantSlug, saved }: { tenantSlug: string; saved: Branch }) {
  const desk = useDesk(tenantSlug);
  const { ctx } = desk;
  const store = useScheduleStore();
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const [draft, setDraft] = useState<Branch>(saved);
  const [submitted, setSubmitted] = useState(false);
  const [taken, setTaken] = useState(false);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [lastBranch, setLastBranch] = useState(false);

  const all: Branch[] = [store.branch, ...store.extraBranches];
  const isFirst = saved.id === store.branch.id;
  const archived = !isActive(saved);
  const otherActive = all.filter((b) => isActive(b) && b.id !== saved.id).length;

  const staffTypeIds = new Set(store.resourceTypes.filter((t) => t.isStaff).map((t) => t.id));
  const own = store.resources.filter((r) => r.branchId === saved.id && isActive(r));
  const staffCount = own.filter((r) => staffTypeIds.has(r.resourceTypeId)).length;
  const resourceCount = own.length - staffCount;

  const days = useMemo(() => hoursByDay(draft.businessHours), [draft.businessHours]);
  const changes = useMemo(
    () =>
      branchChanges(
        saved,
        draft,
        () => '',
        () => 0n,
      ),
    [saved, draft],
  );
  useUnsavedGuard(changes.length > 0, setLeaveHref);

  // BR-02, BR-35: only the first branch has appointments in the mock.
  const waiting = new Set(store.requeues.flatMap((r) => r.appointmentIds));
  const affected = useMemo(
    () =>
      isFirst
        ? outsideHours(store.appointments, draft, MOCK_NOW).filter((a) => !waiting.has(a.id))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isFirst, store.appointments, draft, store.requeues],
  );

  const set = (patch: Partial<Branch>) => setDraft((d) => ({ ...d, ...patch }));
  const setDay = (weekday: Weekday, windows: OpenWindow[]) =>
    set({ businessHours: toBusinessHours({ ...days, [weekday]: windows }) });

  const nameBad = cleanName(draft.name) === '';
  const addressBad = cleanName(draft.address) === '';
  const phoneBad = phoneProblem(draft.phone ?? '');
  const dayProblems = WEEK.map((w) => windowsProblem(days[w]));
  const noDayOpen = WEEK.every((w) => days[w].length === 0);
  const specialProblems = draft.specialDays.some((d) => windowsProblem(d.hours) !== null);
  const setSpecialHours = (date: string, hours: OpenWindow[]) =>
    set({
      specialDays: draft.specialDays.map((d) =>
        d.date === date ? { ...d, hours: hours as SpecialDay['hours'] } : d,
      ),
    });
  const invalid =
    nameBad ||
    addressBad ||
    Boolean(phoneBad) ||
    noDayOpen ||
    dayProblems.some(Boolean) ||
    specialProblems;

  const hourReasons = changes
    .filter((c) => c.short.startsWith('giờ ') || c.short.startsWith('ngày đặc biệt'))
    .map((c) => {
      if (c.short.startsWith('giờ ')) {
        const w = WEEK.find((x) => `giờ ${WEEKDAY_NAME[x]}` === c.short)!;
        return `${WEEKDAY_NAME[w]} ${windowsText(days[w]).toLowerCase() === 'nghỉ' ? 'nghỉ' : windowsText(days[w])}`;
      }
      return c.short;
    });

  /** The special days from today on; the ones that are past are not shown and a save leaves them (BR-93.14). */
  const upcoming = [...draft.specialDays]
    .filter((d) => d.date >= MOCK_TODAY)
    .sort((a, b) => a.date.localeCompare(b.date));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (invalid) return;
    if (branchNameTaken(all, draft.name, saved.id)) {
      setTaken(true);
      return;
    }
    const next: Branch = {
      ...draft,
      name: cleanName(draft.name),
      address: cleanName(draft.address),
    };
    store.saveSettings(
      isFirst
        ? { branch: next }
        : { extraBranches: store.extraBranches.map((b) => (b.id === saved.id ? next : b)) },
    );
    if (affected.length > 0) {
      store.addRequeues(
        branchRequeues(
          affected,
          { kind: 'hours', label: 'Chi nhánh', reason: 'Giờ mở cửa mới' },
          ctx().now,
          (n) => `${store.branch.tenantId}-rq-hours-${(requeueSequence += 1)}-${n}`,
        ),
      );
    }
    setDraft(next);
    setSubmitted(false);
    toast({
      text: `Đã lưu chi nhánh.${
        affected.length > 0 ? ` ${affected.length} lịch vào danh sách "Cần xếp lại".` : ''
      } Thay đổi áp từ lúc này.`,
    });
  }

  function archive() {
    // API #5 step 2: the last branch in use stays (BR-93.10).
    if (otherActive === 0) {
      setLastBranch(true);
      return;
    }
    store.saveSettings({
      extraBranches: store.extraBranches.map((b) =>
        b.id === saved.id ? { ...b, archivedAt: ctx().now } : b,
      ),
    });
    toast({ text: `Đã ngừng dùng ${saved.name}.` });
    setArchiving(false);
    setLeaveHref(null);
    router.push(appHref('settings/branches'));
  }

  const summary = <>Chưa lưu: {changes.map((c) => c.short).join(', ')}</>;

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Cài đặt', href: appHref('settings') },
          { label: 'Chi nhánh', href: appHref('settings/branches') },
          { label: saved.name },
        ]}
        title={saved.name}
        sub={
          archived
            ? 'Đã ngừng dùng'
            : `${isFirst ? 'Chi nhánh đầu tiên · ' : ''}${staffCount} nhân viên, ${resourceCount} tài nguyên`
        }
        actions={
          archived ? undefined : (
            <Button
              onClick={() => {
                setLastBranch(false);
                setArchiving(true);
              }}
            >
              Ngừng dùng chi nhánh
            </Button>
          )
        }
      />
      {archived && (
        <Notice tone="note" role="status" icon={<Info size={18} aria-hidden="true" />}>
          Chi nhánh đã ngừng dùng. Bạn chỉ xem được.
        </Notice>
      )}
      <Form onSubmit={onSubmit} className="gap-5">
        <fieldset disabled={archived} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
          <section className="sp-panel" aria-labelledby="b-i">
            <h2 className="sp-panel__title" id="b-i">
              Thông tin
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                id="b-n"
                label="Tên chi nhánh"
                error={
                  taken
                    ? 'Đã có chi nhánh tên này.'
                    : submitted && nameBad
                      ? 'Nhập tên chi nhánh.'
                      : undefined
                }
              >
                <input
                  id="b-n"
                  value={draft.name}
                  aria-invalid={taken || (submitted && nameBad) ? true : undefined}
                  onChange={(e) => {
                    set({ name: e.target.value });
                    setTaken(false);
                  }}
                />
              </Field>
              <Field
                id="b-p"
                label="Số điện thoại"
                help="Khách thấy số này khi không tự đổi, hủy được lịch (BR-08)."
                error={submitted ? (phoneBad ?? undefined) : undefined}
              >
                <input
                  id="b-p"
                  inputMode="tel"
                  type="tel"
                  value={draft.phone ?? ''}
                  aria-invalid={submitted && phoneBad ? true : undefined}
                  onChange={(e) => set({ phone: e.target.value })}
                />
              </Field>
              <Field
                id="b-a"
                label="Địa chỉ"
                error={submitted && addressBad ? 'Nhập địa chỉ.' : undefined}
              >
                <input
                  id="b-a"
                  value={draft.address}
                  aria-invalid={submitted && addressBad ? true : undefined}
                  onChange={(e) => set({ address: e.target.value })}
                />
              </Field>
              <Field
                id="b-z"
                label="Múi giờ"
                help="Mọi giờ trên trang khách và lịch theo múi giờ này."
              >
                <input
                  id="b-z"
                  className="cursor-not-allowed bg-(--fill-tonal)! text-(--ink-muted)!"
                  value={`${draft.timeZone} (GMT+7)`}
                  disabled
                  readOnly
                />
              </Field>
            </div>
          </section>

          <section className="sp-panel" aria-labelledby="b-h">
            <h2 className="sp-panel__title" id="b-h">
              Giờ mở cửa
            </h2>
            <div
              className="sp-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Giờ mở cửa theo tuần, cuộn được"
            >
              <table className="sp-table">
                <caption className="sp-sr-only">Giờ mở cửa theo tuần</caption>
                <thead>
                  <tr>
                    <th scope="col">Ngày</th>
                    <th scope="col">Khung giờ</th>
                    <th scope="col">Nghỉ</th>
                    <th scope="col">
                      <span className="sp-sr-only">Thêm</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {WEEK.map((weekday, row) => {
                    const windows = days[weekday];
                    const problem = dayProblems[row];
                    const closed = windows.length === 0;
                    return (
                      <tr key={weekday}>
                        <td>
                          <strong>{WEEKDAY_NAME[weekday]}</strong>
                        </td>
                        <td>
                          {closed ? (
                            <span className="text-(--ink-muted)">Nghỉ cả ngày</span>
                          ) : (
                            <span className="inline-flex flex-wrap gap-1">
                              {windows.map((w, i) => (
                                <span key={i} className="mr-2 inline-flex items-center gap-1">
                                  <span className="sp-field sp-field--sm inline-flex w-20">
                                    <span className="sp-field__control">
                                      <input
                                        className="sp-num"
                                        aria-label={`${WEEKDAY_NAME[weekday]} từ`}
                                        aria-invalid={
                                          submitted && Boolean(problem) ? true : undefined
                                        }
                                        value={w.open}
                                        onChange={(e) =>
                                          setDay(
                                            weekday,
                                            windows.map((x, j) =>
                                              j === i ? { ...x, open: e.target.value } : x,
                                            ),
                                          )
                                        }
                                      />
                                    </span>
                                  </span>
                                  –
                                  <span className="sp-field sp-field--sm inline-flex w-20">
                                    <span className="sp-field__control">
                                      <input
                                        className="sp-num"
                                        aria-label={`${WEEKDAY_NAME[weekday]} đến`}
                                        aria-invalid={
                                          submitted && Boolean(problem) ? true : undefined
                                        }
                                        value={w.close}
                                        onChange={(e) =>
                                          setDay(
                                            weekday,
                                            windows.map((x, j) =>
                                              j === i ? { ...x, close: e.target.value } : x,
                                            ),
                                          )
                                        }
                                      />
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    className="sp-icon-btn"
                                    aria-label={`Bỏ khung ${w.open}–${w.close}`}
                                    onClick={() =>
                                      setDay(
                                        weekday,
                                        windows.filter((_, j) => j !== i),
                                      )
                                    }
                                  >
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                </span>
                              ))}
                            </span>
                          )}
                          {problem && (submitted || windows.length > 1) && (
                            <span className="sp-field__help block text-(--danger)">{problem}</span>
                          )}
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${WEEKDAY_NAME[weekday]} nghỉ`}
                            checked={closed}
                            onChange={(e) =>
                              setDay(
                                weekday,
                                e.target.checked ? [] : [{ open: '09:00', close: '20:00' }],
                              )
                            }
                          />
                        </td>
                        <td>
                          {!closed && windows.length < MAX_WINDOWS && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const last = windows.at(-1)!;
                                const start = last.close < '20:00' ? last.close : '20:00';
                                setDay(weekday, [
                                  ...windows,
                                  { open: start, close: start < '23:00' ? '23:00' : '23:59' },
                                ]);
                              }}
                            >
                              Thêm khung
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {submitted && noDayOpen && (
              <p role="alert" className="sp-field__help m-0 text-(--danger)">
                Chọn ít nhất một ngày mở cửa.
              </p>
            )}
            <p className="sp-panel__note">
              Mỗi ngày nhiều khung được, khung không chồng nhau (BR-02). Ca nhân viên có thể bắt đầu
              trước giờ mở cửa (BR-35).
            </p>
          </section>

          {affected.length > 0 && (
            <Banner tone="warning">
              <strong>
                {hourReasons.join('; ')} thì {affected.length} lịch đã đặt nằm ngoài giờ mở cửa.
              </strong>{' '}
              Lưu thì {affected.length === 1 ? 'lịch này' : `${affected.length} lịch này`} vào "Cần
              xếp lại" (BR-35). Lịch đã đặt giữ giá cũ.
            </Banner>
          )}

          <section className="sp-panel" aria-labelledby="b-s">
            <div className="flex items-center gap-2">
              <h2 className="sp-panel__title" id="b-s">
                Ngày đặc biệt
              </h2>
              <div className="ml-auto">
                <Button size="sm" onClick={() => setAdding(true)}>
                  <Plus size={14} aria-hidden="true" />
                  Thêm ngày
                </Button>
              </div>
            </div>
            {upcoming.length === 0 ? (
              <p className="sp-empty m-0">Chưa có ngày đặc biệt nào.</p>
            ) : (
              <div
                className="sp-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Ngày đặc biệt, cuộn được"
              >
                <table className="sp-table">
                  <caption className="sp-sr-only">Ngày đặc biệt</caption>
                  <thead>
                    <tr>
                      <th scope="col">Ngày</th>
                      <th scope="col">Giờ</th>
                      <th scope="col">Ghi chú</th>
                      <th scope="col">
                        <span className="sp-sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((d) => (
                      <tr key={d.date}>
                        <td>
                          <span className="sp-num">
                            {formatDay(d.date).replace(',', '')}/{d.date.slice(0, 4)}
                          </span>
                        </td>
                        <td>
                          <WindowsEditor
                            label={`Ngày ${d.date.slice(8)}/${d.date.slice(5, 7)}`}
                            windows={d.hours}
                            problem={windowsProblem(d.hours)}
                            invalid={submitted}
                            onChange={(hours) => setSpecialHours(d.date, hours)}
                          />
                        </td>
                        <td>{d.note}</td>
                        <td>
                          <button
                            type="button"
                            className="sp-icon-btn"
                            aria-label={`Bỏ ngày ${d.date.slice(8)}/${d.date.slice(5, 7)}`}
                            onClick={() =>
                              set({
                                specialDays: draft.specialDays.filter((x) => x.date !== d.date),
                              })
                            }
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="sp-panel__note">
              Ngày đặc biệt thay giờ của ngày trong tuần đó. Đóng cửa ngày đã có lịch thì các lịch
              vào "Cần xếp lại". (Áp dụng khi có lịch hẹn.)
            </p>
          </section>
        </fieldset>

        <SaveBar
          count={changes.length}
          summary={summary}
          saveDisabled={submitted && invalid}
          saveLabel={affected.length > 0 ? `Lưu và xếp lại ${affected.length} lịch` : 'Lưu'}
          onDiscard={() => {
            setDraft(saved);
            setSubmitted(false);
            setTaken(false);
          }}
        />
      </Form>

      <SpecialDayDialog
        open={adding}
        existing={draft.specialDays.map((d) => d.date)}
        onClose={() => setAdding(false)}
        onAdd={(d) => {
          set({ specialDays: [...draft.specialDays, d] });
          setAdding(false);
        }}
      />
      <ConfirmDialog
        open={leaveHref !== null}
        title="Rời trang này?"
        body={`Còn ${changes.length} thay đổi chưa lưu. Rời đi thì ${changes.length === 1 ? 'thay đổi đó' : 'các thay đổi đó'} mất.`}
        confirmLabel="Rời trang"
        tone="danger"
        onClose={() => setLeaveHref(null)}
        onConfirm={() => {
          const href = leaveHref;
          setLeaveHref(null);
          if (href) router.push(href);
        }}
      />
      <ConfirmDialog
        open={archiving}
        title={`Ngừng dùng ${saved.name}?`}
        body={`Chi nhánh không nhận lịch mới và không dùng lại được. Tài nguyên và giờ mở cửa giữ nguyên.${
          changes.length > 0 ? ' Thay đổi chưa lưu sẽ mất.' : ''
        }`}
        confirmLabel="Ngừng dùng"
        backLabel="Quay lại"
        tone="danger"
        confirmDisabled={isFirst && otherActive > 0}
        onClose={() => setArchiving(false)}
        onConfirm={archive}
      >
        {lastBranch ? (
          <Notice tone="danger" role="alert" icon={<Info size={18} aria-hidden="true" />}>
            Đây là chi nhánh đang dùng cuối cùng. Cơ sở cần ít nhất một chi nhánh.
          </Notice>
        ) : isFirst && otherActive > 0 ? (
          <Notice tone="note" role="status" icon={<Info size={18} aria-hidden="true" />}>
            Mock: chi nhánh đầu tiên chưa ngừng dùng được, vì lịch, ca và dịch vụ của mock chỉ đọc
            chi nhánh này.
          </Notice>
        ) : null}
      </ConfirmDialog>
    </>
  );
}

/**
 * The windows of one special day: several are allowed like on a regular day (BR-02), up to four;
 * none means closed all day.
 */
function WindowsEditor({
  label,
  windows,
  problem,
  invalid,
  onChange,
}: {
  label: string;
  windows: readonly OpenWindow[];
  problem: string | null;
  invalid: boolean;
  onChange: (windows: OpenWindow[]) => void;
}) {
  const closed = windows.length === 0;
  const patch = (i: number, next: Partial<OpenWindow>) =>
    onChange(windows.map((w, j) => (j === i ? { ...w, ...next } : w)));
  return (
    <div className="flex flex-col gap-1">
      {closed ? (
        <strong>Đóng cửa</strong>
      ) : (
        <span className="inline-flex flex-wrap gap-1">
          {windows.map((w, i) => (
            <span key={i} className="mr-2 inline-flex items-center gap-1">
              <span className="sp-field sp-field--sm inline-flex w-20">
                <span className="sp-field__control">
                  <input
                    className="sp-num"
                    aria-label={`${label} từ`}
                    aria-invalid={invalid && problem ? true : undefined}
                    value={w.open}
                    onChange={(e) => patch(i, { open: e.target.value })}
                  />
                </span>
              </span>
              –
              <span className="sp-field sp-field--sm inline-flex w-20">
                <span className="sp-field__control">
                  <input
                    className="sp-num"
                    aria-label={`${label} đến`}
                    aria-invalid={invalid && problem ? true : undefined}
                    value={w.close}
                    onChange={(e) => patch(i, { close: e.target.value })}
                  />
                </span>
              </span>
              <button
                type="button"
                className="sp-icon-btn"
                aria-label={`Bỏ khung ${w.open}–${w.close} của ${label}`}
                onClick={() => onChange(windows.filter((_, j) => j !== i))}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </span>
          ))}
        </span>
      )}
      <span className="flex items-center gap-2">
        {windows.length < MAX_WINDOWS && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const last = windows.at(-1);
              const start = last ? (last.close < '20:00' ? last.close : '20:00') : '09:00';
              onChange([
                ...windows,
                { open: start, close: last ? (start < '23:00' ? '23:00' : '23:59') : '12:00' },
              ]);
            }}
          >
            Thêm khung
          </Button>
        )}
        {!closed && (
          <Button size="sm" variant="ghost" onClick={() => onChange([])}>
            Đóng cửa cả ngày
          </Button>
        )}
      </span>
      {problem && (invalid || windows.length > 1) && (
        <span className="sp-field__help block text-(--danger)">{problem}</span>
      )}
    </div>
  );
}

/** "Thêm ngày": closed all day, or one or more windows, from today on. */
function SpecialDayDialog({
  open,
  existing,
  onAdd,
  onClose,
}: {
  open: boolean;
  existing: string[];
  onAdd: (d: SpecialDay) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState('');
  const [closed, setClosed] = useState(true);
  const [windows, setWindows] = useState<OpenWindow[]>([{ open: '09:00', close: '12:00' }]);
  const [note, setNote] = useState('');
  const problem = !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ? 'Chọn ngày.'
    : date < MOCK_TODAY
      ? 'Chọn ngày từ hôm nay trở đi.'
      : existing.includes(date)
        ? 'Ngày này đã có trong danh sách.'
        : !closed && (windows.length === 0 || windowsProblem(windows) !== null)
          ? (windowsProblem(windows) ?? 'Thêm ít nhất một khung giờ.')
          : null;

  return (
    <ConfirmDialog
      open={open}
      title="Thêm ngày đặc biệt"
      confirmLabel="Thêm ngày"
      backLabel="Hủy"
      confirmDisabled={problem !== null}
      onClose={onClose}
      onConfirm={() => {
        onAdd({
          date,
          note: note.trim().slice(0, 200),
          hours: closed ? [] : (windows as SpecialDay['hours']),
        });
        setDate('');
        setNote('');
        setClosed(true);
        setWindows([{ open: '09:00', close: '12:00' }]);
      }}
    >
      <Field id="sd-date" label="Ngày" help={problem && date !== '' ? problem : undefined}>
        <input
          id="sd-date"
          type="date"
          min={MOCK_TODAY}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <div role="group" aria-label="Giờ của ngày này" className="sp-segmented sp-segmented--block">
        <button
          type="button"
          className="sp-segmented__item"
          aria-pressed={closed}
          onClick={() => setClosed(true)}
        >
          Đóng cửa
        </button>
        <button
          type="button"
          className="sp-segmented__item"
          aria-pressed={!closed}
          onClick={() => setClosed(false)}
        >
          Giờ khác
        </button>
      </div>
      {!closed && (
        <WindowsEditor
          label="Ngày đặc biệt"
          windows={windows}
          problem={windowsProblem(windows)}
          invalid
          onChange={setWindows}
        />
      )}
      <Field id="sd-note" label="Ghi chú" optional>
        <input
          id="sd-note"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}
