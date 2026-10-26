import { useCallback, useEffect, useState } from 'react'

type ResourceState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: Error }

export function useApiResource<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' })
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    loader().then(
      (data) => {
        if (active) setState({ status: 'success', data })
      },
      (caught: unknown) => {
        if (active) {
          setState({
            status: 'error',
            error: caught instanceof Error ? caught : new Error('Unknown error'),
          })
        }
      },
    )

    return () => {
      active = false
    }
  }, [loader, revision])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setRevision((value) => value + 1)
  }, [])

  return { ...state, reload }
}
