interface StateMessageProps {
  title: string
  description: string
  tone?: 'neutral' | 'error'
}

export function StateMessage({
  title,
  description,
  tone = 'neutral',
}: StateMessageProps) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-950'
          : 'bg-white text-slate-900'
      }`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <h2 className="font-semibold">{title}</h2>
      <p
        className={`mt-1 text-sm leading-6 ${
          tone === 'error' ? 'text-red-700' : 'text-slate-500'
        }`}
      >
        {description}
      </p>
    </div>
  )
}

export function LoadingState() {
  return (
    <StateMessage title="Загрузка" description="Материалы скоро появятся." />
  )
}

export function ErrorState() {
  return (
    <StateMessage
      title="Не удалось загрузить данные"
      description="Попробуйте обновить страницу немного позже."
      tone="error"
    />
  )
}
