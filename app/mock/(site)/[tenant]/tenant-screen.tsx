'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { branchPhone } from '@/mock/site';
import { useCustomerSession } from '@/components/mock/customer-session';
import { freeSlots } from '@/mock/availability';
import { formatDuration, formatVnd } from '@/mock/format';
import { visibleMinutes } from '@/mock/occupation';
import { formatTime, MOCK_NOW, MOCK_TODAY } from '@/mock/time';
import type { BusinessHours, Service, ServiceVariant } from '@/mock/fixtures';

function variantSummary(service: Service): string {
  if (service.variants.length === 1) {
    const v = service.variants[0]!;
    let text = formatDuration(visibleMinutes(v));
    if (v.depositVnd) text += ` · cọc ${formatVnd(v.depositVnd)}`;
    return text;
  }
  let text = service.variants
    .map((v) => `${v.name} ${formatDuration(visibleMinutes(v))}`)
    .join(' · ');
  const deposit = service.variants.find((v) => v.depositVnd)?.depositVnd;
  if (deposit) text += ` · cọc ${formatVnd(deposit)}`;
  return text;
}

function lowestPriceOf(service: Service): { price: bigint; isRange: boolean } {
  let min = service.variants[0]?.priceVnd ?? 0n;
  let hasRange = service.variants.length > 1;
  for (const v of service.variants) {
    if (v.priceVnd < min) min = v.priceVnd;
    if (v.pricesByLevel && v.pricesByLevel.length > 1) {
      hasRange = true;
    }
  }
  return { price: min, isRange: hasRange };
}

function formatHoursGroup(hours: BusinessHours[]): { label: string; time: string }[] {
  // Typical group: Monday to Friday, Saturday, Sunday
  const result: { label: string; time: string }[] = [];
  const map = new Map<string, number[]>();
  for (const h of hours) {
    const t = `${h.open}–${h.close}`;
    const days = map.get(t) ?? [];
    days.push(h.weekday);
    map.set(t, days);
  }

  // Sort by weekdays
  const weekdayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  // Check if Mon-Fri have same hours
  const monToFri = [1, 2, 3, 4, 5];
  for (const [t, days] of map.entries()) {
    const hasAllMonFri = monToFri.every((d) => days.includes(d));
    if (hasAllMonFri && days.length === 5) {
      result.push({ label: 'Thứ Hai đến Thứ Sáu', time: t });
    }
  }

  // Add Saturday and Sunday or individual days
  for (const h of hours) {
    if (h.weekday === 6) {
      result.push({ label: 'Thứ Bảy', time: `${h.open}–${h.close}` });
    } else if (h.weekday === 0) {
      result.push({ label: 'Chủ Nhật', time: `${h.open}–${h.close}` });
    } else if (!monToFri.every((d) => (map.get(`${h.open}–${h.close}`) ?? []).includes(d))) {
      result.push({ label: weekdayNames[h.weekday]!, time: `${h.open}–${h.close}` });
    }
  }
  return result;
}

