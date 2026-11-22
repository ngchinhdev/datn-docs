export type AsideVariant = 'login' | 'signup' | 'forgot' | 'workspace' | 'admin';

/**
 * Left block of the account pages, from 900px. It sits on the brand color in both themes: the
 * wrapper takes the light theme, so the tokens inside do not follow the page theme.
 */
export function AuthAside({ variant }: { variant: AsideVariant }) {
  return (
    <div className="hidden flex-none basis-[46%] min-[900px]:flex max-w-[680px]">
      <div
        data-theme="light"
        data-variant={variant}
        className="relative flex min-h-[760px] h-[calc(100dvh-32px)] w-full flex-col gap-7 overflow-hidden rounded-[calc(var(--radius-lg)+4px)] bg-(--brand) p-10 text-white"
      >
        <div className="flex items-center justify-between">
          <span className="text-2xl leading-7 font-bold tracking-[-0.02em]">Sapio</span>
        </div>
      </div>
    </div>
  );
}
