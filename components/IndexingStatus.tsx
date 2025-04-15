"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle, InfoIcon, ChevronDown, ChevronUp, LineChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const STALL_THRESHOLD = 10
const REFETCH_INTERVAL = 10 * 1000 // 10 seconds in milliseconds
const ONE_HOUR = 60 * 60 * 1000 // 1 hour in milliseconds

interface IndexingData {
  currentBlockNumber: number
  erc20BlockNumber: number
  erc20Synced: boolean
  masterCopiesBlockNumber: number
  masterCopiesSynced: boolean
  synced: boolean
  timestamp: number
}

const calculateRollingSpeed = (data: IndexingData[], isERC20: boolean) => {
  if (data.length < 2) return 0

  const now = data[0].timestamp
  const oneHourAgo = now - ONE_HOUR

  // Find the oldest data point within the last hour
  const oldestIndex = data.findIndex((d) => d.timestamp < oneHourAgo)
  const oldestPoint = oldestIndex === -1 ? data[data.length - 1] : data[oldestIndex]

  const blockDiff = isERC20
    ? data[0].erc20BlockNumber - oldestPoint.erc20BlockNumber
    : data[0].masterCopiesBlockNumber - oldestPoint.masterCopiesBlockNumber

  const timeDiff = (data[0].timestamp - oldestPoint.timestamp) / 1000 / 60 // Convert to minutes
  return blockDiff / timeDiff
}

