import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from './App'

function renderRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/exercises/unknown')) {
        return Response.json(
          { error: { code: 'EXERCISE_NOT_FOUND', message: 'Упражнение не найдено' } },
          { status: 404 },
        )
      }
      return Response.json({ data: [] })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('маршрутизация приложения', () => {
  it('перенаправляет с главной страницы к упражнениям', async () => {
    renderRoute('/')
    expect(
      await screen.findByRole('heading', { name: 'Упражнения' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['/exercises', 'Упражнения'],
    ['/songs', 'Песни'],
    ['/tags', 'Теги'],
    ['/settings', 'Настройки'],
  ])('открывает %s', async (route, heading) => {
    renderRoute(route)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    if (route === '/exercises' || route === '/tags') {
      await waitForElementToBeRemoved(() => screen.queryByText('Материалы скоро появятся.'))
    }
  })

  it('показывает понятное состояние для неизвестного упражнения', async () => {
    renderRoute('/exercises/unknown')
    expect(
      await screen.findByRole('heading', { name: 'Упражнение не найдено' }),
    ).toBeInTheDocument()
  })

  it('показывает страницу для неизвестного адреса', () => {
    renderRoute('/unknown')
    expect(
      screen.getByRole('heading', { name: 'Страница не найдена' }),
    ).toBeInTheDocument()
  })
})

describe('оболочка приложения', () => {
  it('переходит между разделами через навигацию', async () => {
    const user = userEvent.setup()
    renderRoute('/exercises')

    await user.click(screen.getAllByRole('link', { name: 'Песни' })[0])

    expect(screen.getByRole('heading', { name: 'Песни' })).toBeInTheDocument()
  })

  it('показывает отдельное пустое состояние библиотеки', async () => {
    renderRoute('/exercises')
    expect(
      await screen.findByRole('heading', { name: 'Упражнений пока нет' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Создать упражнение' })).toBeInTheDocument()
  })
})
