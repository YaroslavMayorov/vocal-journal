export function Brand() {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="grid size-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-sm">
        VJ
      </div>
      <div>
        <p className="text-[15px] font-semibold tracking-tight text-ink-950">
          Vocal Journal
        </p>
        <p className="text-xs text-slate-500">Вокальный дневник</p>
      </div>
    </div>
  )
}
