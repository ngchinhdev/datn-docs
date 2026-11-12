/**
 * Root domain of the platform (T-16). Every customer page lives on a subdomain of it:
 * `toc-may.sapio.vn`. The mock keeps the routes `/mock/[tenant]/book`, but shows the real address.
 */
export const BASE_DOMAIN = 'sapio.vn';

/** `toc-may.sapio.vn`: the address a tenant gives to its customers. */
export const siteHost = (slug: string) => `${slug}.${BASE_DOMAIN}`;

/** The number a customer calls when they cannot change a booking by themselves (BR-08). */
export const branchPhone = (slug: string) =>
  slug === 'pawpaw'
    ? { tel: '02873005678', display: '028 7300 5678' }
    : { tel: '02839301234', display: '028 3930 1234' };
