/*
 * What the landing page (MH-01) says about money: the plans and their features, read from the same
 * data the plan page uses (BR-83, BR-84), never written by hand. Pure.
 */
import { formatVnd } from './format';
import { TRIAL_DAYS } from './signup';
import {
  PERIODS,
  planFeatureList,
  planHasAll,
  PLAN_CODES,
  plans,
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

export const pricingCards = (): PricingCard[] =>
  PLAN_CODES.map((code) => {
    const plan = plans[code];
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
export const lowestPrice = () =>
  formatVnd(
    PLAN_CODES.map((code) => plans[code].monthlyPriceVnd).reduce((a, b) => (b < a ? b : a)),
  );

/** `Trả 3 tháng giảm 10%, 12 tháng giảm 20%.` */
export const discountLine = () =>
  `Trả ${PERIODS.filter((p) => p.discountPercent > 0)
    .map((p) => `${p.months} tháng giảm ${p.discountPercent}%`)
    .join(', ')}.`;

export const TRIAL_LABEL = `Dùng thử ${TRIAL_DAYS} ngày`;

/** The line under the trial button. */
export const trialNote = () =>
  `Không cần thẻ. Hết ${TRIAL_DAYS} ngày, chọn gói từ ${lowestPrice()} mỗi tháng.`;