const calculateETA = (blocksLeft: number, speed: number): string => {
  if (speed <= 0) return "N/A"

  const minutes = blocksLeft / speed
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`
  } else if (minutes < 1440) {
    return `${Math.round(minutes / 60)} hours`
  } else {
    return `${Math.round(minutes / 1440)} days`
  }
}

interface IndexingStatusProps {
  baseUrl: string
  onDataUpdate: (data: any) => void
}

export default function IndexingStatus({ baseUrl, onDataUpdate }: IndexingStatusProps) {
  const [data, setData] = useState<IndexingData[]>([])
  const [latestData, setLatestData] = useState<IndexingData | null>(null)
  const [erc20Speed, setErc20Speed] = useState<number>(0)
  const [masterCopiesSpeed, setMasterCopiesSpeed] = useState<number>(0)
  const [erc20ETA, setErc20ETA] = useState<string>("N/A")
  const [masterCopiesETA, setMasterCopiesETA] = useState<string>("N/A")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [erc20BlockHistory, setErc20BlockHistory] = useState<number[]>([])
  const [masterCopiesBlockHistory, setMasterCopiesBlockHistory] = useState<number[]>([])
  const [showErc20Warning, setShowErc20Warning] = useState(false)
  const [showMasterCopiesWarning, setShowMasterCopiesWarning] = useState(false)
  const [showErc20Chart, setShowErc20Chart] = useState(false)
  const [showMasterCopiesChart, setShowMasterCopiesChart] = useState(false)
  const [countdown, setCountdown] = useState<number>(REFETCH_INTERVAL / 1000)

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFetchingRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log("Fetch already in progress, skipping...")
      return
    }

    isFetchingRef.current = true
    console.log(`Fetching data at ${new Date().toISOString()}. Interval: ${REFETCH_INTERVAL / 1000} seconds`)

    try {
      const response = await fetch(`${baseUrl}/api/v1/about/indexing`)
      const newData: IndexingData = await response.json()
      const dataWithTimestamp = { ...newData, timestamp: Date.now() }

      setErc20BlockHistory((prev) => {
        const newHistory = [dataWithTimestamp.erc20BlockNumber, ...prev].slice(0, STALL_THRESHOLD)
        const isStalled = newHistory.length === STALL_THRESHOLD && newHistory.every((val) => val === newHistory[0])
        setShowErc20Warning(isStalled)
        return newHistory
      })

      setMasterCopiesBlockHistory((prev) => {
        const newHistory = [dataWithTimestamp.masterCopiesBlockNumber, ...prev].slice(0, STALL_THRESHOLD)
        const isStalled = newHistory.length === STALL_THRESHOLD && newHistory.every((val) => val === newHistory[0])
        setShowMasterCopiesWarning(isStalled)
        return newHistory
      })

      setData((prevData) => {
        const now = Date.now()
        const updatedData = [dataWithTimestamp, ...prevData].filter((d) => now - d.timestamp <= ONE_HOUR)

        if (updatedData.length >= 2) {
          const newErc20Speed = calculateRollingSpeed(updatedData, true)
          const newMasterCopiesSpeed = calculateRollingSpeed(updatedData, false)
          setErc20Speed(newErc20Speed)
          setMasterCopiesSpeed(newMasterCopiesSpeed)

          const erc20BlocksLeft = dataWithTimestamp.currentBlockNumber - dataWithTimestamp.erc20BlockNumber
          const masterCopiesBlocksLeft =
            dataWithTimestamp.currentBlockNumber - dataWithTimestamp.masterCopiesBlockNumber

          const newErc20ETA = calculateETA(erc20BlocksLeft, newErc20Speed)
          const newMasterCopiesETA = calculateETA(masterCopiesBlocksLeft, newMasterCopiesSpeed)
          setErc20ETA(newErc20ETA)
          setMasterCopiesETA(newMasterCopiesETA)

          onDataUpdate({
            erc20: {
              blocksLeft: erc20BlocksLeft,
              speed: newErc20Speed,
              indexedBlocks: dataWithTimestamp.erc20BlockNumber,
              eta: newErc20ETA,
              synced: dataWithTimestamp.erc20Synced,
            },
            masterCopies: {
              blocksLeft: masterCopiesBlocksLeft,
              speed: newMasterCopiesSpeed,
              indexedBlocks: dataWithTimestamp.masterCopiesBlockNumber,
              eta: newMasterCopiesETA,
              synced: dataWithTimestamp.masterCopiesSynced,
            },
            latestBlock: dataWithTimestamp.currentBlockNumber,
          })
        }

        return updatedData
      })
      setLatestData(dataWithTimestamp)
      setLastUpdated(new Date())
      setCountdown(REFETCH_INTERVAL / 1000)
    } catch (error) {
      console.error("Error fetching indexing data:", error)
    } finally {
      isFetchingRef.current = false
    }
  }, [baseUrl])

  useEffect(() => {
    const scheduleFetch = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchData().then(() => {
          scheduleFetch()
        })
      }, REFETCH_INTERVAL)
    }

    fetchData().then(() => {
      scheduleFetch()
    })

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [fetchData])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prevCountdown) => (prevCountdown > 0 ? prevCountdown - 1 : REFETCH_INTERVAL / 1000))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  // Calculate speeds for graph using rolling window
  const calculateGraphSpeeds = (data: IndexingData[]) => {
    const speeds = []
    for (let i = 0; i < data.length; i++) {
      const windowData = data.slice(i)
      speeds.push({
        erc20: calculateRollingSpeed(windowData, true),
        masterCopies: calculateRollingSpeed(windowData, false),
        timestamp: data[i].timestamp,
      })
    }
    return speeds
  }

  const graphSpeeds = calculateGraphSpeeds([...data].reverse())

  const createChartData = (isERC20: boolean) => {
    const limitedData = graphSpeeds.slice(0, 30) // Limit to 30 points (5 minutes of data)
    return {
      labels: limitedData.map((entry) => formatTime(entry.timestamp)),
      datasets: [
        {
          label: isERC20 ? "ERC20 Indexing Speed" : "Master Copies Indexing Speed",
          data: limitedData.map((entry) => (isERC20 ? entry.erc20 : entry.masterCopies)),
          borderColor: isERC20 ? "rgb(0, 255, 255)" : "rgb(255, 0, 255)",
          backgroundColor: isERC20 ? "rgba(0, 255, 255, 0.1)" : "rgba(255, 0, 255, 0.1)",
          borderWidth: 2,
          pointBackgroundColor: isERC20 ? "rgb(0, 255, 255)" : "rgb(255, 0, 255)",
          pointBorderColor: isERC20 ? "rgb(0, 255, 255)" : "rgb(255, 0, 255)",
          pointHoverBackgroundColor: "rgb(255, 255, 255)",
          pointHoverBorderColor: isERC20 ? "rgb(0, 255, 255)" : "rgb(255, 0, 255)",
          tension: 0.3,
          fill: true,
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "rgb(200, 200, 200)",
        bodyColor: "rgb(200, 200, 200)",
        borderColor: "rgba(200, 200, 200, 0.2)",
        borderWidth: 1,
        padding: 12,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(200, 200, 200, 0.1)",
          drawBorder: false,
        },
        ticks: {
          color: "rgb(200, 200, 200)",
          font: {
            size: 12,
          },
          padding: 8,
          callback: (value: number) => `${value.toLocaleString()}`,
        },
        border: {
          display: false,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "rgb(200, 200, 200)",
          font: {
            size: 12,
          },
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 8,
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
    elements: {
      point: {
        radius: 2,
        hoverRadius: 6,
      },
      line: {
        borderWidth: 2,
      },
    },
    layout: {
      padding: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
    },
  }

  const toggleErc20Chart = () => setShowErc20Chart((prev) => !prev)
  const toggleMasterCopiesChart = () => setShowMasterCopiesChart((prev) => !prev)

  const TimestampDisplay = ({
    lastUpdated,
    countdown,
    className,
  }: { lastUpdated: Date; countdown: number; className?: string }) => (
    <div className={cn("text-xs sm:text-sm flex items-center gap-2 flex-wrap", className)}>
      <div className="flex items-center">
        <Clock className="w-4 h-4 mr-1.5 animate-pulse" />
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
      </div>
      <span className="opacity-70">(Next update in {countdown}s)</span>
    </div>
  )

  if (!latestData) {
    return <div className="text-center text-blue-300 animate-pulse">Loading...</div>
  }

  const erc20Progress = (latestData.erc20BlockNumber / latestData.currentBlockNumber) * 100
  const masterCopiesProgress = (latestData.masterCopiesBlockNumber / latestData.currentBlockNumber) * 100

  const SyncedMessage = ({ type }: { type: "ERC20" | "Master Copies" }) => (
    <div className="flex items-center justify-center space-x-2 text-lg font-medium">
      <CheckCircle className="w-6 h-6 text-green-500" />
      <span className="text-green-400">{type} tokens are fully synchronized with the latest block.</span>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3 sm:p-4 flex items-start space-x-3">
        <InfoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-blue-200">
          Data is stored for the last hour only. Speeds and ETAs are calculated based on this time frame.
        </p>
      </div>
      <Card className="bg-gray-900/50 border border-cyan-500/50 shadow-lg shadow-cyan-500/20">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 sm:pb-2">
          <CardTitle className="text-lg sm:text-xl text-cyan-300">ERC20 Synchronization</CardTitle>
          {lastUpdated && (
            <TimestampDisplay
              lastUpdated={lastUpdated}
              countdown={countdown}
              className="bg-cyan-500/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-cyan-400/90"
            />
          )}
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {latestData.erc20Synced ? (
            <SyncedMessage type="ERC20" />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <Button
                  onClick={toggleErc20Chart}
                  variant="outline"
                  size="sm"
                  className="text-cyan-400 hover:text-cyan-300 hover:border-cyan-500 ml-auto flex items-center gap-2"
                >
                  <LineChart className="h-4 w-4" />
                  {showErc20Chart ? (
                    <>
                      Hide Speed Chart
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show Speed Chart
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              {!showErc20Chart && (
                <p className="text-sm text-cyan-400/60 text-center mt-2">
                  Click the button above to view the historical indexing speed chart
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-900/20 rounded-lg border border-gray-800/50">
                <div className="text-center group">
                  <div className="text-base sm:text-lg font-medium text-cyan-400/80 group-hover:text-cyan-400 transition-colors">
                    Blocks Left
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-cyan-300 tabular-nums">
                    {(latestData.currentBlockNumber - latestData.erc20BlockNumber).toLocaleString()}
                  </div>
                </div>
                <div className="text-center group">
                  <div className="text-base sm:text-lg font-medium text-cyan-400/80 group-hover:text-cyan-400 transition-colors">
                    Current Speed
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-cyan-300 tabular-nums">
                    {erc20Speed.toFixed(2)}
                    <div className="text-sm text-cyan-400/80">blocks/minute</div>
                  </div>
                </div>
                <div className="text-center group">
                  <div className="text-base sm:text-lg font-medium text-cyan-400/80 group-hover:text-cyan-400 transition-colors">
                    Indexed Blocks
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-cyan-300 tabular-nums">
                    {latestData.erc20BlockNumber.toLocaleString()}
                  </div>
                </div>
                <div className="text-center group">
                  <div className="text-base sm:text-lg font-medium text-cyan-400/80 group-hover:text-cyan-400 transition-colors">
                    Latest Block
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-cyan-300 tabular-nums">
                    {latestData.currentBlockNumber.toLocaleString()}
                  </div>
                </div>
                <div className="text-center group">
                  <div className="text-base sm:text-lg font-medium text-cyan-400/80 group-hover:text-cyan-400 transition-colors">
                    ETA
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-cyan-300 tabular-nums">{erc20ETA}</div>
                </div>
              </div>
              <Progress
                value={erc20Progress}
                className="h-2 bg-cyan-950/50"
                indicatorClassName="bg-gradient-to-r from-cyan-500 to-cyan-400 animate-pulse"
              />
              {showErc20Warning && (
                <div className="bg-amber-900/50 border border-amber-500/50 text-amber-200 px-4 py-2 rounded-md flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    Warning: ERC20 indexing appears to be stalled. No progress detected in the last {STALL_THRESHOLD}{" "}
                    checks.
                  </span>
                </div>
              )}
              {showErc20Chart && (
                <div className="h-[250px] bg-gray-900/20 rounded-lg border border-gray-800/50 p-4 animate-in fade-in duration-500">
                  <Line data={createChartData(true)} options={chartOptions} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <Card className="bg-gray-900/50 border border-fuchsia-500/50 shadow-lg shadow-fuchsia-500/20">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-4 sm:pb-2">
          <CardTitle className="text-lg sm:text-xl text-fuchsia-300">Master Copies Synchronization</CardTitle>
          {lastUpdated && (
            <TimestampDisplay
              lastUpdated={lastUpdated}
              countdown={countdown}
              className="bg-fuchsia-500/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-fuchsia-400/90"
            />
          )}
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {latestData.masterCopiesSynced ? (
            <SyncedMessage type="Master Copies" />
          ) : (
            <>
              <div className="flex justify-between items-center">
                <Button
                  onClick={toggleMasterCopiesChart}
                  variant="outline"
                  size="sm"
                  className="text-fuchsia-400 hover:text-fuchsia-300 hover:border-fuchsia-500 ml-auto flex items-center gap-2"
                >
                  <LineChart className="h-4 w-4" />
                  {showMasterCopiesChart ? (
                    <>
                      Hide Speed Chart
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show Speed Chart
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              {!showMasterCopiesChart && (
                <p className="text-sm text-fuchsia-400/60 text-center mt-2">
                  Click the button above to view the historical indexing speed chart
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-900/20 rounded-lg border border-gray-800/50">
                <div className="text-center group">
                  <div className="text-base sm:text-lg font-medium text-fuchsia-400/80 group-hover:text-fuchsia-400 transition-colors">
                    Blocks Left
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-fuchsia-300 tabular-nums">
                    {(latestData.currentBlockNumber - latestData.masterCopiesBlockNumber).toLocaleString()}
                  </div>
                </div>
                <div className="text-center group">
                  <div className="text-base sm:text-lg font-medium text-fuchsia-400/80 group-hover:text-fuchsia-400 transition-colors">
                    Current Speed
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-fuchsia-300 tabular-nums">
                    {masterCopiesSpeed.toFixed(2)}
                    <div className="text-sm text-fuchsia-400/80">blocks/minute</div>
                  </div>
                </div>
                <div className="text-center group">
                  <div className="text-base sm:text-lg font-medium text-fuchsia-400/80 group-hover:text-fuchsia-400 transition-colors">
                    Indexed Blocks
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-fuchsia-300 tabular-nums">
                    {latestData.masterCopiesBlockNumber.toLocaleString()}
                  </div>
                </div>
                <div className="text-center group">
                  <div className="text-base sm:text-lg font-medium text-fuchsia-400/80 group-hover:text-fuchsia-400 transition-colors">
                    Latest Block
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-fuchsia-300 tabular-nums">
                    {latestData.currentBlockNumber.toLocaleString()}
                  </div>
                </div>
                <div className="text-center group">
                  <div className="text-base sm:text-lg font-medium text-fuchsia-400/80 group-hover:text-fuchsia-400 transition-colors">
                    ETA
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-fuchsia-300 tabular-nums">{masterCopiesETA}</div>
                </div>
              </div>
              <Progress
                value={masterCopiesProgress}
                className="h-2 bg-fuchsia-950/50"
                indicatorClassName="bg-gradient-to-r from-fuchsia-500 to-fuchsia-400 animate-pulse"
              />
              {showMasterCopiesWarning && (
                <div className="bg-amber-900/50 border border-amber-500/50 text-amber-200 px-4 py-2 rounded-md flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    Warning: Master Copies indexing appears to be stalled. No progress detected in the last{" "}
                    {STALL_THRESHOLD} checks.
                  </span>
                </div>
              )}
              {showMasterCopiesChart && (
                <div className="h-[250px] bg-gray-900/20 rounded-lg border border-gray-800/50 p-4 animate-in fade-in duration-500">
                  <Line data={createChartData(false)} options={chartOptions} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

