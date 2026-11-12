'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CustomerHeader } from '@/components/mock/customer-header';
import { useCustomerSession } from '@/components/mock/customer-session';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { OtpField } from '@/components/sapio/otp-field';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { cn } from '@/lib/utils';
import { MOCK_CODE } from '@/mock/emails';
import { fixtureBySlug } from '@/mock/selection';

/** BR-16, N: wrong codes allowed before a new one is needed. */
const MAX_WRONG = 5;
const RESEND_SECONDS = 60;
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

type Phase = 'email' | 'code' | 'empty';

/** MH-16: log in to one shop with an email code; the session belongs to that shop only. */
export function LoginScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = fixtureBySlug(tenantSlug)!;
  const { tenant } = fixture;
  const router = useRouter();
  const session = useCustomerSession();
  const now = useMockNow();
  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(0);
  const [sentAt, setSentAt] = useState(now);

  const emailError = touched && !isEmail(email) ? 'Email chưa đúng. Ví dụ: thu@example.com.' : null;
  const wait = Math.max(0, RESEND_SECONDS - (Date.parse(now) - Date.parse(sentAt)) / 1000);
  const locked = wrong >= MAX_WRONG;

  function send() {
    setTouched(true);
    if (!isEmail(email)) return;
    setSentAt(now);
    setCode('');
    setWrong(0);
    setPhase('code');
  }

  function verify(value: string) {
    if (value !== MOCK_CODE) {
      setWrong((n) => n + 1);
      setCode('');
      return;
    }
    const result = session.login(email);
    if (result.ok) {
      router.push(`/mock/${tenantSlug}/me`);
      return;
    }
    session.loginAsGuest(email);
    setPhase('empty');
  }

  const title = phase === 'email' ? 'Đăng nhập' : phase === 'code' ? 'Nhập mã' : 'Chưa có lịch nào';
  const error = locked
    ? 'Sai 5 lần rồi. Gửi mã mới để thử lại.'
    : wrong > 0
      ? `Mã chưa đúng. Còn ${MAX_WRONG - wrong} lần thử.`
      : null;

  return (
    <div
      className={cn(
        `sp-tenant-${tenant.id}`,
        'mx-auto flex w-full max-w-[420px] flex-col gap-(--space-5)',
      )}
    >
      <CustomerHeader fixture={fixture} right={<span />} />
      <h1 className="title m-0">{title}</h1>

      {phase === 'email' && (
        <form
          noValidate
          className="sp-stack"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <p className="body-sm m-0 text-(--ink-muted)">Xem và đổi lịch hẹn ở {tenant.name}.</p>
          <Field id="login-email" size="md" label="Email bạn dùng khi đặt lịch" error={emailError}>
            <input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Ví dụ: thu@example.com"
              value={email}
              aria-invalid={emailError ? true : undefined}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
            />
          </Field>
          <Button type="submit" variant="accent" size="lg" block>
            Gửi mã
          </Button>
          <p className="body-sm m-0 text-(--ink-muted)">
            Không cần mật khẩu. Mã 6 số gửi tới email, dùng một lần trong 10 phút.
          </p>
        </form>
      )}

      {phase === 'code' && (
        <div className="sp-stack">
          <OtpField
            id="login-code"
            value={code}
            onChange={setCode}
            onComplete={verify}
            disabled={locked}
            autoFocus
            help={`Đã gửi mã 6 số tới ${email.trim()}.`}
            error={error}
          />
          <p className="body-sm m-0 text-(--ink-muted)">Sai {MAX_WRONG} lần thì phải gửi mã mới.</p>
          <div className="flex items-center justify-between gap-(--space-2)">
            <Button variant="ghost" onClick={() => setPhase('email')}>
              Đổi email
            </Button>
            {wait > 0 && !locked ? (
              <span className="body-sm sp-num text-(--ink-muted)">
                Gửi lại sau {Math.floor(wait / 60)}:{String(Math.floor(wait % 60)).padStart(2, '0')}
              </span>
            ) : (
              <Button variant="ghost" onClick={send}>
                Gửi lại mã
              </Button>
            )}
          </div>
          <p className="body-sm m-0 text-(--ink-muted)">
            Đăng nhập chỉ có hiệu lực ở {tenant.name}. Ở cơ sở khác dùng Sapio, bạn đăng nhập riêng.
          </p>
          <p className="body-sm m-0 text-(--ink-muted)">Môi trường thử: mã là {MOCK_CODE}.</p>
        </div>
      )}

      {phase === 'empty' && (
        <div className="sp-stack">
          <p className="body m-0">
            Email {email.trim()} chưa từng đặt lịch ở {tenant.name}.
          </p>
          <p className="body-sm m-0 text-(--ink-muted)">
            Bạn vẫn đăng nhập được để đặt lịch nhanh hơn lần sau. Thông tin và{' '}
            {fixture.template.vocabulary.subject ?? 'người đi cùng'} đã lưu chỉ hiện sau khi bạn đặt
            lịch đầu tiên.
          </p>
          <Link
            href={`/mock/${tenantSlug}/book`}
            className="sp-btn sp-btn--accent sp-btn--lg sp-btn--block no-underline"
          >
            Đặt lịch
          </Link>
        </div>
      )}
    </div>
  );
}
