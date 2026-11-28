import type { BookingPolicies } from './types.ts';

/** What a new tenant starts with (BR-06, BR-08, BR-09, BR-10). */
export const defaultPolicies: BookingPolicies = {
  minNoticeHours: 2,
  maxAdvanceDays: 30,
  cancelBeforeHours: 4,
  maxReschedules: 2,
  noShowAfterMinutes: 15,
  depositAfterNoShows: 2,
};
