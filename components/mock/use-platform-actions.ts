'use client';

import { useCallback } from 'react';
import { useAccountStore } from '@/components/mock/account-store';
import { usePlatform } from '@/components/mock/platform-store';
import { platformLockMail, platformUnlockMail } from '@/mock/account-mail';
import { PLATFORM_ADMIN } from '@/mock/fixtures/platform';
import {
  addPlatformLog,
  extended,
  extension,
  extensionDetail,
  extensionPayment,
  lockDetail,
  type TenantView,
} from '@/mock/platform';

/**
 * What the platform admin does to a tenant. A lock is the account store's, the one the tenant's own
 * pages read (BR-75); dates, payments and the log are the platform's. Each action writes the log
 * (BR-63).
 */
export function usePlatformActions() {
  const platform = usePlatform();
  const account = useAccountStore();
  const { now } = account;
  const { patch: patchPlatform } = platform;
  const { patch: patchAccount } = account;

  const lock = useCallback(
    (view: TenantView, reason: string) => {
      const { tenant } = view;
      const text = reason.trim();
      patchAccount((d) => ({
        locks: { ...d.locks, [tenant.id]: { at: now, reason: text } },
        mails: [
          ...d.mails,
          platformLockMail({
            ownerEmail: tenant.ownerEmail,
            ownerName: tenant.ownerName,
            tenantName: tenant.name,
            reason: text,
            now,
            seq: d.mails.length + 1,
          }),
        ],
      }));
      patchPlatform((d) => ({
        log: addPlatformLog(d.log, now, PLATFORM_ADMIN, {
          action: 'Khóa cơ sở',
          object: tenant.name,
          detail: lockDetail(view),
          tenantId: tenant.id,
          reason: text,
        }),
      }));
    },
    [now, patchAccount, patchPlatform],
  );

  const unlock = useCallback(
    (view: TenantView, reason: string) => {
      const { tenant } = view;
      patchAccount((d) => {
        const { [tenant.id]: _opened, ...rest } = d.locks;
        return {
          locks: rest,
          mails: [
            ...d.mails,
            platformUnlockMail({
              ownerEmail: tenant.ownerEmail,
              ownerName: tenant.ownerName,
              tenantName: tenant.name,
              now,
              seq: d.mails.length + 1,
            }),
          ],
        };
      });
      patchPlatform((d) => ({
        log: addPlatformLog(d.log, now, PLATFORM_ADMIN, {
          action: 'Mở khóa cơ sở',
          object: tenant.name,
          detail: 'Mở khóa',
          tenantId: tenant.id,
          reason: reason.trim(),
        }),
      }));
    },
    [now, patchAccount, patchPlatform],
  );

  /** Moves the date of the tenant; the row it leaves in the history takes no money (BR-91). */
  const extend = useCallback(
    (view: TenantView, days: number, reason: string) => {
      const { tenant } = view;
      patchPlatform((d) => {
        const sub = d.subscriptions[tenant.id] ?? view.subscription;
        const e = extension(sub, days, now);
        const own = d.payments[tenant.id] ?? [];
        return {
          subscriptions: { ...d.subscriptions, [tenant.id]: extended(sub, e) },
          payments: {
            ...d.payments,
            [tenant.id]: [extensionPayment(tenant.id, days, now, own.length), ...own],
          },
          log: addPlatformLog(d.log, now, PLATFORM_ADMIN, {
            action: 'Gia hạn thủ công',
            object: tenant.name,
            detail: extensionDetail(days, e),
            tenantId: tenant.id,
            reason: reason.trim(),
          }),
        };
      });
    },
    [now, patchPlatform],
  );

  return { lock, unlock, extend };
}
