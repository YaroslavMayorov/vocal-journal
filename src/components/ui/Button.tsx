import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

export function Button({
  children,
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400',
        variant === 'primary' &&
          'bg-brand-600 text-white hover:bg-brand-700 active:bg-blue-800',
        variant === 'secondary' &&
          'border bg-white text-slate-700 hover:bg-slate-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
