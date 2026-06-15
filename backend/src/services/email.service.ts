/**
 * EmailService — sends transactional emails via nodemailer.
 *
 * In development the service uses Ethereal (a free fake SMTP from nodemailer)
 * so you do not need a real mail server to test. Set NODE_ENV=production and
 * provide SMTP_* env vars to switch to a real provider.
 *
 * All templates are plain strings here. If the project grows, swap them out
 * for a proper template engine, but for now keeping it simple is better.
 */

import nodemailer, { type Transporter } from "nodemailer"
import { config } from "../config/index.js"

type CredentialIssuedOptions = {
  to: string
  studentName: string
  institution: string
  programme: string
  graduationYear: number
}

type VerificationResultOptions = {
  to: string
  employerName: string
  studentName: string
  claimType: string
  result: "VERIFIED" | "NOT_VERIFIED"
  txHash: string
}

type KycApprovalOptions = {
  to: string
  orgName: string
  role: "institution" | "employer"
}

type KycRejectionOptions = {
  to: string
  orgName: string
  role: "institution" | "employer"
  reason: string
}

type PasswordResetOptions = {
  to: string
  name: string
  role: "admin" | "institution" | "employer"
  token: string
}

type NewRegistrationAdminAlertOptions = {
  role: "institution" | "employer"
  orgName: string
  email: string
}

type InstitutionDeactivationOptions = {
  to: string
  orgName: string
  reason: string
  date: string
}

type EmployerDeactivationOptions = {
  to: string
  orgName: string
  reason: string
  date: string
}

// ─── Transport builder ────────────────────────────────────────────────────────

