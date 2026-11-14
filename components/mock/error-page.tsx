import type { ReactNode } from 'react';
import { AuthPage, AuthTop } from '@/components/sapio/signup-layout';

/** A page of the public flows that says one thing and offers a way out (MH-10, MH-04, MH-05). */
export function ErrorPage({
  title,
  lead,
  actions,
  note,
  top,
}: {
  title: string;
  lead: ReactNode;
  actions?: ReactNode;
  /** Small text under the buttons: an error code. */
  note?: ReactNode;
  top?: ReactNode;
}) {
  return (
    <AuthPage maxWidth={480} top={<AuthTop>{top}</AuthTop>}>
      <div className="flex flex-col gap-(--space-3) pt-(--space-8)">
        <h1 className="sp-auth__title">{title}</h1>
        <p className="sp-auth__lead m-0!">{lead}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-(--space-2)">{actions}</div>}
      {note && <p className="sp-num m-0 text-[13px] leading-[18px] text-(--ink-muted)">{note}</p>}
    </AuthPage>
  );
}
