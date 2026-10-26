import { useEffect } from 'react'

const MESSAGE = 'Есть несохранённые изменения. Покинуть страницу?'

export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    const followLink = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest('a[href]')
      if (link && !window.confirm(MESSAGE)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', followLink, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', followLink, true)
    }
  }, [isDirty])
}
