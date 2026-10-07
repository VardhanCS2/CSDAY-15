import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { ComponentPropsWithoutRef } from 'react'

const buttonStyles = cva('ui-button', {
  variants: {
    variant: { default: 'ui-button-primary', outline: 'ui-button-outline', ghost: 'ui-button-ghost' },
    size: { default: 'ui-button-default', sm: 'ui-button-small', icon: 'ui-button-icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />
}