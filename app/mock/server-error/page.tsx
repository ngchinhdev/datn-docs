import type { Metadata } from 'next';
import { ServerError } from '@/components/mock/error-views';

export const metadata: Metadata = {
  title: 'Lỗi máy chủ · Sapio',
};

/** The 500 page with a sample code, for the mock tool menu to open. */
export default function ServerErrorSample() {
  return <ServerError />;
}