async function buildTransport(): Promise<Transporter> {
  if (config.NODE_ENV !== "production") {
    // Use Ethereal in dev/test so no real mail is ever sent during development
    const testAccount = await nodemailer.createTestAccount()
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    })
  }

  // Production: expects SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  })
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class EmailService {
  private transport: Transporter | null = null

  private async getTransport(): Promise<Transporter> {
    if (!this.transport) {
      this.transport = await buildTransport()
    }
    return this.transport
  }

  /**
   * Notify a student that their academic credential has been registered on-chain.
   * This is the only email a student ever receives from the system.
   */
  async sendCredentialIssued(opts: CredentialIssuedOptions): Promise<void> {
    const transport = await this.getTransport()

    const text = `
Hello ${opts.studentName},

Your academic credential from ${opts.institution} has been registered on the VERIDAQ platform.

Programme:       ${opts.programme}
Graduation year: ${opts.graduationYear}

When an employer requests verification of your academic qualifications, VERIDAQ uses
a Zero-Knowledge Proof to confirm your credentials without disclosing your personal
data to the blockchain or to the employer beyond what they specifically requested.

You do not need to take any action.

VERIDAQ Platform
    `.trim()

    const info = await transport.sendMail({
      from: config.EMAIL_FROM ?? "VERIDAQ <noreply@veridaq.xyz>",
      to: opts.to,
      subject: "Your academic credential has been registered — VERIDAQ",
      text,
    })

    // In dev, log the Ethereal preview URL so you can inspect the email
    if (config.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info)
      console.log(`[EmailService] Credential issued preview: ${previewUrl}`)
    }
  }

  /**
   * Send an employer the result of a credential verification.
   * Includes the on-chain transaction hash as proof that the ZKP was verified
   * by the smart contract, not just by the backend.
   */
  async sendVerificationResult(opts: VerificationResultOptions): Promise<void> {
    const transport = await this.getTransport()

    const outcome =
      opts.result === "VERIFIED"
        ? "VERIFIED — the claimed credential has been confirmed by an on-chain ZKP"
        : "NOT VERIFIED — the claim could not be confirmed"

    const text = `
Hello ${opts.employerName},

Here is the result of your credential verification request on VERIDAQ.

Candidate:       ${opts.studentName}
Claim:           ${opts.claimType}
Result:          ${outcome}
Blockchain proof: https://sepolia.basescan.org/tx/${opts.txHash}

The verification result above was produced by a Groth16 Zero-Knowledge Proof and
validated by the VERIDAQ smart contract on Base Sepolia. The linked transaction
hash is the on-chain record.

VERIDAQ Platform
    `.trim()

    const info = await transport.sendMail({
      from: config.EMAIL_FROM ?? "VERIDAQ <noreply@veridaq.xyz>",
      to: opts.to,
      subject: `Credential Verification: ${opts.result} — VERIDAQ`,
      text,
    })

    if (config.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info)
      console.log(`[EmailService] Verification result preview: ${previewUrl}`)
    }
  }

  /**
   * Tell an institution or employer their KYC application was approved.
   * Sent by the admin when they mark the account as kycApproved.
   */
  async sendKycApproval(opts: KycApprovalOptions): Promise<void> {
    const transport = await this.getTransport()

    const portalUrl =
      opts.role === "institution"
        ? `${config.FRONTEND_URL}/institution/login`
        : `${config.FRONTEND_URL}/employer/login`

    const text = `
Hello ${opts.orgName},

Your ${opts.role} account on VERIDAQ has been approved.

You can now log in at: ${portalUrl}

VERIDAQ Platform
    `.trim()

    await transport.sendMail({
      from: config.EMAIL_FROM ?? "VERIDAQ <noreply@veridaq.xyz>",
      to: opts.to,
      subject: "Your VERIDAQ account has been approved",
      text,
    })
  }

  /**
   * Tell an institution or employer their KYC application was rejected.
   * Includes the admin-provided rejection reason.
   */
  async sendKycRejection(opts: KycRejectionOptions): Promise<void> {
    const transport = await this.getTransport()

    const text = `
Hello ${opts.orgName},

Unfortunately your ${opts.role} account application on VERIDAQ was not approved.

Reason: ${opts.reason}

If you believe this is an error, reply to this email with supporting documents.

VERIDAQ Platform
    `.trim()

    await transport.sendMail({
      from: config.EMAIL_FROM ?? "VERIDAQ <noreply@veridaq.xyz>",
      to: opts.to,
      subject: "Your VERIDAQ account application was not approved",
      text,
    })
  }

  /**
   * Send a password reset link to the user.
   */
  async sendPasswordReset(opts: PasswordResetOptions): Promise<void> {
    const transport = await this.getTransport()

    // We send a token which the client can use on a frontend route
    const resetUrl = `${config.FRONTEND_URL}/${opts.role}/reset-password?token=${opts.token}`

    const text = `
Hello ${opts.name},

You requested a password reset for your VERIDAQ ${opts.role} account.
Please click the link below to set a new password:

${resetUrl}

This link will expire in 1 hour. If you did not request this, please ignore this email.

VERIDAQ Platform
    `.trim()

    const info = await transport.sendMail({
      from: config.EMAIL_FROM ?? "VERIDAQ <noreply@veridaq.xyz>",
      to: opts.to,
      subject: "Password Reset Request — VERIDAQ",
      text,
    })

    if (config.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info)
      console.log(`[EmailService] Password Reset preview: ${previewUrl}`)
    }
  }

  /**
   * Alert the platform admin that a new entity has registered and awaits KYC review.
   */
  async sendNewRegistrationAdminAlert(opts: NewRegistrationAdminAlertOptions): Promise<void> {
    const transport = await this.getTransport()
    const text = `
Admin Alert:

A new ${opts.role} has registered on VERIDAQ and is awaiting KYC approval.

Organization: ${opts.orgName}
Contact Email: ${opts.email}

Please log in to the Admin Portal to review their application.
    `.trim()

    // Assuming the main admin contact is configured, otherwise fallback
    const adminEmail = config.EMAIL_FROM ?? "admin@veridaq.xyz"

    await transport.sendMail({
      from: `"VERIDAQ" <noreply@veridaq.xyz>`,
      to: adminEmail,
      subject: `[Action Required] New ${opts.role.toUpperCase()} Registration: ${opts.orgName}`,
      text,
    })
  }

  /**
   * Send an alert when an institution is deactivated by the admin.
   */
  async sendInstitutionDeactivationAlert(opts: InstitutionDeactivationOptions): Promise<void> {
    const transport = await this.getTransport()
    const text = `
Hello ${opts.orgName},

Your institution account on VERIDAQ has been officially deactivated by the platform administrators as of ${opts.date}.

Reason provided: 
${opts.reason}

Note: Pre-existing verified credentials issued by your institution prior to this date will remain verifiable by employers, but you can no longer login, issue new credentials or modify existing ones.

Please reply to this email for further clarification or appeals.
VERIDAQ Platform
    `.trim()

    const info = await transport.sendMail({
      from: config.EMAIL_FROM ?? "VERIDAQ Support <noreply@veridaq.xyz>",
      to: opts.to,
      subject: `Important: Institution Account Deactivated`,
      text,
    })

    if (config.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info)
      console.log(`[EmailService] Deactivation Alert preview: ${previewUrl}`)
    }
  }

  /**
   * Send an alert when an employer is deactivated by the admin.
   */
  async sendEmployerDeactivationAlert(opts: EmployerDeactivationOptions): Promise<void> {
    const transport = await this.getTransport()
    const text = `
Hello ${opts.orgName},

Your employer account on VERIDAQ has been officially deactivated by the platform administrators as of ${opts.date}.

Reason provided: 
${opts.reason}

Note: Previously completed verification requests will remain accessible, but you can no longer submit new verification requests or log in.

Please reply to this email for further clarification or appeals.
VERIDAQ Platform
    `.trim()

    const info = await transport.sendMail({
      from: config.EMAIL_FROM ?? "VERIDAQ Support <noreply@veridaq.xyz>",
      to: opts.to,
      subject: `Important: Employer Account Deactivated`,
      text,
    })

    if (config.NODE_ENV !== "production") {
      const previewUrl = nodemailer.getTestMessageUrl(info)
      console.log(`[EmailService] Employer Deactivation Alert preview: ${previewUrl}`)
    }
  }
}
