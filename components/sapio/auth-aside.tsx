import { Bell } from 'lucide-react';
import { AUTH_COPY, type AsideVariant } from '@/mock/auth-copy';

export type { AsideVariant };

const SHADOW_CARD = 'shadow-[0_2px_6px_rgba(18,24,23,0.10),0_16px_40px_rgba(9,40,31,0.35)]';
const SHADOW_NOTE = 'shadow-[0_2px_6px_rgba(18,24,23,0.10),0_12px_32px_rgba(9,40,31,0.35)]';

/** Shop scene along the bottom: chair, cart, plant, spa bed and an arched window. */
function Scene() {
  return (
    <svg
      viewBox="0 0 560 220"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      className="mt-4 min-h-[150px] w-full flex-1"
    >
      <path d="M380 212 V86 a70 70 0 0 1 140 0 V212 Z" fill="#1f7359" />
      <path d="M450 18 V212 M380 120 H520" stroke="#2c8a6d" strokeWidth="4" />
      <rect x="70" y="92" width="62" height="70" rx="20" fill="#2c8a6d" />
      <rect x="58" y="152" width="86" height="22" rx="11" fill="#33977a" />
      <rect x="95" y="174" width="12" height="30" rx="4" fill="#2c8a6d" />
      <ellipse cx="101" cy="205" rx="40" ry="7" fill="#2c8a6d" />
      <rect x="172" y="140" width="68" height="5" rx="2.5" fill="#2c8a6d" />
      <rect x="172" y="180" width="68" height="5" rx="2.5" fill="#2c8a6d" />
      <rect x="176" y="140" width="4" height="66" fill="#2c8a6d" />
      <rect x="232" y="140" width="4" height="66" fill="#2c8a6d" />
      <rect x="182" y="114" width="12" height="26" rx="4" fill="#9fdcc6" fillOpacity="0.75" />
      <rect x="198" y="122" width="11" height="18" rx="4" fill="#e991a6" fillOpacity="0.85" />
      <rect x="214" y="118" width="14" height="22" rx="5" fill="#e1f0ea" fillOpacity="0.7" />
      <rect x="186" y="168" width="40" height="12" rx="6" fill="#9fdcc6" fillOpacity="0.5" />
      <path d="M278 212 h40 l-6 -40 h-28 Z" fill="#33977a" />
      <ellipse cx="286" cy="142" rx="12" ry="32" fill="#3fa587" transform="rotate(-24 286 142)" />
      <ellipse cx="310" cy="136" rx="11" ry="36" fill="#4bb594" transform="rotate(18 310 136)" />
      <ellipse cx="298" cy="128" rx="10" ry="40" fill="#3fa587" />
      <rect x="340" y="158" width="200" height="20" rx="10" fill="#33977a" />
      <rect x="354" y="178" width="10" height="32" rx="3" fill="#2c8a6d" />
      <rect x="516" y="178" width="10" height="32" rx="3" fill="#2c8a6d" />
      <rect x="476" y="141" width="54" height="17" rx="8.5" fill="#e1f0ea" fillOpacity="0.85" />
      <ellipse cx="380" cy="153" rx="18" ry="5" fill="#9fdcc6" fillOpacity="0.6" />
      <ellipse cx="380" cy="146" rx="13" ry="4.5" fill="#9fdcc6" fillOpacity="0.75" />
      <ellipse cx="380" cy="140" rx="9" ry="3.5" fill="#e1f0ea" fillOpacity="0.9" />
      <path d="M16 212 H544" stroke="#2c8a6d" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Left block of the account pages, from 900px. It sits on the brand color in both themes: the
 * wrapper takes the light theme, so the tokens inside do not follow the page theme.
 */
export function AuthAside({ variant }: { variant: AsideVariant }) {
  const { variants, card, chips } = AUTH_COPY.vi.aside;
  const text = variants[variant];
  return (
    <div className="hidden max-w-[680px] flex-none basis-[46%] min-[900px]:flex">
      <div
        data-theme="light"
        className="relative flex h-[calc(100dvh-32px)] min-h-[760px] w-full flex-col gap-7 overflow-hidden rounded-[calc(var(--radius-lg)+4px)] bg-(--brand) p-10 text-(--on-primary)"
      >
        <div className="flex items-center justify-between">
          <span className="text-2xl leading-7 font-bold tracking-[-0.02em]">Sapio</span>
          <span className="rounded-full bg-white/14 px-3 py-1.5 text-xs leading-4 font-medium text-[#e1f0ea]">
            {text.kicker}
          </span>
        </div>

        <div className="flex max-w-[480px] flex-col gap-3">
          <h2 className="m-0 text-[38px] leading-11 font-bold tracking-[-0.02em]">{text.title}</h2>
          <p className="m-0 text-[15px] leading-[22px] text-[#d3ebe1]">{text.lead}</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={`relative z-[1] flex w-[420px] max-w-full flex-col gap-2.5 rounded-[14px] bg-(--surface-raised) p-3.5 text-(--ink) ${SHADOW_CARD}`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] leading-[18px] font-semibold">{card.today}</span>
              <span className="text-xs leading-4 text-(--ink-muted)">{card.date}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="border-b border-(--line) pb-1 text-[11px] leading-4 font-medium text-(--ink-muted)">
                  {card.col1}
                </span>
                <div className="rounded-md bg-(--status-confirmed-soft) px-2 py-1.5">
                  <div className="flex items-center gap-[5px] text-xs leading-4 font-semibold">
                    <span className="size-1.5 flex-none rounded-full bg-(--status-confirmed)" />
                    {card.appt1}
                  </div>
                  <div className="sp-num text-[11px] leading-[15px] text-(--ink-muted)">
                    09:00–09:45 · {card.confirmed}
                  </div>
                </div>
                <div className="box-border h-[38px] rounded-md bg-[repeating-linear-gradient(135deg,var(--status-confirmed-soft)_0_4px,var(--surface-raised)_4px_10px)] px-2 py-1 text-[11px] leading-[15px] font-medium text-(--status-confirmed)">
                  {card.wait}
                </div>
                <div className="rounded-md bg-(--status-confirmed-soft) px-2 py-[5px]">
                  <div className="text-xs leading-4 font-semibold">{card.appt1b}</div>
                  <div className="sp-num text-[11px] leading-[15px] text-(--ink-muted)">
                    10:25–10:45
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="border-b border-(--line) pb-1 text-[11px] leading-4 font-medium text-(--ink-muted)">
                  {card.col2}
                </span>
                <div className="h-3.5" />
                <div className="box-border min-h-[58px] rounded-md bg-(--status-checked-in-soft) px-2 py-1.5">
                  <div className="flex items-center gap-[5px] text-xs leading-4 font-semibold">
                    <span className="size-1.5 flex-none rounded-full bg-(--status-checked-in)" />
                    {card.appt2}
                  </div>
                  <div className="sp-num text-[11px] leading-[15px] text-(--ink-muted)">
                    09:15–10:15 · {card.checkedIn}
                  </div>
                </div>
                <div className="sp-num rounded-md border-[1.5px] border-dashed border-(--brand) px-2 py-[5px] text-[11px] leading-[15px] font-medium text-(--brand)">
                  10:30 · {card.holding}
                </div>
              </div>
            </div>
          </div>

          <div
            className={`relative z-[2] -mt-7 flex w-[260px] items-start gap-2.5 self-end rounded-xl bg-(--surface-raised) p-3 text-(--ink) ${SHADOW_NOTE}`}
          >
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-(--brand-soft) text-(--brand)">
              <Bell size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-[13px] leading-[18px] font-semibold">
                <span>{card.newBooking}</span>
                <span className="sp-num font-medium text-(--ink-muted)">09:15</span>
              </div>
              <div className="text-xs leading-4 text-(--ink-muted)">{card.newBookingMeta}</div>
            </div>
          </div>

          <Scene />
        </div>

        {variant !== 'admin' && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {chips.map((label) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/24 bg-white/12 px-3 py-[7px] text-[13px] leading-[18px] font-medium"
              >
                <span className="size-1.5 rounded-full bg-[#9fdcc6]" />
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
