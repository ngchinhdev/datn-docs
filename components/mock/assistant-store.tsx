'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { useMockNow } from '@/components/sapio/use-mock-now';
import {
  ask,
  initialState,
  limitReached,
  quickSuggestions,
  type AskInput,
  type AssistantCard,
  type AssistantReply,
  type AssistantState,
  type Suggestion,
} from '@/mock/assistant';
import type { TenantFixture } from '@/mock/fixtures';

/** One line of the chat: what the customer sent, or what the assistant answered with. */
export interface ChatMessage {
  id: string;
  from: 'customer' | 'assistant';
  text: string;
  cards: AssistantCard[];
  suggestions: Suggestion[];
  links: { label: string; href: string }[];
  /** Mock clock when it was written; the times in its cards were computed then. */
  at: string;
}

interface AssistantValue {
  tenantSlug: string;
  fixture: TenantFixture;
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: ChatMessage[];
  /** Mock clock of the chat, in step with the booking page it hands over to. */
  now: string;
  /** `day` or `month` once the customer cannot send any more (BR-67). */
  limit: 'day' | 'month' | null;
  /** Sends a message; `shown` is what the chat prints for a button inside a card. */
  send: (input: AskInput, shown?: string) => AssistantReply;
}

const AssistantContext = createContext<AssistantValue | null>(null);

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant() needs <AssistantProvider>');
  return ctx;
}

/**
 * The chat of the customer page. It lives in the layout of the tenant, so the conversation stays
 * while the window opens and closes and while the customer moves between the shop page and the
 * booking page (BR-92). In memory: a reload starts a new chat.
 */
export function AssistantProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const fixture = useLiveFixture(tenantSlug);
  const ticking = useMockNow();
  const now = ticking;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AssistantState>(() => initialState(ticking));
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'm0',
      from: 'assistant',
      text: fixture.config.chatbot.greeting,
      cards: [],
      suggestions: quickSuggestions(fixture),
      links: [],
      at: ticking,
    },
  ]);
  const counter = useRef(0);
  const nextId = () => `m${(counter.current += 1)}`;

  const send = useCallback(
    (input: AskInput, shown?: string) => {
      const result = ask(fixture, state, input, now);
      setState(result.state);
      const { reply } = result;
      setMessages((cur) => [
        ...cur,
        {
          id: nextId(),
          from: 'customer',
          text: shown ?? input.text,
          cards: [],
          suggestions: [],
          links: [],
          at: now,
        },
        {
          id: nextId(),
          from: 'assistant',
          text: reply.text,
          cards: reply.cards,
          suggestions: reply.suggestions,
          links: reply.links,
          at: now,
        },
      ]);
      return reply;
    },
    [fixture, state, now],
  );

  const limit = limitReached(fixture.config.chatbot, state, now);

  const value = useMemo(
    () => ({
      tenantSlug,
      fixture,
      open,
      setOpen,
      messages,
      now,
      limit,
      send,
    }),
    [tenantSlug, fixture, open, messages, now, limit, send],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
