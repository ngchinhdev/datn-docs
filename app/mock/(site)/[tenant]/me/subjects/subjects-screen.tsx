'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useCustomerSession } from '@/components/mock/customer-session';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { SubjectFields } from '@/components/sapio/subject-fields';
import { useToast } from '@/components/sapio/toast';
import { matchesAttributes } from '@/mock/occupation';
import { fixtureBySlug } from '@/mock/selection';
import {
  checkSubject,
  describeSubject,
  priceFactors,
  type SubjectValues,
} from '@/mock/subject-schema';
import { formatDay, localDate, MOCK_NOW } from '@/mock/time';
import type { ServedSubject } from '@/mock/fixtures';

type View = { kind: 'list' } | { kind: 'edit'; id: string };
const NEW = 'new';
let made = 0;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** MH-19: the pets (or other subjects) saved at this shop: list, add, edit (BR-17, BR-71). */
export function SubjectsScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = fixtureBySlug(tenantSlug)!;
  const { tenant, services, template } = fixture;
  const { vocabulary, subjectSchema } = template;
  const noun = vocabulary.subject ?? '';
  const store = useScheduleStore();
  const toast = useToast();
  const { subjects, customerId } = useCustomerSession();
  const [view, setView] = useState<View>({ kind: 'list' });
  const [name, setName] = useState('');
  const [values, setValues] = useState<SubjectValues>({});
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const mine = subjects.filter((s) => s.kind === 'other');
  const live = (a: { status: string; startAt: string }) =>
    (a.status === 'confirmed' || a.status === 'checked_in') && a.startAt >= MOCK_NOW;
  /** BR-17: a subject with a booking ahead cannot be removed. */
  const nextBooking = (id: string) =>
    store.appointments
      .filter((a) => live(a) && a.items.some((i) => i.servedSubjectId === id))
      .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

  const priceBy = (subject: ServedSubject) => {
    for (const service of services) {
      const v = service.variants.find((x) => matchesAttributes(x.match, subject.attributes));
      if (v) return `Giá theo: ${v.name.charAt(0).toLowerCase()}${v.name.slice(1)}`;
    }
    return `Chưa có dịch vụ nào nhận ${noun} này`;
  };

  function open(subject: ServedSubject | null) {
    setName(subject?.name ?? '');
    setValues(subject ? { ...subject.attributes } : {});
    setNote(subject?.note ?? '');
    setTouched([]);
    setDeleting(false);
    setView({ kind: 'edit', id: subject?.id ?? NEW });
  }

  if (view.kind === 'edit') {
    const editing = view.id === NEW ? null : (mine.find((s) => s.id === view.id) ?? null);
    const check = checkSubject(subjectSchema, noun, name, values);
    const ahead = editing ? nextBooking(editing.id) : undefined;
    const touch = (key: string) => setTouched((t) => (t.includes(key) ? t : [...t, key]));

    function save() {
      setTouched(['name', ...subjectSchema.map((f) => f.key)]);
      if (Object.keys(check.errors).length > 0) return;
      if (editing) {
        // BR-12, BR-17: bookings made keep their price and time; only the subject changes.
        const { note: _previous, ...rest } = editing;
        void _previous;
        store.replaceSubject({
          ...rest,
          name: name.trim(),
          attributes: check.attributes,
          ...(note.trim() ? { note: note.trim() } : {}),
        });
        toast({ text: `Đã lưu ${editing.name}.` });
      } else if (customerId) {
        made += 1;
        store.addSubject({
          id: `${tenant.id}-s-me${made}`,
          tenantId: tenant.id,
          customerId,
          kind: 'other',
          name: name.trim(),
          attributes: check.attributes,
          ...(note.trim() ? { note: note.trim() } : {}),
        });
        toast({ text: `Đã thêm ${name.trim()}.` });
      }
      setView({ kind: 'list' });
    }

    return (
      <form
        noValidate
        className="sp-stack"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h1 className="title m-0">
          {editing ? `Sửa ${editing.name}` : (vocabulary.addSubject ?? 'Thêm')}
        </h1>
        <SubjectFields
          idPrefix="me-subject"
          schema={subjectSchema}
          noun={noun}
          nameExample={vocabulary.subjectExample}
          name={name}
          values={values}
          onName={setName}
          onValue={(k, v) => setValues((cur) => ({ ...cur, [k]: v }))}
          error={(k) => (touched.includes(k) ? check.errors[k] : undefined)}
          touch={touch}
        />
        <Field id="me-subject-note" size="md" label="Lưu ý cho nhân viên" optional>
          <input
            id="me-subject-note"
            value={note}
            placeholder="Ví dụ: Sợ máy sấy to, cần dỗ."
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <div className="flex gap-(--space-2)">
          <Button type="button" variant="secondary" onClick={() => setView({ kind: 'list' })}>
            Hủy
          </Button>
          <Button type="submit" variant="accent">
            Lưu
          </Button>
        </div>
        {editing && (
          <div className="flex flex-col gap-(--space-2)">
            {ahead ? (
              <p className="body-sm m-0 text-(--ink-muted)">
                {editing.name} có lịch ngày {formatDay(localDate(ahead.startAt)).slice(-5)} nên chưa
                xóa được. Sửa{' '}
                {subjectSchema.find((f) => f.type === 'number')?.label.toLowerCase() ?? 'thông tin'}{' '}
                không đổi giá lịch đã đặt.
              </p>
            ) : deleting ? (
              <div className="flex flex-col gap-(--space-2)">
                <p className="body-sm m-0">
                  Xóa {editing.name}? Lịch đã qua vẫn giữ tên {noun} này.
                </p>
                <div className="flex gap-(--space-2)">
                  <Button type="button" variant="secondary" onClick={() => setDeleting(false)}>
                    Giữ lại
                  </Button>
                  <Button
                    type="button"
                    variant="accent"
                    onClick={() => {
                      store.removeSubject(editing.id);
                      toast({ text: `Đã xóa ${editing.name}.` });
                      setView({ kind: 'list' });
                    }}
                  >
                    Xóa {editing.name}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="self-start"
                onClick={() => setDeleting(true)}
              >
                Xóa {editing.name}
              </Button>
            )}
          </div>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-(--space-5)">
      <h1 className="title m-0">{capitalize(noun)} của tôi</h1>
      {mine.length === 0 ? (
        <p className="body-sm m-0 text-(--ink-muted)">
          Chưa có {noun} nào. {capitalize(noun)} bạn thêm hoặc khai lúc đặt lịch sẽ hiện ở đây.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-(--space-2) p-0">
          {mine.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-(--space-3) rounded-(--radius-lg) bg-(--surface-raised) p-(--space-3) shadow-[0_0_0_1px_var(--line)]"
            >
              <span className="sp-avatar" aria-hidden="true">
                {s.name.charAt(0)}
              </span>
              <span className="flex min-w-0 grow flex-col">
                <span className="body font-semibold">{s.name}</span>
                <span className="body-sm text-(--ink-muted)">
                  {describeSubject(subjectSchema, s)}
                </span>
                <span className="body-sm text-(--ink-muted)">{priceBy(s)}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Sửa ${s.name}`}
                onClick={() => open(s)}
              >
                Sửa
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="ghost" className="h-12 justify-start" onClick={() => open(null)}>
        <Plus size={18} aria-hidden="true" />
        {vocabulary.addSubject}
      </Button>
      <p className="body-sm m-0 text-(--ink-muted)">
        {capitalize(priceFactors(subjectSchema, services[0]!))} quyết định giá và thời gian của dịch
        vụ.
      </p>
    </div>
  );
}
