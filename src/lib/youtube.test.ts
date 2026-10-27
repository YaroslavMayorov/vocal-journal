import { describe, expect, it } from 'vitest'
import {
  getCanonicalYouTubeUrl,
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
} from './youtube'

describe('YouTube URL helpers', () => {
  it.each([
    'https://www.youtube.com/watch?v=L3wKzyIN1yk',
    'https://youtu.be/L3wKzyIN1yk?t=15',
    'https://youtube.com/embed/L3wKzyIN1yk',
    'https://m.youtube.com/shorts/L3wKzyIN1yk',
  ])('извлекает id из поддерживаемого адреса %s', (url) => {
    expect(getYouTubeVideoId(url)).toBe('L3wKzyIN1yk')
  })

  it.each([
    'javascript:alert(1)',
    'https://example.com/watch?v=L3wKzyIN1yk',
    'https://youtube.com.evil.test/watch?v=L3wKzyIN1yk',
    'https://youtube.com/watch?v=short',
    'не ссылка',
  ])('отклоняет небезопасный или некорректный адрес %s', (url) => {
    expect(getYouTubeVideoId(url)).toBeNull()
  })

  it('строит каноническую ссылку и privacy-enhanced embed', () => {
    const url = 'https://youtu.be/L3wKzyIN1yk'
    expect(getCanonicalYouTubeUrl(url)).toBe(
      'https://www.youtube.com/watch?v=L3wKzyIN1yk',
    )
    expect(getYouTubeEmbedUrl(url)).toBe(
      'https://www.youtube-nocookie.com/embed/L3wKzyIN1yk',
    )
  })
})
