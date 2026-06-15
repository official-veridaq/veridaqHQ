"use client"

import { useEffect, useState } from "react"

type UseScrollSpyOptions = {
  initialSection: string
  offset?: number
}

export function useScrollSpy(sectionIds: string[], options: UseScrollSpyOptions) {
  const { initialSection, offset = 180 } = options
  const [activeSection, setActiveSection] = useState(initialSection)

  useEffect(() => {
    if (typeof window === "undefined") return

    let ticking = false

    const updateActiveSection = () => {
      let nextSection = initialSection

      for (const sectionId of sectionIds) {
        const section = document.getElementById(sectionId)
        if (!section) continue

        const rect = section.getBoundingClientRect()
        if (rect.top <= offset) {
          nextSection = sectionId
          continue
        }

        break
      }

      setActiveSection(nextSection)
    }

    const onScroll = () => {
      if (ticking) return

      ticking = true
      window.requestAnimationFrame(() => {
        updateActiveSection()
        ticking = false
      })
    }

    updateActiveSection()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [initialSection, offset, sectionIds])

  return activeSection
}
