"use client"

import { useState, useEffect } from "react"

interface IndexingData {
  currentBlockNumber: number
  erc20BlockNumber: number
  masterCopiesBlockNumber: number
  erc20ChartData: { time: string; speed: number }[]
  masterCopiesChartData: { time: string; speed: number }[]
}

export function useIndexingStatus(
  baseUrl: string,
  onDataUpdate: () => void,
): {
  latestData: IndexingData | null
  erc20Speed: number
  erc20ETA: string
  masterCopiesSpeed: number
  masterCopiesETA: string
  error: string | null
} {
  const [latestData, setLatestData] = useState<IndexingData | null>(null)
  const [erc20Speed, setErc20Speed] = useState(0)
  const [erc20ETA, setErc20ETA] = useState("")
  const [masterCopiesSpeed, setMasterCopiesSpeed] = useState(0)
  const [masterCopiesETA, setMasterCopiesETA] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/v1/about/indexing`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data: IndexingData = await response.json()
        setLatestData(data)
        setErc20Speed(calculateSpeed(data.erc20ChartData))
        setMasterCopiesSpeed(calculateSpeed(data.masterCopiesChartData))
        setErc20ETA(calculateETA(data.currentBlockNumber, data.erc20BlockNumber, erc20Speed))
        setMasterCopiesETA(calculateETA(data.currentBlockNumber, data.masterCopiesBlockNumber, masterCopiesSpeed))
        setError(null)
        onDataUpdate()
      } catch (error) {
        console.error("Error fetching data:", error)
        setError(`Failed to fetch data: ${error instanceof Error ? error.message : "Unknown error"}`)
        setLatestData(null)
      }
    }

    const intervalId = setInterval(fetchData, 10000) // Fetch data every 10 seconds

    fetchData() // Initial fetch

    return () => clearInterval(intervalId)
  }, [baseUrl, onDataUpdate, erc20Speed, masterCopiesSpeed])

  const calculateSpeed = (data: { time: string; speed: number }[]): number => {
    if (!data || data.length === 0) return 0
    return data[data.length - 1].speed
  }

  const calculateETA = (currentBlock: number, syncedBlock: number, speed: number): string => {
    if (speed <= 0) return "N/A"
    const blocksLeft = currentBlock - syncedBlock
    const minutes = blocksLeft / speed
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`
    } else if (minutes < 1440) {
      return `${Math.round(minutes / 60)} hours`
    } else {
      return `${Math.round(minutes / 1440)} days`
    }
  }

  return { latestData, erc20Speed, erc20ETA, masterCopiesSpeed, masterCopiesETA, error }
}

