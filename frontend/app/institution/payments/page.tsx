import { DashboardLayout } from "@/components/institution/layout"

export default function InstitutionPayments() {
  return (
    <DashboardLayout title="Payments">
      <div className="bg-void flex min-h-[60vh] items-center justify-center">
        <div className="border-surface-border bg-surface-card mx-auto max-w-md rounded-2xl border p-8 text-center shadow-2xl">
          <div className="bg-accent/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <span className="text-accent text-3xl font-bold">!</span>
          </div>
          <h1 className="text-foreground mb-2 text-2xl font-bold">Coming soon</h1>
          <p className="text-muted text-sm leading-relaxed">
            Payment history is under development and will appear here once available.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
