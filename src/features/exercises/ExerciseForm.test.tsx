import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ExerciseForm } from './ExerciseForm'

describe('форма упражнения', () => {
  it('не отправляет пустое название и показывает ошибку на русском', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <MemoryRouter>
        <ExerciseForm
          tags={[]}
          submitLabel="Создать упражнение"
          cancelTo="/exercises"
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Создать упражнение' }))

    expect(screen.getByText('Введите название упражнения')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
