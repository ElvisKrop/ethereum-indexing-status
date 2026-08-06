import type { ElementType, ReactNode } from "react"
import { ArrowRight, Plus, Share2, Table2 } from "lucide-react"

interface GuideStepProps {
  icon: ElementType
  title: string
  children: ReactNode
}

const GuideStep = ({ icon: Icon, title, children }: GuideStepProps) => (
  <div className="flex gap-3">
    <div className="flex-shrink-0 h-8 w-8 rounded-md bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-400 flex items-center justify-center">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <p className="text-sm text-slate-600 dark:text-gray-400 mt-0.5">{children}</p>
    </div>
  </div>
)

export default function HomeGuide() {
  return (
    <div className="mt-6 rounded-lg border border-slate-200/70 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/50 p-4 sm:p-6">
      <h3 className="text-base font-medium text-foreground mb-4">How it works</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <GuideStep icon={Plus} title="Add one or more services">
          Paste a Transaction Service URL above (e.g.{" "}
          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800/70 px-1 py-0.5 rounded">
            https://transaction-ethereum.safe.protofire.io
          </span>
          ). Click &quot;Add another service&quot; to track several at once.
        </GuideStep>
        <GuideStep icon={Table2} title="One vs. many">
          Tracking a single service opens its full detail view (sync charts, RPC
          status). Two or more open a dashboard table summarizing all of them.
        </GuideStep>
        <GuideStep icon={ArrowRight} title="Drill in or manage">
          From the table, click &quot;Details&quot; on any row for the full view, or the
          &quot;×&quot; to stop tracking it. Use the &quot;+ Add&quot; field above the table to track
          more without starting over.
        </GuideStep>
        <GuideStep icon={Share2} title="Share or bookmark">
          Nothing is sent to a server — your tracked services are remembered in
          this browser, and the page URL always reflects them. Use &quot;Share URL&quot;
          (or just copy the address bar) to hand a teammate this exact dashboard.
        </GuideStep>
      </div>
    </div>
  )
}
