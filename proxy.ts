import { NextResponse, type NextRequest } from 'next/server';

const MOVED: Record<string, (tenant: string) => string> = {
  '/mock/dat-lich': (t) => `/mock/${t}/book`,
  '/mock/le-tan': (t) => `/mock/app/${t}/calendar`,
  '/mock/le-tan/tai-nguyen': (t) => `/mock/app/${t}/calendar?view=resources`,
  '/mock/hom-nay': (t) => `/mock/app/${t}/today`,
};

const SLUGS = ['toc-may', 'pawpaw'];

/** Mock links from before the tenant moved into the path: 308 to the new route, `tenant` dropped. */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const target = MOVED[pathname];
  if (!target) return NextResponse.next();
  const asked = searchParams.get('tenant') ?? '';
  const url = new URL(target(SLUGS.includes(asked) ? asked : SLUGS[0]!), request.url);
  for (const [key, value] of searchParams) {
    if (key !== 'tenant') url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/mock/dat-lich', '/mock/le-tan', '/mock/le-tan/tai-nguyen', '/mock/hom-nay'],
};
