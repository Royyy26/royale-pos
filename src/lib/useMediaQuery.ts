import { useEffect, useState } from 'react'

/**
 * Membaca media query secara reaktif. Dipakai agar logika tata letak sidebar
 * memakai sumber kebenaran yang sama dengan CSS-nya — bukan menebak lewat
 * kelas responsif yang bisa saling bertentangan.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Ambang sidebar menetap. Di bawah ini sidebar tampil sebagai panel melayang. */
export const SIDEBAR_QUERY = '(min-width: 768px)'

export function useIsDesktopSidebar(): boolean {
  return useMediaQuery(SIDEBAR_QUERY)
}
