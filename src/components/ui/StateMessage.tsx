import { Button } from './Button'

interface StateMessageProps {
  title: string
  description: string
  tone?: 'neutral' | 'error'
  action?: React.ReactNode
}

export function StateMessage({
  title,
  description,
  tone = 'neutral',
  action,
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
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function LoadingState() {
  return (
    <StateMessage title="Загрузка" description="Материалы скоро появятся." />
  )
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <StateMessage
      title="Не удалось загрузить данные"
      description="Попробуйте обновить страницу немного позже."
      tone="error"
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Повторить
          </Button>
        ) : undefined
      }
    />
  )
}
