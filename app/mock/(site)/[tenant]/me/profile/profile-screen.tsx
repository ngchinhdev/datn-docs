'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCustomerSession } from '@/components/mock/customer-session';
import { Button } from '@/components/sapio/button';
import { Field, SwitchRow } from '@/components/sapio/form';
import { OtpField } from '@/components/sapio/otp-field';
import { PhoneField } from '@/components/sapio/phone-field';
import { Sheet } from '@/components/sapio/sheet';
import { useToast } from '@/components/sapio/toast';
import { formatPhone, normalizePhone } from '@/mock/format';
import { fixtureBySlug } from '@/mock/selection';
import { localDate } from '@/mock/time';

/** The code the mock accepts, as on the login page (BR-16). */
const MOCK_CODE = '482193';
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/** MH-21: name, phone, email, offers, and logging out. */
export function ProfileScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = fixtureBySlug(tenantSlug)!;
  const { tenant } = fixture;
  const router = useRouter();
  const toast = useToast();
  const { customer, email, updateProfile, logout } = useCustomerSession();

  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ? formatPhone(customer.phone) : '');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [offers, setOffers] = useState(customer?.marketingOptIn ?? false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [codeWrong, setCodeWrong] = useState(false);

  if (!customer) {
    return (
      <div className="sp-empty flex flex-col gap-(--space-2)">
        <h1 className="title m-0">Thông tin</h1>
        <p className="m-0">
          Thông tin của bạn sẽ có ở đây sau khi bạn đặt lịch đầu tiên ở {tenant.name}.
        </p>
        <Button onClick={() => (logout(), router.push(`/mock/${tenantSlug}`))}>Đăng xuất</Button>
      </div>
    );
  }

  const consented = customer.consentAt ? localDate(customer.consentAt) : '';
  const e164 = normalizePhone(phone);
  const phoneError = phoneTouched && !e164 ? 'Số điện thoại chưa đúng. Ví dụ: 0912 345 678.' : null;
  const nameError = name.trim() ? null : 'Nhập họ và tên.';
  const dirty =
    name.trim() !== customer.name ||
    (e164 ?? phone) !== customer.phone ||
    offers !== (customer.marketingOptIn ?? false);
  const canSave = dirty && !nameError && Boolean(e164);

  function save() {
    if (!canSave || !e164) return;
    updateProfile({ name: name.trim(), phone: e164, marketingOptIn: offers });
    toast({ text: 'Đã lưu thông tin.' });
  }
  function discard() {
    setName(customer!.name);
    setPhone(formatPhone(customer!.phone));
    setOffers(customer!.marketingOptIn ?? false);
    setPhoneTouched(false);
  }
  function closeEmail() {
    setChangingEmail(false);
    setNewEmail('');
    setCodeSent(false);
    setCode('');
    setCodeWrong(false);
  }
  function confirmEmail(value: string) {
    if (value !== MOCK_CODE) {
      setCodeWrong(true);
      setCode('');
      return;
    }
    updateProfile({ email: newEmail.trim() });
    toast({ text: `Đã đổi email đăng nhập sang ${newEmail.trim()}.` });
    closeEmail();
  }

  return (
    <div className="flex flex-col gap-(--space-5)">
      <h1 className="title m-0">Thông tin</h1>
      <form
        noValidate
        className="sp-stack"
        onSubmit={(e) => {
          e.preventDefault();
          setPhoneTouched(true);
          save();
        }}
      >
        <Field id="profile-name" size="md" label="Họ và tên" error={nameError}>
          <input
            id="profile-name"
            autoComplete="name"
            value={name}
            aria-invalid={nameError ? true : undefined}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <PhoneField
          id="profile-phone"
          label="Số điện thoại"
          value={phone}
          onChange={setPhone}
          onBlur={() => setPhoneTouched(true)}
          error={phoneError}
          help="Để tiệm gọi khi cần đổi lịch."
        />
        <div className="flex items-center justify-between gap-(--space-3) rounded-(--radius-lg) bg-(--surface-raised) p-(--space-4) shadow-[0_0_0_1px_var(--line)]">
          <span className="flex min-w-0 flex-col">
            <span className="body-sm text-(--ink-muted)">Email đăng nhập</span>
            <span className="body break-words">{email ?? customer.email}</span>
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setChangingEmail(true)}>
            Đổi email
          </Button>
        </div>
        <p className="body-sm m-0 -mt-(--space-2) text-(--ink-muted)">
          Đổi email thì gửi mã tới email mới để xác nhận.
        </p>
        <SwitchRow
          label="Nhận tin khuyến mãi"
          hint={`Email ưu đãi của ${tenant.name}, tối đa 2 lần mỗi tháng. Email về lịch hẹn vẫn gửi.`}
          checked={offers}
          onChange={setOffers}
        />
        <div className="flex gap-(--space-2)">
          <Button type="button" variant="secondary" disabled={!dirty} onClick={discard}>
            Hủy
          </Button>
          <Button type="submit" variant="accent" disabled={!canSave}>
            Lưu
          </Button>
        </div>
      </form>
      {consented && (
        <p className="body-sm m-0 text-(--ink-muted)">
          Bạn đồng ý cho {tenant.name} xử lý dữ liệu cá nhân khi đặt lịch lần đầu, ngày{' '}
          {consented.slice(8, 10)}/{consented.slice(5, 7)}/{consented.slice(0, 4)}.
        </p>
      )}
      <Button
        variant="ghost"
        className="self-start"
        onClick={() => {
          logout();
          router.push(`/mock/${tenantSlug}`);
        }}
      >
        Đăng xuất
      </Button>

      <Sheet
        open={changingEmail}
        title="Đổi email đăng nhập"
        onClose={closeEmail}
        footer={
          codeSent ? (
            <Button variant="secondary" onClick={closeEmail}>
              Hủy
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeEmail}>
                Hủy
              </Button>
              <Button
                variant="accent"
                disabled={!isEmail(newEmail)}
                onClick={() => setCodeSent(true)}
              >
                Gửi mã
              </Button>
            </>
          )
        }
      >
        <div className="flex flex-col gap-(--space-4)">
          <Field id="new-email" size="md" label="Email mới">
            <input
              id="new-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Ví dụ: thu@example.com"
              value={newEmail}
              disabled={codeSent}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </Field>
          {codeSent && (
            <OtpField
              id="new-email-code"
              value={code}
              onChange={setCode}
              onComplete={confirmEmail}
              autoFocus
              help={`Đã gửi mã 6 số tới ${newEmail.trim()}. Môi trường thử: mã là ${MOCK_CODE}.`}
              error={codeWrong ? 'Mã chưa đúng. Thử lại.' : null}
            />
          )}
        </div>
      </Sheet>
    </div>
  );
}
