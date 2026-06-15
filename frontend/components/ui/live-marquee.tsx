"use client"
import { api } from "@/lib/api"
import { useEffect, useState } from "react"

export function LiveMarquee() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    // initial fetch
    api
      .get("/stats")
      .then(({ data }) => setStats(data))
      .catch(() => {})

    // Establish the SSE pipe
    const evtSource = new EventSource("http://localhost:4000/api/stats/streaming")
    evtSource.addEventListener("stats_update", (e) => {
      try {
        setStats(JSON.parse(e.data))
      } catch {}
    })
    return () => evtSource.close()
  }, [])

  if (!stats) return null

  return (
    <div
      className="border-surface-border lazy-fade mt-16 flex w-full select-none overflow-hidden whitespace-nowrap border-y bg-[#0a0a0f] py-4 md:mt-24"
      data-reveal
    >
      <div className="animate-slide inline-flex items-center space-x-12 pr-12 [animation-duration:40s] hover:[animation-play-state:paused]">
        <MarqueeItem label="Network Pulse" value="ONLINE" status="green" />
        <MarqueeItem label="Total Institutions" value={stats.institutions} />
        <MarqueeItem label="Total Employers" value={stats.employers} />
        <MarqueeItem label="Credentials Vaulted" value={stats.totalCredentials} />
        <MarqueeItem label="Verifications Sent" value={stats.successfulVerifications} />
        <MarqueeItem label="Revoked Commitments" value={stats.revokedCredentials} status="red" />
        {/* clone items for seamless loop */}
        <MarqueeItem label="Network Pulse" value="ONLINE" status="green" />
        <MarqueeItem label="Total Institutions" value={stats.institutions} />
        <MarqueeItem label="Total Employers" value={stats.employers} />
        <MarqueeItem label="Credentials Vaulted" value={stats.totalCredentials} />
        <MarqueeItem label="Verifications Sent" value={stats.successfulVerifications} />
        <MarqueeItem label="Revoked Commitments" value={stats.revokedCredentials} status="red" />
      </div>
    </div>
  )
}

function MarqueeItem({
  label,
  value,
  status,
}: {
  label: string
  value: string | number
  status?: "green" | "red"
}) {
  return (
    <div className="flex items-center space-x-2 font-mono text-sm">
      <span className="text-muted uppercase tracking-widest">{label}:</span>
      {status === "green" && <span className="h-2 w-2 animate-pulse rounded-full bg-[#00e699]" />}
      {status === "red" && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}
      <span className="font-bold text-foreground">{value}</span>
    </div>
  )
}
