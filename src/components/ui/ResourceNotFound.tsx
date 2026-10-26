import { Link } from 'react-router-dom'

interface ResourceNotFoundProps {
  title: string
  description: string
  backTo: string
  backLabel: string
}

export function ResourceNotFound({
  title,
  description,
  backTo,
  backLabel,
}: ResourceNotFoundProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-xl border bg-white px-6 py-10 text-center sm:px-10">
        <p className="text-sm font-semibold text-brand-600">Не найдено</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-950">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
        <Link
          to={backTo}
          className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  )
}
