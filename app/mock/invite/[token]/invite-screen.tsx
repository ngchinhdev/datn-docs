'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { AccountTools } from '@/components/mock/account-tools';
import { ErrorPage } from '@/components/mock/error-page';
import { Notice, PasswordField } from '@/components/mock/password-field';
import { useInvitations } from '@/components/mock/use-invitations';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { AuthPage, AuthTop } from '@/components/sapio/signup-layout';
import { useToast } from '@/components/sapio/toast';
import {
  attemptLogin,
  branchLabel,
  inviteView,
  ROLE_LABEL,
  type DeadReason,
  type InviteView,
} from '@/mock/account';
import { formatMoment, lockMail } from '@/mock/account-mail';
import { workspaces, type Invitation } from '@/mock/fixtures/accounts';
import { passwordError } from '@/mock/signup';

const DEAD: Record<DeadReason, { title: string; lead: (invitation: Invitation | null) => string }> =
  {
    expired: {
      title: 'Lời mời đã hết hạn',
      lead: (i) =>
        `Lời mời này hết hạn lúc ${i ? formatMoment(i.expiresAt) : ''}. Nhờ người mời gửi lại một lời mời mới.`,
    },
    revoked: {
      title: 'Lời mời đã bị thu hồi',
      lead: () => 'Người mời đã thu hồi lời mời này. Liên hệ họ nếu bạn nghĩ đây là nhầm lẫn.',
    },
    accepted: {
      title: 'Lời mời đã được nhận',
      lead: () => 'Mỗi lời mời chỉ dùng một lần. Đăng nhập để vào cơ sở.',
    },
    declined: {
      title: 'Lời mời đã bị từ chối',
      lead: () => 'Cần tham gia thì nhờ người mời gửi lời mời mới.',
    },
    replaced: {
      title: 'Đã có lời mời mới hơn',
      lead: () =>
        'Người mời vừa gửi lại, nên link này không còn dùng được. Mở link trong email mới nhất.',
    },
    unknown: {
      title: 'Không tìm thấy lời mời',
      lead: () => 'Link có thể đã cũ hoặc gõ sai. Hỏi người mời để có link đúng.',
    },
  };

/** MH-05: the page of an invitation link; four states of a live one and one empty page for the rest (BR-78). */
export function InviteScreen({ token }: { token: string }) {
  const { now, accounts, invitations, signedIn } = useAccountStore();
  const view = inviteView(invitations, accounts, token, signedIn?.email ?? null, now);

  if (view.kind === 'dead') {
    return <DeadInvite view={view} />;
  }
  return (
    <>
      <LiveInvite key={view.kind} view={view} token={token} />
      <AccountTools />
    </>
  );
}

function DeadInvite({ view }: { view: Extract<InviteView, { kind: 'dead' }> }) {
  const { accounts } = useAccountStore();
  const dead = DEAD[view.reason];
  const inviter = view.invitation
    ? accounts.find((a) => a.id === view.invitation!.invitedByAccountId)
    : undefined;
  const mailTo = `mailto:${inviter?.email ?? 'hotro@sapio.vn'}`;
  return (
    <>
      <ErrorPage
        title={dead.title}
        lead={dead.lead(view.invitation)}
        actions={
          <>
            {view.reason === 'accepted' ? (
              <Link href="/mock/login" className="sp-btn sp-btn--primary no-underline">
                Đăng nhập
              </Link>
            ) : (
              <a href={mailTo} className="sp-btn sp-btn--primary no-underline">
                {view.invitation
                  ? `Liên hệ ${view.invitation.invitedBy.split(',')[0]}`
                  : 'Liên hệ hỗ trợ'}
              </a>
            )}
            <Link href="/mock/login" className="sp-btn sp-btn--ghost no-underline">
              Về đăng nhập
            </Link>
          </>
        }
      />
      <AccountTools />
    </>
  );
}

