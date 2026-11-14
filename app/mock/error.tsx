'use client';

import { ServerError } from '@/components/mock/error-views';

/** A page of the mock threw: the 500 page of MH-10, with the digest as the error code. */
export default function MockError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ServerError code={error.digest} onRetry={reset} />;
}
