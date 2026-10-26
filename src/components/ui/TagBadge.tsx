interface TagBadgeProps {
  name: string
}

export function TagBadge({ name }: TagBadgeProps) {
  return (
    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
      {name}
    </span>
  )
}
