import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, error, hint, id: providedId, label, ...props }, ref) => {
    const generatedId = useId()
    const id = providedId ?? generatedId
    const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

    return (
      <label className="block" htmlFor={id}>
        <span className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </span>
        <input
          ref={ref}
          id={id}
          aria-describedby={descriptionId}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900 shadow-xs',
            'placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-100',
            className,
          )}
          {...props}
        />
        {error ? (
          <span id={descriptionId} className="mt-1.5 block text-sm text-red-600">
            {error}
          </span>
        ) : hint ? (
          <span id={descriptionId} className="mt-1.5 block text-xs text-slate-500">
            {hint}
          </span>
        ) : null}
      </label>
    )
  },
)

TextInput.displayName = 'TextInput'
