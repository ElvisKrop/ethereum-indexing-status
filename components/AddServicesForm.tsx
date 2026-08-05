"use client"

import { type FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, XCircle } from "lucide-react"
import { isValidUrl, sanitizeUrl } from "@/lib/service-url"

export default function AddServicesForm() {
  const router = useRouter()
  const [urls, setUrls] = useState<string[]>([""])
  const [error, setError] = useState("")

  const updateField = (index: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)))
  }

  const addField = () => {
    setUrls((prev) => [...prev, ""])
  }

  const removeField = (index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError("")

    const sanitized = urls.map((u) => sanitizeUrl(u.trim())).filter((u) => u.length > 0)

    const invalid = sanitized.find((u) => !isValidUrl(u))
    if (invalid) {
      setError(`"${invalid}" is not a valid URL`)
      return
    }

    const deduped = Array.from(new Set(sanitized))

    if (deduped.length === 0) {
      setError("Please enter at least one URL")
      return
    }

    if (deduped.length === 1) {
      router.push(`/service?url=${encodeURIComponent(deduped[0])}`)
    } else {
      router.push(`/?${deduped.map((u) => `url=${encodeURIComponent(u)}`).join("&")}`)
    }
  }

  return (
    <section id="url-input">
      <h2 className="text-2xl sm:text-3xl font-light text-center mb-6 text-sky-400 tracking-tight">
        Track Transaction Service Indexing
      </h2>
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {urls.map((url, index) => (
            <div key={index} className="relative flex-grow flex gap-2 items-center">
              <Input
                type="text"
                placeholder="https://transaction-ethereum.safe.protofire.io"
                value={url}
                onChange={(e) => updateField(index, e.target.value)}
                className="w-full bg-slate-800/50 text-white border-slate-700/50 focus:border-sky-500/50 focus:ring-sky-500/50 h-12 pl-4 pr-4 text-sm sm:text-base rounded-xl shadow-inner"
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="text-slate-400 hover:text-white transition-colors px-1"
                  aria-label="Remove field"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={addField}
              className="border-slate-700/50 text-slate-300 hover:bg-slate-800/50 hover:text-white"
            >
              <Plus className="h-4 w-4 mr-1" /> Add another service
            </Button>
            <Button
              type="submit"
              className="h-12 px-6 text-base sm:text-lg font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 w-full sm:w-auto"
            >
              Start Tracking
            </Button>
          </div>
        </form>
        {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}
      </div>
    </section>
  )
}
