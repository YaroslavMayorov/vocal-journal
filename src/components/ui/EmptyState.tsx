import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 py-12 text-center">
      {icon ? (
        <div className="mb-4 grid size-11 place-items-center rounded-lg border bg-slate-50 text-slate-500">
          {icon}
        </div>
      ) : null}
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  )
}
