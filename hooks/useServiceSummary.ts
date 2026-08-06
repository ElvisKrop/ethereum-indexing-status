"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AboutData, RpcData } from "@/lib/types"
import { calculateETA, calculateRollingSpeed, IndexingData, REFETCH_INTERVAL, STALL_THRESHOLD } from "@/lib/indexing-metrics"
import {
  CachedServiceStatus,
  createEmptyServiceStatus,
  loadCachedServiceStatus,
  saveCachedServiceStatus,
  ServiceSummaryMetric,
} from "@/lib/service-status-cache"

export type { ServiceSummaryMetric } from "@/lib/service-status-cache"

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
  chainId: number | null
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
//
// Every successful field is cached to localStorage (keyed by baseUrl) so a
// remounted row — e.g. navigating to /service and back — shows the last-known
// data with its real timestamp immediately, instead of a blank "Loading..."
// while it revalidates in the background. Callers must key their component by
// `url` (as components/ServicesTable.tsx does) so baseUrl never changes across
// the lifetime of one hook instance — this hook assumes it doesn't.
export function useServiceSummary(baseUrl: string): ServiceSummary {
  // Deliberately NOT seeded from the cache here: localStorage doesn't exist
  // during SSR, so a lazy useState(() => loadCachedServiceStatus(...)) would
  // render "no data" on the server and then find real cached data on the
  // client's first render — a hydration mismatch. Cache hydration happens in
  // the effect below instead, which only ever runs client-side post-mount.
  const [aboutData, setAboutData] = useState<AboutData | null>(null)
  const [aboutError, setAboutError] = useState<string | null>(null)
  const [erc20, setErc20] = useState<ServiceSummaryMetric | null>(null)
  const [masterCopies, setMasterCopies] = useState<ServiceSummaryMetric | null>(null)
  const [rpcSynced, setRpcSynced] = useState<boolean | null>(null)
  const [rpcError, setRpcError] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [currentBlockNumber, setCurrentBlockNumber] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  const historyRef = useRef<IndexingData[]>([])
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFetchingRef = useRef(false)
  const snapshotRef = useRef<CachedServiceStatus>(createEmptyServiceStatus())

  // Runs before the fetch-scheduling effect below (React runs effects in
  // declaration order), so cached data is in place before the first live
  // fetch's result arrives.
  useEffect(() => {
    const cached = loadCachedServiceStatus(baseUrl)
    if (!cached) return

    snapshotRef.current = cached
    if (cached.aboutData) setAboutData(cached.aboutData)
    if (cached.rpcSynced !== null) setRpcSynced(cached.rpcSynced)
    if (cached.chainId !== null) setChainId(cached.chainId)
    if (cached.erc20) setErc20(cached.erc20)
    if (cached.masterCopies) setMasterCopies(cached.masterCopies)
    if (cached.currentBlockNumber !== null) setCurrentBlockNumber(cached.currentBlockNumber)
    if (cached.lastUpdated) {
      setLastUpdated(new Date(cached.lastUpdated))
      setStatus("ok")
    }
  }, [baseUrl])

  const fetchSummary = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    const [aboutResult, indexingResult, rpcResult] = await Promise.allSettled([
      fetchJson(`${baseUrl}/api/v1/about/`) as Promise<AboutData>,
      fetchJson(`${baseUrl}/api/v1/about/indexing`) as Promise<Omit<IndexingData, "timestamp">>,
      fetchJson(`${baseUrl}/api/v1/about/ethereum-rpc`) as Promise<RpcData>,
    ])

    // About and RPC are secondary — a failure here is surfaced per-field but
    // never marks the whole row unreachable, and never clears prior data.
    if (aboutResult.status === "fulfilled") {
      setAboutData(aboutResult.value)
      setAboutError(null)
      snapshotRef.current = { ...snapshotRef.current, aboutData: aboutResult.value }
    } else {
      setAboutError(messageOf(aboutResult.reason))
    }

    if (rpcResult.status === "fulfilled") {
      const synced = !rpcResult.value.syncing
      setRpcSynced(synced)
      setRpcError(null)
      setChainId(rpcResult.value.chain_id)
      snapshotRef.current = { ...snapshotRef.current, rpcSynced: synced, chainId: rpcResult.value.chain_id }
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

      const nextErc20 = {
        synced: dataWithTimestamp.erc20Synced,
        blocksLeft: erc20BlocksLeft,
        speed: erc20Speed,
        eta: calculateETA(erc20BlocksLeft, erc20Speed),
      }
      const nextMasterCopies = {
        synced: dataWithTimestamp.masterCopiesSynced,
        blocksLeft: masterCopiesBlocksLeft,
        speed: masterCopiesSpeed,
        eta: calculateETA(masterCopiesBlocksLeft, masterCopiesSpeed),
      }
      const now = new Date()

      setErc20(nextErc20)
      setMasterCopies(nextMasterCopies)
      setCurrentBlockNumber(dataWithTimestamp.currentBlockNumber)
      setLastUpdated(now)
      setError(null)
      setStatus("ok")

      snapshotRef.current = {
        ...snapshotRef.current,
        erc20: nextErc20,
        masterCopies: nextMasterCopies,
        currentBlockNumber: dataWithTimestamp.currentBlockNumber,
        lastUpdated: now.toISOString(),
      }
    } else {
      console.error(`Error fetching indexing data for ${baseUrl}:`, indexingResult.reason)
      setError(messageOf(indexingResult.reason))
      // Once we've had a successful fetch, a later transient failure keeps
      // showing the last-known-good data (status stays "ok") instead of
      // blanking the row — `error` being set is what flags it as stale.
      setStatus((prev) => (prev === "ok" ? "ok" : "error"))
    }

    saveCachedServiceStatus(baseUrl, snapshotRef.current)
    isFetchingRef.current = false
  }, [baseUrl])

  useEffect(() => {
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
    chainId,
    currentBlockNumber,
    lastUpdated,
  }
}
