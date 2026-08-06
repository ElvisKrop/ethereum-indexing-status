import { AboutData } from "@/lib/types"

const STORAGE_KEY = "ethereum-indexing-status:service-status-cache"

export interface ServiceSummaryMetric {
  synced: boolean
  blocksLeft: number
  speed: number
  eta: string
}

export interface CachedServiceStatus {
  aboutData: AboutData | null
  erc20: ServiceSummaryMetric | null
  masterCopies: ServiceSummaryMetric | null
  rpcSynced: boolean | null
  currentBlockNumber: number | null
  lastUpdated: string | null // ISO timestamp — Date doesn't survive JSON round-trips
}

type Cache = Record<string, CachedServiceStatus>

function readCache(): Cache {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function createEmptyServiceStatus(): CachedServiceStatus {
  return {
    aboutData: null,
    erc20: null,
    masterCopies: null,
    rpcSynced: null,
    currentBlockNumber: null,
    lastUpdated: null,
  }
}

// Last-known status per tracked service, so a table row (or the detail page)
// can show real data with its timestamp immediately on mount instead of a
// blank "Loading..." state, while a fresh poll updates it in the background.
// Shared by both components/ServiceRow.tsx (via hooks/useServiceSummary.ts)
// and the /service detail page (via components/IndexingStatus.tsx) so
// whichever view last polled a service is what the other one sees.
export function loadCachedServiceStatus(url: string): CachedServiceStatus | null {
  return readCache()[url] ?? null
}

export function saveCachedServiceStatus(url: string, status: CachedServiceStatus): void {
  if (typeof window === "undefined") return

  try {
    const cache = readCache()
    cache[url] = status
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded) — non-fatal.
  }
}

// Updates only the given fields, preserving whatever the other view already
// knows (e.g. IndexingStatus.tsx has no `aboutData` of its own to report —
// merging avoids clobbering it back to null).
export function mergeCachedServiceStatus(url: string, partial: Partial<CachedServiceStatus>): void {
  const existing = loadCachedServiceStatus(url) ?? createEmptyServiceStatus()
  saveCachedServiceStatus(url, { ...existing, ...partial })
}

export function removeCachedServiceStatus(url: string): void {
  if (typeof window === "undefined") return

  try {
    const cache = readCache()
    if (url in cache) {
      delete cache[url]
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
    }
  } catch {
    // non-fatal
  }
}
