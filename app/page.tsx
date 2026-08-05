"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, LineChart } from "lucide-react"
import AddServicesForm from "@/components/AddServicesForm"
import ServicesTable from "@/components/ServicesTable"

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urls = searchParams.getAll("url")

  // Defensive fallback for a direct/bookmarked link with a single `url=` param
  // (the form itself navigates straight to /service, skipping this state).
  useEffect(() => {
    if (urls.length === 1) {
      router.replace(`/service?url=${encodeURIComponent(urls[0])}`)
    }
  }, [urls, router])

  if (urls.length === 1) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <p className="text-blue-300 animate-pulse">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <main className="container mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-500 p-2 rounded-md shadow-sm">
            <LineChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Safe Indexing</h1>
            <p className="text-xs text-cyan-500">Transaction Service Monitor</p>
          </div>
        </div>

        <Alert className="mb-6 bg-card-dark border-card-dark p-4" dismissible>
          <InfoIcon className="h-4 w-4 flex-shrink-0 text-accent-cyan" />
          <AlertDescription className="text-sm text-gray-400">
            This app monitors real-time blockchain indexing status for one or more transaction services. No data is
            stored, and the app only works while this website is open.
          </AlertDescription>
        </Alert>

        {urls.length === 0 ? (
          <Card className="overflow-hidden bg-slate-900/50 border-slate-800/50 shadow-xl backdrop-blur-xl">
            <div className="p-4 sm:p-6">
              <AddServicesForm />
            </div>
          </Card>
        ) : (
          <ServicesTable urls={urls} />
        )}
      </main>
    </div>
  )
}
