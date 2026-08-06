"use client"

import { useEffect, useState } from "react"
import { loadChainlist } from "@/lib/chainlist"

// Kicks off the shared chainlist fetch on mount and returns the resolved
// chainId -> name map once ready (null until then). Safe to call from many
// components at once — loadChainlist() memoizes the underlying fetch.
export function useChainlist(): Map<number, string> | null {
  const [chainNames, setChainNames] = useState<Map<number, string> | null>(null)

  useEffect(() => {
    let cancelled = false
    loadChainlist().then((names) => {
      if (!cancelled) setChainNames(names)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return chainNames
}
