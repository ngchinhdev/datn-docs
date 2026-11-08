'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  canOpen,
  emptyDraft,
  furthestStep,
  stepOf,
  type SignupDraft,
  type SignupStep,
} from '@/mock/signup';
import { AccountStep } from './account-step';
import { BusinessStep } from './business-step';
import { DoneStep } from './done-step';
import { IndustryStep } from './industry-step';
import { VerifyStep } from './verify-step';

const STORAGE_KEY = 'sapio.signup';

const stepHref = (step: SignupStep) => `/mock/signup?step=${step}`;

function load(): SignupDraft {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved
      ? { ...emptyDraft(), ...(JSON.parse(saved) as Partial<SignupDraft>) }
      : emptyDraft();
  } catch {
    return emptyDraft();
  }
}

/**
 * The five steps of MH-02. The step is in `?step=`; the draft lives in this component and in
 * `sessionStorage` (never the password), so a reload keeps it. A step opens only when the ones
 * before it are done, otherwise the address redirects to the furthest one allowed.
 */
export function SignupFlow() {
  const router = useRouter();
  const step = stepOf(useSearchParams().get('step'));
  const [draft, setDraft] = useState<SignupDraft>(emptyDraft);
  const [password, setPassword] = useState('');
  const [ready, setReady] = useState(false);

  // sessionStorage exists only in the browser, so the saved draft is read after the first render.
  useEffect(() => {
    setDraft(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, ready]);

  const allowed = canOpen(step, draft);
  useEffect(() => {
    if (ready && !allowed) router.replace(stepHref(furthestStep(draft)));
  }, [ready, allowed, draft, router]);

  const update = useCallback((patch: Partial<SignupDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);
  const go = useCallback((next: SignupStep) => router.push(stepHref(next)), [router]);

  if (!ready || !allowed) return null;

  switch (step) {
    case 'account':
      return (
        <AccountStep
          draft={draft}
          update={update}
          password={password}
          setPassword={setPassword}
          onNext={() => go('verify')}
        />
      );
    case 'verify':
      return <VerifyStep draft={draft} update={update} onNext={() => go('industry')} />;
    case 'industry':
      return (
        <IndustryStep
          draft={draft}
          update={update}
          onBack={() => go('verify')}
          onNext={() => go('business')}
        />
      );
    case 'business':
      return (
        <BusinessStep
          draft={draft}
          update={update}
          onBack={() => go('industry')}
          onNext={() => go('done')}
        />
      );
    case 'done':
      return <DoneStep draft={draft} />;
  }
}
