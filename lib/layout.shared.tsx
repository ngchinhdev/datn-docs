import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Đồ án đặt lịch đa tài nguyên',
    },
    links: [{ text: 'Mock', url: '/mock' }],
    githubUrl: 'https://github.com/ngchinhdev/datn-docs',
  };
}
