const STORAGE_KEY = "ethereum-indexing-status:tracked-services"

// Persists the dashboard's tracked-service list across sessions. The `?url=`
// query string remains the single source of truth for what's rendered on any
// given page load (so sharing/bookmarking still works) — this just lets `/`
// bootstrap that query string from a prior session when it's empty.
export function loadTrackedServices(): string[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string") : []
  } catch {
    return []
  }
}

export function saveTrackedServices(urls: string[]): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(urls))
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded) — non-fatal.
  }
}
