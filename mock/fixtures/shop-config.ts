/*
 * What Cài đặt starts with for each sample shop: no resource out of use, the refund tiers of
 * BR-23, the colour of the shop, a gateway that has reported once, the reminders and the chatbot.
 */
import type { ShopConfig } from './types.ts';

const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+07:00`).toISOString();

const base = {
  outages: [],
  refundTiers: { over24: 100, over4: 50, under4: 0 },
  packageCancelFee: 50_000n,
  counterMethods: { transfer: true, card: true, wallet: true },
  notifications: {
    reminder24h: true,
    reminder2h: false,
    staffNewAppointment: true,
    staffNewLeave: true,
  },
} satisfies Partial<ShopConfig>;

export const salonConfig: ShopConfig = {
  ...base,
  branding: { accent: '#A63D57', slug: 'toc-may' },
  gateway: {
    keyTail: '3f9a',
    keyVersion: 1,
    events: [
      {
        id: 'gw-1',
        at: at('2026-11-05', '21:14'),
        text: 'Báo cọc PG-7K2Q9, 100.000 ₫, đúng chữ ký',
        ok: true,
      },
    ],
  },
  chatbot: {
    enabled: true,
    greeting:
      'Chào bạn, mình là trợ lý của Salon Tóc Mây. Mình xem giá, giờ trống và giữ chỗ giúp bạn.',
    perCustomerPerDay: 20,
    perShopPerMonth: 3000,
    usedThisMonth: 412,
  },
};

export const pawpawConfig: ShopConfig = {
  ...base,
  branding: { accent: '#C2410C', slug: 'pawpaw' },
  gateway: { keyTail: '8c21', keyVersion: 1, events: [] },
  chatbot: {
    enabled: true,
    greeting:
      'Chào bạn, mình là trợ lý của Spa thú cưng Pawpaw. Mình xem giá, giờ trống và giữ chỗ cho bé giúp bạn.',
    perCustomerPerDay: 20,
    perShopPerMonth: 3000,
    usedThisMonth: 96,
  },
};
