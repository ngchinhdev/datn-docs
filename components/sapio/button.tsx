import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'sp-btn',
        `sp-btn--${variant}`,
        size !== 'md' && `sp-btn--${size}`,
        block && 'sp-btn--block',
        className,
      )}
      {...props}
    />
  );
}
