import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Mock links sent out before the tenant moved into the path keep working.
  async redirects() {
    const withTenant = [{ type: 'query', key: 'tenant', value: '(?<tenant>toc-may|pawpaw)' }];
    const moved = [
      ['/mock/dat-lich', '/mock/:tenant/book'],
      ['/mock/le-tan', '/mock/app/:tenant/calendar'],
      ['/mock/le-tan/tai-nguyen', '/mock/app/:tenant/calendar?view=resources'],
      ['/mock/hom-nay', '/mock/app/:tenant/today'],
    ];
    return moved.flatMap(([source, destination]) => [
      { source, has: withTenant, destination, permanent: true },
      { source, destination: destination.replace(':tenant', 'toc-may'), permanent: true },
    ]);
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

const withMDX = createMDX();

export default withMDX(config);
