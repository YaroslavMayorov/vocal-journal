import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ExerciseDetailPage } from '../pages/ExerciseDetailPage'
import { ExerciseCreatePage } from '../pages/ExerciseCreatePage'
import { ExerciseEditPage } from '../pages/ExerciseEditPage'
import { ExercisesPage } from '../pages/ExercisesPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { SettingsPage } from '../pages/SettingsPage'
import { SongCreatePage } from '../pages/SongCreatePage'
import { SongDetailPage } from '../pages/SongDetailPage'
import { SongEditPage } from '../pages/SongEditPage'
import { SongsPage } from '../pages/SongsPage'
import { TagsPage } from '../pages/TagsPage'
import { AppLayout } from './AppLayout'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/exercises" replace />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="exercises/new" element={<ExerciseCreatePage />} />
        <Route path="exercises/:id/edit" element={<ExerciseEditPage />} />
        <Route path="exercises/:id" element={<ExerciseDetailPage />} />
        <Route path="songs" element={<SongsPage />} />
        <Route path="songs/new" element={<SongCreatePage />} />
        <Route path="songs/:id/edit" element={<SongEditPage />} />
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
