'use client';

import { useAccountStore } from '@/components/mock/account-store';
import { AUTH_COPY, type AuthCopy, type AuthLang } from '@/mock/auth-copy';

/** The language of the account pages and their text; it is kept with the mock store. */
export function useAuthText(): { lang: AuthLang; t: AuthCopy; setLang: (lang: AuthLang) => void } {
  const { lang, patch } = useAccountStore();
  return { lang, t: AUTH_COPY[lang], setLang: (next) => patch(() => ({ lang: next })) };
}
