"use client"

import { useEffect, useState } from "react"

interface Shape {
  id: number
  type: "circle" | "hex" | "triangle" | "diamond"
  size: number
  x: number
  y: number
  duration: number
  delay: number
  color: string
  initialOpacity: number
}

function generateShapes(count: number): Shape[] {
  const types: Shape["type"][] = ["circle", "hex", "triangle", "diamond"]
  const colors = ["accent", "info", "error", "accent-dim"]
  const shapes: Shape[] = []
  for (let i = 0; i < count; i++) {
    shapes.push({
      id: i,
      type: types[i % types.length]!,
      size: 20 + Math.random() * 40,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 6 + Math.random() * 10,
      delay: Math.random() * -10,
      color: colors[i % colors.length]!,
      initialOpacity: 0.03 + Math.random() * 0.05,
    })
  }
  return shapes
}

export function FloatingShapes({ count = 12 }: { count?: number }) {
  const [shapes, setShapes] = useState<Shape[]>([])

  useEffect(() => {
    setShapes(generateShapes(count))
  }, [count])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {shapes.map((shape) => (
        <div
          key={shape.id}
          className="animate-float-shape absolute"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
            opacity: shape.initialOpacity,
            animationDuration: `${shape.duration}s`,
            animationDelay: `${shape.delay}s`,
          }}
        >
          {shape.type === "circle" && (
            <div
              className={`h-full w-full rounded-full border`}
              style={{ borderColor: `rgb(var(--color-${shape.color}) / 0.15)` }}
            />
          )}
          {shape.type === "hex" && (
            <div
              className="h-full w-full"
              style={{
                backgroundColor: `rgb(var(--color-${shape.color}) / 0.06)`,
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              }}
            />
          )}
          {shape.type === "triangle" && (
            <div
              className="h-full w-full"
              style={{
                backgroundColor: `rgb(var(--color-${shape.color}) / 0.06)`,
                clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
              }}
            />
          )}
          {shape.type === "diamond" && (
            <div
              className="h-full w-full"
              style={{
                border: `1px solid rgb(var(--color-${shape.color}) / 0.12)`,
                transform: "rotate(45deg)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function PortalBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0">
        <div className="bg-void absolute inset-0" />
        <div
          className="absolute -left-[10%] top-[20%] h-[400px] w-[400px] rounded-full bg-accent/4 blur-[120px]"
        />
        <div
          className="absolute -right-[10%] bottom-[30%] h-[350px] w-[350px] rounded-full bg-info/3 blur-[100px]"
        />
      </div>
      {/* Subtle grid */}
      <div className="bg-grid-pattern bg-grid absolute inset-0 opacity-20" />
    </div>
  )
}