function LiveInvite({
  view,
  token,
}: {
  view: Exclude<InviteView, { kind: 'dead' }>;
  token: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { now, accounts, records, patch, signedIn } = useAccountStore();
  const { accept, decline } = useInvitations();
  const { invitation } = view;
  const workspace = workspaces.find((w) => w.id === invitation.workspaceId)!;
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);

  const isNew = view.kind === 'new-account';
  const alreadyIn = view.kind === 'existing-account' && signedIn?.email === invitation.email;
  const nameError = isNew && !fullName.trim() ? 'Nhập họ và tên.' : null;
  const passError = isNew ? passwordError(password) : null;

  function finish() {
    const result = accept(token, { fullName, password });
    if (!result.ok) return;
    toast({ text: `Đã nhận lời mời vào ${workspace.name}.` });
    router.push(('href' in result && result.href) || '/mock/select-workspace');
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (isNew) {
      if (nameError || passError) return;
      finish();
      return;
    }
    if (alreadyIn) {
      finish();
      return;
    }
    // The password goes through the same count as the sign-in page (BR-76).
    const result = attemptLogin(accounts, records, invitation.email, password, now);
    patch(() => ({ records: result.records }));
    const { outcome } = result;
    if (outcome.kind === 'ok') {
      finish();
      return;
    }
    setPassword('');
    if (outcome.kind === 'locked') {
      const account = accounts.find((a) => a.email === invitation.email);
      if (account && outcome.notify) {
        patch((d) => ({
          mails: [...d.mails, lockMail(account, outcome.until, now, d.mails.length + 1)],
        }));
      }
      setWrong(
        'Tạm khóa đăng nhập 15 phút vì sai mật khẩu nhiều lần. Đặt lại mật khẩu để vào ngay.',
      );
      return;
    }
    setWrong(
      outcome.remaining
        ? `Mật khẩu chưa đúng. Còn ${outcome.remaining} lần thử, sau đó tạm khóa 15 phút.`
        : 'Mật khẩu chưa đúng.',
    );
  }

  function refuse() {
    decline(token);
    toast({ text: `Đã từ chối lời mời vào ${workspace.name}.` });
  }

  const card = (
    <section className="sp-auth__card gap-3! p-4!" aria-label="Lời mời">
      <div className="flex items-center gap-3">
        <span
          className={`sp-switcher__mark sp-tenant-${workspace.tone}`}
          aria-hidden="true"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          {workspace.monogram}
        </span>
        <div>
          <div className="text-base leading-[22px] font-semibold">{workspace.name}</div>
          <div className="text-[13px] leading-[18px] text-(--ink-muted)">
            {workspace.slug}.sapio.vn
          </div>
        </div>
      </div>
      <dl className="sp-kv m-0">
        <dt>Vai trò</dt>
        <dd>{ROLE_LABEL[invitation.role]}</dd>
        <dt>Chi nhánh</dt>
        <dd>{branchLabel(invitation.branchId)}</dd>
        <dt>Người mời</dt>
        <dd>{invitation.invitedBy}</dd>
        <dt>Hết hạn</dt>
        <dd className="sp-num">{formatMoment(invitation.expiresAt)}</dd>
      </dl>
    </section>
  );

  if (view.kind === 'other-account') {
    return (
      <AuthPage maxWidth={480} top={<AuthTop />}>
        <div>
          <h1 className="sp-auth__title">Bạn được mời vào {workspace.name}</h1>
        </div>
        {card}
        <Notice tone="danger" role="alert" icon={<Info size={18} aria-hidden="true" />}>
          <strong>Lời mời này gửi cho {invitation.email}.</strong>
          <br />
          Bạn đang đăng nhập bằng {view.sessionEmail}. Đăng xuất rồi mở lại link để nhận.
        </Notice>
        <Button
          variant="primary"
          className="h-12!"
          onClick={() => patch(() => ({ session: null }))}
        >
          Đăng xuất và tiếp tục
        </Button>
      </AuthPage>
    );
  }

  return (
    <AuthPage maxWidth={480} top={<AuthTop />}>
      <div>
        <h1 className="sp-auth__title">Bạn được mời vào {workspace.name}</h1>
        {!isNew && (
          <p className="sp-auth__lead">
            Email này đã có tài khoản Sapio.{' '}
            {alreadyIn
              ? 'Bạn đang đăng nhập đúng email, nhận là vào được.'
              : 'Đăng nhập để nhận; cơ sở mới sẽ có trong danh sách cơ sở của bạn.'}
          </p>
        )}
      </div>
      {card}
      <form onSubmit={submit} noValidate className="flex flex-col gap-(--space-4)">
        <Field
          id="iv-mail"
          label="Email"
          size="md"
          help={isNew ? 'Lời mời gắn với email này, không đổi được.' : undefined}
        >
          <input
            id="iv-mail"
            type="email"
            value={invitation.email}
            readOnly
            aria-describedby={isNew ? 'iv-mail-help' : undefined}
          />
        </Field>
        {isNew && (
          <Field id="iv-name" label="Họ và tên" size="md" error={submitted ? nameError : null}>
            <input
              id="iv-name"
              type="text"
              autoComplete="name"
              value={fullName}
              aria-invalid={submitted && nameError ? true : undefined}
              aria-describedby={submitted && nameError ? 'iv-name-help' : undefined}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>
        )}
        {isNew && (
          <PasswordField
            id="iv-pass"
            label="Tạo mật khẩu"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            help="Ít nhất 15 ký tự. Một câu dễ nhớ là đủ."
            error={submitted ? passError : null}
          />
        )}
        {!isNew && !alreadyIn && (
          <PasswordField
            id="iv-pass"
            label="Mật khẩu"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            error={wrong}
          />
        )}
        <Button type="submit" variant="primary" className="h-12!">
          {isNew
            ? 'Tạo tài khoản và nhận lời mời'
            : alreadyIn
              ? 'Nhận lời mời'
              : 'Đăng nhập và nhận lời mời'}
        </Button>
        {!isNew && !alreadyIn && (
          <Link
            href={`/mock/forgot-password?email=${encodeURIComponent(invitation.email)}`}
            className="self-center text-sm font-medium"
          >
            Quên mật khẩu?
          </Link>
        )}
        <Button variant="ghost" onClick={refuse}>
          Từ chối lời mời
        </Button>
      </form>
    </AuthPage>
  );
}
