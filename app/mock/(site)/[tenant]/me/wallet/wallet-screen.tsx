'use client';

import { useCustomerSession } from '@/components/mock/customer-session';
import { formatVnd } from '@/mock/format';
import { fixtureBySlug } from '@/mock/selection';

/** MH-20: the packages and the wallet of the customer. Read only: top-ups and withdrawals happen at the desk. */
export function WalletScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = fixtureBySlug(tenantSlug)!;
  const { packages, wallet } = useCustomerSession();

  return (
    <div className="flex flex-col gap-(--space-5)">
      <h1 className="title m-0">Gói và ví</h1>

      <section aria-labelledby="packages-title" className="flex flex-col gap-(--space-3)">
        <h2 id="packages-title" className="heading m-0">
          Gói dịch vụ
        </h2>
        {packages.length === 0 ? (
          <p className="body-sm m-0 text-(--ink-muted)">
            Chưa có gói nào. Gói mua ở quầy sẽ hiện ở đây.
          </p>
        ) : (
          packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-col gap-(--space-2) rounded-(--radius-lg) bg-(--surface-raised) p-(--space-4) shadow-[0_0_0_1px_var(--line)]"
            >
              <div className="flex items-baseline justify-between gap-(--space-2)">
                <span className="body font-semibold">{pkg.name}</span>
                <span className="body-sm sp-num text-(--ink-muted)">hạn {pkg.expiresAt}</span>
              </div>
              <div className="flex items-center gap-(--space-3)">
                <span className="title sp-num">Còn {pkg.remainingSessions} buổi</span>
                <span
                  className="h-2 grow overflow-hidden rounded-(--radius-pill) bg-(--fill-tonal)"
                  role="img"
                  aria-label={`Đã dùng ${pkg.usedSessions} trên ${pkg.totalSessions} buổi`}
                >
                  <span
                    className="block h-full bg-(--accent)"
                    style={{ width: `${(pkg.remainingSessions / pkg.totalSessions) * 100}%` }}
                  />
                </span>
              </div>
              {pkg.note && <p className="body-sm m-0 text-(--ink-muted)">{pkg.note}</p>}
            </div>
          ))
        )}
      </section>

      <section aria-labelledby="wallet-title" className="flex flex-col gap-(--space-3)">
        <h2 id="wallet-title" className="heading m-0">
          Ví
        </h2>
        <div className="flex flex-col gap-(--space-1) rounded-(--radius-lg) bg-(--surface-raised) p-(--space-4) shadow-[0_0_0_1px_var(--line)]">
          <span className="title sp-num">{formatVnd(wallet.balanceVnd)}</span>
          <span className="body-sm sp-num text-(--ink-muted)">
            Tiền nạp {formatVnd(wallet.realVnd)} · tiền tặng {formatVnd(wallet.bonusVnd)}
          </span>
        </div>
        <p className="body-sm m-0 text-(--ink-muted)">
          Nạp và rút tiền ở quầy. Rút chỉ được phần tiền nạp, không rút tiền tặng.
        </p>
      </section>

      <section aria-labelledby="history-title" className="flex flex-col gap-(--space-2)">
        <h2 id="history-title" className="heading m-0">
          Lịch sử
        </h2>
        {wallet.history.length === 0 ? (
          <p className="body-sm m-0 text-(--ink-muted)">
            Chưa có giao dịch nào ở {fixture.tenant.name}.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {wallet.history.map((tx) => (
              <li
                key={tx.id}
                className="flex items-start justify-between gap-(--space-3) border-b border-(--line) py-(--space-3) last:border-b-0"
              >
                <span className="flex flex-col">
                  <span className="body">{tx.description}</span>
                  <span className="body-sm sp-num text-(--ink-muted)">{tx.date}</span>
                </span>
                <span
                  className={`body sp-num flex-none ${tx.isPositive ? 'font-semibold text-(--accent)' : ''}`}
                >
                  {tx.amountText}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
