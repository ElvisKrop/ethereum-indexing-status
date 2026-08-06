"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { AlertTriangle, ArrowRight, X } from "lucide-react"
import { useServiceSummary } from "@/hooks/useServiceSummary"
import { buildUrlsQuery, getNetworkFromHost } from "@/lib/service-url"

interface ServiceRowProps {
  url: string
  siblingUrls: string[]
  onRemove: (url: string) => void
}

const SyncBadge = ({ synced }: { synced: boolean }) => (
  <Badge className={synced ? "bg-emerald-600 text-white border-transparent" : "bg-amber-600 text-white border-transparent"}>
    {synced ? "Synced" : "Syncing"}
  </Badge>
)

const Warning = ({ message }: { message: string }) => (
  <span title={message}>
    <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" aria-label={message} />
  </span>
)

export default function ServiceRow({ url, siblingUrls, onRemove }: ServiceRowProps) {
  const summary = useServiceSummary(url)

  const serviceName = summary.aboutData ? getNetworkFromHost(summary.aboutData.host) : null

  // Carry the full dashboard list along so "Back to Dashboard" on the detail
  // page can restore it — a plain `/service?url=<this one>` link has no way
  // to know what else was being tracked.
  const detailsHref = `/service?url=${encodeURIComponent(url)}&${buildUrlsQuery(siblingUrls, "from")}`

  return (
    <TableRow>
      <TableCell className="max-w-[220px]">
        <div className="font-medium text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
          {serviceName ?? "—"}
          {summary.aboutError && <Warning message={`Service info unavailable: ${summary.aboutError}`} />}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400 truncate" title={url}>
          {url}
        </div>
      </TableCell>

      {summary.status === "error" ? (
        <TableCell colSpan={5} className="text-red-600 dark:text-red-400 text-sm">
          Unreachable{summary.error ? `: ${summary.error}` : ""}
        </TableCell>
      ) : summary.status === "loading" ? (
        <TableCell colSpan={5} className="text-slate-600 dark:text-slate-400 text-sm animate-pulse">
          Loading...
        </TableCell>
      ) : (
        <>
          <TableCell>
            {summary.erc20 && (
              <div className="space-y-1">
                <SyncBadge synced={summary.erc20.synced} />
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {summary.erc20.synced ? "Fully synced" : `${summary.erc20.speed.toFixed(1)} blocks/min`}
                </div>
              </div>
            )}
          </TableCell>
          <TableCell>
            {summary.masterCopies && (
              <div className="space-y-1">
                <SyncBadge synced={summary.masterCopies.synced} />
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {summary.masterCopies.synced ? "Fully synced" : `${summary.masterCopies.speed.toFixed(1)} blocks/min`}
                </div>
              </div>
            )}
          </TableCell>
          <TableCell className="text-sm text-slate-700 dark:text-slate-300">
            {summary.erc20?.synced && summary.masterCopies?.synced
              ? "—"
              : [summary.erc20?.synced ? null : summary.erc20?.eta, summary.masterCopies?.synced ? null : summary.masterCopies?.eta]
                  .filter(Boolean)
                  .join(" / ") || "N/A"}
          </TableCell>
          <TableCell>
            {summary.rpcSynced === null ? (
              summary.rpcError ? (
                <div className="flex items-center gap-1.5">
                  <Warning message={`RPC status unavailable: ${summary.rpcError}`} />
                  <span className="text-xs text-amber-700 dark:text-amber-400">Error</span>
                </div>
              ) : (
                <span className="text-xs text-slate-600 dark:text-slate-400">N/A</span>
              )
            ) : (
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${summary.rpcSynced ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                <span className="text-xs text-slate-600 dark:text-slate-400">{summary.rpcSynced ? "Synced" : "Syncing"}</span>
                {summary.rpcError && <Warning message={`Last RPC check failed: ${summary.rpcError}`} />}
              </div>
            )}
          </TableCell>
          <TableCell className="text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              {summary.lastUpdated ? summary.lastUpdated.toLocaleTimeString() : "—"}
              {summary.error && <Warning message={`Last indexing check failed, showing last known data: ${summary.error}`} />}
            </div>
          </TableCell>
        </>
      )}

      <TableCell className="text-right whitespace-nowrap">
        <Button asChild size="sm" variant="ghost" className="text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300">
          <Link href={detailsHref}>
            Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-slate-500 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
          onClick={() => onRemove(url)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      </TableCell>
    </TableRow>
  )
}
