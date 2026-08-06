const CHAINLIST_URL = "https://chainlist.org/rpcs.json"

// Module-level cache so the ~2MB payload is fetched at most once per page
// load, no matter how many ServiceRow instances call loadChainlist() —
// they all share this single in-flight/resolved promise.
let chainlistPromise: Promise<Map<number, string>> | null = null

export function loadChainlist(): Promise<Map<number, string>> {
  if (!chainlistPromise) {
    chainlistPromise = fetch(CHAINLIST_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((entries: unknown) => {
        const names = new Map<number, string>()
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            if (entry && typeof entry.chainId === "number" && typeof entry.name === "string") {
              names.set(entry.chainId, entry.name)
            }
          }
        }
        return names
      })
      .catch((error) => {
        console.error("Error fetching chainlist:", error)
        chainlistPromise = null // allow a retry on the next call
        return new Map<number, string>()
      })
  }
  return chainlistPromise
}
