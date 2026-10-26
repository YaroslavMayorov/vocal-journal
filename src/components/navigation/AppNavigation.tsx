import type { ComponentType, SVGProps } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ExercisesIcon,
  SettingsIcon,
  SongsIcon,
  TagsIcon,
} from '../icons/Icons'
import { cn } from '../../lib/cn'

interface NavigationItem {
  label: string
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const navigationItems: NavigationItem[] = [
  { label: 'Упражнения', to: '/exercises', icon: ExercisesIcon },
  { label: 'Песни', to: '/songs', icon: SongsIcon },
  { label: 'Теги', to: '/tags', icon: TagsIcon },
  { label: 'Настройки', to: '/settings', icon: SettingsIcon },
]

interface AppNavigationProps {
  onNavigate?: () => void
}

export function AppNavigation({ onNavigate }: AppNavigationProps) {
  return (
    <nav aria-label="Основная навигация" className="px-3">
      <ul className="space-y-1">
        {navigationItems.map(({ icon: Icon, label, to }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
