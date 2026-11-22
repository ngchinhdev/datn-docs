'use client';

import { useTheme } from 'fumadocs-ui/provider/base';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { AuthAside, type AsideVariant } from '@/components/sapio/auth-aside';
import { Tip } from '@/components/sapio/tooltip';
import { cn } from '@/lib/utils';

/** Switches between the light and the dark theme; the moon shows in light, the sun in dark. */
export function ThemeButton({ label }: { label: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';
  const Icon = dark ? Sun : Moon;
  return (
    <Tip label={label} side="bottom-end">
      <button
        type="button"
        className="sp-icon-btn size-11! rounded-[10px]! bg-(--fill-tonal)! min-[900px]:size-10!"
        aria-label={label}
        onClick={() => setTheme(dark ? 'light' : 'dark')}
      >
        <Icon aria-hidden="true" />
      </button>
    </Tip>
  );
}

export const SIGNUP_STEPS = ['Tài khoản', 'Xác thực', 'Ngành', 'Cơ sở', 'Xong'] as const;

/**
 * Page of the public flows. With `aside` it splits in two from 900px: the illustration block on
 * the left, the form on the right; below that the block is gone and the page is one column.
 * Without `aside` it is the plain single column.
 */
export function AuthPage({
  top,
  aside,
  link,
  maxWidth,
  wide = false,
  stickyActions = false,
  children,
}: {
  /** Replaces the default top bar; only for pages without `aside`. */
  top?: ReactNode;
  /** The block on the left and the text it shows. */
  aside?: AsideVariant;
  /** Link of the page's context, on the right of the top bar. */
  link?: ReactNode;
  /** Column width in px; the default is 560 (`SignupFlow` README), 400 with `aside`. */
  maxWidth?: number;
  /** 1080px column for steps with a side-by-side preview. */
  wide?: boolean;
  /** The action bar sticks to the bottom edge on phones, so the page keeps room for it. */
  stickyActions?: boolean;
  children: ReactNode;
}) {
  const padBottom = stickyActions && 'max-md:pb-28!';

  if (!aside) {
    return (
      <div className="sp-auth">
        {top}
        <main
          className={cn('sp-auth__main', wide && 'sp-auth__main--wide', padBottom)}
          style={{ paddingTop: 0, ...(maxWidth ? { maxWidth } : {}) }}
        >
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="sp-auth min-[900px]:flex-row min-[900px]:gap-4 min-[900px]:p-4">
      <AuthAside variant={aside} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-4 pt-4 min-[900px]:justify-end min-[900px]:p-0">
          <span className="sp-brand__name me-auto text-[22px]! leading-7! min-[900px]:hidden">
            Sapio
          </span>
          {link}
          <ThemeButton label="Đổi giao diện sáng hoặc tối" />
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-8 min-[900px]:px-2">
          <main
            className={cn('flex w-full flex-col gap-(--space-6)', padBottom)}
            style={{ maxWidth: maxWidth ?? 400 }}
          >
            {children}
          </main>
        </div>
      </div>
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
      aside="signup"
      link={top}
      maxWidth={maxWidth ?? 420}
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
