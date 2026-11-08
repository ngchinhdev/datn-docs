'use client';

import { OTPInput, OTPInputContext } from 'input-otp';
import { useContext, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/**
 * shadcn/ui `InputOTP`: one real input that draws its characters into the slots. The classes
 * are Sapio's `.sp-otp`, so the boxes look like the rest of the design system.
 */
export function InputOTP({
  className,
  containerClassName,
  ...props
}: ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn('sp-otp', containerClassName)}
      className={cn('sp-otp__input', className)}
      {...props}
    />
  );
}

/** Lays the slots out through the container, which already is the flex row. */
export function InputOTPGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="input-otp-group" className={cn('contents', className)} {...props} />;
}

export function InputOTPSlot({
  index,
  className,
  ...props
}: ComponentProps<'span'> & { index: number }) {
  const { slots } = useContext(OTPInputContext);
  const slot = slots[index];
  return (
    <span
      data-slot="input-otp-slot"
      data-active={slot?.isActive ? '' : undefined}
      className={cn('sp-otp__slot', className)}
      {...props}
    >
      {slot?.char}
    </span>
  );
}
