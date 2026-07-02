import { PrismaClient } from "@prisma/client"
import PDFDocument from "pdfkit"
import { resolve } from "path"

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const FONT_DIR = resolve(process.cwd(), "backend/src/assets/fonts")
const ORBITRON_PATH = resolve(FONT_DIR, "Orbitron-Variable.ttf")
const CAMBRIA_TTC = "/usr/share/fonts/truetype/msttcorefonts/CAMBRIA.TTC"
const LOGO_WHITE = resolve(process.cwd(), "frontend/public/logo-white.png")
const LOGO_BLACK = resolve(process.cwd(), "frontend/public/logo-black.png")

const NAVY = "#0f172a"
const WHITE = "#ffffff"
const FG = "#1e293b"
const MUTED = "#64748b"
const BORDER = "#e2e8f0"
const ROW_LIGHT = "#f8fafc"
const LINK = "#2563eb"
const GREEN_BG = "#f0fdf4"
const GREEN = "#16a34a"
const RED_BG = "#fef2f2"
const RED = "#dc2626"

export class ReportService {
  constructor(private prisma: PrismaClient) {}

  async buildVerificationReport(requestId: string, employerId: string) {
    const request = await this.prisma.verificationRequest.findFirst({
      where: { id: requestId, employerId },
      select: {
        id: true,
        institutionId: true,
        matricNumber: true,
        claimType: true,
        threshold: true,
        status: true,
        result: true,
        proofJson: true,
        txHash: true,
        createdAt: true,
        completedAt: true,
        institution: { select: { name: true, onChainId: true } },
        employer: { select: { name: true, email: true } },
        credential: { select: { commitment: true, nullifier: true, graduationYear: true } },
      },
    })

    if (!request) return { error: "NOT_FOUND" as const }
    if (!request.result || !request.completedAt) return { error: "NOT_READY" as const }

    const claim = await this.prisma.claimDefinition.findFirst({
      where: {
        institutionId: request.institutionId,
        claimCode: request.claimType,
        threshold: request.threshold,
      },
      select: { label: true, description: true },
    })

    const isVerified = request.result === "VERIFIED"
    const buffer = await this.renderPdf({
      requestId: request.id,
      institutionName: request.institution.name,
      institutionOnChainId: request.institution.onChainId,
      employerName: request.employer.name,
      employerEmail: request.employer.email,
      claimLabel: claim?.label ?? `Claim Type ${request.claimType}`,
      claimDescription: claim?.description ?? null,
      threshold: request.threshold,
      matricNumber: request.matricNumber,
      result: request.result,
      isVerified,
      txHash: request.txHash,
      credentialCommitment: request.credential?.commitment ?? null,
      credentialNullifier: request.credential?.nullifier ?? null,
      graduationYear: request.credential?.graduationYear ?? null,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
    })
    return { buffer }
  }

  private renderPdf(data: {
    requestId: string
    institutionName: string
    institutionOnChainId: string
    employerName: string
    employerEmail: string
    claimLabel: string
    claimDescription: string | null
    threshold: number
    matricNumber: string
    result: string
    isVerified: boolean
    txHash: string | null
    credentialCommitment: string | null
    credentialNullifier: string | null
    graduationYear: number | null
    createdAt: Date
    completedAt: Date
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 40 })
      const chunks: Buffer[] = []
      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.on("error", reject)

      doc.registerFont("Orbitron", ORBITRON_PATH)
      doc.registerFont("Cambria", CAMBRIA_TTC, "Cambria")

      const M = 40
      const CW = doc.page.width - M * 2
      const LX = M
      const PAGE_BOTTOM = doc.page.height - M

      let rowToggle = false

      // ── Row helper: renders label + value with alternating bg ─────
      function row(label: string, value: string, mono = false) {
        const rh = 14
        if (doc.y + rh > PAGE_BOTTOM) { doc.addPage(); rowToggle = false }
        rowToggle = !rowToggle
        const ry = doc.y
        doc.rect(LX, ry, CW, rh).fill(rowToggle ? ROW_LIGHT : WHITE)
        doc.fontSize(7.5).fillColor(MUTED).font("Cambria")
        doc.text(label, LX + 8, ry + 3, { width: 130 })
        doc.fillColor(FG)
        if (mono) doc.font("Courier").fontSize(6.5)
        else doc.font("Cambria").fontSize(7.5)
        doc.text(value, LX + 146, ry + 3, { width: CW - 160, lineBreak: false })
        doc.y = ry + rh
      }

      // ── Section heading ───────────────────────────────────────────
      function section(title: string) {
        if (doc.y + 30 > PAGE_BOTTOM) { doc.addPage(); rowToggle = false }
        doc.y += 8
        doc.fontSize(9).fillColor(NAVY).font("Orbitron")
        doc.text(title, LX, doc.y)
        doc.y += 2
        doc.rect(LX, doc.y, CW, 0.5).fill(BORDER)
        doc.y += 6
      }

      // ════════════════ HEADER ═══════════════════════════════════════
      doc.rect(0, 0, doc.page.width, 50).fill(NAVY)
      doc.rect(0, 50, doc.page.width, 1).fill(MUTED)

