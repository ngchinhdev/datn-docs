'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { nextDraftId, useBookingDraft, type BookingDraft } from '@/components/mock/booking-draft';
import { useScheduleStore } from '@/components/mock/schedule-store';
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
  type SlotChoice,
  type Suggestion,
} from '@/mock/assistant';
import { holdState, makeHold } from '@/mock/assistant-hold';
import { ANY_STAFF } from '@/mock/availability';
import type { TenantFixture } from '@/mock/fixtures';
import { formatDay, formatRange, formatTime, localDate } from '@/mock/time';

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

/** What it takes to hold one time of a card. */
export interface HoldTarget {
  serviceId: string;
  variantId: string;
  /** `ANY_STAFF` or the person asked for. */
  staffChoice: string;
  slot: SlotChoice;
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
  /** Whether the shop takes online bookings now; on a trial the assistant answers but holds nothing. */
  holdOpen: boolean;
  setHoldOpen: (open: boolean) => void;
  /** Holds a time (BR-07); the one the chat held before is given back. */
  holdSlot: (target: HoldTarget) => void;
  /** Gives the held time back before it runs out. */
  dropHold: (appointmentId: string) => void;
  /** Id of the appointment of the newest hold of this chat. */
  latestHoldId: string | null;
  /** Holds the customer gave up or replaced, as opposed to the ones that ran out. */
  droppedIds: string[];
}

const AssistantContext = createContext<AssistantValue | null>(null);

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error('useAssistant() needs <AssistantProvider>');
  return ctx;
}

