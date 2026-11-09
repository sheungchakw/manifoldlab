import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'icon'
}

/** Minimal shadcn-style button. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-50',
        variant === 'default' && 'bg-sky-500 text-neutral-950 hover:bg-sky-400',
        variant === 'ghost' && 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100',
        variant === 'outline' &&
          'border border-neutral-700 text-neutral-200 hover:bg-neutral-800',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-9 px-4 text-sm',
        size === 'icon' && 'h-9 w-9',
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
