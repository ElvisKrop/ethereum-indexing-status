"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AboutData } from "@/lib/types"
import { calculateETA, calculateRollingSpeed, IndexingData, REFETCH_INTERVAL, STALL_THRESHOLD } from "@/lib/indexing-metrics"

export interface ServiceSummaryMetric {
  synced: boolean
  blocksLeft: number
  speed: number
  eta: string
}

export interface ServiceSummary {
  // "error" only means the indexing endpoint has never returned data at all.
  // A transient failure after a prior success keeps status "ok" with `error` set,
  // so the row keeps showing its last-known-good data instead of going blank.
  status: "loading" | "ok" | "error"
  error: string | null
  aboutData: AboutData | null
  aboutError: string | null
  erc20: ServiceSummaryMetric | null
  masterCopies: ServiceSummaryMetric | null
  rpcSynced: boolean | null
  rpcError: string | null
  currentBlockNumber: number | null
  lastUpdated: Date | null
}

const messageOf = (reason: unknown): string => (reason instanceof Error ? reason.message : "Unknown error")

const fetchJson = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

// Lightweight per-service poller for the multi-service table: keeps only a short
// ring buffer (STALL_THRESHOLD samples) for speed calculation, unlike the full
// hour-long buffer + chart data kept by components/IndexingStatus.tsx for the
// single-service detail view.
//
// The three endpoints are fetched independently (Promise.allSettled, not
// Promise.all) so a 500/network failure on the secondary `about`/`ethereum-rpc`
// endpoints can never take down the whole row — only the primary `indexing`
// endpoint drives the row's overall status.
export function useServiceSummary(baseUrl: string): ServiceSummary {
  const [aboutData, setAboutData] = useState<AboutData | null>(null)
  const [aboutError, setAboutError] = useState<string | null>(null)
  const [erc20, setErc20] = useState<ServiceSummaryMetric | null>(null)
  const [masterCopies, setMasterCopies] = useState<ServiceSummaryMetric | null>(null)
  const [rpcSynced, setRpcSynced] = useState<boolean | null>(null)
  const [rpcError, setRpcError] = useState<string | null>(null)
  const [currentBlockNumber, setCurrentBlockNumber] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  const historyRef = useRef<IndexingData[]>([])
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFetchingRef = useRef(false)

  const fetchSummary = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    const [aboutResult, indexingResult, rpcResult] = await Promise.allSettled([
      fetchJson(`${baseUrl}/api/v1/about/`) as Promise<AboutData>,
      fetchJson(`${baseUrl}/api/v1/about/indexing`) as Promise<Omit<IndexingData, "timestamp">>,
      fetchJson(`${baseUrl}/api/v1/about/ethereum-rpc`),
    ])

    // About and RPC are secondary — a failure here is surfaced per-field but
    // never marks the whole row unreachable, and never clears prior data.
    if (aboutResult.status === "fulfilled") {
      setAboutData(aboutResult.value)
      setAboutError(null)
    } else {
      setAboutError(messageOf(aboutResult.reason))
    }

    if (rpcResult.status === "fulfilled") {
      setRpcSynced(!rpcResult.value.syncing)
      setRpcError(null)
    } else {
      setRpcError(messageOf(rpcResult.reason))
    }

    // Indexing is the primary signal this row exists to show.
    if (indexingResult.status === "fulfilled") {
      const dataWithTimestamp: IndexingData = { ...indexingResult.value, timestamp: Date.now() }
      historyRef.current = [dataWithTimestamp, ...historyRef.current].slice(0, STALL_THRESHOLD)

      const erc20Speed = calculateRollingSpeed(historyRef.current, true)
      const masterCopiesSpeed = calculateRollingSpeed(historyRef.current, false)
      const erc20BlocksLeft = dataWithTimestamp.currentBlockNumber - dataWithTimestamp.erc20BlockNumber
      const masterCopiesBlocksLeft = dataWithTimestamp.currentBlockNumber - dataWithTimestamp.masterCopiesBlockNumber

      setErc20({
        synced: dataWithTimestamp.erc20Synced,
        blocksLeft: erc20BlocksLeft,
        speed: erc20Speed,
        eta: calculateETA(erc20BlocksLeft, erc20Speed),
      })
      setMasterCopies({
        synced: dataWithTimestamp.masterCopiesSynced,
        blocksLeft: masterCopiesBlocksLeft,
        speed: masterCopiesSpeed,
        eta: calculateETA(masterCopiesBlocksLeft, masterCopiesSpeed),
      })
      setCurrentBlockNumber(dataWithTimestamp.currentBlockNumber)
      setLastUpdated(new Date())
      setError(null)
      setStatus("ok")
    } else {
      console.error(`Error fetching indexing data for ${baseUrl}:`, indexingResult.reason)
      setError(messageOf(indexingResult.reason))
      // Once we've had a successful fetch, a later transient failure keeps
      // showing the last-known-good data (status stays "ok") instead of
      // blanking the row — `error` being set is what flags it as stale.
      setStatus((prev) => (prev === "ok" ? "ok" : "error"))
    }

    isFetchingRef.current = false
  }, [baseUrl])

  useEffect(() => {
    historyRef.current = []
    setStatus("loading")

    const scheduleFetch = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchSummary().then(scheduleFetch)
      }, REFETCH_INTERVAL)
    }

    fetchSummary().then(scheduleFetch)

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [fetchSummary])

  return {
    status,
    error,
    aboutData,
    aboutError,
    erc20,
    masterCopies,
    rpcSynced,
    rpcError,
    currentBlockNumber,
    lastUpdated,
  }
}