export function TenantScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = useLiveFixture(tenantSlug);
  const { customer, isLoggedIn } = useCustomerSession();

  const branch = fixture.branches[0]!;
  const tenantClass = `sp-tenant-${fixture.tenant.slug === 'toc-may' ? 'may' : 'pawpaw'}`;

  // Calculate earliest free slot today for each staff member
  const staffSlots = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const s of fixture.staff) {
      if (!s.profile.bookableOnline) continue;
      const firstService = fixture.services.find(
        (svc) => svc.bookableOnline && s.skillServiceIds.includes(svc.id),
      );
      if (!firstService || firstService.variants.length === 0) {
        map[s.resourceId] = null;
        continue;
      }
      const variant = firstService.variants[0]!;
      const slots = freeSlots({
        fixture,
        variant,
        serviceId: firstService.id,
        date: MOCK_TODAY,
        staffResourceId: s.resourceId,
        channel: 'online',
        now: MOCK_NOW,
        notBefore: MOCK_NOW,
      });
      map[s.resourceId] = slots[0] ? formatTime(slots[0].startAt) : null;
    }
    return map;
  }, [fixture]);

  // Overall earliest free slot
  const overallEarliest = useMemo(() => {
    const times = Object.values(staffSlots).filter((t): t is string => t !== null);
    if (times.length === 0) return null;
    return times.sort()[0]!;
  }, [staffSlots]);

  // Group services
  const groupedServices = useMemo(() => {
    const groups: { name: string; services: Service[] }[] = [];
    for (const service of fixture.services) {
      if (!service.bookableOnline) continue;
      let grp = groups.find((g) => g.name === service.group);
      if (!grp) {
        grp = { name: service.group, services: [] };
        groups.push(grp);
      }
      grp.services.push(service);
    }
    return groups;
  }, [fixture.services]);

  const hoursFormatted = useMemo(() => {
    return formatHoursGroup(branch.businessHours);
  }, [branch.businessHours]);

  const policies = fixture.template.defaultPolicies;
  const depositService = fixture.services.find((s) => s.variants.some((v) => v.depositVnd));
  const depositVnd = depositService?.variants.find((v) => v.depositVnd)?.depositVnd;

  const staffLabel = fixture.template.vocabulary.staff;

  const isPawpaw = fixture.tenant.slug === 'pawpaw';
  const phone = branchPhone(fixture.tenant.slug);

  return (
    <div className={`${tenantClass} w-full text-(--ink) font-(--font-sans)`}>
      {/* Top Header */}
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 bg-(--surface-raised) shadow-[0_1px_0_var(--line)] min-[900px]:px-10 min-[900px]:py-3">
        <Link
          href={`/mock/${fixture.tenant.slug}`}
          className="flex items-center gap-2.5 text-(--ink) no-underline"
        >
          <span
            className={`sp-switcher__mark ${tenantClass} w-8 h-8 rounded-lg text-sm bg-(--accent-soft) text-(--accent)`}
            aria-hidden="true"
          >
            {fixture.tenant.monogram}
          </span>
          <span className="font-semibold text-[15px] leading-5 min-[900px]:text-base min-[900px]:leading-[22px]">
            {fixture.tenant.name}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {isLoggedIn && customer ? (
            <>
              <Link
                href={`/mock/${fixture.tenant.slug}/me`}
                className="hidden min-[900px]:inline-flex sp-btn sp-btn--ghost text-sm no-underline"
              >
                Lịch của tôi
              </Link>
              <Link
                href={`/mock/${fixture.tenant.slug}/me`}
                className="sp-icon-btn w-11 h-11 no-underline flex items-center justify-center"
                aria-label={`Tài khoản của ${customer.name}`}
              >
                <span className="sp-avatar sp-avatar--sm">
                  {customer.callName?.slice(-1) || customer.name[0]}
                </span>
              </Link>
            </>
          ) : (
            <Link
              href={`/mock/${fixture.tenant.slug}/login`}
              className="sp-btn sp-btn--ghost sp-btn--sm no-underline"
            >
              Đăng nhập
            </Link>
          )}
          <Link
            href={`/mock/${fixture.tenant.slug}/book`}
            className="hidden min-[900px]:inline-flex sp-btn sp-btn--accent text-sm no-underline"
          >
            Đặt lịch
          </Link>
        </div>
      </header>

      {/* Banner */}
      <div
        aria-hidden="true"
        className="h-[140px] px-4 py-4 flex items-end bg-[linear-gradient(135deg,var(--accent-soft),var(--fill-tonal))] min-[900px]:h-[200px] min-[900px]:px-10 min-[900px]:pb-6"
      >
        <span
          className={`sp-switcher__mark ${tenantClass} w-16 h-16 text-2xl rounded-2xl bg-(--accent-soft) text-(--accent) min-[900px]:w-[88px] min-[900px]:h-[88px] min-[900px]:text-[33px] min-[900px]:rounded-[22px]`}
        >
          {fixture.tenant.monogram}
        </span>
      </div>

      {/* Body content */}
      <div className="p-4 pb-32 min-[900px]:p-10 min-[900px]:pb-16 min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_380px] min-[900px]:gap-12 min-[900px]:items-start">
        {/* Main Column */}
        <div className="flex flex-col gap-6 min-[900px]:gap-8">
          {/* Brand details */}
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-bold text-[26px] leading-8 tracking-[-0.02em] min-[900px]:text-[32px] min-[900px]:leading-10">
              {fixture.tenant.name}
            </h1>
            <p className="m-0 text-sm leading-5 text-(--ink-muted) min-[900px]:text-base min-[900px]:leading-6">
              {isPawpaw
                ? 'Chăm sóc toàn diện cho chó và mèo. Tắm sấy, cắt tỉa lông tạo kiểu chuyên nghiệp.'
                : 'Cắt, gội, nhuộm cho nam và nữ. Chuyên nhuộm màu thời trang.'}
            </p>
            <a
              href="#map"
              className="flex items-center gap-1.5 text-sm leading-5 text-(--accent) no-underline"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{branch.address} · Chỉ đường</span>
            </a>
            <span className="sp-num flex items-center gap-1.5 text-sm leading-5">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>
                <strong>Đang mở</strong> · hôm nay 08:00–20:00
              </span>
            </span>
            <a
              href={`tel:${phone.tel}`}
              className="sp-num flex items-center gap-1.5 text-sm leading-5 text-(--ink) no-underline"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{phone.display}</span>
            </a>
          </div>

          {/* Dịch vụ và giá */}
          <section className="flex flex-col gap-2">
            <h2 className="m-0 font-semibold text-[17px] leading-6 tracking-[-0.01em]">
              Dịch vụ và giá
            </h2>
            {groupedServices.map((grp) => (
              <section key={grp.name} className="flex flex-col">
                <h3 className="m-0 mb-1 font-semibold text-[13px] leading-[18px] text-(--ink-muted) uppercase tracking-[0.04em]">
                  {grp.name}
                </h3>
                <ul className="m-0 p-0 list-none">
                  {grp.services.map((svc) => {
                    const priceInfo = lowestPriceOf(svc);
                    const subtitle = variantSummary(svc);
                    return (
                      <li
                        key={svc.id}
                        className="flex items-center gap-3 py-3 border-t border-(--line)"
                      >
                        <span className="flex-1 min-w-0 flex flex-col">
                          <span className="font-medium text-[15px] leading-[22px] truncate">
                            {svc.name}
                          </span>
                          <span className="sp-num text-[13px] leading-[18px] text-(--ink-muted)">
                            {subtitle}
                          </span>
                        </span>
                        <span className="sp-num font-semibold text-[15px] leading-[22px] whitespace-nowrap">
                          {priceInfo.isRange
                            ? `từ ${formatVnd(priceInfo.price)}`
                            : formatVnd(priceInfo.price)}
                        </span>
                        <Link
                          href={`/mock/${fixture.tenant.slug}/book?service=${svc.id}`}
                          className="sp-btn sp-btn--secondary sp-btn--sm no-underline"
                          aria-label={`Đặt ${svc.name}`}
                        >
                          Đặt
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <p className="m-0 text-[13px] leading-[18px] text-(--ink-muted)">
              {isPawpaw
                ? 'Loài và cân nặng quyết định giá và thời gian của dịch vụ (BR-13).'
                : 'Giá theo cấp thợ: chọn đích danh Thợ chính thì giá nhuộm cao hơn 10%. Để "Bất kỳ ai" là giá thấp nhất.'}
            </p>
          </section>

          {/* Thợ / Kỹ thuật viên */}
          <section className="flex flex-col gap-2.5">
            <h2 className="m-0 font-semibold text-[17px] leading-6 tracking-[-0.01em]">
              {staffLabel}
            </h2>
            <ul className="m-0 p-0 list-none flex flex-col gap-2 min-[900px]:grid min-[900px]:grid-cols-3 min-[900px]:gap-3">
              {fixture.staff
                .filter((s) => s.profile.bookableOnline)
                .map((member) => {
                  const freeTime = staffSlots[member.resourceId];
                  return (
                    <li
                      key={member.resourceId}
                      className="flex items-center gap-3 p-3 px-3.5 rounded-(--radius-lg) bg-(--surface-raised) shadow-[0_0_0_1px_var(--line)]"
                    >
                      <span className="sp-avatar">{member.profile.displayName[0]}</span>
                      <span className="flex-1 min-w-0 flex flex-col">
                        <span className="font-semibold text-[15px] leading-[22px]">
                          {member.profile.displayName}{' '}
                          <span className="font-normal text-(--ink-muted)">
                            · {member.profile.title}
                          </span>
                        </span>
                        <span className="text-[13px] leading-[18px] text-(--ink-muted) truncate">
                          {member.profile.specialty}
                        </span>
                      </span>
                      <span
                        className={`sp-num font-medium text-[13px] leading-[18px] text-right ${freeTime ? 'text-(--accent)' : 'text-(--ink-muted)'}`}
                      >
                        {freeTime ? (
                          <>
                            Trống
                            <br />
                            {freeTime}
                          </>
                        ) : (
                          'Hết giờ'
                        )}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </section>

          {/* Giờ mở cửa */}
          <section className="flex flex-col gap-2">
            <h2 className="m-0 font-semibold text-[17px] leading-6 tracking-[-0.01em]">
              Giờ mở cửa
            </h2>
            <div>
              {hoursFormatted.map((h, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between text-sm leading-[22px] ${h.label === 'Thứ Bảy' ? 'font-semibold' : ''}`}
                >
                  <span>{h.label}</span>
                  <span className="sp-num">{h.time}</span>
                </div>
              ))}
              {branch.specialDays.map((sp) => (
                <p
                  key={sp.date}
                  className="m-0 mt-1.5 text-[13px] leading-[18px] text-(--ink-muted)"
                >
                  Nghỉ {sp.note.toLowerCase().includes('bảo trì') ? 'Thứ Hai 09/11' : sp.date} (
                  {sp.note.toLowerCase()}).
                </p>
              ))}
            </div>
          </section>

          {/* Chính sách đặt lịch */}
          <section className="flex flex-col gap-2">
            <h2 className="m-0 font-semibold text-[17px] leading-6 tracking-[-0.01em]">
              Chính sách đặt lịch
            </h2>
            <ul className="m-0 pl-4.5 flex flex-col gap-1.5 text-sm leading-5">
              <li>
                Đặt trước ít nhất {policies.minNoticeHours} giờ, xa nhất {policies.maxAdvanceDays}{' '}
                ngày.
              </li>
              <li>
                Đổi giờ hoặc hủy trên trang này trước giờ hẹn {policies.cancelBeforeHours} giờ; mỗi
                lịch đổi tối đa {policies.maxReschedules} lần.
              </li>
              <li>
                {depositVnd
                  ? `Dịch vụ nhuộm cần đặt cọc ${formatVnd(depositVnd)}. Hủy trước 24 giờ hoàn 100%, từ 4 đến 24 giờ hoàn 50%, dưới 4 giờ hoặc không đến thì không hoàn.`
                  : 'Hủy trước 24 giờ hoàn 100%, từ 4 đến 24 giờ hoàn 50%, dưới 4 giờ hoặc không đến thì không hoàn.'}
              </li>
            </ul>
          </section>
        </div>

        {/* Desktop Sticky Aside */}
        <aside className="hidden min-[900px]:flex sticky top-6 flex-col gap-4 p-5 rounded-(--radius-lg) bg-(--surface-raised) shadow-[0_0_0_1px_var(--line),var(--shadow-card)]">
          <span className="sp-num text-sm leading-5">
            <strong>Đang mở</strong> · hôm nay 08:00–20:00
          </span>
          <Link
            href={`/mock/${fixture.tenant.slug}/book`}
            className="sp-btn sp-btn--accent sp-btn--lg sp-btn--block no-underline text-center justify-center"
          >
            Đặt lịch
          </Link>
          {overallEarliest && (
            <p className="m-0 text-sm leading-[19px] text-(--ink-muted)">
              Hôm nay còn giờ từ {overallEarliest}.
            </p>
          )}
          <div className="h-[1px] bg-(--line)" />
          <a
            href="#map"
            className="flex gap-2 text-sm leading-5 text-(--accent) no-underline items-start"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{branch.address}</span>
          </a>
          <a
            href={`tel:${phone.tel}`}
            className="sp-num flex gap-2 text-sm leading-5 text-(--ink) no-underline items-center"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>{phone.display}</span>
          </a>
          <div className="h-[1px] bg-(--line)" />
          <div>
            <p className="m-0 mb-1.5 font-semibold text-sm leading-5">Giờ mở cửa</p>
            {hoursFormatted.map((h, idx) => (
              <div
                key={idx}
                className={`flex justify-between text-sm leading-[22px] ${h.label === 'Thứ Bảy' ? 'font-semibold' : ''}`}
              >
                <span>{h.label}</span>
                <span className="sp-num">{h.time}</span>
              </div>
            ))}
            {branch.specialDays.map((sp) => (
              <p key={sp.date} className="m-0 mt-1.5 text-[13px] leading-[18px] text-(--ink-muted)">
                Nghỉ {sp.note.toLowerCase().includes('bảo trì') ? 'Thứ Hai 09/11' : sp.date} (
                {sp.note.toLowerCase()}).
              </p>
            ))}
          </div>
        </aside>
      </div>

      {/* Mobile Sticky Bottom Bar (< 900px) */}
      <div className="min-[900px]:hidden fixed left-0 right-0 bottom-0 z-20 flex items-center gap-3 p-3 px-4 pb-5 bg-(--surface-raised) shadow-[0_-1px_0_var(--line)]">
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="sp-num font-semibold text-[15px] leading-[22px]">Đặt lịch online</span>
          <span className="sp-num text-[13px] leading-[18px] text-(--ink-muted) truncate">
            {overallEarliest ? `Hôm nay còn giờ từ ${overallEarliest}` : 'Hôm nay đã kín lịch'}
          </span>
        </div>
        <Link
          href={`/mock/${fixture.tenant.slug}/book`}
          className="sp-btn sp-btn--accent sp-btn--lg no-underline shrink-0"
        >
          Đặt lịch
        </Link>
      </div>
    </div>
  );
}
