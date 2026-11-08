'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { SignupLayout } from '@/components/sapio/signup-layout';
import { useToast } from '@/components/sapio/toast';
import { emailError, passwordError, type SignupDraft } from '@/mock/signup';

type Key = 'fullName' | 'email' | 'password' | 'terms';
const IDS: Record<Key, string> = {
  fullName: 'su-name',
  email: 'su-mail',
  password: 'su-pass',
  terms: 'su-terms',
};

/** Step 1: the owner's account. The password follows BR-73 and never leaves this component. */
export function AccountStep({
  draft,
  update,
  password,
  setPassword,
  onNext,
}: {
  draft: SignupDraft;
  update: (patch: Partial<SignupDraft>) => void;
  password: string;
  setPassword: (value: string) => void;
  onNext: () => void;
}) {
  const toast = useToast();
  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [shown, setShown] = useState(false);

  const errors: Record<Key, string | null> = {
    fullName: draft.fullName.trim() ? null : 'Nhập họ và tên.',
    email: emailError(draft.email),
    password: passwordError(password),
    terms: draft.terms ? null : 'Cần đồng ý điều khoản để tiếp tục.',
  };
  const shownError = (key: Key) => (submitted || touched[key] ? errors[key] : null);
  const touch = (key: Key) => () => setTouched((t) => ({ ...t, [key]: true }));

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const first = (Object.keys(errors) as Key[]).find((key) => errors[key]);
    if (first) {
      document.getElementById(IDS[first])?.focus();
      return;
    }
    update({ passwordOk: true, email: draft.email.trim() });
    onNext();
  }

  return (
    <SignupLayout
      current={1}
      title="Tạo tài khoản chủ cơ sở"
      lead="Dùng tài khoản này để quản lý lịch, nhân viên và thu tiền."
      maxWidth={560}
      top={
        <button
          type="button"
          className="sp-btn sp-btn--ghost sp-btn--sm"
          onClick={() => toast({ text: 'Đăng nhập: chưa có trong mock.' })}
        >
          Đăng nhập
        </button>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-(--space-4)">
        <Field id="su-name" label="Họ và tên" size="md" error={shownError('fullName')}>
          <input
            id="su-name"
            type="text"
            placeholder="Ví dụ: Nguyễn Văn An"
            autoComplete="name"
            value={draft.fullName}
            aria-invalid={shownError('fullName') ? true : undefined}
            aria-describedby={shownError('fullName') ? 'su-name-help' : undefined}
            onChange={(e) => update({ fullName: e.target.value })}
            onBlur={touch('fullName')}
          />
        </Field>
        <Field
          id="su-mail"
          label="Email"
          size="md"
          help="Mã xác nhận sẽ gửi tới email này."
          error={shownError('email')}
        >
          <input
            id="su-mail"
            type="email"
            placeholder="Ví dụ: an@tiemcuaban.vn"
            autoComplete="email"
            value={draft.email}
            aria-invalid={shownError('email') ? true : undefined}
            aria-describedby="su-mail-help"
            onChange={(e) => update({ email: e.target.value, verified: false })}
            onBlur={touch('email')}
          />
        </Field>
        <Field
          id="su-pass"
          label="Mật khẩu"
          size="md"
          help={
            <>
              Ít nhất 15 ký tự. Một câu dễ nhớ là đủ, ví dụ <em>tiem toc may mo cua 8 gio</em>.
            </>
          }
          error={shownError('password')}
        >
          <input
            id="su-pass"
            type={shown ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            aria-invalid={shownError('password') ? true : undefined}
            aria-describedby="su-pass-help"
            onChange={(e) => setPassword(e.target.value)}
            onBlur={touch('password')}
          />
          <button
            type="button"
            className="sp-icon-btn me-1"
            aria-label={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
          >
            {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </Field>
        <div className="flex flex-col gap-(--space-1)">
          <label className="sp-check">
            <input
              id="su-terms"
              type="checkbox"
              checked={draft.terms}
              aria-invalid={shownError('terms') ? true : undefined}
              aria-describedby={shownError('terms') ? 'su-terms-help' : undefined}
              onChange={(e) => update({ terms: e.target.checked })}
            />
            <span>
              Tôi đồng ý với <a href="#">Điều khoản sử dụng</a> và{' '}
              <a href="#">Chính sách quyền riêng tư</a> của Sapio.
            </span>
          </label>
          {shownError('terms') && (
            <span id="su-terms-help" className="sp-field__help text-(--danger)">
              {shownError('terms')}
            </span>
          )}
        </div>
        <Button type="submit" variant="primary" className="h-12!">
          Tạo tài khoản
        </Button>
      </form>
    </SignupLayout>
  );
}
