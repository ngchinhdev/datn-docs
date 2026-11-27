'use client';

import { Copy, CircleCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useAuthText } from '@/components/mock/auth-text';
import { Button } from '@/components/sapio/button';
import { SignupLayout } from '@/components/sapio/signup-layout';
import { useToast } from '@/components/sapio/toast';
import { siteHost } from '@/mock/site';
import { TRIAL_DAYS, describeResources, type SignupDraft } from '@/mock/signup';
import { addDays, formatFullDate, localDate, MOCK_NOW } from '@/mock/time';

/**
 * The mock creates no tenant: both buttons open the sample salon in trial mode, which is what the
 * new owner would see. The summary above them is read from what was typed.
 */
const SAMPLE_TENANT = 'toc-may';

/** Step 4: the tenant that was created, its booking page, the last day of the trial. */
export function DoneStep({ draft }: { draft: SignupDraft }) {
  const toast = useToast();
  const { lang, t } = useAuthText();
  const text = t.signup.done;

  const host = siteHost(draft.slug);
  // The day the tenant is created counts as day one (BR-80, BR-74.23).
  const trialEnd = formatFullDate(addDays(localDate(MOCK_NOW), TRIAL_DAYS - 1));

  return (
    <SignupLayout
      current={4}
      title={text.title(draft.businessName.trim())}
      titleIcon={
        <CircleCheck
          size={32}
          aria-hidden="true"
          className="flex-none text-(--status-checked-in)"
        />
      }
      lead={text.lead(draft.branchName.trim(), describeResources(draft, lang))}
      maxWidth={640}
      actions={
        <div className="flex w-full flex-wrap justify-end gap-(--space-2)">
          <Link
            href={`/mock/app/${SAMPLE_TENANT}/calendar?plan=trial`}
            className="sp-btn sp-btn--primary no-underline"
          >
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
    </SignupLayout>
  );
}