      doc.image(LOGO_WHITE, M, 13, { width: 24, height: 24 })
      doc.fontSize(15).fillColor(WHITE).font("Orbitron")
      doc.text("VERIDAQ", M + 32, 13)
      doc.fontSize(6.5).fillColor(MUTED).font("Cambria")
      doc.text("Credential Verification Report", M + 32, 31)

      doc.fontSize(8).fillColor(WHITE).font("Courier")
      const ref = data.requestId.slice(0, 8).toUpperCase()
      doc.text(`REF: ${ref}`, M, 13, { width: CW, align: "right" })
      doc.fontSize(6.5).fillColor(MUTED).font("Cambria")
      doc.text("CONFIDENTIAL", M, 27, { width: CW, align: "right" })

      doc.y = 60

      // ════════════════ RESULT BADGE ═════════════════════════════════
      const v = data.isVerified
      const bc = v ? GREEN : RED
      const bb = v ? GREEN_BG : RED_BG
      doc.roundedRect(LX, doc.y, CW, 28, 3).fill(bb)
      doc.roundedRect(LX, doc.y, CW, 28, 3).lineWidth(0.5).stroke(bc)
      doc.fontSize(12).fillColor(bc).font("Orbitron")
      doc.text(v ? "VERIFIED" : "NOT VERIFIED", LX + 12, doc.y + 6)
      doc.fontSize(6.5).fillColor(MUTED).font("Cambria")
      doc.text(v ? "Cryptographic proof verified on-chain" : "Proof verification failed or credential revoked", LX + 12, doc.y + 21)
      doc.y += 36

      // ════════════════ VERIFICATION DETAILS ═════════════════════════
      section("Verification Details")
      row("Institution", data.institutionName)
      row("Matriculation Number", data.matricNumber)
      row("Employer", data.employerName)
      row("Claim Type", data.claimLabel)
      row("Result", data.result.replace(/_/g, " "))
      row("Submitted", dateFormatter.format(data.createdAt))
      row("Completed", dateFormatter.format(data.completedAt))
      if (data.claimDescription) row("Description", data.claimDescription)
      if (data.threshold > 0) row("Threshold", `${data.threshold}`)
      if (data.graduationYear) row("Graduation Year", String(data.graduationYear))
      row("Institution Chain ID", data.institutionOnChainId, true)

      doc.y += 4

      // ════════════════ ON-CHAIN PROOF ═══════════════════════════════
      section("On-Chain Proof")
      row("Verification Method", "Groth16 Zero-Knowledge Proof")
      row("Network", "Stellar Soroban Testnet")
      if (data.txHash) {
        row("Transaction Hash", data.txHash, true)
        doc.y += 1
        const url = `https://stellar.expert/explorer/testnet/tx/${data.txHash}`
        doc.fontSize(6.5).fillColor(LINK).font("Courier")
        doc.text(url, LX + 8, doc.y, { width: CW - 16, link: url, underline: true, lineBreak: false })
        doc.y += 13
      }
      doc.y += 4

      // ════════════════ ZERO-KNOWLEDGE PROOF ═════════════════════════
      section("Zero-Knowledge Proof")
      const zkpNote = "The following values are stored on-chain and were verified using a Groth16 zero-knowledge proof."
      doc.fontSize(6.5).fillColor(MUTED).font("Cambria")
      doc.text(zkpNote, LX + 8, doc.y, { width: CW - 16, lineBreak: false })
      doc.y += 11

      if (data.credentialCommitment) row("Poseidon Commitment", data.credentialCommitment, true)
      if (data.credentialNullifier) row("Nullifier", data.credentialNullifier, true)

      doc.y += 5

      // ════════════════ AUTHENTICITY SEAL ════════════════════════════
      section("Authenticity Seal")

      const sa = doc.y
      doc.roundedRect(LX, sa, CW, 38, 3).fill(ROW_LIGHT)
      doc.roundedRect(LX, sa, CW, 38, 3).lineWidth(0.5).stroke(BORDER)

      doc.image(LOGO_BLACK, LX + 12, sa + 7, { width: 24, height: 24 })

      doc.fontSize(8).fillColor(NAVY).font("Orbitron")
      doc.text("VERIFIED BY VERIDAQ", LX + 44, sa + 6)
      doc.fontSize(6.5).fillColor(MUTED).font("Cambria")
      doc.text("This verification is independently verifiable on the Stellar blockchain.", LX + 44, sa + 20)
      doc.text("Verify the transaction hash at stellar.expert/explorer/testnet.", LX + 44, sa + 29)

      doc.y = sa + 46

      // ════════════════ FOOTER ═══════════════════════════════════════
      const fh = 30
      const fy = PAGE_BOTTOM - fh
      doc.rect(0, fy, doc.page.width, fh).fill(NAVY)
      doc.rect(0, fy, doc.page.width, 0.5).fill(MUTED)
      doc.fontSize(6).fillColor(MUTED).font("Cambria")
      doc.text(`Generated ${dateFormatter.format(new Date())}  ·  Report ${data.requestId}`, M, fy + 8, { width: CW, align: "center" })
      doc.fontSize(5.5).fillColor(MUTED).font("Cambria")
      doc.text("VERIDAQ — Censor-Resistant Academic Truth", M, fy + 19, { width: CW, align: "center" })

      doc.end()
    })
  }
}
