import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ExerciseDetailPage } from '../pages/ExerciseDetailPage'
import { ExercisesPage } from '../pages/ExercisesPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { SettingsPage } from '../pages/SettingsPage'
import { SongDetailPage } from '../pages/SongDetailPage'
import { SongsPage } from '../pages/SongsPage'
import { TagsPage } from '../pages/TagsPage'
import { AppLayout } from './AppLayout'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/exercises" replace />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="exercises/:id" element={<ExerciseDetailPage />} />
        <Route path="songs" element={<SongsPage />} />
        <Route path="songs/:id" element={<SongDetailPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