type Draft = Omit<ChatMessage, 'id'>;

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
  const store = useScheduleStore();
  const { setDraft } = useBookingDraft();
  const now = useMockNow();
  const [open, setOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(true);
  const [state, setState] = useState<AssistantState>(() => initialState(now));
  const counter = useRef(0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'm0',
      from: 'assistant',
      text: fixture.config.chatbot.greeting,
      cards: [],
      suggestions: quickSuggestions(fixture),
      links: [],
      at: now,
    },
  ]);
  const [holdIds, setHoldIds] = useState<string[]>([]);
  const [droppedIds, setDroppedIds] = useState<string[]>([]);

  const append = useCallback((...added: Draft[]) => {
    setMessages((cur) => [
      ...cur,
      ...added.map((m) => ({ ...m, id: `m${(counter.current += 1)}` })),
    ]);
  }, []);

  const latestHoldId = holdIds.at(-1) ?? null;

  const dropHold = useCallback(
    (appointmentId: string) => {
      store.removeAppointment(appointmentId);
      setDroppedIds((cur) => [...cur, appointmentId]);
    },
    [store],
  );

  const holdSlotWith = useCallback(
    (target: HoldTarget, customerText?: string) => {
      const staffName = fixture.staff.find((s) => s.resourceId === target.slot.staffResourceId)
        ?.profile.displayName;
      const said: Draft = {
        from: 'customer',
        text:
          customerText ??
          `Lấy ${formatTime(target.slot.startAt)}${staffName ? ` với ${staffName}` : ''} nhé`,
        cards: [],
        suggestions: [],
        links: [],
        at: now,
      };
      const answer = (text: string, cards: AssistantCard[] = []): Draft => ({
        from: 'assistant',
        text,
        cards,
        suggestions: [],
        links: [],
        at: now,
      });
      if (!holdOpen) {
        append(
          said,
          answer(
            'Cơ sở chưa nhận đặt lịch online nên mình chưa giữ chỗ được. Bạn vẫn hỏi giá và giờ trống thoải mái nhé.',
          ),
        );
        return;
      }
      // One hold per chat: the one before is given back when this one is made (BR-92).
      const previous =
        latestHoldId &&
        holdState(
          fixture.appointments.find((a) => a.id === latestHoldId),
          now,
        ) === 'active'
          ? latestHoldId
          : null;
      const draftId = nextDraftId();
      const appointmentId = `${fixture.tenant.id}-a-web${draftId}`;
      const hold = makeHold({
        fixture,
        appointmentId,
        ...target,
        now,
        ...(previous ? { replaces: previous } : {}),
      });
      if (!hold) {
        append(said, answer('Giờ này vừa có người đặt mất rồi. Bạn chọn giờ khác trong thẻ nhé.'));
        return;
      }
      if (previous) dropHold(previous);
      store.addAppointment(hold.appointment);
      setHoldIds((cur) => [...cur, appointmentId]);

      const service = fixture.services.find((s) => s.id === target.serviceId)!;
      const variant = service.variants.find((v) => v.id === target.variantId)!;
      const asksSubject = fixture.template.vocabulary.subject !== null;
      const placed = hold.bookingSlot;
      const day = formatDay(localDate(placed.startAt));
      const draft: BookingDraft = {
        id: draftId,
        tenantSlug,
        newCustomer: true,
        source: 'assistant',
        state: {
          picks: asksSubject ? [] : [{ serviceId: service.id, variantId: variant.id }],
          people: null,
          chosenIds: asksSubject ? ['new-1'] : [],
          drafts: asksSubject
            ? [{ id: 'new-1', name: '', values: state.context.attrs, touched: [] }]
            : [],
          serviceFor: asksSubject ? { 'new-1': service.id } : {},
          petChain: asksSubject ? [service.id] : null,
          staffByKey: { [service.id]: target.staffChoice },
          date: localDate(placed.startAt),
          name: '',
          phone: '',
          email: '',
          slot: placed,
          holdExpiresAt: hold.expiresAt,
        },
        refs: [hold.ref],
        mode: 'single',
        slot: placed,
        holdExpiresAt: hold.expiresAt,
        now,
        contact: { name: '', phone: '', email: '' },
        priceVnd: hold.appointment.items[0]?.priceVnd ?? variant.priceVnd,
        depositVnd: variant.depositVnd ?? 0n,
        display: {
          slotLine: `${formatTime(placed.startAt)} · ${day}`,
          people: staffName ?? '',
          plan: [
            {
              id: service.id,
              time: formatRange(placed.startAt, placed.endAt),
              title: `${service.name} · ${variant.name}`,
              note: staffName ?? '',
            },
          ],
          day,
        },
      };
      setDraft(draft);
      append(
        said,
        answer('Mình đã giữ chỗ cho bạn. Bạn bấm xác nhận để nhập thông tin và mã gửi qua email.', [
          {
            kind: 'hold',
            appointmentId,
            serviceId: target.serviceId,
            variantId: target.variantId,
            staffChoice: target.staffChoice,
            slot: target.slot,
            expiresAt: hold.expiresAt,
          },
        ]),
      );
    },
    [fixture, now, holdOpen, latestHoldId, store, setDraft, append, dropHold, tenantSlug, state],
  );

  const send = useCallback(
    (input: AskInput, shown?: string) => {
      const result = ask(fixture, state, input, now);
      setState(result.state);
      const { reply } = result;
      if (reply.pick) {
        holdSlotWith(
          {
            serviceId: reply.pick.serviceId,
            variantId: reply.pick.variantId,
            staffChoice: result.state.context.staffResourceId ?? ANY_STAFF,
            slot: reply.pick.slot,
          },
          shown ?? input.text,
        );
        return reply;
      }
      append(
        {
          from: 'customer',
          text: shown ?? input.text,
          cards: [],
          suggestions: [],
          links: [],
          at: now,
        },
        {
          from: 'assistant',
          text: reply.text,
          cards: reply.cards,
          suggestions: reply.suggestions,
          links: reply.links,
          at: now,
        },
      );
      return reply;
    },
    [fixture, state, now, holdSlotWith, append],
  );

  // BR-07: a hold that ran out goes back to the free times, whatever page the customer is on.
  useEffect(() => {
    for (const id of holdIds) {
      const appointment = fixture.appointments.find((a) => a.id === id);
      if (appointment?.status === 'held' && holdState(appointment, now) === 'returned') {
        store.removeAppointment(id);
      }
    }
  }, [now, holdIds, fixture.appointments, store]);

  const limit = limitReached(fixture.config.chatbot, state, now);
  const holdSlot = useCallback((target: HoldTarget) => holdSlotWith(target), [holdSlotWith]);

  const value = useMemo<AssistantValue>(
    () => ({
      tenantSlug,
      fixture,
      open,
      setOpen,
      messages,
      now,
      limit,
      send,
      holdOpen,
      setHoldOpen,
      holdSlot,
      dropHold,
      latestHoldId,
      droppedIds,
    }),
    [
      tenantSlug,
      fixture,
      open,
      messages,
      now,
      limit,
      send,
      holdOpen,
      holdSlot,
      dropHold,
      latestHoldId,
      droppedIds,
    ],
  );
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
