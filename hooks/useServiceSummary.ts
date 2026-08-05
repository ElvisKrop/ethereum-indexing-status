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
  status: "loading" | "ok" | "error"
  error: string | null
  aboutData: AboutData | null
  erc20: ServiceSummaryMetric | null
  masterCopies: ServiceSummaryMetric | null
  rpcSynced: boolean | null
  currentBlockNumber: number | null
  lastUpdated: Date | null
}

// Lightweight per-service poller for the multi-service table: keeps only a short
// ring buffer (STALL_THRESHOLD samples) for speed calculation, unlike the full
// hour-long buffer + chart data kept by components/IndexingStatus.tsx for the
// single-service detail view.
export function useServiceSummary(baseUrl: string): ServiceSummary {
  const [aboutData, setAboutData] = useState<AboutData | null>(null)
  const [erc20, setErc20] = useState<ServiceSummaryMetric | null>(null)
  const [masterCopies, setMasterCopies] = useState<ServiceSummaryMetric | null>(null)
  const [rpcSynced, setRpcSynced] = useState<boolean | null>(null)
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

    try {
      const [aboutResponse, indexingResponse, rpcResponse] = await Promise.all([
        fetch(`${baseUrl}/api/v1/about/`),
        fetch(`${baseUrl}/api/v1/about/indexing`),
        fetch(`${baseUrl}/api/v1/about/ethereum-rpc`),
      ])

      if (!indexingResponse.ok) {
        throw new Error(`HTTP error! status: ${indexingResponse.status}`)
      }

      const indexingData: Omit<IndexingData, "timestamp"> = await indexingResponse.json()
      const dataWithTimestamp: IndexingData = { ...indexingData, timestamp: Date.now() }

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

      if (aboutResponse.ok) {
        setAboutData(await aboutResponse.json())
      }

      if (rpcResponse.ok) {
        const rpcData = await rpcResponse.json()
        setRpcSynced(!rpcData.syncing)
      } else {
        setRpcSynced(null)
      }

      setLastUpdated(new Date())
      setStatus("ok")
      setError(null)
    } catch (err) {
      console.error(`Error fetching summary for ${baseUrl}:`, err)
      setStatus("error")
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      isFetchingRef.current = false
    }
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

  return { status, error, aboutData, erc20, masterCopies, rpcSynced, currentBlockNumber, lastUpdated }
}
