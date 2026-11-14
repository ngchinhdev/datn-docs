'use client';

import { MessageCircle, Phone, Send, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { HoldBanner } from '@/components/sapio/hold-banner';
import { useBookingDraft } from '@/components/mock/booking-draft';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAssistant, type ChatMessage } from '@/components/mock/assistant-store';
import { useTenantSubscription } from '@/components/mock/platform-store';
import { useSiteSuspended } from '@/components/mock/site-suspended';
import {
  assistantAvailable,
  lineOf,
  type AssistantCard,
  type AssistantPage,
  type ServiceLine,
  type Suggestion,
} from '@/mock/assistant';
import { holdState, offerAfterExpiry } from '@/mock/assistant-hold';
import { ANY_STAFF } from '@/mock/availability';
import { formatDuration, formatVnd } from '@/mock/format';
import { visibleMinutes } from '@/mock/occupation';
import { branchPhone } from '@/mock/site';
import { can, entitlements } from '@/mock/subscription';
import { addMinutes, formatDay, formatRange, formatTime, localDate, MOCK_NOW } from '@/mock/time';

const LAUNCHER_ID = 'assistant-launcher';

/** Which page of the customer area the assistant is on, `null` where it has no button. */
function pageOf(
  pathname: string,
  tenantSlug: string,
  step: string | null,
  asksSubject: boolean,
): AssistantPage | null {
  const base = `/mock/${tenantSlug}`;
  if (pathname === base) return 'home';
  if (pathname === `${base}/book`) {
    const known = ['service', 'subject', 'datetime', 'info', 'confirm'] as const;
    return known.find((s) => s === step) ?? (asksSubject ? 'subject' : 'service');
  }
  if (pathname.startsWith(`${base}/book/pay`)) return 'deposit';
  return null;
}

/** The floating button and, once opened, the chat window (MH-22, BR-92). */
export function AssistantDock() {
  const { tenantSlug, fixture, open, setOpen, setHoldOpen } = useAssistant();
  const pathname = usePathname();
  const query = useSearchParams();
  const { subscription, catalog } = useTenantSubscription(tenantSlug);
  const suspended = useSiteSuspended(tenantSlug);
  const asked = useRef(false);

  const page = pageOf(
    pathname,
    tenantSlug,
    query.get('step'),
    fixture.template.vocabulary.subject !== null,
  );
  const mode = entitlements(subscription, MOCK_NOW, catalog).mode;
  // A trial walks through the page but takes no booking, so the assistant holds nothing (BR-81).
  useEffect(() => setHoldOpen(mode === 'active'), [mode, setHoldOpen]);
  const available =
    page !== null &&
    // Moving a booking that exists is not a place to ask for a new one.
    query.get('doi') === null &&
    assistantAvailable({
      enabled: fixture.config.chatbot.enabled,
      planHasChatbot: can(entitlements(subscription, MOCK_NOW, catalog), 'chatbot'),
      suspended,
      page,
    });

  // `?chat=1` opens the window once, for a link that shows it.
  const wantsOpen = query.get('chat') === '1';
  useEffect(() => {
    if (wantsOpen && available && !asked.current) {
      asked.current = true;
      setOpen(true);
    }
  }, [wantsOpen, available, setOpen]);

  if (!available) return null;
  return open ? (
    <AssistantWindow />
  ) : (
    <button
      id={LAUNCHER_ID}
      type="button"
      className="sp-btn sp-btn--accent fixed right-4 bottom-24 z-40 shadow-(--shadow-popover) min-[1024px]:right-6 min-[1024px]:bottom-6"
      onClick={() => setOpen(true)}
    >
      <MessageCircle size={18} aria-hidden="true" />
      Hỏi trợ lý
    </button>
  );
}

