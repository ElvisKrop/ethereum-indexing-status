"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, LineChart } from "lucide-react"
import AddServicesForm from "@/components/AddServicesForm"
import ServicesTable from "@/components/ServicesTable"
import HomeGuide from "@/components/HomeGuide"
import { ThemeToggle } from "@/components/theme-toggle"
import { buildUrlsQuery } from "@/lib/service-url"
import { loadTrackedServices, saveTrackedServices } from "@/lib/tracked-services-storage"

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urls = searchParams.getAll("url")

  // Bootstrap the dashboard from localStorage on a fresh visit (no `url=`
  // params at all) — e.g. reopening the app in a new tab/session. The query
  // string remains the actual source of truth for what's rendered; this just
  // seeds it from the last session so tracked services survive a restart.
  useEffect(() => {
    if (urls.length === 0) {
      const stored = loadTrackedServices()
      if (stored.length > 0) {
        router.replace(`/?${buildUrlsQuery(stored)}`)
      }
    }
  }, [urls, router])

  // Keep localStorage mirroring whatever's actually in the URL — covers direct
  // navigation to a shared multi-service link too, not just the form/table's
  // own add/remove actions. Removing the last service is handled explicitly
  // in ServicesTable (clearing storage), not here, so a fresh `/` with no
  // params at all doesn't immediately erase what the bootstrap effect above
  // is about to read.
  useEffect(() => {
    if (urls.length > 0) {
      saveTrackedServices(urls)
    }
  }, [urls])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto p-4">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-md shadow-sm">
              <LineChart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Safe Indexing</h1>
              <p className="text-xs text-cyan-700 dark:text-cyan-500">Transaction Service Monitor</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Alert className="mb-6 bg-card-dark border-card-dark p-4" dismissible>
          <InfoIcon className="h-4 w-4 flex-shrink-0 text-accent-cyan" />
          <AlertDescription className="text-sm text-slate-600 dark:text-gray-400">
            This app monitors real-time blockchain indexing status for one or more transaction services. Nothing is
            sent to or stored on a server — tracked services are remembered only in this browser.
          </AlertDescription>
        </Alert>

        {urls.length === 0 ? (
          <>
            <Card className="overflow-hidden bg-white/70 dark:bg-slate-900/50 border-slate-200/70 dark:border-slate-800/50 shadow-xl backdrop-blur-xl">
              <div className="p-4 sm:p-6">
                <AddServicesForm />
              </div>
            </Card>
            <HomeGuide />
          </>
        ) : (
          <ServicesTable urls={urls} />
        )}
      </main>
    </div>
  )
}
