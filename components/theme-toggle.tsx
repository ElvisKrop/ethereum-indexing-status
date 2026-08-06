"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  // next-themes doesn't know the theme until after mount (avoids a
  // server/client hydration mismatch) — render a stable placeholder until then.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className={`h-6 w-11 ${className ?? ""}`} />
  }

  const isDark = resolvedTheme === "dark"

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Sun className="h-4 w-4 text-amber-500" />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <Moon className="h-4 w-4 text-cyan-400" />
    </div>
  )
}
