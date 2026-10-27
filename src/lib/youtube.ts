const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
])

export function getYouTubeVideoId(value: string): string | null {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  let candidate: string | null = null
  if (url.hostname === 'youtu.be') {
    candidate = url.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    const pathParts = url.pathname.split('/').filter(Boolean)
    if (url.pathname === '/watch') candidate = url.searchParams.get('v')
    if (pathParts[0] === 'embed' || pathParts[0] === 'shorts') {
      candidate = pathParts[1] ?? null
    }
  }

  return candidate && VIDEO_ID_PATTERN.test(candidate) ? candidate : null
}

export function getYouTubeEmbedUrl(value: string): string | null {
  const videoId = getYouTubeVideoId(value)
  return videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : null
}

export function getCanonicalYouTubeUrl(value: string): string | null {
  const videoId = getYouTubeVideoId(value)
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null
}
