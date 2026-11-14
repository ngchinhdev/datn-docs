'use client';

import { Check, CreditCard, PawPrint, CalendarCheck, Layers, Minus, Scissors } from 'lucide-react';
import Link from 'next/link';
import { ResourceCalendar } from '@/components/sapio/resource-calendar';
import { tenantFixtures } from '@/mock/fixtures';
import { industryTemplates } from '@/mock/fixtures/templates';
import { dayHours } from '@/mock/hours';
import { discountLine, pricingCards, trialNote, TRIAL_LABEL } from '@/mock/landing';
import { staffColumns } from '@/mock/reception';
import { siteHost } from '@/mock/site';
import { formatDay, MOCK_NOW, MOCK_TODAY } from '@/mock/time';

const noop = () => {};

/** MH-01: what Sapio is, the calendar of the sample tenant, the industries and the plans. */
export function LandingScreen() {
  const salon = tenantFixtures.find((f) => f.tenant.slug === 'toc-may')!;
  const hours = dayHours(salon, MOCK_TODAY);
  const columns = staffColumns(salon, salon.appointments, MOCK_NOW, null, noop, MOCK_TODAY);
  const industries = industryTemplates.filter((t) => t.status !== 'hidden');
  const host = siteHost(salon.tenant.slug);

  const features = [
    {
      icon: Layers,
      title: 'Lịch theo tài nguyên',
      text: 'Nhuộm tóc giữ thợ, ghế và giường gội đúng từng đoạn. Lúc chờ lên màu, thợ rảnh để nhận khách khác; ghế vẫn giữ.',
    },
    {
      icon: CalendarCheck,
      title: 'Khách tự đặt',
      text: `Trang riêng ${host} chỉ hiện giờ còn trống thật. Giữ chỗ 10 phút, cọc qua QR, nhắc lịch qua email.`,
    },
    {
      icon: CreditCard,
      title: 'Thu tiền và nhân sự',
      text: 'Hóa đơn, gói liệu trình, ví trả trước. Xếp ca, duyệt nghỉ có xử lý lịch bị ảnh hưởng, hoa hồng chốt theo tháng.',
    },
  ];

  return (
    <div className="sp-auth">
      <header className="sp-auth__top max-md:flex-wrap! md:px-20! md:py-5!">
        <span className="sp-brand__name text-xl">Sapio</span>
        <nav
          aria-label="Trang giới thiệu"
          className="flex gap-7 text-[15px] leading-[22px] font-medium max-md:order-3 max-md:w-full"
        >
          <a href="#tinh-nang" className="text-(--ink) no-underline">
            Tính năng
          </a>
          <a href="#nganh" className="text-(--ink) no-underline">
            Ngành
          </a>
          <a href="#gia" className="text-(--ink) no-underline">
            Bảng giá
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/mock/login" className="text-sm font-semibold no-underline">
            Đăng nhập
          </Link>
          <Link href="/mock/signup" className="sp-btn sp-btn--primary no-underline">
            Đăng ký cơ sở
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-24 px-5 pt-12 pb-16 md:px-20 max-md:gap-16 max-md:pt-6">
        <section className="flex flex-wrap items-center gap-14 max-md:gap-8" aria-labelledby="lp-h">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5 md:max-w-[480px]">
            <h1
              id="lp-h"
              className="m-0 text-[48px] leading-[58px] font-bold tracking-[-0.02em] max-md:text-[32px] max-md:leading-10"
            >
              Sắp lịch cho người, ghế và phòng cùng lúc
            </h1>
            <p className="m-0 text-lg leading-7 text-(--ink-muted)">
              Sapio giữ lịch hẹn cho tiệm tóc, nail, spa và spa thú cưng. Khách tự đặt trên trang
              riêng của tiệm; lễ tân thấy cả ngày trên một màn; không ai bị xếp trùng.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/mock/signup"
                className="sp-btn sp-btn--primary h-12! px-[22px]! no-underline"
              >
                {TRIAL_LABEL}
              </Link>
              <Link
                href={`/mock/${salon.tenant.slug}/book`}
                className="sp-btn sp-btn--secondary h-12! px-[22px]! no-underline"
              >
                Xem trang đặt lịch mẫu
              </Link>
            </div>
            <p className="m-0 text-sm leading-5 text-(--ink-muted)">{trialNote()}</p>
          </div>
          <figure className="sp-tenant-may m-0 min-w-0 flex-[1_1_480px] rounded-(--radius-lg) bg-(--surface-raised) p-4 shadow-[0_0_0_1px_var(--line),var(--shadow-card)]">
            <figcaption className="flex flex-wrap justify-between gap-2 px-1 pb-3 text-sm leading-5 font-semibold">
              <span>
                {salon.tenant.name} · {formatDay(MOCK_TODAY)}
              </span>
              <span className="font-normal text-(--ink-muted)">Lịch theo nhân viên</span>
            </figcaption>
            <div className="pointer-events-none" aria-hidden="true">
              <ResourceCalendar
                label={`Lịch mẫu ${salon.tenant.name}`}
                columns={columns}
                date={MOCK_TODAY}
                from="09:00"
                to="14:00"
                open={hours.open}
                close={hours.close}
                now={MOCK_NOW}
                compact
              />
            </div>
          </figure>
        </section>

        <section id="tinh-nang" className="flex flex-col gap-6" aria-labelledby="lp-f">
          <h2 id="lp-f" className="m-0 text-[32px] leading-10 font-bold tracking-[-0.01em]">
            Một lịch hẹn giữ đủ mọi thứ nó cần
          </h2>
          <div className="flex flex-wrap gap-5">
            {features.map(({ icon: Icon, title, text }) => (
              <section key={title} className="sp-panel min-w-[240px] flex-[1_1_0] gap-2.5 p-6!">
                <span className="inline-flex size-10 items-center justify-center rounded-(--radius-md) bg-(--brand-soft) text-(--brand)">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="m-0 text-lg leading-[26px] font-semibold">{title}</h3>
                <p className="m-0 text-[15px] leading-[22px] text-(--ink-muted)">{text}</p>
              </section>
            ))}
          </div>
        </section>

        <section id="nganh" className="flex flex-col gap-6" aria-labelledby="lp-n">
          <h2 id="lp-n" className="m-0 text-[32px] leading-10 font-bold tracking-[-0.01em]">
            Chọn ngành, tiệm có sẵn dịch vụ mẫu
          </h2>
          <div className="flex flex-wrap gap-5">
            {industries.map((template) => (
              <section
                key={template.id}
                className="sp-panel min-w-[240px] flex-[1_1_0] gap-2.5 p-6!"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-(--radius-md) bg-(--brand-soft) text-(--brand)">
                  {template.id === 'pet_spa' ? (
                    <PawPrint size={20} aria-hidden="true" />
                  ) : (
                    <Scissors size={20} aria-hidden="true" />
                  )}
                </span>
                <h3 className="m-0 text-lg leading-[26px] font-semibold">
                  {template.name}
                  {template.status === 'soon' && (
                    <span className="sp-badge sp-badge--pending ms-2">Sắp có</span>
                  )}
                </h3>
                <p className="m-0 text-[15px] leading-[22px] text-(--ink-muted)">
                  {template.cardDescription}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section id="gia" className="flex flex-col gap-6" aria-labelledby="lp-g">
          <div className="flex flex-col gap-1">
            <h2 id="lp-g" className="m-0 text-[32px] leading-10 font-bold tracking-[-0.01em]">
              Bảng giá
            </h2>
            <p className="m-0 text-[15px] leading-[22px] text-(--ink-muted)">
              Không giới hạn nhân viên và lịch hẹn. {discountLine()}
            </p>
          </div>
          <div className="sp-plans">
            {pricingCards().map((card) => (
              <section key={card.code} className="sp-plan" aria-labelledby={`lp-plan-${card.code}`}>
                <div className="sp-plan__head">
                  <h3 className="sp-plan__name" id={`lp-plan-${card.code}`}>
                    {card.name}
                  </h3>
                </div>
                <div>
                  <span className="whitespace-nowrap">
                    <span className="sp-plan__price">{card.price}</span>
                    <span className="sp-plan__unit"> / tháng</span>
                  </span>
                  <div className="sp-plan__note">{card.note}</div>
                </div>
                <ul className="sp-plan__features">
                  {card.features.map((feature) => (
                    <li key={feature.label} data-off={feature.on ? undefined : ''}>
                      {feature.on ? <Check aria-hidden="true" /> : <Minus aria-hidden="true" />}
                      <span>
                        {!feature.on && <span className="sp-sr-only">Không có: </span>}
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/mock/signup" className="sp-btn sp-btn--secondary no-underline">
                  {TRIAL_LABEL}
                </Link>
              </section>
            ))}
          </div>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-(--line) px-5 py-6 text-[13px] leading-[18px] text-(--ink-muted) md:px-20">
        <span>Sapio · đồ án tốt nghiệp, Trường Đại học Công nghệ Thông tin</span>
        <span className="flex gap-4">
          <a href="#">Điều khoản</a>
          <a href="#">Quyền riêng tư</a>
          <Link href="/mock/login">Đăng nhập</Link>
        </span>
      </footer>
    </div>
  );
}
