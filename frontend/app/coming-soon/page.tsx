import Link from "next/link"

export default function ComingSoon() {
  return (
    <div className="bg-void flex min-h-screen flex-col items-center justify-center px-4">
      <div className="border-surface-border bg-surface-card mx-auto max-w-md rounded-2xl border p-8 text-center shadow-2xl">
        <div className="bg-accent/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
          <span className="text-accent text-3xl font-bold">!</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Coming soon
        </h1>
        <p className="text-muted mb-8 text-sm leading-relaxed">
          This feature is under development and will be available in an upcoming
          release. Check back later.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="bg-accent text-void hover:bg-accent/90 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            Back to home
          </Link>
          <Link
            href="/docs"
            className="border-surface-border text-foreground hover:bg-surface-border inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors"
          >
            View docs
          </Link>
        </div>
      </div>
    </div>
  )
}
