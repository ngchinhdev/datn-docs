import { salonTocMay } from './salon-toc-may.ts';
import { spaLaSen } from './spa-la-sen.ts';
import type { TenantFixture } from './types.ts';

export type * from './types.ts';

export const tenantFixtures: TenantFixture[] = [salonTocMay, spaLaSen];
