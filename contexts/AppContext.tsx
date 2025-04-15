"use client"

import { useState, useEffect, type FormEvent, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import IndexingStatus from "../components/IndexingStatus"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, XCircle, Share2, Copy } from "lucide-react"

// Function to remove trailing slashes from a URL
const sanitizeUrl = (url: string): string => {
  return url.replace(/\/+$/, "")
}

// Function to validate URL
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const [url, setUrl] = useState("")
  const [activeUrl, setActiveUrl] = useState("")
  const [error, setError] = useState("")
  const [isUrlCopied, setIsUrlCopied] = useState(false)
  const [isDataCopied, setIsDataCopied] = useState(false)
  const [currentData, setCurrentData] = useState<any>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  const resetState = useCallback(() => {
    setIsVisible(false)
    setActiveUrl("")
    setError("")
    setIsUrlCopied(false)
    setIsDataCopied(false)
    setCurrentData(null)
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
      }
    } else {
      resetState()
    }
  }, [searchParams, resetState, url])

  const handleStartPolling = (e: FormEvent<HTMLFormElement>) => {
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

        // Update the URL with the new query parameter
        const newSearchParams = new URLSearchParams(searchParams.toString())
        newSearchParams.set("url", sanitizedUrl)
        router.push(`/?${newSearchParams.toString()}`)
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

🕒 Timestamp: ${new Date().toLocaleString()}

🔗 Check it live: ${window.location.href}`

      navigator.clipboard.writeText(formattedData).then(() => {
        setIsDataCopied(true)
        setTimeout(() => setIsDataCopied(false), 2000) // Reset copied state after 2 seconds
      })
    }
  }

  const handleDataUpdate = (data: any) => {
    // Use setTimeout to defer the state update
    setTimeout(() => {
      setCurrentData(data)
    }, 0)
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <main className="container mx-auto p-4">
        <Alert className="mb-6 bg-[#1B2A4E]/80 border-blue-500/20 shadow-lg shadow-blue-500/10" dismissible>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            This app monitors real-time blockchain indexing status. Enter a transaction service URL to begin tracking
            synchronization progress for ERC20 tokens and Master Copies. No data is stored, and the app only works while
            this website is open.
          </AlertDescription>
        </Alert>

        <Card className="overflow-hidden bg-slate-900/50 border-slate-800/50 shadow-xl backdrop-blur-xl">
          <div className="p-8">
            <h2 className="text-3xl font-light text-center mb-8 text-sky-400 tracking-tight">
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
                    className="w-full bg-slate-800/50 text-white border-slate-700/50 focus:border-sky-500/50 focus:ring-sky-500/50 h-12 pl-10 pr-4 text-lg rounded-xl shadow-inner"
                  />
                  {url && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  className="h-12 px-6 text-lg font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 sm:w-auto w-full"
                >
                  Start Polling
                </Button>
              </form>
              {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}
              {isVisible && activeUrl && (
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    onClick={handleShareUrl}
                    className={`h-11 px-5 font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/25 ${
                      isUrlCopied ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={isUrlCopied}
                  >
                    <Share2 className="mr-2 h-5 w-5" />
                    {isUrlCopied ? "URL Copied!" : "Share URL"}
                  </Button>
                  <Button
                    onClick={handleCopyData}
                    className={`h-11 px-5 font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/25 ${
                      isDataCopied ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={isDataCopied || !currentData}
                  >
                    <Copy className="mr-2 h-5 w-5" />
                    {isDataCopied ? "Text Copied!" : "Copy Status"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {isVisible && activeUrl && (
          <div className="mt-6">
            <Card className="bg-slate-900/50 border-slate-800/50 shadow-xl backdrop-blur-xl">
              <div className="p-8">
                <h2 className="text-3xl font-light text-center mb-8 text-sky-400 tracking-tight">
                  Real-time Indexing Data
                </h2>
                <IndexingStatus baseUrl={activeUrl} onDataUpdate={handleDataUpdate} />
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

