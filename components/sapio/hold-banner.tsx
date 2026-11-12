'use client';

import { useEffect } from 'react';
import { formatCountdown } from '@/mock/time';

const HOLD_SECONDS = 10 * 60;

export interface HoldBannerProps {
  /** Expiry from the server, ISO 8601 UTC (BR-07). */
  expiresAt: string;
  /** Current mock time, ISO 8601 UTC. */
  now: string;
  /** "Ghế 2 · Lan", what is being held. */
  note: string;
  /** Replaces "Giữ chỗ cho bạn trong 10 phút", e.g. "Đang giữ chỗ 14:00, Thứ Bảy 07/11". */
  title?: string;
  onExpire: () => void;
}

export function HoldBanner({ expiresAt, now, note, title, onExpire }: HoldBannerProps) {
  const left = Math.max(0, (Date.parse(expiresAt) - Date.parse(now)) / 1000);
  const expired = left <= 0;

  useEffect(() => {
    if (expired) onExpire();
  }, [expired, onExpire]);

  const minutes = Math.floor(left / 60);
  const seconds = Math.floor(left % 60);

  return (
    <div className="sp-hold" role="status" aria-label={`Còn ${minutes} phút ${seconds} giây`}>
      <span className="sp-hold__title">{title ?? 'Giữ chỗ cho bạn trong 10 phút'}</span>
      <span className="sp-hold__time" aria-hidden="true">
        {formatCountdown(left)}
      </span>
      <span className="sp-hold__note">{note}</span>
      <span className="sp-hold__bar" aria-hidden="true">
        <span style={{ width: `${(left / HOLD_SECONDS) * 100}%` }} />
      </span>
    </div>
  );
}
