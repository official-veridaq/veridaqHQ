import { Providers } from "@/components/providers"
import { Footer } from "@/components/ui/footer"
import { ScrollEffectsProvider } from "@/components/ui/scroll-effects"
import { ScrollIndicator } from "@/components/ui/scroll-indicator"
import { ToastContainer } from "@/components/ui/toast"
import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "VERIDAQ",
  description:
    "Censor-Resistant Academic Truth. Zero-Knowledge Proofs for academic truth.",
  icons: {
    icon: "/logo-white.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05050a" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <Providers>
          <ScrollEffectsProvider />
          <div className="flex min-w-0 flex-1 shrink-0 flex-col">{children}</div>
          <Footer />
          <ScrollIndicator />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
