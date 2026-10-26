import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'

export function SettingsPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Настройки"
        description="Параметры приложения и управление данными."
      />

      <SectionCard
        title="Резервное копирование"
        description="Экспорт резервной копии и восстановление данных будут доступны в одной из следующих задач. Сейчас данные не сохраняются и облачные сервисы не подключены."
      />
    </div>
  )
}
