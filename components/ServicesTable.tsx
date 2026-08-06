"use client"

import { type FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import ServiceRow from "@/components/ServiceRow"
import { buildUrlsQuery, isValidUrl, sanitizeUrl } from "@/lib/service-url"
import { removeCachedServiceStatus } from "@/lib/service-status-cache"
import { saveTrackedServices } from "@/lib/tracked-services-storage"

interface ServicesTableProps {
  urls: string[]
}

export default function ServicesTable({ urls }: ServicesTableProps) {
  const router = useRouter()
  const [newUrl, setNewUrl] = useState("")
  const [addError, setAddError] = useState("")

  const handleAdd = (e: FormEvent) => {
    e.preventDefault()
    setAddError("")

    const sanitized = sanitizeUrl(newUrl.trim())
    if (!sanitized) return
    if (!isValidUrl(sanitized)) {
      setAddError("Please enter a valid URL")
      return
    }
    if (urls.includes(sanitized)) {
      setAddError("This service is already being tracked")
      return
    }

    setNewUrl("")
    const next = [...urls, sanitized]
    saveTrackedServices(next)
    router.push(`/?${buildUrlsQuery(next)}`)
  }

  const handleRemove = (url: string) => {
    const remaining = urls.filter((u) => u !== url)
    saveTrackedServices(remaining)
    removeCachedServiceStatus(url)
    if (remaining.length === 0) {
      router.push("/")
    } else {
      router.push(`/?${buildUrlsQuery(remaining)}`)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="text"
          placeholder="Add another transaction service URL..."
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="bg-white text-slate-900 border-slate-300 focus:border-sky-600/50 focus:ring-sky-600/50 dark:bg-slate-800/50 dark:text-white dark:border-slate-700/50 dark:focus:border-sky-500/50 dark:focus:ring-sky-500/50"
        />
        <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white sm:w-auto w-full">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </form>
      {addError && <div className="text-red-600 dark:text-red-400 text-sm">{addError}</div>}

      <div className="rounded-lg border border-slate-200 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800/50">
              <TableHead className="text-slate-600 dark:text-slate-400">Service</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400">ERC20</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400">Master Copies</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400">ETA</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400">RPC</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400">Updated</TableHead>
              <TableHead className="text-right text-slate-600 dark:text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {urls.map((url) => (
              <ServiceRow key={url} url={url} siblingUrls={urls} onRemove={handleRemove} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
