'use client';

import { useAuthText } from '@/components/mock/auth-text';
import type { AuthLang } from '@/mock/auth-copy';
import { SHELL_COPY, type ShellCopy } from '@/mock/shell-copy';

/** The language of the app frame is the one of the account pages; it is kept with the mock store. */
export function useShellText(): {
  lang: AuthLang;
  t: ShellCopy;
  setLang: (lang: AuthLang) => void;
} {
  const { lang, setLang } = useAuthText();
  return { lang, t: SHELL_COPY[lang], setLang };
}
