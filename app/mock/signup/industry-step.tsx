'use client';

import { Hand, Leaf, PawPrint, Scissors } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/sapio/button';
import { ChoiceCards } from '@/components/sapio/choice-cards';
import { SignupLayout } from '@/components/sapio/signup-layout';
import { useToast } from '@/components/sapio/toast';
import type { IndustryTemplate } from '@/mock/fixtures';
import {
  industries,
  industryById,
  previewLines,
  type IndustryId,
  type SignupDraft,
  placedResourceTypes,
} from '@/mock/signup';

const ICONS: Record<IndustryId, ReactNode> = {
  salon: <Scissors />,
  nail: <Hand />,
  spa: <Leaf />,
  pet: <PawPrint />,
};

/** The fields the add-subject form asks for, in the words of the schema: "tên, loài, giống, cân nặng". */
const askedFields = (template: IndustryTemplate) =>
  ['tên', ...template.subjectSchema.map((f) => f.label.toLowerCase())].join(', ');

/** What the template installs, read from the template: services, resources, words. */
function Preview({ template }: { template: IndustryTemplate }) {
  const lines = previewLines(template.sampleServices);
  const subject = template.subjectSchema.length > 0;
  return (
    <section
      aria-labelledby="pv-title"
      className="flex flex-col gap-(--space-4) rounded-(--radius-lg) bg-(--surface-raised) p-(--space-5) shadow-[0_0_0_1px_var(--line),var(--shadow-card)]"
    >
      <h2 id="pv-title" className="m-0 text-base leading-6 font-semibold">
        Gói {template.name} có sẵn
      </h2>
      <div className="flex flex-col gap-(--space-2)">
        <span className="sp-menu__label p-0!">Dịch vụ mẫu · {lines.length}</span>
        <div className="flex flex-col gap-1.5 text-sm leading-5">
          {lines.map((line) => (
            <div key={line.label} className="flex justify-between gap-(--space-3)">
              <span>{line.label}</span>
              <span className="sp-num whitespace-nowrap text-(--ink-muted)">{line.detail}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="sp-menu__label p-0!">Tài nguyên</span>
        <span className="text-sm leading-5">
          {placedResourceTypes(template)
            .map((r) => r.name)
            .join(', ')}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="sp-menu__label p-0!">Cách gọi</span>
        <span className="text-sm leading-5">
          Nhân viên gọi là &quot;{template.vocabulary.staff}&quot;. Khách đặt lịch cho{' '}
          {template.bookingFor}
          {subject ? `: ${askedFields(template)}.` : '.'}
        </span>
      </div>
      <p className="m-0 rounded-(--radius-md) bg-(--fill-tonal) p-(--space-3) text-[13px] leading-[18px] text-(--ink-muted)">
        {template.previewNote}
      </p>
    </section>
  );
}

/** Step 3: the industry decides the sample services, resource types and wording. */
export function IndustryStep({
  draft,
  update,
  onBack,
  onNext,
}: {
  draft: SignupDraft;
  update: (patch: Partial<SignupDraft>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const toast = useToast();
  const chosen = industryById(draft.industry);
  const template = chosen?.template ?? null;

  return (
    <SignupLayout
      current={3}
      title="Cơ sở của bạn thuộc ngành nào?"
      titleId="ind-title"
      lead={
        <>
          <span className="max-md:hidden">
            Sapio nạp sẵn dịch vụ mẫu, loại tài nguyên và cách gọi theo ngành. Bạn chỉnh được hết
            sau khi tạo.
          </span>
          <span className="md:hidden">Sapio nạp sẵn dịch vụ mẫu và cách gọi theo ngành.</span>
        </>
      }
      wide
      stickyActions
      top={
        <button
          type="button"
          className="sp-btn sp-btn--ghost sp-btn--sm"
          onClick={() =>
            toast({ text: 'Đã lưu. Đăng nhập lại để làm tiếp (mock chưa có đăng nhập).' })
          }
        >
          <span className="max-md:hidden">Lưu và làm tiếp sau</span>
          <span className="md:hidden">Lưu, làm sau</span>
        </button>
      }
      actions={
        <>
          <Button variant="secondary" onClick={onBack}>
            Quay lại
          </Button>
          <Button variant="primary" disabled={!template} onClick={onNext}>
            <span className="max-md:hidden!">Tiếp tục với {chosen?.title}</span>
            <span className="md:hidden!">Tiếp tục</span>
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-start gap-(--space-6)">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-(--space-3)">
          <ChoiceCards
            name="industry"
            labelledBy="ind-title"
            value={draft.industry}
            onChange={(value) => update({ industry: value as IndustryId, counts: {} })}
            options={industries.map((industry) => ({
              value: industry.id,
              title: industry.title,
              description: industry.description,
              icon: ICONS[industry.id],
              ...(industry.template ? {} : { disabled: true, tag: 'Sắp có' }),
            }))}
          />
          <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
            Ngành khác? Chọn ngành gần nhất, rồi đổi tên dịch vụ và tài nguyên trong Cài đặt.
          </p>
        </div>
        <div className="min-w-0 flex-[1_1_340px]">
          {template && <Preview template={template} />}
        </div>
      </div>
    </SignupLayout>
  );
}
