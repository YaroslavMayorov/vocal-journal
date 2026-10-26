import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface SectionCardProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function SectionCard({
  title,
  description,
  children,
  className,
}: SectionCardProps) {
  return (
    <section className={cn('rounded-xl border bg-white p-5 sm:p-6', className)}>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description ? (
        <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  )
}
