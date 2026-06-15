/**
 * SubtleGrid — replaces the animated particle field with a static
 * dot-grid background. Professional, zero distraction.
 */
export function ParticleField() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-0 opacity-30"
      aria-hidden="true"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
  )
}