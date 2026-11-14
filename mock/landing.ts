/*
 * What the landing page (MH-01) says about money: the plans and their features, read from the same
 * data the plan page and the platform administration use (BR-83, BR-84), never written by hand. Pure.
 */
import { formatVnd } from './format';
import {
  TRIAL_DAYS,
  planFeatureList,
  planHasAll,
  PLAN_CODES,
  type Catalog,
  type PlanCode,
} from './subscription';

export interface PricingCard {
  code: PlanCode;
  name: string;
  /** `199.000 ₫`. */
  price: string;
  /** `1 chi nhánh`. */
  note: string;
  features: { label: string; on: boolean }[];
}

export const pricingCards = (catalog: Catalog): PricingCard[] =>
  PLAN_CODES.map((code) => {
    const plan = catalog.plans[code];
    return {
      code,
      name: plan.name,
      price: formatVnd(plan.monthlyPriceVnd),
      note: plan.note,
      features: planFeatureList.map((feature) => ({
        label: feature.label,
        on: planHasAll(plan, feature.requires),
      })),
    };
  });

/** The cheapest monthly price, for "chọn gói từ …". */
export const lowestPrice = (catalog: Catalog) =>
  formatVnd(
    PLAN_CODES.map((code) => catalog.plans[code].monthlyPriceVnd).reduce((a, b) => (b < a ? b : a)),
  );

/** `Trả 3 tháng giảm 10%, 12 tháng giảm 20%.` */
export const discountLine = (catalog: Catalog) =>
  `Trả ${catalog.periods
    .filter((p) => p.discountPercent > 0)
    .map((p) => `${p.months} tháng giảm ${p.discountPercent}%`)
    .join(', ')}.`;

export const TRIAL_LABEL = `Dùng thử ${TRIAL_DAYS} ngày`;

/** The line under the trial button. */
export const trialNote = (catalog: Catalog) =>
  `Không cần thẻ. Hết ${TRIAL_DAYS} ngày, chọn gói từ ${lowestPrice(catalog)} mỗi tháng.`;
