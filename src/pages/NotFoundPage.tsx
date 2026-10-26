import { ResourceNotFound } from '../components/ui/ResourceNotFound'

export function NotFoundPage() {
  return (
    <ResourceNotFound
      title="Страница не найдена"
      description="Проверьте адрес или вернитесь к списку упражнений."
      backTo="/exercises"
      backLabel="К упражнениям"
    />
  )
}
