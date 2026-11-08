import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const SIGNUP_STEPS = ['Tài khoản', 'Xác thực', 'Ngành', 'Cơ sở', 'Xong'] as const;

/** Page of the public flows: Sapio name and one link on top, a column of content below. */
export function AuthPage({
  top,
  maxWidth,
  wide = false,
  stickyActions = false,
  children,
}: {
  /** Replaces the default top bar. */
  top: ReactNode;
  /** Column width in px; the default is 560 (`SignupFlow` README). */
  maxWidth?: number;
  /** 1080px column for steps with a side-by-side preview. */
  wide?: boolean;
  /** The action bar sticks to the bottom edge on phones, so the page keeps room for it. */
  stickyActions?: boolean;
  children: ReactNode;
}) {
  const style: CSSProperties = { paddingTop: 0, ...(maxWidth ? { maxWidth } : {}) };
  return (
    <div className="sp-auth">
      {top}
      <main
        className={cn(
          'sp-auth__main',
          wide && 'sp-auth__main--wide',
          stickyActions && 'max-md:pb-28!',
        )}
        style={style}
      >
        {children}
      </main>
    </div>
  );
}

/** `Sapio` on the left, one action on the right. */
export function AuthTop({ children }: { children?: ReactNode }) {
  return (
    <header className="sp-auth__top">
      <span className="sp-brand__name">Sapio</span>
      {children ?? <span />}
    </header>
  );
}

/** Five bars and, on phones, one line of text instead of the labels. */
export function SignupSteps({ current }: { current: number }) {
  const name = SIGNUP_STEPS[current - 1];
  return (
    <div className="flex flex-col gap-(--space-2)">
      <span className="sp-steps__caption">
        Bước {current}/{SIGNUP_STEPS.length} · {name}
      </span>
      <ol className="sp-steps" aria-label="Các bước đăng ký">
        {SIGNUP_STEPS.map((label, i) => {
          const n = i + 1;
          return (
            <li
              key={label}
              className="sp-steps__item"
              data-state={n < current ? 'done' : undefined}
              aria-current={n === current ? 'step' : undefined}
            >
              <span className="sp-steps__label">
                {n}. {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * One step of the sign-up flow: the five bars, heading, the step itself and the buttons
 * (SignupFlow README). The main button on the right says what it does next.
 */
export function SignupLayout({
  current,
  title,
  titleIcon,
  titleId,
  lead,
  top,
  maxWidth,
  wide,
  actions,
  stickyActions = false,
  children,
}: {
  current: number;
  title: string;
  titleIcon?: ReactNode;
  /** id of the heading, for a control that is labelled by it. */
  titleId?: string;
  lead: ReactNode;
  top?: ReactNode;
  maxWidth?: number;
  wide?: boolean;
  actions?: ReactNode;
  stickyActions?: boolean;
  children: ReactNode;
}) {
  return (
    <AuthPage
      top={<AuthTop>{top}</AuthTop>}
      {...(maxWidth ? { maxWidth } : {})}
      {...(wide ? { wide } : {})}
      stickyActions={stickyActions}
    >
      <SignupSteps current={current} />
      {titleIcon ? (
        <div className="flex flex-col gap-(--space-2)">
          <div className="flex items-center gap-(--space-3)">
            {titleIcon}
            <h1 className="sp-auth__title" id={titleId}>
              {title}
            </h1>
          </div>
          <p className="sp-auth__lead m-0!">{lead}</p>
        </div>
      ) : (
        <div>
          <h1 className="sp-auth__title" id={titleId}>
            {title}
          </h1>
          <p className="sp-auth__lead">{lead}</p>
        </div>
      )}
      {children}
      {actions && (
        <div
          className={cn(
            'sp-auth__actions',
            stickyActions &&
              'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:bg-(--surface-raised) max-md:px-(--space-4) max-md:py-(--space-3) max-md:shadow-[0_-1px_0_var(--line)]',
          )}
        >
          {actions}
        </div>
      )}
    </AuthPage>
  );
}
