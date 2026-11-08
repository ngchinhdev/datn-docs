'use client';

import { Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useTemplateStore } from '@/components/mock/template-store';
import { Button } from '@/components/sapio/button';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { DetailLayout, KeyValueList, Panel } from '@/components/sapio/detail-layout';
import { Field, FormSection } from '@/components/sapio/form';
import { PageHeader } from '@/components/sapio/page-header';
import { SegmentTimeline } from '@/components/sapio/segment-timeline';
import { useToast } from '@/components/sapio/toast';
import { useUnsavedGuard } from '@/components/sapio/use-unsaved-guard';
import type {
  IndustryTemplate,
  SubjectField,
  TemplateContent,
  TemplatePolicies,
  TemplateStatus,
} from '@/mock/fixtures';
import { formatDuration, formatVnd } from '@/mock/format';
import { sampleMinutes } from '@/mock/signup';
import {
  POLICY_FIELDS,
  VOCABULARY_FIELDS,
  changeLines,
  contentOf,
  placedTypes,
  sampleTimeline,
  statusLabel,
} from '@/mock/template-view';
import { formatFullDate } from '@/mock/time';

type VocabularyKey = (typeof VOCABULARY_FIELDS)[number]['key'];

interface FormState {
  name: string;
  status: TemplateStatus;
  cardDescription: string;
  previewNote: string;
  vocabulary: Record<VocabularyKey, string>;
  policies: Record<keyof TemplatePolicies, string>;
}

const toForm = (t: IndustryTemplate): FormState => ({
  name: t.name,
  status: t.status,
  cardDescription: t.cardDescription,
  previewNote: t.previewNote,
  vocabulary: {
    staff: t.vocabulary.staff,
    subject: t.vocabulary.subject ?? '',
    subjectQuestion: t.vocabulary.subjectQuestion ?? '',
    addSubject: t.vocabulary.addSubject ?? '',
    subjectExample: t.vocabulary.subjectExample ?? '',
  },
  policies: Object.fromEntries(
    Object.entries(t.defaultPolicies).map(([key, value]) => [key, String(value)]),
  ) as FormState['policies'],
});

const isCount = (text: string) => /^\d+$/.test(text.trim());

/** The form as template content; policies that are not whole numbers keep the saved value. */
function toContent(form: FormState, template: IndustryTemplate): TemplateContent {
  const text = (key: VocabularyKey) =>
    template.vocabulary[key] === null && form.vocabulary[key].trim() === ''
      ? null
      : form.vocabulary[key].trim();
  return {
    ...contentOf(template),
    name: form.name.trim(),
    status: form.status,
    cardDescription: form.cardDescription.trim(),
    previewNote: form.previewNote.trim(),
    vocabulary: {
      staff: form.vocabulary.staff.trim(),
      subject: text('subject'),
      subjectQuestion: text('subjectQuestion'),
      addSubject: text('addSubject'),
      subjectExample: text('subjectExample'),
    },
    defaultPolicies: Object.fromEntries(
      POLICY_FIELDS.map((f) => [
        f.key,
        isCount(form.policies[f.key])
          ? Number(form.policies[f.key])
          : template.defaultPolicies[f.key],
      ]),
    ) as unknown as TemplatePolicies,
  };
}

const TYPE_WORD = { enum: 'Chọn một', number: 'Số', text: 'Chữ' } as const;

function requiredText(field: SubjectField, template: IndustryTemplate): string {
  if (field.required === true) return 'Luôn';
  if (field.required === false) return 'Không';
  const [[key, value] = ['', '']] = Object.entries(field.required);
  const other = template.subjectSchema.find((f) => f.key === key);
  const option =
    other?.type === 'enum' ? other.options.find((o) => o.value === value)?.label : undefined;
  return `Khi ${other?.label.toLowerCase() ?? key} là ${option ?? value}`;
}

function fieldDetail(field: SubjectField) {
  if (field.type === 'enum') {
    return (
      <span className="sp-chips">
        {field.options.map((o) => (
          <span key={o.value} className="sp-chip h-[26px] cursor-default">
            {o.label} · {o.value}
          </span>
        ))}
      </span>
    );
  }
  if (field.type === 'number') {
    return `${field.unit ?? ''}${field.example ? ` · ví dụ ${field.example}` : ''}`.replace(
      /^ · /,
      '',
    );
  }
  return <span className="sp-muted">{field.example ? `Ví dụ: ${field.example}` : ''}</span>;
}

