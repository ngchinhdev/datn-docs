'use client';

import Link from 'next/link';
import { downloadIcs } from '@/components/mock/download-ics';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { cn } from '@/lib/utils';
import { buildEmails, type EmailAction, type EmailSample } from '@/mock/emails';
import { branchPhone } from '@/mock/site';
import { MOCK_NOW } from '@/mock/time';

/** MH-23: the emails a customer gets, from the sample bookings. A page that exists only in the mock. */
export function EmailsScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = useLiveFixture(tenantSlug);
  const { tenant } = fixture;
  const branch = fixture.branches[0]!;
  const phone = branchPhone(tenantSlug);
  const emails = buildEmails(fixture, MOCK_NOW);
  const base = `/mock/${tenantSlug}`;

  const hrefOf = (email: EmailSample, action: Exclude<EmailAction, { to: 'ics' }>) => {
    const id = email.appointmentId;
    switch (action.to) {
      case 'detail':
        return `${base}/me/appointments/${id}`;
      // "Đồng ý" is answered on the page of the booking, where both buttons are.
      case 'reply':
        return `${base}/me/appointments/${id}`;
      case 'answer':
        return `${base}/book?step=datetime&doi=${id}&hoi=1`;
      case 'rebook':
        return `${base}/book`;
    }
  };

  function calendarOf(email: EmailSample) {
    const appt = fixture.appointments.find((a) => a.id === email.appointmentId);
    if (!appt) return;
    const end = appt.bookings.reduce(
      (m, b) => (b.kind !== 'cleanup' && b.endAt > m ? b.endAt : m),
      appt.startAt,
    );
    downloadIcs({
      start: appt.startAt,
      end,
      title: `${tenant.name}`,
      location: branch.address,
    });
  }

  return (
    <div
      className={cn(
        `sp-tenant-${tenant.id}`,
        'mx-auto flex w-full max-w-[720px] flex-col gap-(--space-6)',
      )}
    >
      <header className="flex flex-col gap-(--space-2)">
        <h1 className="title m-0">Email gửi cho khách</h1>
        <p className="body-sm m-0 text-(--ink-muted)">
          Trang chỉ có trong mock. Mỗi mẫu lấy giờ, người và tiền từ lịch mẫu của {tenant.name}.
        </p>
        <nav aria-label="Các mẫu email" className="flex flex-wrap gap-(--space-2)">
          {emails.map((e) => (
            <a
              key={e.id}
              href={`#email-${e.id}`}
              className="body-sm rounded-(--radius-pill) bg-(--fill-tonal) px-(--space-3) py-(--space-1) text-(--ink) no-underline hover:bg-(--surface-hover)"
            >
              {e.label}
            </a>
          ))}
        </nav>
      </header>

      {emails.map((email) => (
        <article
          key={email.id}
          id={`email-${email.id}`}
          aria-labelledby={`email-${email.id}-title`}
          className="flex scroll-mt-20 flex-col gap-(--space-2)"
        >
          <h2 id={`email-${email.id}-title`} className="heading m-0">
            {email.label}
          </h2>
          <div className="flex flex-col gap-(--space-3) rounded-(--radius-lg) bg-(--fill-tonal) p-(--space-4)">
            <dl className="body-sm m-0 flex flex-col gap-0.5 text-(--ink-muted)">
              <div className="flex gap-(--space-2)">
                <dt className="flex-none">Từ</dt>
                <dd className="m-0 break-words">{email.from}</dd>
              </div>
              <div className="flex gap-(--space-2)">
                <dt className="flex-none">Tiêu đề</dt>
                <dd className="m-0 font-semibold break-words text-(--ink)">{email.subject}</dd>
              </div>
            </dl>
            <div className="mx-auto flex w-full max-w-[480px] flex-col gap-(--space-4) rounded-(--radius-md) bg-(--surface-raised) p-(--space-5) shadow-[0_0_0_1px_var(--line)]">
              <div className="flex items-center gap-(--space-3)">
                <span
                  className="sp-switcher__mark size-8 rounded-lg bg-(--accent-soft) text-sm text-(--accent)"
                  aria-hidden="true"
                >
                  {tenant.monogram}
                </span>
                <span className="body font-semibold">{tenant.name}</span>
              </div>
              <p className="body m-0">
                {email.greeting && `${email.greeting}, `}
                {email.lead}
              </p>
              {email.code && (
                <p className="sp-num m-0 rounded-(--radius-md) bg-(--fill-tonal) py-(--space-3) text-center text-[32px] leading-10 font-semibold tracking-[0.3em]">
                  {email.code}
                </p>
              )}
              {email.highlight && (
                <p className="body m-0 rounded-(--radius-md) bg-(--accent-soft) p-(--space-3) font-medium">
                  {email.highlight}
                </p>
              )}
              {email.rows.length > 0 && (
                <dl className="m-0 flex flex-col">
                  {email.rows.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between gap-(--space-4) border-b border-(--line) py-(--space-2) last:border-b-0"
                    >
                      <dt className="body-sm flex-none text-(--ink-muted)">{k}</dt>
                      <dd
                        className={cn(
                          'body sp-num m-0 text-right whitespace-pre-line',
                          k === 'Giờ cũ' && 'text-(--ink-muted) line-through',
                        )}
                      >
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {email.actions.length > 0 && (
                <div className="flex flex-wrap gap-(--space-2)">
                  {email.actions.map((action, i) =>
                    action.to === 'ics' ? (
                      <button
                        key={action.label}
                        type="button"
                        className="sp-btn sp-btn--secondary"
                        onClick={() => calendarOf(email)}
                      >
                        {action.label}
                      </button>
                    ) : (
                      <Link
                        key={action.label}
                        href={hrefOf(email, action)}
                        className={cn(
                          'sp-btn no-underline',
                          i === 0 ? 'sp-btn--accent' : 'sp-btn--secondary',
                        )}
                      >
                        {action.label}
                      </Link>
                    ),
                  )}
                </div>
              )}
              {email.notes.map((note) => (
                <p key={note} className="body-sm m-0 text-(--ink-muted)">
                  {note}
                </p>
              ))}
              <p className="body-sm m-0 border-t border-(--line) pt-(--space-3) text-(--ink-muted)">
                {branch.address} · {phone.display}
                <br />
                Bạn nhận email này vì đã đặt lịch ở {tenant.name}. Email gửi qua Sapio.
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
