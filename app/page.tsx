"use client"

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import IndexingStatus from "../components/IndexingStatus"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Database, InfoIcon, LineChart, RefreshCw, Server, Share2, XCircle } from "lucide-react"
import { SidebarWrapper } from "@/components/app-sidebar"
import { MobileSidebarTrigger } from "@/components/mobile-sidebar-trigger"

export interface AboutData {
  name: string;
  version: string;
  api_version: string;
  secure: boolean;
  host: string;
  headers: string[];
  settings: Settings;
}

export interface Settings {
  AWS_CONFIGURED: boolean;
  AWS_S3_PUBLIC_URL: string;
  ETHEREUM_NODE_URL: string;
  ETHEREUM_TRACING_NODE_URL: null;
  ETH_EVENTS_BLOCK_PROCESS_LIMIT: number;
  ETH_EVENTS_BLOCK_PROCESS_LIMIT_MAX: number;
  ETH_EVENTS_QUERY_CHUNK_SIZE: number;
  ETH_EVENTS_UPDATED_BLOCK_BEHIND: number;
  ETH_INTERNAL_NO_FILTER: boolean;
  ETH_INTERNAL_TRACE_TXS_BATCH_SIZE: number;
  ETH_INTERNAL_TXS_BLOCK_PROCESS_LIMIT: number;
  ETH_L2_NETWORK: boolean;
  ETH_REORG_BLOCKS: number;
  NOTIFICATIONS_FIREBASE_CREDENTIALS_PATH: null;
  SSO_ENABLED: boolean;
  TOKENS_LOGO_BASE_URI: string;
  TOKENS_LOGO_EXTENSION: string;
}

export interface CurrentData {
  erc20: {
    blocksLeft: number,
    speed: number,
    indexedBlocks: number,
    eta: string,
    synced: boolean,
  },
  masterCopies: {
    blocksLeft: number,
    speed: number,
    indexedBlocks: number,
    eta: string,
    synced: boolean,
  },
  latestBlock: number,
}

// Function to remove trailing slashes from a URL
const sanitizeUrl = (url: string): string => {
  return url.replace(/\/+$/, "")
}

