/*
 * Cài đặt of a shop as pure functions: the prices of a branch, the opening hours with several
 * windows a day, the colour of the shop, the address of the booking page. Imports types and pure
 * modules only, so Node can run it (scripts/check-shop.ts).
 */
import type { Service } from './fixtures/types.ts';

/**
 * BR-02, BR-56: a branch may price a variant on its own. The prices by staff level follow the
 * branch price in the same proportions, rounded down to whole VND; a variant without an entry
 * keeps the shared price.
 */
export function applyBranchPrices(
  services: readonly Service[],
  prices: Record<string, bigint> | undefined,
): Service[] {
  if (!prices) return [...services];
  return services.map((service) => ({
    ...service,
    variants: service.variants.map((variant) => {
      const own = prices[variant.id];
      if (own === undefined) return variant;
      const levels = variant.pricesByLevel;
      const lowest = levels?.[0] ?? variant.priceVnd;
      return {
        ...variant,
        priceVnd: own,
        ...(levels && lowest > 0n
          ? { pricesByLevel: levels.map((price) => (own * price) / lowest) }
          : {}),
      };
    }),
  }));
}
