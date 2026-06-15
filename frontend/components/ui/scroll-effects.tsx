"use client"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

export function ScrollEffectsProvider() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined") return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (reduceMotion.matches) return

    let stackItems: HTMLElement[] = []
    let revealItems: HTMLElement[] = []

    const refresh = () => {
      stackItems = Array.from(
        document.querySelectorAll<HTMLElement>("[data-stack-item], .card, .card-sm")
      )
      stackItems.forEach((el, index) => {
        el.dataset.stackItem = "true"
        el.style.setProperty("--stack-index", String(index))
      })

      revealItems = Array.from(
        document.querySelectorAll<HTMLElement>("[data-reveal], .card, .card-sm, .lazy-fade")
      )
      revealItems.forEach((el) => {
        if (!el.dataset.reveal) el.dataset.reveal = "true"
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement
          if (entry.isIntersecting) {
            target.dataset.revealState = "in"
          } else {
            target.dataset.revealState = "out"
          }
        })
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    )

    const observeAll = () => {
      observer.disconnect()
      revealItems.forEach((el) => observer.observe(el))
    }

    const updateStack = () => {
      stackItems.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / (viewportHeight + rect.height)))
        el.style.setProperty('--stack-progress', progress.toFixed(3))
      })
    }

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        updateStack()
        ticking = false
      })
    }

    refresh()
    observeAll()
    updateStack()

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)

    const mutation = new MutationObserver(() => {
      refresh()
      observeAll()
      updateStack()
    })
    mutation.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      observer.disconnect()
      mutation.disconnect()
    }
  }, [pathname])

  return null
}
