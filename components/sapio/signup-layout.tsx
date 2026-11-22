'use client';

import { useTheme } from 'fumadocs-ui/provider/base';
import { Globe, Moon, Sun } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuthText } from '@/components/mock/auth-text';
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

/** Language switch: a globe and the code of the language in use. */
export function LangButton() {
  const { lang, t, setLang } = useAuthText();
  return (
    <button
      type="button"
      className="inline-flex h-11 items-center gap-1.5 rounded-[10px] border-0 bg-(--fill-tonal) px-3 text-[13px] leading-[18px] font-semibold text-(--ink) min-[900px]:h-10"
      aria-label={t.common.langLabel}
      onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
    >
      <Globe size={16} aria-hidden="true" />
      {lang.toUpperCase()}
    </button>
  );
}

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
  const { lang, t } = useAuthText();
  // The page names its language for screen readers; the other pages are Vietnamese.
  useEffect(() => {
    if (!aside) return;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = 'vi';
    };
  }, [aside, lang]);

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
    <div className="sp-auth min-[900px]:flex-row! min-[900px]:gap-4! min-[900px]:p-4!">
      <AuthAside variant={aside} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-4 pt-4 min-[900px]:justify-end min-[900px]:p-0">
          <span className="sp-brand__name me-auto text-[22px]! leading-7! min-[900px]:hidden">
            Sapio
          </span>
          {link}
          <LangButton />
          <ThemeButton label={t.common.themeLabel} />
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-8 min-[900px]:px-2">
          <main
            className={cn(
              'flex w-full flex-col gap-[18px] [&_.sp-auth__lead]:mt-1.5 [&_.sp-auth__lead]:text-sm [&_.sp-auth__lead]:leading-5 [&_.sp-auth__title]:text-[26px] [&_.sp-auth__title]:leading-8 [&_.sp-auth__title]:font-semibold',
              padBottom,
            )}
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

/** The steps as numbered pills; the current and finished ones are brand-colored. */
export function SignupSteps({ current }: { current: number }) {
  const { t } = useAuthText();
  return (
    <ol aria-label={t.signup.stepsLabel} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {t.signup.steps.map((label, i) => {
        const n = i + 1;
        const on = n <= current;
        return (
          <li
            key={label}
            aria-current={n === current ? 'step' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full py-[5px] pr-2.5 pl-[5px] text-xs leading-4 font-medium',
              on ? 'bg-(--brand-soft) text-(--brand)' : 'bg-(--fill-tonal) text-(--ink-muted)',
            )}
          >
            <span
              className={cn(
                'sp-num inline-flex size-5 items-center justify-center rounded-full font-semibold',
                on
                  ? 'bg-(--primary) text-(--on-primary)'
                  : 'bg-(--surface-raised) text-(--ink-muted)',
              )}
            >
              {n}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
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
