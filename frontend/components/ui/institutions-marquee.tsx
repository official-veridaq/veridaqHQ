"use client"
import { api } from "@/lib/api"
import { Building2 } from "lucide-react"
import { useEffect, useState } from "react"

export function InstitutionsMarquee() {
  const [institutions, setInstitutions] = useState<string[]>([])

  useEffect(() => {
    api
      .get("/stats")
      .then(({ data }) => {
        if (data?.activeInstitutionNames) {
          setInstitutions(data.activeInstitutionNames)
        }
      })
      .catch(() => {})

    const evtSource = new EventSource("http://localhost:4000/api/stats/streaming")
    evtSource.addEventListener("stats_update", (e) => {
      try {
        const liveStats = JSON.parse(e.data)
        if (liveStats?.activeInstitutionNames) {
          setInstitutions(liveStats.activeInstitutionNames)
        }
      } catch {}
    })
    return () => evtSource.close()
  }, [])

  if (!institutions || institutions.length === 0) return null

  // Ensure enough items to scroll by duplicating the array if small
  const displayItems = [...institutions, ...institutions, ...institutions, ...institutions].slice(
    0,
    Math.max(10, institutions.length * 3)
  )

  return (
    <div className="lazy-fade flex w-full flex-col items-center overflow-hidden py-16" data-reveal>
      <p className="text-muted mb-8 px-4 text-center text-sm font-semibold uppercase tracking-widest">
        Trusted By Verified Academic Institutions
      </p>

      <div className="relative flex w-full overflow-hidden whitespace-nowrap before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-32 before:bg-gradient-to-r before:from-[#0a0a0f] before:to-transparent before:content-[''] after:absolute after:inset-y-0 after:right-0 after:z-10 after:w-32 after:bg-gradient-to-l after:from-[#0a0a0f] after:to-transparent after:content-['']">
        <div className="animate-slide inline-flex items-center space-x-8 pr-8 [animation-duration:60s] hover:[animation-play-state:paused]">
          {displayItems.map((name, i) => (
            <div
              key={i}
              className="bg-surface-card border-surface-border hover:border-accent/40 flex items-center gap-3 rounded-full border px-6 py-3 shadow-sm transition-colors"
            >
              <Building2 className="text-accent h-5 w-5" />
              <span className="text-sm font-medium text-foreground md:text-base">{name}</span>
            </div>
          ))}
          {/* Duplicate block for seamless loop */}
          {displayItems.map((name, i) => (
            <div
              key={`dup-${i}`}
              className="bg-surface-card border-surface-border hover:border-accent/40 flex items-center gap-3 rounded-full border px-6 py-3 shadow-sm transition-colors"
            >
              <Building2 className="text-accent h-5 w-5" />
              <span className="text-sm font-medium text-foreground md:text-base">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
