'use client';

import { ChevronRight, Copy, CircleCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useAuthText } from '@/components/mock/auth-text';
import { Button } from '@/components/sapio/button';
import { SignupLayout } from '@/components/sapio/signup-layout';
import { useToast } from '@/components/sapio/toast';
import { siteHost } from '@/mock/site';
import {
  TRIAL_DAYS,
  describeResources,
  industryById,
  previewLines,
  type SignupDraft,
} from '@/mock/signup';
import { addDays, formatFullDate, localDate, MOCK_NOW } from '@/mock/time';

/**
 * The mock creates no tenant: both buttons open the sample salon in trial mode, which is what the
 * new owner would see. The summary above them is read from what was typed.
 */
const SAMPLE_TENANT = 'toc-may';

/** The page each of the four suggestions opens, in the order of `text.next`. */
const NEXT_PATHS = ['settings/staff', 'settings/services', 'shifts', 'settings/branding'];

/** Step 5: what was created, the address, the end of the trial and what to do next. */
export function DoneStep({ draft }: { draft: SignupDraft }) {
  const toast = useToast();
  const { t } = useAuthText();
  const text = t.signup.done;
  const template = industryById(draft.industry)?.template;
  if (!template) return null;

  const host = siteHost(draft.slug);
  const services = previewLines(template.sampleServices).length;
  // The day the tenant is created counts as day one (BR-80).
  const trialEnd = formatFullDate(addDays(localDate(MOCK_NOW), TRIAL_DAYS - 1));
  const app = (path: string) => `/mock/app/${SAMPLE_TENANT}/${path}?plan=trial`;

  return (
    <SignupLayout
      current={5}
      title={text.title(draft.businessName.trim())}
      titleIcon={
        <CircleCheck
          size={32}
          aria-hidden="true"
          className="flex-none text-(--status-checked-in)"
        />
      }
      lead={text.lead(draft.branchName.trim(), services, describeResources(draft, template))}
      maxWidth={640}
      actions={
        <div className="flex w-full flex-wrap justify-end gap-(--space-2)">
          <Link href={app('settings/plan')} className="sp-btn sp-btn--secondary no-underline">
            {text.activate}
          </Link>
          <Link href={app('calendar')} className="sp-btn sp-btn--primary no-underline">
            {text.enter}
          </Link>
        </div>
      }
    >
      <section className="sp-auth__card gap-(--space-3)!" aria-labelledby="dn-link">
        <div className="flex items-center justify-between gap-(--space-3)">
          <h2 id="dn-link" className="m-0 text-base leading-6 font-semibold">
            {text.pageTitle}
          </h2>
          <span className="sp-badge sp-badge--pending">{text.notOpen}</span>
        </div>
        <div className="flex flex-wrap items-center gap-(--space-2)">
          <span className="sp-num min-w-0 flex-[1_1_200px] rounded-(--radius-sm) bg-(--fill-tonal) px-3 py-2.5 text-[15px] leading-[22px] font-medium break-all">
            {host}
          </span>
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard?.writeText(host);
              toast({ text: text.copied(host) });
            }}
          >
            <Copy size={16} aria-hidden="true" />
            {text.copy}
          </Button>
          <Link
            href={`/mock/${SAMPLE_TENANT}/book?plan=trial`}
            className="sp-btn sp-btn--secondary no-underline"
          >
            <ExternalLink size={16} aria-hidden="true" />
            {text.preview}
          </Link>
        </div>
        <p className="sp-field__help m-0">{text.pageHelp}</p>
      </section>

      <section
        className="sp-auth__card gap-(--space-2)! bg-(--brand-soft)! shadow-none!"
        aria-labelledby="dn-trial"
      >
        <h2 id="dn-trial" className="m-0 text-base leading-6 font-semibold">
          {text.trialTitle(TRIAL_DAYS, trialEnd)}
        </h2>
        <p className="m-0 text-sm leading-5">{text.trialBody(TRIAL_DAYS)}</p>
      </section>

      <section aria-labelledby="dn-next" className="flex flex-col gap-(--space-2)">
        <h2 id="dn-next" className="m-0 text-base leading-6 font-semibold">
          {text.nextTitle}
        </h2>
        <ol className="sp-menu m-0 min-w-0 list-none">
          {text.next(services).map((item, i) => (
            <li key={NEXT_PATHS[i]}>
              <Link href={app(NEXT_PATHS[i]!)} className="sp-menu__item min-h-13">
                <span className="sp-avatar sp-avatar--sm bg-(--fill-tonal)!" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="sp-menu__text">
                  {item.title}
                  <span className="sp-menu__sub">{item.where}</span>
                </span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </SignupLayout>
  );
}
