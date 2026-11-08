'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { industryTemplates } from '@/mock/fixtures/templates';
import type { IndustryTemplate, TemplateContent } from '@/mock/fixtures';
import { contentOf } from '@/mock/template-view';
import { MOCK_TODAY } from '@/mock/time';

interface TemplateStore {
  templates: IndustryTemplate[];
  /** Keeps edits as the draft; the first edit starts it from the content as it was (BR-70). */
  saveDraft: (id: string, next: TemplateContent, changes: string[]) => void;
  /** Drops the draft and returns the content it started from. */
  discardDraft: (id: string) => void;
  /** The draft becomes the version new tenants receive; tenants already made keep their data. */
  publish: (id: string) => void;
}

const TemplateContext = createContext<TemplateStore | null>(null);

/** Templates of the platform, so the list and the detail pages show the same drafts. */
export function TemplateStoreProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState(industryTemplates);
  const update = (id: string, change: (t: IndustryTemplate) => IndustryTemplate) =>
    setTemplates((list) => list.map((t) => (t.id === id ? change(t) : t)));

  const saveDraft = useCallback((id: string, next: TemplateContent, changes: string[]) => {
    update(id, (t) => {
      const draft = t.draft ?? {
        number: (t.publishedVersion?.number ?? 0) + 1,
        changes: [],
        base: contentOf(t),
      };
      const merged = [...draft.changes, ...changes.filter((line) => !draft.changes.includes(line))];
      return {
        ...t,
        ...next,
        draft: { ...draft, changes: merged },
        updatedAt: MOCK_TODAY,
      };
    });
  }, []);

  const discardDraft = useCallback((id: string) => {
    update(id, (t) => ({ ...t, ...(t.draft?.base ?? {}), draft: null, updatedAt: MOCK_TODAY }));
  }, []);

  const publish = useCallback((id: string) => {
    update(id, (t) => {
      if (!t.draft) return t;
      return {
        ...t,
        publishedVersion: {
          number: t.draft.number,
          publishedAt: MOCK_TODAY,
          tenantsCreated: t.publishedVersion?.tenantsCreated ?? 0,
        },
        draft: null,
        updatedAt: MOCK_TODAY,
      };
    });
  }, []);

  const value = useMemo(
    () => ({ templates, saveDraft, discardDraft, publish }),
    [templates, saveDraft, discardDraft, publish],
  );
  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
}

export function useTemplateStore() {
  const store = useContext(TemplateContext);
  if (!store) throw new Error('useTemplateStore() needs <TemplateStoreProvider>');
  return store;
}
