import { salonTocMay } from './salon-toc-may';
import { spaThuCungPawpaw } from './spa-thu-cung-pawpaw';
import type { TenantFixture } from './types';

export type * from './types';

export const tenantFixtures: TenantFixture[] = [salonTocMay, spaThuCungPawpaw];
