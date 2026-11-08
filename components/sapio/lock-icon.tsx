import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Padlock beside a feature the plan does not include (BR-87). Decorative: the link it sits in
 * says "cần nâng gói" in words.
 */
export function LockIcon({ className }: { className?: string }) {
  return <Lock aria-hidden="true" className={cn('sp-lock', className)} />;
}
