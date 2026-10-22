import { useEffect } from 'react'

// Long enough to greet the visitor even when the campus loads instantly from cache.
const MIN_VISIBLE_MS = 1400
const FADE_MS = 450

/** Fades out the splash written in index.html once the 3D campus is on screen. */
export function useSplashExit(ready: boolean) {
  useEffect(() => {
    const splash = document.getElementById('splash')
    if (!ready || !splash) return
    let removal = 0
    // performance.now() counts from the page request, the moment the splash first appeared.
    const exit = setTimeout(() => {
      splash.classList.add('leaving')
      splash.querySelector('.visually-hidden')!.textContent = 'Campus listo'
      removal = window.setTimeout(() => splash.remove(), FADE_MS)
    }, Math.max(0, MIN_VISIBLE_MS - performance.now()))
    return () => {
      clearTimeout(exit)
      clearTimeout(removal)
    }
  }, [ready])
}
