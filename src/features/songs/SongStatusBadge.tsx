import { SONG_STATUS_LABELS, type SongStatus } from '../../domain/models'

const statusClasses: Record<SongStatus, string> = {
  learning: 'bg-blue-50 text-blue-700',
  learned: 'bg-emerald-50 text-emerald-700',
  postponed: 'bg-slate-100 text-slate-600',
}

export function SongStatusBadge({ status }: { status: SongStatus }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${statusClasses[status]}`}
    >
      {SONG_STATUS_LABELS[status]}
    </span>
  )
}