function AssistantWindow() {
  const { fixture, setOpen, messages, send, limit, skipAhead, spendToday } = useAssistant();
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const tone = fixture.tenant.slug === 'toc-may' ? 'may' : 'pawpaw';
  const name = `Trợ lý ${fixture.tenant.name.replace(/^(Salon|Spa thú cưng|Spa|Nail)\s+/, '')}`;

  useEffect(() => input.current?.focus(), []);
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [messages, limit]);

  const close = () => {
    setOpen(false);
    // Back to where the customer was: the button they pressed.
    requestAnimationFrame(() => document.getElementById(LAUNCHER_ID)?.focus());
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || limit) return;
    send({ text: value });
    setText('');
  };

  return (
    <div
      role="dialog"
      aria-label={name}
      className={`sp-tenant-${tone} fixed inset-0 z-50 flex flex-col overflow-hidden bg-(--surface) text-(--ink) min-[1024px]:inset-auto min-[1024px]:right-6 min-[1024px]:bottom-6 min-[1024px]:h-[620px] min-[1024px]:w-[400px] min-[1024px]:rounded-(--radius-lg) min-[1024px]:shadow-[0_0_0_1px_var(--line),0_24px_48px_rgba(0,0,0,.18)]`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
    >
      <header className="flex items-center gap-(--space-3) bg-(--surface-raised) py-(--space-2) ps-(--space-4) pe-(--space-2) shadow-[0_1px_0_var(--line)]">
        <span
          className="sp-switcher__mark size-9 rounded-lg bg-(--accent-soft) text-sm text-(--accent)"
          aria-hidden="true"
        >
          {fixture.tenant.monogram}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="body font-semibold">{name}</span>
          <span className="caption truncate text-(--ink-muted)">
            Tự động · số liệu từ hệ thống của tiệm
          </span>
        </span>
        <button
          type="button"
          className="sp-icon-btn flex size-11 items-center justify-center"
          aria-label="Đóng khung chat"
          onClick={close}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div
        role="log"
        aria-live="polite"
        aria-label="Cuộc trò chuyện"
        className="flex min-h-0 flex-1 flex-col gap-(--space-3) overflow-y-auto p-(--space-4)"
      >
        {messages.map((m, i) => (
          <Message key={m.id} message={m} last={i === messages.length - 1} />
        ))}
        {limit && (
          <div className="max-w-[92%] self-start">
            <LimitCard
              card={{
                kind: 'limit',
                reason: limit,
                limit:
                  limit === 'month'
                    ? fixture.config.chatbot.perShopPerMonth
                    : fixture.config.chatbot.perCustomerPerDay,
                phone: branchPhone(fixture.tenant.slug, fixture.branches[0]?.phone),
              }}
            />
          </div>
        )}
        {messages.length === 1 && (
          <p className="caption m-0 text-(--ink-muted)">
            Mình không tự đặt lịch: lịch chỉ được đặt khi bạn nhập mã 6 số gửi qua email.
          </p>
        )}
        <div ref={end} />
      </div>

      <div className="flex items-center gap-(--space-2) px-(--space-3) py-(--space-2) shadow-[0_-1px_0_var(--line)]">
        <span className="caption text-(--ink-muted)">Công cụ mock</span>
        <button
          type="button"
          className="sp-btn sp-btn--ghost sp-btn--sm"
          onClick={() => skipAhead(10)}
        >
          Tua 10 phút
        </button>
        <button type="button" className="sp-btn sp-btn--ghost sp-btn--sm" onClick={spendToday}>
          Dùng hết lượt hôm nay
        </button>
      </div>

      <form
        onSubmit={submit}
        className="flex items-center gap-(--space-2) bg-(--surface-raised) p-(--space-3) shadow-[0_-1px_0_var(--line)]"
      >
        <label className="sp-field__control h-11 flex-1 rounded-full">
          <input
            ref={input}
            aria-label="Câu hỏi"
            placeholder={limit ? 'Trợ lý đã hết lượt' : 'Hỏi giá, giờ trống…'}
            value={text}
            disabled={limit !== null}
            onChange={(e) => setText(e.target.value)}
            className="px-4 text-[15px]"
          />
        </label>
        <button
          type="submit"
          className="sp-btn sp-btn--accent size-11 rounded-full p-0"
          aria-label="Gửi"
          disabled={limit !== null || text.trim() === ''}
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function Message({ message, last }: { message: ChatMessage; last: boolean }) {
  const { send, limit } = useAssistant();
  if (message.from === 'customer') {
    return (
      <p className="body m-0 max-w-[85%] self-end rounded-(--radius-lg) bg-(--accent) px-(--space-4) py-(--space-2) text-(--on-accent)">
        {message.text}
      </p>
    );
  }
  const tap = (s: Suggestion) =>
    send({ text: s.label, ...(s.variantId ? { variantId: s.variantId } : {}) });
  return (
    <div className="flex max-w-[92%] flex-col gap-(--space-2) self-start">
      {message.text && (
        <p className="body m-0 rounded-(--radius-lg) bg-(--fill-tonal) px-(--space-4) py-(--space-2)">
          {message.text}
        </p>
      )}
      {message.cards.map((card, i) => (
        <Card key={i} card={card} message={message} />
      ))}
      {message.links.length > 0 && (
        <div className="flex flex-wrap gap-(--space-2)">
          {message.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="sp-btn sp-btn--secondary sp-btn--sm no-underline"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
      {last && message.suggestions.length > 0 && !limit && (
        <div className="flex flex-wrap gap-(--space-2)">
          {message.suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              className="sp-btn sp-btn--secondary sp-btn--sm rounded-full"
              onClick={() => tap(s)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const frame =
  'flex flex-col gap-(--space-2) rounded-(--radius-lg) bg-(--surface-raised) p-(--space-4) shadow-[0_0_0_1px_var(--line)]';

function Card({ card, message }: { card: AssistantCard; message: ChatMessage }) {
  switch (card.kind) {
    case 'service':
      return <ServiceCard card={card} />;
    case 'slots':
      return <SlotsCard card={card} at={message.at} />;
    case 'reception':
      return <ReceptionCard card={card} />;
    case 'hold':
      return <HoldCard card={card} />;
    case 'limit':
      return <LimitCard card={card} />;
    default:
      return null;
  }
}

function Source({ children }: { children: ReactNode }) {
  return <span className="caption text-(--ink-muted)">{children}</span>;
}

function ServiceCard({ card }: { card: Extract<AssistantCard, { kind: 'service' }> }) {
  const { fixture, send } = useAssistant();
  const top = fixture.staffLevels.at(-1);
  const multi = (fixture.services.find((s) => s.id === card.serviceId)?.variants.length ?? 1) > 1;
  return (
    <div className={frame}>
      {card.lines.map((line: ServiceLine) => (
        <div key={line.variantId} className="flex flex-col gap-(--space-1)">
          <div className="flex items-baseline justify-between gap-(--space-3)">
            <span className="flex flex-col">
              <span className="body font-semibold">
                {card.name}
                {multi ? ` · ${line.name}` : ''}
              </span>
              <span className="sp-num caption text-(--ink-muted)">
                {formatDuration(line.minutes)}
              </span>
            </span>
            <span className="sp-num title whitespace-nowrap">{formatVnd(line.priceVnd)}</span>
          </div>
          {line.topPriceVnd !== undefined && top && (
            <div className="sp-num caption flex justify-between text-(--ink-muted)">
              <span>Chọn đích danh {top}</span>
              <span>{formatVnd(line.topPriceVnd)}</span>
            </div>
          )}
          {line.depositVnd !== undefined && (
            <div className="sp-num caption flex justify-between text-(--ink-muted)">
              <span>Cọc khi đặt online</span>
              <span>{formatVnd(line.depositVnd)}</span>
            </div>
          )}
          <button
            type="button"
            className="sp-btn sp-btn--secondary sp-btn--sm self-start"
            onClick={() =>
              send(
                { text: `${card.name} còn giờ không?`, variantId: line.variantId, free: true },
                `Xem giờ trống ${card.name.toLowerCase()} · ${line.name}`,
              )
            }
          >
            Xem giờ trống
          </button>
        </div>
      ))}
      <Source>Lấy từ bảng giá của tiệm</Source>
    </div>
  );
}

function SlotsCard({ card, at }: { card: Extract<AssistantCard, { kind: 'slots' }>; at: string }) {
  const { tenantSlug, holdSlot, holdOpen, fixture, now, latestHoldId } = useAssistant();
  const held = latestHoldId ? fixture.appointments.find((a) => a.id === latestHoldId) : undefined;
  const heldStart = held && holdState(held, now) === 'active' ? held.startAt : null;
  return (
    <div className={frame}>
      <div className="flex items-baseline justify-between gap-(--space-3)">
        <span className="flex flex-col">
          <span className="body font-semibold">{card.name}</span>
          <span className="sp-num caption text-(--ink-muted)">
            {formatDuration(card.line.minutes)}
            {card.line.depositVnd === undefined ? ' · trả ở tiệm' : ''}
            {' · '}
            {formatDay(card.date)}
          </span>
        </span>
        <span className="sp-num title whitespace-nowrap">{formatVnd(card.line.priceVnd)}</span>
      </div>
      <span className="caption text-(--ink-muted)">Thợ: {card.staffName ?? 'Bất kỳ ai'}</span>
      <div className="sp-slots" role="group" aria-label={`Giờ trống ${formatDay(card.date)}`}>
        {card.slots.map((s) => (
          <button
            key={s.startAt}
            type="button"
            className="sp-slot"
            aria-pressed={
              heldStart === s.startAt && held?.items[0]?.serviceVariantId === card.variantId
            }
            disabled={!holdOpen}
            onClick={() =>
              holdSlot({
                serviceId: card.serviceId,
                variantId: card.variantId,
                staffChoice: card.staffResourceId,
                slot: s,
              })
            }
          >
            {formatTime(s.startAt)}
          </button>
        ))}
      </div>
      {!holdOpen && (
        <span className="caption text-(--ink-muted)">
          Cơ sở chưa nhận đặt lịch online, nên chưa giữ chỗ được.
        </span>
      )}
      <Link href={`/mock/${tenantSlug}/book`} className="caption text-(--brand)">
        Ngày khác, thợ khác: mở trang đặt lịch
      </Link>
      <Source>Giờ trống tính lúc {formatTime(at)}, có thể thay đổi</Source>
    </div>
  );
}

function ReceptionCard({ card }: { card: Extract<AssistantCard, { kind: 'reception' }> }) {
  return (
    <div className={frame}>
      <span className="body font-semibold">{card.branchName}</span>
      <span className="sp-num caption text-(--ink-muted)">
        {card.open
          ? `Đang mở · lễ tân trực đến ${card.closesAt}`
          : card.reopensTime
            ? `Đang đóng · mở lại ${card.reopensTime}${card.reopensDate ? `, ${formatDay(card.reopensDate)}` : ''}`
            : 'Đang đóng'}
      </span>
      <a href={`tel:${card.phone.tel}`} className="sp-btn sp-btn--accent no-underline">
        <Phone size={16} aria-hidden="true" />
        Gọi {card.phone.display}
      </a>
      <span className="caption text-(--ink-muted)">{card.address}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sp-num flex justify-between gap-(--space-3) text-sm">
      <span className="text-(--ink-muted)">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/** The booking page the held time goes on in, keeping the plan the customer is looking at. */
function bookHref(tenantSlug: string, step: string, query: URLSearchParams) {
  const keep = new URLSearchParams({ step, giu: '1' });
  for (const key of ['plan', 'periodEnd']) {
    const value = query.get(key);
    if (value) keep.set(key, value);
  }
  return `/mock/${tenantSlug}/book?${keep.toString()}`;
}

/**
 * A time the assistant holds (BR-07, BR-92): counting down, handed on to the booking page, turned
 * into a booking there, or given back. Its state is read from the calendar, not kept here.
 */
function HoldCard({ card }: { card: Extract<AssistantCard, { kind: 'hold' }> }) {
  const { fixture, tenantSlug, now, dropHold, send, latestHoldId, droppedIds } = useAssistant();
  const { customers } = useScheduleStore();
  const router = useRouter();
  const query = useSearchParams();
  const { draft, setDraft } = useBookingDraft();
  const appointment = fixture.appointments.find((a) => a.id === card.appointmentId);
  const state = holdState(appointment, now);
  const service = fixture.services.find((s) => s.id === card.serviceId);
  const variant = service?.variants.find((v) => v.id === card.variantId);
  if (!service || !variant) return null;

  const start = card.slot.startAt;
  const end = addMinutes(start, visibleMinutes(variant));
  const day = formatDay(localDate(start));
  const person = fixture.staff.find((s) => s.resourceId === card.slot.staffResourceId);
  const price = appointment?.items[0]?.priceVnd ?? variant.priceVnd;
  const asksSubject = fixture.template.vocabulary.subject !== null;
  const label = `${service.name}${service.variants.length > 1 ? ` · ${variant.name}` : ''}`;

  const details = (
    <>
      <Row label="Dịch vụ">{label}</Row>
      <Row label="Giờ">
        {formatRange(start, end)}, {day}
      </Row>
      {person && <Row label="Thợ">{person.profile.displayName}</Row>}
      <Row label={variant.depositVnd ? 'Cọc khi đặt online' : 'Trả ở tiệm'}>
        {formatVnd(variant.depositVnd ?? price)}
      </Row>
    </>
  );

  if (state === 'active') {
    return (
      <div className={frame}>
        <HoldBanner
          expiresAt={card.expiresAt}
          now={now}
          title="Đang giữ chỗ cho bạn"
          note={`${service.name} · ${person?.profile.displayName ?? ''}`}
          onExpire={() => {}}
        />
        {details}
        <div className="flex gap-(--space-2)">
          <button
            type="button"
            className="sp-btn sp-btn--accent flex-1"
            onClick={() => {
              // The booking page carries on from the clock of the chat, tool or not.
              if (draft && card.appointmentId.endsWith(`-a-web${draft.id}`))
                setDraft({ ...draft, now });
              router.push(bookHref(tenantSlug, asksSubject ? 'subject' : 'info', query));
            }}
          >
            Xác nhận bằng email
          </button>
          <button
            type="button"
            className="sp-btn sp-btn--secondary"
            onClick={() => {
              dropHold(card.appointmentId);
              send(
                { text: `${service.name} còn giờ không?`, variantId: variant.id, free: true },
                'Đổi giờ',
              );
            }}
          >
            Đổi giờ
          </button>
        </div>
        <Source>
          Trợ lý chỉ giữ chỗ. Lịch được đặt khi bạn nhập đúng mã 6 số; hết 10 phút chưa xác nhận thì
          giờ được trả lại.
        </Source>
      </div>
    );
  }

  if (state === 'used') {
    const customer = customers.find((c) => c.id === appointment?.customerId);
    const booked = appointment?.status === 'confirmed';
    return (
      <>
        <div className={frame}>
          <span className="body font-semibold">
            Đã giữ {formatTime(start)}, chuyển sang xác nhận
          </span>
          {details}
        </div>
        {booked && (
          <div className={frame}>
            <span className="body font-semibold">
              Đã đặt lịch {formatTime(start)}, {day}
            </span>
            <span className="caption text-(--ink-muted)">
              {label}
              {person ? ` · ${person.profile.displayName}` : ''}.
              {customer?.email ? ` Email xác nhận đã gửi tới ${customer.email}.` : ''}
            </span>
            <Link href={`/mock/${tenantSlug}/me`} className="sp-btn sp-btn--secondary no-underline">
              Xem lịch hẹn của bạn
            </Link>
            <Source>
              Hẹn gặp bạn. Muốn đổi giờ hay hủy thì vào Lịch của tôi, trước giờ hẹn{' '}
              {fixture.policies.cancelBeforeHours} tiếng.
            </Source>
          </div>
        )}
      </>
    );
  }

  // Given back: ran out, or the customer changed it. After running out the assistant looks again.
  const offer =
    card.appointmentId === latestHoldId && !droppedIds.includes(card.appointmentId)
      ? offerAfterExpiry(fixture, card, now)
      : null;
  return (
    <>
      <div className={`${frame} opacity-80`}>
        <span className="body font-semibold">Đã trả lại giờ {formatTime(start)}</span>
        {details}
      </div>
      {offer && (
        <div className="flex flex-col gap-(--space-2)">
          <p className="body m-0 rounded-(--radius-lg) bg-(--fill-tonal) px-(--space-4) py-(--space-2)">
            Hết thời gian giữ, giờ đã được trả lại. Mình vừa xem lại các giờ còn trống, bạn muốn giữ
            giờ nào?
          </p>
          <SlotsCard
            card={{
              kind: 'slots',
              serviceId: service.id,
              variantId: variant.id,
              name: label,
              line: lineOf(fixture, service, variant),
              date: offer.date,
              staffResourceId: card.staffChoice,
              ...(person && card.staffChoice !== ANY_STAFF
                ? { staffName: person.profile.displayName }
                : {}),
              slots: offer.slots,
            }}
            at={now}
          />
          <Source>
            Giờ đã có người đặt thì trợ lý chỉ đưa các giờ còn trống, không giữ lại giờ cũ.
          </Source>
        </div>
      )}
    </>
  );
}

function LimitCard({ card }: { card: Extract<AssistantCard, { kind: 'limit' }> }) {
  const { tenantSlug } = useAssistant();
  return (
    <div className={frame}>
      <span className="body font-semibold">
        {card.reason === 'day'
          ? `Bạn đã hỏi ${card.limit} lượt hôm nay`
          : 'Trợ lý đã hết lượt trong tháng'}
      </span>
      <span className="caption text-(--ink-muted)">
        {card.reason === 'day'
          ? 'Trợ lý nghỉ đến 00:00. Bạn vẫn xem đủ giờ trống trên trang đặt lịch, hoặc gọi tiệm.'
          : 'Bạn vẫn xem đủ giờ trống trên trang đặt lịch, hoặc gọi tiệm.'}
      </span>
      <div className="flex gap-(--space-2)">
        <Link
          href={`/mock/${tenantSlug}/book`}
          className="sp-btn sp-btn--accent flex-1 no-underline"
        >
          Đặt trên trang
        </Link>
        <a href={`tel:${card.phone.tel}`} className="sp-btn sp-btn--secondary flex-1 no-underline">
          Gọi {card.phone.display}
        </a>
      </div>
    </div>
  );
}
