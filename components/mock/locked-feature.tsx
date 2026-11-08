'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { NotBuilt } from '@/components/mock/not-built';
import { PurchaseDialogHost } from '@/components/mock/plan-purchase';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { Button } from '@/components/sapio/button';
import { PageHeader } from '@/components/sapio/page-header';
import { formatVnd } from '@/mock/format';
import { screenForAppPath } from '@/mock/screens';
import { fixtureBySlug } from '@/mock/selection';
import { featureInfo, plans, upgradeCharge, type FeatureCode } from '@/mock/subscription';
import { addDays, formatFullDate } from '@/mock/time';

/** The page of a feature the plan does not have: what it does, what upgrading costs today (BR-85, BR-87). */
function LockedFeature({
  feature,
  tenantSlug,
  inSettings,
}: {
  feature: FeatureCode;
  tenantSlug: string;
  inSettings: boolean;
}) {
  const { subscription, daysLeft } = useSubscription();
  const appHref = useAppHref(tenantSlug);
  const info = featureInfo[feature];
  const tenant = fixtureBySlug(tenantSlug)?.tenant;
  const current = plans[subscription.planCode];
  const target = plans.pro;
  const left = daysLeft ?? 0;
  const end = subscription.periodEndsOn ?? '';
  const charge = upgradeCharge(current, target, left);
  if (!info || !tenant) return null;

  return (
    <PurchaseDialogHost>
      {(ask) => (
        <>
          <PageHeader
            title={info.title}
            sub={`${tenant.name} · gói ${current.name}, dùng đến ${formatFullDate(end)}`}
            {...(inSettings
              ? {
                  crumbs: [{ label: 'Cài đặt', href: appHref('settings') }, { label: info.short }],
                }
              : {})}
          />
          <section
            className="sp-auth__card max-w-[680px] gap-(--space-4)!"
            aria-labelledby="lock-title"
          >
            <div className="flex items-center gap-(--space-3)">
              <span className="sp-choice__icon" aria-hidden="true">
                <Lock />
              </span>
              <h2 id="lock-title" className="m-0 text-xl leading-7 font-semibold">
                {info.short} có ở gói {target.name}
              </h2>
            </div>
            <p className="m-0 text-sm leading-5 text-(--ink-muted)">{info.summary}</p>
            <dl className="sp-dialog__facts">
              <dt>Gói hiện tại</dt>
              <dd>
                {current.name} ·{' '}
                <span className="whitespace-nowrap">
                  {formatVnd(current.monthlyPriceVnd)}/tháng
                </span>
              </dd>
              <dt>Gói {target.name}</dt>
              <dd className="whitespace-nowrap">{formatVnd(target.monthlyPriceVnd)}/tháng</dd>
              <dt>Còn lại của kỳ này</dt>
              <dd>
                {left} ngày (đến {formatFullDate(end).slice(0, 5)})
              </dd>
              <dt className="sp-dialog__total">Trả thêm hôm nay</dt>
              <dd className="sp-dialog__total">{formatVnd(charge)}</dd>
            </dl>
            <p className="sp-plan__note m-0">
              Phần chênh {formatVnd(target.monthlyPriceVnd - current.monthlyPriceVnd)}/tháng ×{' '}
              {left}/30 ngày, làm tròn lên tới nghìn đồng. Từ{' '}
              {formatFullDate(addDays(end, 1)).slice(0, 5)} gia hạn theo giá gói {target.name}.
            </p>
            <div className="flex flex-col gap-(--space-2) sm:flex-row sm:justify-end">
              <Link
                href={appHref('settings/plan')}
                className="sp-btn sp-btn--secondary no-underline max-sm:w-full!"
              >
                So sánh hai gói
              </Link>
              <Button
                variant="primary"
                className="max-sm:w-full!"
                onClick={() => ask({ kind: 'upgrade', planCode: 'pro' })}
              >
                Nâng cấp, trả {formatVnd(charge)}
              </Button>
            </div>
          </section>
        </>
      )}
    </PurchaseDialogHost>
  );
}

/**
 * A screen that is not built yet. When the plan lacks its feature it shows the explanation page
 * instead of "Chưa làm", so the padlock in the menu leads somewhere.
 */
export function GatedPage({
  feature,
  tenantSlug,
  path,
  inSettings,
}: {
  feature: FeatureCode;
  tenantSlug: string;
  /** Path under `/app/[tenant]`, split. */
  path: string[];
  inSettings: boolean;
}) {
  const { can } = useSubscription();
  const locked = !can(feature);
  const body = locked ? (
    <LockedFeature feature={feature} tenantSlug={tenantSlug} inSettings={inSettings} />
  ) : (
    <NotBuilt screen={screenForAppPath(path)} path={`/${path.join('/')}`} />
  );
  return inSettings ? body : <div className="sp-shell__content">{body}</div>;
}
