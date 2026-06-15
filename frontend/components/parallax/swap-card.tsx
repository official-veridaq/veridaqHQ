"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { LogoMark } from "@/components/ui/logo"

const views = [
  {
    role: "Institution",
    badge: "INSTITUTION",
    email: "futminna@veridaq.xyz",
    tier: "FREE",
    balance: "0.06 ETH",
    actions: [
      { label: "Upload Batch", accent: true },
      { label: "View Claims" },
      { label: "Verifications" },
    ],
    color: "accent",
  },
  {
    role: "Employer",
    badge: "EMPLOYER",
    email: "firstbank@veridaq.xyz",
    tier: "3 Free",
    balance: "0 verifications",
    actions: [
      { label: "Verify Now", accent: true },
      { label: "History" },
      { label: "Account" },
    ],
    color: "error",
  },
]

export function SwapCard() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1)
      setCurrent((prev) => (prev + 1) % views.length)
      setFlash(true)
      window.setTimeout(() => setFlash(false), 450)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const view = views[current]!

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.95,
    }),
  }

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div
        className="border-surface-border bg-surface-card rounded-2xl border p-1 shadow-elevated-lg [perspective:800px] transition-shadow duration-500 hover:shadow-[0_0_40px_var(--color-accent-glow)]"
      >
        <div className="border-surface-border rounded-xl border p-4">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LogoMark className="h-5 w-5" />
              <span className="text-xs font-bold tracking-wider text-foreground">VERIDAQ</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex h-5 items-center rounded-full px-2 text-[9px] font-bold uppercase tracking-widest"
                style={{
                  backgroundColor: `rgb(var(--color-${view.color}) / 0.12)`,
                  color: `rgb(var(--color-${view.color}))`,
                }}
              >
                {view.badge}
              </div>
              <span className="text-[10px] text-muted">Companion v0.1</span>
            </div>
          </div>

          {/* Swap area */}
          <div className="relative h-[200px] overflow-hidden">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
              >
                {/* Session card */}
                <div
                  className="mb-3 rounded-lg p-3"
                  style={{
                    backgroundColor: `rgb(var(--color-${view.color}) / 0.06)`,
                    border: `1px solid rgb(var(--color-${view.color}) / 0.1)`,
                  }}
                >
                  <div className="text-[10px] uppercase tracking-wider text-muted">Signed in as</div>
                  <div className="mt-0.5 text-sm font-semibold text-foreground">{view.role}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">{view.email}</span>
                    <span className="text-[10px] font-mono" style={{ color: `rgb(var(--color-${view.color}))` }}>
                      {view.tier}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {view.actions.map((action) => (
                    <div
                      key={action.label}
                      className="rounded-lg border p-2 text-center transition-all"
                      style={{
                        backgroundColor: action.accent
                          ? `rgb(var(--color-${view.color}) / 0.1)`
                          : undefined,
                        borderColor: action.accent
                          ? `rgb(var(--color-${view.color}) / 0.2)`
                          : undefined,
                      }}
                    >
                      <div
                        className="text-[9px] font-bold uppercase tracking-wider"
                        style={{
                          color: action.accent
                            ? `rgb(var(--color-${view.color}))`
                            : undefined,
                        }}
                      >
                        {action.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input fields mockup */}
                <div className="space-y-2">
                  <input
                    readOnly
                    placeholder="Institution on-chain ID"
                    className="bg-surface border-surface-border w-full rounded-lg border px-3 py-2 text-xs text-muted placeholder:text-muted-subtle"
                  />
                  <input
                    readOnly
                    placeholder="Matric number"
                    className="bg-surface border-surface-border w-full rounded-lg border px-3 py-2 text-xs text-muted placeholder:text-muted-subtle"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
            <div
              className={`pointer-events-none absolute inset-0 border-2 rounded-xl transition-opacity duration-300 ${
                flash ? "opacity-100" : "opacity-0"
              }`}
              style={{ borderColor: `rgb(var(--color-${view.color}) / 0.35)` }}
            />
          </div>

          {/* Bottom indicator dots */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-1.5">
              {views.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > current ? 1 : -1)
                    setCurrent(i)
                  }}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? 16 : 6,
                    backgroundColor:
                      i === current
                        ? "rgb(var(--color-accent))"
                        : "rgb(var(--color-muted-subtle))",
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] text-muted">
              <span style={{ color: "rgb(var(--color-accent))" }}>{view.role}</span>
              {" "}· click dot to swap
            </span>
          </div>
        </div>
      </div>

      {/* Ambient glow */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-accent/10 to-error/10 blur-2xl pointer-events-none" />
    </div>
  )
}