/** Gói cấu hình ngành, one industry (MH-59): card, wording, subject fields, resources, sample services, policies. */
export function TemplateDetailScreen({ code }: { code: string }) {
  const { templates, saveDraft, discardDraft, publish } = useTemplateStore();
  const template = templates.find((t) => t.id === code) ?? templates[0]!;
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toForm(template));
  const [submitted, setSubmitted] = useState(false);
  const [confirm, setConfirm] = useState<'publish' | 'discard' | null>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);

  const content = toContent(form, template);
  const local = changeLines(contentOf(template), content);
  const policyErrors = POLICY_FIELDS.filter((f) => !isCount(form.policies[f.key]));
  const invalid = policyErrors.length > 0 || form.name.trim() === '';
  const published = template.publishedVersion;
  const draftNumber = template.draft?.number ?? (published?.number ?? 0) + 1;
  const draftChanges = [
    ...(template.draft?.changes ?? []),
    ...local.filter((line) => !template.draft?.changes.includes(line)),
  ];
  const hasDraft = Boolean(template.draft) || local.length > 0;
  useUnsavedGuard(local.length > 0, setLeaveHref);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const setWord = (key: VocabularyKey, value: string) =>
    setForm((f) => ({ ...f, vocabulary: { ...f.vocabulary, [key]: value } }));
  const setPolicy = (key: keyof TemplatePolicies, value: string) =>
    setForm((f) => ({ ...f, policies: { ...f.policies, [key]: value.replace(/\D/g, '') } }));

  function save(): boolean {
    setSubmitted(true);
    if (invalid) {
      document
        .getElementById(form.name.trim() === '' ? 'tp-name' : `po-${policyErrors[0]!.key}`)
        ?.focus();
      return false;
    }
    if (local.length > 0) saveDraft(template.id, content, local);
    setSubmitted(false);
    return true;
  }

  const onSubmit = (e: FormEvent) => e.preventDefault();

  const staffWord = form.vocabulary.staff.trim() || 'nhân viên';
  const subjectWord = form.vocabulary.subject.trim();
  const sample = (key: VocabularyKey) =>
    ({
      staff: `“Chọn ${staffWord.toLowerCase()}”, lịch theo ${staffWord.toLowerCase()}`,
      subject: subjectWord ? `“Thông tin của ${subjectWord}”, “3 ${subjectWord}”` : '',
      subjectQuestion: 'Tiêu đề bước đặt lịch',
      addSubject: subjectWord ? `Nút ở bước chọn ${subjectWord}` : '',
      subjectExample: 'Chữ mờ trong ô tên',
    })[key];
  const vocabLabel: Record<VocabularyKey, string> = {
    staff: 'Từ cho nhân viên',
    subject: 'Từ cho đối tượng',
    subjectQuestion: 'Câu hỏi chọn đối tượng',
    addSubject: 'Chữ trên nút thêm',
    subjectExample: 'Ví dụ tên',
  };
  const askedSubject = template.vocabulary.subject !== null;
  const bookingPage = { hair_salon: 'toc-may', pet_spa: 'pawpaw' }[template.id];

  return (
    <div className="sp-shell__content">
      <PageHeader
        crumbs={[
          { label: 'Gói cấu hình ngành', href: '/mock/admin/templates' },
          { label: template.name },
        ]}
        title={template.name}
        sub={
          <>
            <code>{template.id}</code>
            {hasDraft
              ? ` · đang sửa bản nháp ${draftNumber}`
              : published
                ? ` · bản ${published.number} đang dùng`
                : ' · chưa xuất bản'}
          </>
        }
      />
      <DetailLayout
        sideLabel="Phiên bản"
        onSubmit={onSubmit}
        main={
          <>
            <FormSection
              id="tp-s1"
              title="Thẻ ở bước đăng ký"
              description={`Chủ cơ sở thấy thẻ này ở bước “Cơ sở của bạn thuộc ngành nào?”.`}
            >
              <Field
                id="tp-name"
                label="Tên ngành"
                error={submitted && form.name.trim() === '' ? 'Nhập tên ngành.' : undefined}
              >
                <input
                  id="tp-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                />
              </Field>
              <Field id="tp-state" label="Trạng thái" help="Sắp có: hiện thẻ nhưng chưa chọn được.">
                <select
                  id="tp-state"
                  value={form.status}
                  aria-describedby="tp-state-help"
                  onChange={(e) => set({ status: e.target.value as TemplateStatus })}
                >
                  {(['open', 'soon', 'hidden'] as const).map((status) => (
                    <option key={status} value={status}>
                      {statusLabel[status]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="tp-desc" label="Mô tả trên thẻ" full area>
                <textarea
                  id="tp-desc"
                  rows={2}
                  value={form.cardDescription}
                  onChange={(e) => set({ cardDescription: e.target.value })}
                />
              </Field>
              <Field id="tp-note" label="Câu dưới bảng xem trước" full area>
                <textarea
                  id="tp-note"
                  rows={2}
                  value={form.previewNote}
                  onChange={(e) => set({ previewNote: e.target.value })}
                />
              </Field>
            </FormSection>

            <section className="sp-form-section sp-form-section--stack" aria-labelledby="tp-s2">
              <div className="sp-form-section__head">
                <div>
                  <h2 className="sp-form-section__title" id="tp-s2">
                    Từ ngữ hiển thị
                  </h2>
                  <p className="sp-form-section__desc">
                    Thay chữ trên mọi màn của cơ sở thuộc ngành này. Lõi đặt lịch chỉ dùng tên
                    chung: nhân viên, đối tượng, tài nguyên.
                  </p>
                </div>
              </div>
              <div
                className="sp-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Từ ngữ hiển thị, cuộn được"
              >
                <table className="sp-table">
                  <caption className="sp-sr-only">Từ ngữ hiển thị</caption>
                  <thead>
                    <tr>
                      <th scope="col">Chỗ dùng</th>
                      <th scope="col">Từ của ngành</th>
                      <th scope="col">Ví dụ trên màn hình</th>
                    </tr>
                  </thead>
                  <tbody>
                    {VOCABULARY_FIELDS.map((field) => {
                      const unused = !askedSubject && field.key !== 'staff';
                      return (
                        <tr key={field.key}>
                          <td>{field.where}</td>
                          <td>
                            <div className="sp-field sp-field--sm">
                              <div className="sp-field__control">
                                <input
                                  type="text"
                                  value={form.vocabulary[field.key]}
                                  placeholder={unused ? 'Không dùng' : undefined}
                                  disabled={unused}
                                  aria-label={vocabLabel[field.key]}
                                  onChange={(e) => setWord(field.key, e.target.value)}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="sp-muted">
                              {unused ? 'Ngành này phục vụ chính khách' : sample(field.key)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="sp-form-section sp-form-section--stack" aria-labelledby="tp-s3">
              <div className="sp-form-section__head">
                <div>
                  <h2 className="sp-form-section__title" id="tp-s3">
                    Thông tin của {subjectWord || 'khách'}
                  </h2>
                  <p className="sp-form-section__desc">
                    {askedSubject
                      ? `Khách nhập một lần cho mỗi ${subjectWord}. Biến thể dịch vụ chọn theo các trường này (BR-13, BR-71).`
                      : 'Ngành này phục vụ chính khách nên không hỏi thêm thông tin.'}
                  </p>
                </div>
                {askedSubject && (
                  <div>
                    <Button
                      size="sm"
                      onClick={() => toast({ text: 'Thêm trường: chưa có trong mock.' })}
                    >
                      <Plus size={14} aria-hidden="true" />
                      Thêm trường
                    </Button>
                  </div>
                )}
              </div>
              {template.subjectSchema.length > 0 && (
                <div
                  className="sp-table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label={`Thông tin của ${subjectWord}, cuộn được`}
                >
                  <table className="sp-table">
                    <caption className="sp-sr-only">Thông tin của {subjectWord}</caption>
                    <thead>
                      <tr>
                        <th scope="col">Trường</th>
                        <th scope="col">Mã</th>
                        <th scope="col">Kiểu</th>
                        <th scope="col">Lựa chọn hoặc đơn vị</th>
                        <th scope="col">Bắt buộc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {template.subjectSchema.map((field) => (
                        <tr key={field.key}>
                          <td>{field.label}</td>
                          <td>
                            <code>{field.key}</code>
                          </td>
                          <td>{TYPE_WORD[field.type]}</td>
                          <td>{fieldDetail(field)}</td>
                          <td>{requiredText(field, template)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="sp-form-section sp-form-section--stack" aria-labelledby="tp-s4">
              <div className="sp-form-section__head">
                <div>
                  <h2 className="sp-form-section__title" id="tp-s4">
                    Loại tài nguyên
                  </h2>
                  <p className="sp-form-section__desc">
                    Tạo sẵn cho chi nhánh đầu tiên; chủ cơ sở chỉnh số lượng ở bước đăng ký.
                  </p>
                </div>
                <div>
                  <Button
                    size="sm"
                    onClick={() => toast({ text: 'Thêm loại: chưa có trong mock.' })}
                  >
                    <Plus size={14} aria-hidden="true" />
                    Thêm loại
                  </Button>
                </div>
              </div>
              <div
                className="sp-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Loại tài nguyên, cuộn được"
              >
                <table className="sp-table">
                  <caption className="sp-sr-only">Loại tài nguyên</caption>
                  <thead>
                    <tr>
                      <th scope="col">Tên</th>
                      <th scope="col">Là nhân viên</th>
                      <th scope="col">Gợi ý khi đăng ký</th>
                      <th scope="col" className="sp-table__num">
                        Số gợi ý
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {template.resourceTypes.map((type) => (
                      <tr key={type.name}>
                        <td>{type.name}</td>
                        <td>
                          {type.isStaff ? (
                            <span className="sp-badge sp-badge--confirmed">Nhân viên</span>
                          ) : (
                            <span className="sp-muted">Không</span>
                          )}
                        </td>
                        <td>
                          {type.isStaff ? <span className="sp-muted">{type.hint}</span> : type.hint}
                        </td>
                        <td className="sp-table__num">
                          <span className="sp-num">{type.defaultCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="sp-form-section sp-form-section--stack" aria-labelledby="tp-s5">
              <div className="sp-form-section__head">
                <div>
                  <h2 className="sp-form-section__title" id="tp-s5">
                    Dịch vụ mẫu
                  </h2>
                  <p className="sp-form-section__desc">
                    Bấm một dòng để sửa các đoạn, giống màn Chi tiết dịch vụ của cơ sở.
                  </p>
                </div>
                <div>
                  <Button
                    size="sm"
                    onClick={() => toast({ text: 'Thêm dịch vụ mẫu: chưa có trong mock.' })}
                  >
                    <Plus size={14} aria-hidden="true" />
                    Thêm dịch vụ
                  </Button>
                </div>
              </div>
              {template.sampleServices.length === 0 ? (
                <p className="sp-empty m-0">Chưa có dịch vụ mẫu.</p>
              ) : (
                <div
                  className="sp-table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="Dịch vụ mẫu, cuộn được"
                >
                  <table className="sp-table">
                    <caption className="sp-sr-only">Dịch vụ mẫu</caption>
                    <thead>
                      <tr>
                        <th scope="col">Dịch vụ</th>
                        <th scope="col">Thời gian, giá</th>
                        <th scope="col">Các đoạn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {template.sampleServices.flatMap((service) =>
                        service.variants.map((variant) => {
                          const timeline = sampleTimeline(template, variant);
                          return (
                            <tr key={`${service.name}-${variant.name}`}>
                              <td>
                                <span className="sp-table__primary">
                                  <Link
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      toast({
                                        text: 'Sửa đoạn của dịch vụ mẫu: dùng màn Chi tiết dịch vụ, chưa nối trong mock.',
                                      });
                                    }}
                                  >
                                    {service.name}
                                  </Link>
                                </span>
                                <span className="sp-table__secondary">{variant.name}</span>
                              </td>
                              <td>
                                <span className="sp-num">
                                  {formatDuration(sampleMinutes(variant))} ·{' '}
                                  {formatVnd(variant.priceVnd)}
                                </span>
                              </td>
                              <td>
                                <div className="min-w-80">
                                  <SegmentTimeline
                                    mini
                                    scale={false}
                                    showSeen={false}
                                    segments={timeline.segments}
                                    types={timeline.types}
                                    cleanup={{}}
                                    visible={timeline.visible}
                                    labelWidth={72}
                                    label={`Các đoạn của ${service.name}, ${variant.name}`}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        }),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <FormSection
              id="tp-s6"
              title="Chính sách mặc định"
              description="Cơ sở mới bắt đầu với các giá trị này và đổi được trong Cài đặt › Chính sách."
            >
              {POLICY_FIELDS.map((field) => (
                <Field
                  key={field.key}
                  id={`po-${field.key}`}
                  label={field.label}
                  suffix={field.unit}
                  help={field.rule}
                  error={
                    !isCount(form.policies[field.key]) ? 'Nhập số nguyên từ 0 trở lên.' : undefined
                  }
                >
                  <input
                    id={`po-${field.key}`}
                    type="text"
                    inputMode="numeric"
                    value={form.policies[field.key]}
                    aria-invalid={isCount(form.policies[field.key]) ? undefined : true}
                    aria-describedby={`po-${field.key}-help`}
                    onChange={(e) => setPolicy(field.key, e.target.value)}
                  />
                </Field>
              ))}
            </FormSection>

            {hasDraft && (
              <div className="sp-savebar max-md:bottom-22!" role="region" aria-label="Lưu bản nháp">
                <span aria-live="polite">
                  Bản nháp {draftNumber} · {draftChanges.length} thay đổi
                  {published ? ` so với bản ${published.number}` : ''}
                </span>
                <span className="sp-savebar__actions flex-wrap">
                  <Button variant="ghost" onClick={() => setConfirm('discard')}>
                    Bỏ bản nháp
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={local.length === 0 || invalid}
                    onClick={() => {
                      if (save()) toast({ text: `Đã lưu bản nháp ${draftNumber}.` });
                    }}
                  >
                    Lưu nháp
                  </Button>
                  <Button
                    variant="primary"
                    disabled={invalid}
                    onClick={() => setConfirm('publish')}
                  >
                    Xuất bản bản {draftNumber}
                  </Button>
                </span>
              </div>
            )}
          </>
        }
        side={
          <>
            <Panel
              title="Phiên bản"
              titleId="tv-title"
              note={`Xuất bản chỉ áp cho cơ sở tạo sau đó. ${published?.tenantsCreated ?? 0} cơ sở đã tạo giữ dữ liệu của mình, không đổi theo (BR-70).`}
            >
              <KeyValueList
                items={[
                  [
                    'Đang dùng cho cơ sở mới',
                    published
                      ? `Bản ${published.number} · ${formatFullDate(published.publishedAt)}`
                      : 'Chưa xuất bản',
                  ],
                  ['Cơ sở đã tạo từ gói', String(published?.tenantsCreated ?? 0)],
                  [
                    'Bản nháp',
                    hasDraft ? `Bản ${draftNumber} · ${draftChanges.length} thay đổi` : 'Không có',
                  ],
                ]}
              />
              {draftChanges.length > 0 && (
                <ul className="m-0 flex list-disc flex-col gap-1 ps-[18px] text-[13px] leading-5">
                  {draftChanges.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel
              title="Xem trước"
              titleId="tv-pv"
              note="Mở bước chọn ngành và trang đặt lịch mẫu, không tạo cơ sở thật."
            >
              <Link
                href="/mock/signup?step=industry"
                className="sp-btn sp-btn--secondary no-underline"
              >
                <Eye size={16} aria-hidden="true" />
                Xem bước chọn ngành
              </Link>
              {bookingPage ? (
                <Link
                  href={`/mock/${bookingPage}/book`}
                  className="sp-btn sp-btn--secondary no-underline"
                >
                  <Eye size={16} aria-hidden="true" />
                  Xem trang đặt lịch mẫu
                </Link>
              ) : (
                <Button disabled>
                  <Eye size={16} aria-hidden="true" />
                  Xem trang đặt lịch mẫu
                </Button>
              )}
            </Panel>
          </>
        }
      />

      <ConfirmDialog
        open={confirm === 'publish'}
        title={`Xuất bản bản ${draftNumber} của ${template.name}?`}
        body={`Chỉ cơ sở tạo sau đó nhận bản này; ${published?.tenantsCreated ?? 0} cơ sở đã tạo giữ dữ liệu của mình (BR-70).`}
        confirmLabel={`Xuất bản bản ${draftNumber}`}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          if (!save()) return;
          publish(template.id);
          toast({ text: `Đã xuất bản bản ${draftNumber} của ${template.name}.` });
        }}
      />
      <ConfirmDialog
        open={confirm === 'discard'}
        title={`Bỏ bản nháp ${draftNumber}?`}
        body={
          published
            ? `Mọi thay đổi trong bản nháp mất; nội dung trở về bản ${published.number}.`
            : 'Mọi thay đổi trong bản nháp mất.'
        }
        confirmLabel="Bỏ bản nháp"
        tone="danger"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          const restored = { ...template, ...(template.draft?.base ?? {}) } as IndustryTemplate;
          discardDraft(template.id);
          setForm(toForm(restored));
          setSubmitted(false);
          toast({ text: `Đã bỏ bản nháp ${draftNumber}.` });
        }}
      />
      <ConfirmDialog
        open={leaveHref !== null}
        title="Rời trang này?"
        body={`Còn ${local.length} thay đổi chưa lưu nháp. Rời đi thì các thay đổi đó mất.`}
        confirmLabel="Rời trang"
        tone="danger"
        onClose={() => setLeaveHref(null)}
        onConfirm={() => {
          const href = leaveHref;
          setLeaveHref(null);
          if (href) router.push(href);
        }}
      />
    </div>
  );
}
