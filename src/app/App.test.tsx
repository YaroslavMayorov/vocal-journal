import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './App'

function renderRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

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
  ])('открывает %s', (route, heading) => {
    renderRoute(route)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('показывает понятное состояние для неизвестного упражнения', () => {
    renderRoute('/exercises/unknown')
    expect(
      screen.getByRole('heading', { name: 'Упражнение не найдено' }),
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
})
