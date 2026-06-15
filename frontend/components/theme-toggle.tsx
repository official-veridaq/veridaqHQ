"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${className}`}
        disabled
      >
        <div className="h-4 w-4" />
      </button>
    )
  }

  const cycle = () => {
    if (theme === "dark") setTheme("light")
    else if (theme === "light") setTheme("system")
    else setTheme("dark")
  }

  return (
    <button
      onClick={cycle}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:scale-105 ${className}`}
      style={{
        backgroundColor: "var(--color-surface-card)",
        border: "1px solid var(--color-surface-border)",
        color: "var(--color-muted)",
      }}
      title={`Current theme: ${theme}. Click to cycle.`}
      aria-label={`Switch theme (currently ${theme})`}
    >
      {theme === "dark" && <Moon className="h-4 w-4" />}
      {theme === "light" && <Sun className="h-4 w-4" />}
      {theme === "system" && <Monitor className="h-4 w-4" />}
    </button>
  )
}
