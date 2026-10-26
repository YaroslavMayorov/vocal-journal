import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { CloseIcon, MenuIcon } from '../components/icons/Icons'
import { AppNavigation } from '../components/navigation/AppNavigation'
import { Brand } from '../components/navigation/Brand'

export function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isMenuOpen) return

    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  return (
    <div className="min-h-dvh bg-slate-50">
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white focus:translate-y-0"
      >
        Перейти к содержимому
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-white lg:block">
        <div className="border-b px-5 py-5">
          <Brand />
        </div>
        <div className="py-5">
          <AppNavigation />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur-sm lg:hidden">
        <Brand />
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
          aria-label="Открыть меню"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen(true)}
        >
          <MenuIcon className="size-5" />
        </button>
      </header>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-slate-950/25"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Меню"
            className="relative h-full w-[min(20rem,88vw)] border-r bg-white shadow-xl"
          >
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Brand />
              <button
                ref={closeButtonRef}
                type="button"
                className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Закрыть меню"
                onClick={() => setIsMenuOpen(false)}
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            <div className="py-5">
              <AppNavigation onNavigate={() => setIsMenuOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:ml-64 lg:px-10"
      >
        <Outlet />
      </main>
    </div>
  )
}
