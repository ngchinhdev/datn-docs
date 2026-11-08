import { salonTocMay } from './salon-toc-may.ts';
import { spaThuCungPawpaw } from './spa-thu-cung-pawpaw.ts';
import type { TenantFixture } from './types.ts';

export type * from './types.ts';

export const tenantFixtures: TenantFixture[] = [salonTocMay, spaThuCungPawpaw];
