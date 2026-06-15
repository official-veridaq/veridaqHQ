"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { LogoMark } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/theme-toggle"

function HeaderLink({
  href,
  label,
  hovered,
  onHover,
  onLeave,
  isAccent,
}: {
  href: string
  label: string
  hovered: boolean
  onHover: () => void
  onLeave: () => void
  isAccent?: boolean
}) {
  return (
    <Link
      href={href}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`relative py-1 text-sm font-medium transition-colors ${
        isAccent ? "text-accent hover:text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
      {hovered && (
        <motion.span
          layoutId="app-header-indicator"
          className="bg-accent absolute -bottom-0.5 left-0 h-px w-full"
          transition={{ type: "spring", stiffness: 350, damping: 35 }}
        />
      )}
    </Link>
  )
}

export function AppHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const links = [
    { href: "/docs", label: "Docs" },
    { href: "/resources", label: "Resources" },
    { href: "/blueprint", label: "Blueprint", accent: true },
  ]

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-surface-border bg-void/80 border-b backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8 rounded-lg" />
          <span className="text-sm font-bold tracking-wider">VERIDAQ</span>
        </Link>

        <div className="flex items-center gap-4">
          {links.map((link, i) => (
            <HeaderLink
              key={link.href}
              href={link.href}
              label={link.label}
              isAccent={link.accent ?? false}
              hovered={hoveredIndex === i}
              onHover={() => setHoveredIndex(i)}
              onLeave={() => setHoveredIndex(null)}
            />
          ))}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
