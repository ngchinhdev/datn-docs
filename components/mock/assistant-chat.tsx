'use client';

import { MessageCircle, Phone, Send, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useAssistant, type ChatMessage } from '@/components/mock/assistant-store';
import { useTenantSubscription } from '@/components/mock/platform-store';
import { useSiteSuspended } from '@/components/mock/site-suspended';
import {
  assistantAvailable,
  type AssistantCard,
  type AssistantPage,
  type ServiceLine,
  type Suggestion,
} from '@/mock/assistant';
import { formatDuration, formatVnd } from '@/mock/format';
import { can, entitlements } from '@/mock/subscription';
import { formatDay, formatTime, MOCK_NOW } from '@/mock/time';

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
  const { tenantSlug, fixture, open, setOpen } = useAssistant();
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
  const { fixture, setOpen, messages, send, limit } = useAssistant();
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const tone = fixture.tenant.slug === 'toc-may' ? 'may' : 'pawpaw';
  const name = `Trợ lý ${fixture.tenant.name.replace(/^(Salon|Spa thú cưng|Spa|Nail)\s+/, '')}`;

  useEffect(() => input.current?.focus(), []);
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [messages]);

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
        {messages.length === 1 && (
          <p className="caption m-0 text-(--ink-muted)">
            Mình không tự đặt lịch: lịch chỉ được đặt khi bạn nhập mã 6 số gửi qua email.
          </p>
        )}
        <div ref={end} />
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
      return <SlotsCard card={card} message={message} />;
    case 'reception':
      return <ReceptionCard card={card} />;
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

function SlotsCard({
  card,
  message,
}: {
  card: Extract<AssistantCard, { kind: 'slots' }>;
  message: ChatMessage;
}) {
  const { tenantSlug } = useAssistant();
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
          <button key={s.startAt} type="button" className="sp-slot" aria-pressed={false}>
            {formatTime(s.startAt)}
          </button>
        ))}
      </div>
      <Link href={`/mock/${tenantSlug}/book`} className="caption text-(--brand)">
        Ngày khác, thợ khác: mở trang đặt lịch
      </Link>
      <Source>Giờ trống tính lúc {formatTime(message.at)}, có thể thay đổi</Source>
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
