import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
}

// eslint-disable-next-line react-refresh/only-export-components
export function buttonClasses(variant: ButtonVariant = 'primary') {
  return cn(
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
    variant === 'primary' &&
      'bg-brand-600 text-white hover:bg-brand-700 active:bg-blue-800',
    variant === 'secondary' &&
      'border bg-white text-slate-700 hover:bg-slate-50',
    variant === 'danger' &&
      'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonClasses(variant),
        'disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
)

Button.displayName = 'Button'

interface LinkButtonProps extends LinkProps {
  children: ReactNode
  variant?: ButtonVariant
}

export function LinkButton({
  children,
  className,
  variant = 'primary',
  ...props
}: LinkButtonProps) {
  return (
    <Link className={cn(buttonClasses(variant), className)} {...props}>
      {children}
    </Link>
  )
}