// Function to validate URL
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Function to mask API keys in URLs
const maskApiKey = (url: string): string => {
  if (!url) return "N/A"

  // Handle standard api_key or apikey parameters
  let maskedUrl = url.replace(/([?&]api[_-]?key=)([^&]+)/gi, "$1********")

  // Handle dRPC specific dkey parameter
  maskedUrl = maskedUrl.replace(/([?&]dkey=)([^&]+)/gi, "$1********")

  // Handle URLs with keys embedded in the path (like Infura or Alchemy)
  const patterns = [
    /https:\/\/[^/]+\.infura\.io\/v3\/([a-f0-9]+)/i,
    /https:\/\/[^/]+\.g\.alchemy\.com\/v2\/([a-zA-Z0-9_-]+)/i,
    /https:\/\/[^/]+\.alchemyapi\.io\/v2\/([a-zA-Z0-9_-]+)/i,
  ]

  for (const pattern of patterns) {
    maskedUrl = maskedUrl.replace(pattern, (match, key) => {
      return match.replace(key, "********")
    })
  }

  // Handle Ankr's URL structure with the key in the path
  maskedUrl = maskedUrl.replace(/(https:\/\/rpc\.ankr\.com\/[^/]+\/)([a-f0-9]{40,})/i, "$1********")

  // Handle QuickNode URL structures
  // Format: https://domain.quiknode.pro/apikey/ or https://domain.quiknode.pro/apikey/extendedpath/
  maskedUrl = maskedUrl.replace(/(https:\/\/[^/]+\.quiknode\.pro\/)([a-zA-Z0-9_-]{8,})(\/|$|#)/i, "$1********$3")

  // Handle QuickNode URL with .io domain
  maskedUrl = maskedUrl.replace(/(https:\/\/[^/]+\.quiknode\.io\/)([a-zA-Z0-9_-]{8,})(\/|$|#)/i, "$1********$3")

  // Handle other common RPC providers with API keys in the path
  maskedUrl = maskedUrl.replace(/(https:\/\/[^/]+\/)([a-zA-Z0-9_-]{30,})(\/|$|#)/i, (match, prefix, key, suffix) => {
    // Only mask if it looks like an API key (long alphanumeric string)
    if (/^[a-zA-Z0-9_-]{30,}$/.test(key)) {
      return `${prefix}********${suffix}`
    }
    return match
  })

  return maskedUrl
}

const getNetworkFromHost = (host: string): string => {
  // Get the first part of the host (before the first dot)
  const firstPart = host.split(".")[0]

  // Remove "safe", "transaction", and "-" from the string
  const network = firstPart
    .replace(/safe/gi, "")
    .replace(/transaction/gi, "")
    .replace(/-/g, "")
    .trim()

  // Convert to uppercase
  return network.toUpperCase()
}

interface RpcData {
  version: string
  block_number: number
  chain_id: number
  chain: string
  syncing: boolean
}

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const [url, setUrl] = useState("")
  const [activeUrl, setActiveUrl] = useState("")
  const [error, setError] = useState("")
  const [isUrlCopied, setIsUrlCopied] = useState(false)
  const [isDataCopied, setIsDataCopied] = useState(false)
  const [currentData, setCurrentData] = useState<null | CurrentData>(null)
  const [showInput, setShowInput] = useState(true)
  const [aboutData, setAboutData] = useState<null | AboutData>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)
  const [ethereumRpcData, setEthereumRpcData] = useState<RpcData | null>(null)
  const [lastRpcFetched, setLastRpcFetched] = useState<Date | null>(null)
  const [tracingRpcData, setTracingRpcData] = useState<RpcData | null>(null)
  const [lastTracingRpcFetched, setLastTracingRpcFetched] = useState<Date | null>(null)

  const rpcFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tracingRpcFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRpcFetchingRef = useRef(false)
  const isTracingRpcFetchingRef = useRef(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  const resetState = useCallback(() => {
    setIsVisible(false)
    setActiveUrl("")
    setError("")
    setIsUrlCopied(false)
    setIsDataCopied(false)
    setCurrentData(null)
    setShowInput(true)
    setAboutData(null)
    setLastFetched(null)
    setEthereumRpcData(null)
    setLastRpcFetched(null)
    setTracingRpcData(null)
    setLastTracingRpcFetched(null)

    if (rpcFetchTimeoutRef.current) {
      clearTimeout(rpcFetchTimeoutRef.current)
      rpcFetchTimeoutRef.current = null
    }

    if (tracingRpcFetchTimeoutRef.current) {
      clearTimeout(tracingRpcFetchTimeoutRef.current)
      tracingRpcFetchTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    const urlParam = searchParams.get("url")
    if (urlParam) {
      const sanitizedUrl = sanitizeUrl(urlParam)
      if (sanitizedUrl !== url) {
        resetState()
        setUrl(sanitizedUrl)
        setActiveUrl(sanitizedUrl)
        setIsVisible(true)
        setShowInput(false)
        fetchAboutData(sanitizedUrl)
        fetchEthereumRpcData(sanitizedUrl)
      }
    } else {
      resetState()
    }
  }, [searchParams, resetState, url])

  const fetchAboutData = async (url: string) => {
    try {
      const response = await fetch(`${url}/api/v1/about/`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: AboutData = await response.json()
      setAboutData(data)
      setLastFetched(new Date())

      // If tracing RPC URL is set, fetch its data
      if (data.settings.ETHEREUM_TRACING_NODE_URL) {
        fetchTracingRpcData(url)
      }
    } catch (error) {
      console.error("Error fetching about data:", error)
      setError(`Failed to fetch about data: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const fetchEthereumRpcData = useCallback(async (url: string) => {
    if (isRpcFetchingRef.current) {
      return
    }

    isRpcFetchingRef.current = true

    try {
      const response = await fetch(`${url}/api/v1/about/ethereum-rpc`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setEthereumRpcData(data)
      setLastRpcFetched(new Date())
    } catch (error) {
      console.error("Error fetching Ethereum RPC data:", error)
    } finally {
      isRpcFetchingRef.current = false
    }
  }, [])

  const fetchTracingRpcData = useCallback(async (url: string) => {
    if (isTracingRpcFetchingRef.current) {
      return
    }

    isTracingRpcFetchingRef.current = true

    try {
      const response = await fetch(`${url}/api/v1/about/ethereum-tracing-rpc`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setTracingRpcData(data)
      setLastTracingRpcFetched(new Date())
    } catch (error) {
      console.error("Error fetching Ethereum Tracing RPC data:", error)
    } finally {
      isTracingRpcFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!activeUrl) return

    const fetchRpcData = () => {
      fetchEthereumRpcData(activeUrl).then(() => {
        if (rpcFetchTimeoutRef.current) {
          clearTimeout(rpcFetchTimeoutRef.current)
        }
        rpcFetchTimeoutRef.current = setTimeout(fetchRpcData, 10000)
      })
    }

    fetchRpcData()

    return () => {
      if (rpcFetchTimeoutRef.current) {
        clearTimeout(rpcFetchTimeoutRef.current)
      }
    }
  }, [activeUrl, fetchEthereumRpcData])

  useEffect(() => {
    if (!activeUrl || !aboutData?.settings?.ETHEREUM_TRACING_NODE_URL) return

    const fetchTracingData = () => {
      fetchTracingRpcData(activeUrl).then(() => {
        if (tracingRpcFetchTimeoutRef.current) {
          clearTimeout(tracingRpcFetchTimeoutRef.current)
        }
        tracingRpcFetchTimeoutRef.current = setTimeout(fetchTracingData, 10000)
      })
    }

    fetchTracingData()

    return () => {
      if (tracingRpcFetchTimeoutRef.current) {
        clearTimeout(tracingRpcFetchTimeoutRef.current)
      }
    }
  }, [activeUrl, aboutData, fetchTracingRpcData])

  const handleStartPolling = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (url) {
      const sanitizedUrl = sanitizeUrl(url)
      if (isValidUrl(sanitizedUrl)) {
        if (sanitizedUrl !== activeUrl) {
          resetState()
        }
        setActiveUrl(sanitizedUrl)
        setIsVisible(true)
        setShowInput(false)

        // Update the URL with the new query parameter
        const newSearchParams = new URLSearchParams(searchParams.toString())
        newSearchParams.set("url", sanitizedUrl)
        router.push(`/?${newSearchParams.toString()}`)

        // Fetch about data
        await fetchAboutData(sanitizedUrl)
        await fetchEthereumRpcData(sanitizedUrl)
      } else {
        setError("Please enter a valid URL")
      }
    } else {
      setError("Please enter a URL")
    }
  }

  const handleClear = () => {
    resetState()
    setUrl("")
    setShowInput(true)

    // Remove the URL from query parameters
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete("url")
    router.push(`/?${newSearchParams.toString()}`)
  }

  const handleShareUrl = () => {
    const currentUrl = window.location.href
    navigator.clipboard.writeText(currentUrl).then(() => {
      setIsUrlCopied(true)
      setTimeout(() => setIsUrlCopied(false), 2000) // Reset copied state after 2 seconds
    })
  }

  const handleCopyData = () => {
    if (currentData) {
      const now = new Date()
      const formattedData = `📊 Indexing Status Update 📊

🔷 ERC20 Tokens:
${
        currentData.erc20.synced
          ? "✅ Fully synchronized with the latest block."
          : `• Blocks Left: ${currentData.erc20.blocksLeft.toLocaleString()}
  • Current Speed: ${currentData.erc20.speed.toFixed(2)} blocks/minute
  • Indexed Blocks: ${currentData.erc20.indexedBlocks.toLocaleString()}
  • ETA: ${currentData.erc20.eta}`
      }

🔶 Master Copies:
${
        currentData.masterCopies.synced
          ? "✅ Fully synchronized with the latest block."
          : `• Blocks Left: ${currentData.masterCopies.blocksLeft.toLocaleString()}
  • Current Speed: ${currentData.masterCopies.speed.toFixed(2)} blocks/minute
  • Indexed Blocks: ${currentData.masterCopies.indexedBlocks.toLocaleString()}
  • ETA: ${currentData.masterCopies.eta}`
      }

📌 Latest Block: ${currentData.latestBlock.toLocaleString()}
${ethereumRpcData ? `🔗 Chain: ${ethereumRpcData.chain} (ID: ${ethereumRpcData.chain_id})` : ""}
${ethereumRpcData ? `🧱 RPC Block: ${ethereumRpcData.block_number.toLocaleString()}` : ""}

🕒 Timestamp: ${now.toLocaleString()}

🔗 Check it live: ${window.location.href}

⚠️ Disclaimer: This data represents a snapshot of indexing performance observed on ${now.toLocaleString()}. 
The speeds measured (${currentData.erc20.speed.toFixed(2)} blocks/minute for ERC20 and ${currentData.masterCopies.speed.toFixed(2)} blocks/minute) 
are based on recent performance and may not be indicative of future indexing speeds. Data is stored for the last hour only.`

      navigator.clipboard.writeText(formattedData).then(() => {
        setIsDataCopied(true)
        setTimeout(() => setIsDataCopied(false), 2000) // Reset copied state after 2 seconds
      })
    }
  }

  const handleDataUpdate = (data: CurrentData | null) => {
    // Use setTimeout to defer the state update
    setTimeout(() => {
      setCurrentData(data)
    }, 0)
  }

  const handleRefresh = async () => {
    if (activeUrl) {
      await fetchAboutData(activeUrl)
      await fetchEthereumRpcData(activeUrl)
      if (aboutData?.settings?.ETHEREUM_TRACING_NODE_URL) {
        await fetchTracingRpcData(activeUrl)
      }
    }
  }

  return (
    <SidebarWrapper>
      <div className="min-h-screen bg-[#0B1120] text-white">
        <div className="bg-slate-900/80 border-b border-slate-800/50 shadow-sm md:hidden">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MobileSidebarTrigger/>
              <div className="h-6 w-px bg-slate-700/50"></div>
              <div className="flex items-center">
                <div className="bg-blue-500 p-1.5 rounded-md shadow-sm">
                  <LineChart className="h-3.5 w-3.5 text-white"/>
                </div>
              </div>
            </div>
            {activeUrl && (
              <div className="text-xs text-slate-400 truncate max-w-[60%]">
                {aboutData ? getNetworkFromHost(aboutData.host) : "Transaction Service"}
              </div>
            )}
          </div>
        </div>
        <main className="container mx-auto p-4">
          <Alert className="mb-6 bg-card-dark border-card-dark p-4" dismissible>
            <InfoIcon className="h-4 w-4 flex-shrink-0 text-accent-cyan"/>
            <AlertDescription className="text-sm text-gray-400">
              This app monitors real-time blockchain indexing status. Enter a transaction service URL to begin tracking
              synchronization progress for ERC20 tokens and Master Copies. No data is stored, and the app only works
              while this website is open.
            </AlertDescription>
          </Alert>

          <Card className="overflow-hidden bg-slate-900/50 border-slate-800/50 shadow-xl backdrop-blur-xl">
            <div className="p-4 sm:p-6">
              {showInput ? (
                <section id="url-input">
                  <h2 className="text-2xl sm:text-3xl font-light text-center mb-6 text-sky-400 tracking-tight">
                    Enter Transaction Service URL
                  </h2>
                  <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleStartPolling} className="flex flex-col gap-4">
                      <div className="relative flex-grow">
                        <Input
                          type="text"
                          placeholder="https://transaction-ethereum.safe.protofire.io"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="w-full bg-slate-800/50 text-white border-slate-700/50 focus:border-sky-500/50 focus:ring-sky-500/50 h-12 pl-4 pr-10 text-sm sm:text-base rounded-xl shadow-inner"
                        />
                        {url && (
                          <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                          >
                            <XCircle className="h-5 w-5"/>
                          </button>
                        )}
                      </div>
                      <Button
                        type="submit"
                        className="h-12 px-6 text-base sm:text-lg font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 w-full sm:w-auto"
                      >
                        Start Polling
                      </Button>
                    </form>
                    {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}
                  </div>
                </section>
              ) : (
                <>
                  <section id="service-info" className="flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h2 className="text-2xl sm:text-3xl font-light text-accent-cyan tracking-tight">
                        Transaction Service Information
                      </h2>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button
                          onClick={handleShareUrl}
                          className="flex-1 sm:flex-none items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md"
                          size="sm"
                        >
                          <Share2 className="h-4 w-4"/>
                          <span>{isUrlCopied ? "URL Copied!" : "Share URL"}</span>
                        </Button>
                        <Button
                          onClick={handleCopyData}
                          className="flex-1 sm:flex-none items-center space-x-2 bg-violet-600 hover:bg-violet-500 text-white rounded-md"
                          size="sm"
                        >
                          <Copy className="h-4 w-4"/>
                          <span>{isDataCopied ? "Copied!" : "Copy Status"}</span>
                        </Button>
                        <Button
                          onClick={handleClear}
                          className="flex-1 sm:flex-none items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4"/>
                          <span className="hidden sm:inline">Change Service</span>
                          <span className="sm:hidden">Change</span>
                        </Button>
                        <Button
                          onClick={handleRefresh}
                          className="flex-1 sm:flex-none items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md"
                          size="sm"
                        >
                          <RefreshCw className="h-4 w-4"/>
                          <span className="hidden sm:inline">Refresh</span>
                        </Button>
                      </div>
                    </div>
                    {aboutData && (
                      <div className="space-y-4 mt-4">
                        <div className="text-sm sm:text-base">
                          <span className="font-semibold text-sky-400">Name:</span>{" "}
                          {`${getNetworkFromHost(aboutData.host)} ${aboutData.name} v${aboutData.version}`}
                        </div>
                        <div className="text-sm sm:text-base break-all">
                          <span className="font-semibold text-sky-400">URL:</span>{" "}
                          <span className="font-mono text-xs sm:text-sm">{activeUrl}</span>
                        </div>

                        <div className="mt-6 p-4 bg-card-dark border border-card-dark rounded-lg" id="service-settings">
                          <h3 className="text-lg font-medium text-accent-cyan mb-4">Service Settings</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-slate-900/40 p-3 rounded-md">
                              <div className="text-xs text-gray-400">Block Process Limit</div>
                              <div className="text-base font-medium text-white">
                                {aboutData.settings.ETH_EVENTS_BLOCK_PROCESS_LIMIT}
                              </div>
                            </div>

                            <div className="bg-slate-900/40 p-3 rounded-md">
                              <div className="text-xs text-gray-400">Max Block Process Limit</div>
                              <div className="text-base font-medium text-white">
                                {aboutData.settings.ETH_EVENTS_BLOCK_PROCESS_LIMIT_MAX || "Not set"}
                              </div>
                            </div>

                            <div className="bg-slate-900/40 p-3 rounded-md">
                              <div className="text-xs text-gray-400">Query Chunk Size</div>
                              <div className="text-base font-medium text-white">
                                {aboutData.settings.ETH_EVENTS_QUERY_CHUNK_SIZE}
                              </div>
                            </div>

                            <div className="bg-slate-900/40 p-3 rounded-md">
                              <div className="text-xs text-gray-400">Updated Block Behind</div>
                              <div className="text-base font-medium text-white">
                                {aboutData.settings.ETH_EVENTS_UPDATED_BLOCK_BEHIND}
                              </div>
                            </div>

                            <div className="bg-slate-900/40 p-3 rounded-md">
                              <div className="text-xs text-gray-400">Internal TXs Block Process Limit</div>
                              <div className="text-base font-medium text-white">
                                {aboutData.settings.ETH_INTERNAL_TXS_BLOCK_PROCESS_LIMIT}
                              </div>
                            </div>

                            <div className="bg-slate-900/40 p-3 rounded-md">
                              <div className="text-xs text-gray-400">Reorg Blocks</div>
                              <div className="text-base font-medium text-white">
                                {aboutData.settings.ETH_REORG_BLOCKS}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-slate-900/40 p-3 rounded-md flex items-center">
                              <div className="flex-1">
                                <div className="text-xs text-gray-400">Internal No Filter</div>
                                <div className="text-base font-medium text-white">
                                  {aboutData.settings.ETH_INTERNAL_NO_FILTER ? "Enabled" : "Disabled"}
                                </div>
                              </div>
                              <div
                                className={`h-3 w-3 rounded-full ${aboutData.settings.ETH_INTERNAL_NO_FILTER ? "bg-green-500" : "bg-red-500"}`}
                              ></div>
                            </div>

                            <div className="bg-slate-900/40 p-3 rounded-md flex items-center">
                              <div className="flex-1">
                                <div className="text-xs text-gray-400">L2 Network</div>
                                <div className="text-base font-medium text-white">
                                  {aboutData.settings.ETH_L2_NETWORK ? "Yes" : "No"}
                                </div>
                              </div>
                              <div
                                className={`h-3 w-3 rounded-full ${aboutData.settings.ETH_L2_NETWORK ? "bg-green-500" : "bg-slate-500"}`}
                              ></div>
                            </div>

                            <div className="bg-slate-900/40 p-3 rounded-md">
                              <div className="text-xs text-gray-400">Internal Trace TXs Batch Size</div>
                              <div className="text-base font-medium text-white">
                                {aboutData.settings.ETH_INTERNAL_TRACE_TXS_BATCH_SIZE || "Not set"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ethereum RPC Information */}
                        {ethereumRpcData && (
                          <section id="rpc-status" className="mt-6 p-4 bg-card-dark border border-card-dark rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <Database className="h-5 w-5 text-accent-cyan"/>
                              <h3 className="text-lg font-medium text-accent-cyan">RPC Status</h3>
                              {lastRpcFetched && (
                                <div className="flex items-center gap-2 ml-auto">
                                  <span className="text-xs text-gray-400">
                                    Updated: {lastRpcFetched.toLocaleTimeString()}
                                  </span>
                                  <Button
                                    onClick={() => fetchEthereumRpcData(activeUrl)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0.5 hover:bg-blue-900/20"
                                  >
                                    <RefreshCw className="h-4 w-4 text-accent-cyan"/>
                                  </Button>
                                </div>
                              )}
                            </div>

                            {aboutData?.settings?.ETHEREUM_NODE_URL && (
                              <div className="mb-4 text-sm break-all">
                                <span className="font-semibold text-accent-cyan">Provider URL:</span>{" "}
                                <span className="font-mono text-xs">
                                  {maskApiKey(aboutData.settings.ETHEREUM_NODE_URL)}
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="bg-slate-900/40 p-3 rounded-md">
                                <div className="text-xs text-gray-400">Chain</div>
                                <div className="text-lg font-semibold text-white">
                                  {ethereumRpcData.chain}{" "}
                                  <span className="text-xs text-gray-400">ID: {ethereumRpcData.chain_id}</span>
                                </div>
                              </div>

                              <div className="bg-slate-900/40 p-3 rounded-md">
                                <div className="text-xs text-gray-400">Current Block</div>
                                <div className="text-lg font-semibold text-white tabular-nums">
                                  {ethereumRpcData.block_number.toLocaleString()}
                                </div>
                              </div>

                              <div className="bg-slate-900/40 p-3 rounded-md">
                                <div className="text-xs text-gray-400">Node Version</div>
                                <div
                                  className="text-sm font-medium text-white truncate"
                                  title={ethereumRpcData.version}
                                >
                                  {ethereumRpcData.version.split("/")[0]}/{ethereumRpcData.version.split("/")[1]}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center">
                              <div
                                className={`h-2 w-2 rounded-full mr-2 ${ethereumRpcData.syncing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}
                              ></div>
                              <span
                                className={`text-sm ${ethereumRpcData.syncing ? "text-amber-400" : "text-emerald-400"}`}
                              >
                                {ethereumRpcData.syncing ? "Node is syncing" : "Node is fully synced"}
                              </span>
                            </div>
                          </section>
                        )}

                        {/* Ethereum Tracing RPC Information */}
                        {tracingRpcData && aboutData.settings.ETHEREUM_TRACING_NODE_URL && (
                          <section
                            id="tracing-rpc-status"
                            className="mt-6 p-4 bg-card-dark border border-card-dark rounded-lg"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <Server className="h-5 w-5 text-purple-400"/>
                              <h3 className="text-lg font-medium text-purple-400">Tracing RPC Status</h3>
                              {lastTracingRpcFetched && (
                                <div className="flex items-center gap-2 ml-auto">
                                  <span className="text-xs text-gray-400">
                                    Updated: {lastTracingRpcFetched.toLocaleTimeString()}
                                  </span>
                                  <Button
                                    onClick={() => fetchTracingRpcData(activeUrl)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0.5 hover:bg-purple-900/20"
                                  >
                                    <RefreshCw className="h-4 w-4 text-purple-400"/>
                                  </Button>
                                </div>
                              )}
                            </div>

                            {aboutData?.settings?.ETHEREUM_TRACING_NODE_URL && (
                              <div className="mb-4 text-sm break-all">
                                <span className="font-semibold text-purple-400">Tracing Provider URL:</span>{" "}
                                <span className="font-mono text-xs">
                                  {maskApiKey(aboutData.settings.ETHEREUM_TRACING_NODE_URL)}
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="bg-slate-900/40 p-3 rounded-md">
                                <div className="text-xs text-gray-400">Chain</div>
                                <div className="text-lg font-semibold text-white">
                                  {tracingRpcData.chain}{" "}
                                  <span className="text-xs text-gray-400">ID: {tracingRpcData.chain_id}</span>
                                </div>
                              </div>

                              <div className="bg-slate-900/40 p-3 rounded-md">
                                <div className="text-xs text-gray-400">Current Block</div>
                                <div className="text-lg font-semibold text-white tabular-nums">
                                  {tracingRpcData.block_number.toLocaleString()}
                                </div>
                              </div>

                              <div className="bg-slate-900/40 p-3 rounded-md">
                                <div className="text-xs text-gray-400">Node Version</div>
                                <div className="text-sm font-medium text-white truncate" title={tracingRpcData.version}>
                                  {tracingRpcData.version.split("/")[0]}/{tracingRpcData.version.split("/")[1]}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center">
                              <div
                                className={`h-2 w-2 rounded-full mr-2 ${tracingRpcData.syncing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}
                              ></div>
                              <span
                                className={`text-sm ${tracingRpcData.syncing ? "text-amber-400" : "text-emerald-400"}`}
                              >
                                {tracingRpcData.syncing ? "Node is syncing" : "Node is fully synced"}
                              </span>
                            </div>
                          </section>
                        )}

                        {lastFetched && (
                          <div className="text-xs text-gray-500">
                            Service info last fetched: {lastFetched.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}
                  </section>
                </>
              )}
            </div>
          </Card>

          {isVisible && activeUrl && (
            <section id="indexing-data" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800/50 shadow-xl backdrop-blur-xl">
                <div className="p-4 sm:p-6">
                  <h2 className="text-2xl sm:text-3xl font-light text-center mb-6 text-sky-400 tracking-tight">
                    Real-time Indexing Data
                  </h2>
                  <IndexingStatus baseUrl={activeUrl} onDataUpdate={handleDataUpdate}/>
                </div>
              </Card>
            </section>
          )}
        </main>
      </div>
    </SidebarWrapper>
  )
}

