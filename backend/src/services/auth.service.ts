/**
 * AuthService — handles login, token generation, and token refresh for all actors.
 *
 * JWTs are signed with the access secret (short-lived, 15 min).
 * Refresh tokens are signed with the refresh secret (7 days) and stored in
 * an httpOnly cookie on the client.
 */

import { PrismaClient } from "@prisma/client"
import bcryptjs from "bcryptjs"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import pino from "pino"
import { encrypt } from "../utils/crypto.js"
import { config } from "../config/index.js"
import { EmailService } from "./email.service.js"

const log = pino({ name: "auth-service" })

type Actor = { id: string; email: string; role: "ADMIN" | "INSTITUTION" | "EMPLOYER" }

function signTokens(actor: Actor) {
  const payload = { sub: actor.id, email: actor.email, role: actor.role }
  const accessExpiresIn = (config.JWT_EXPIRES_IN ?? "15m") as Exclude<
    jwt.SignOptions["expiresIn"],
    undefined
  >
  const refreshExpiresIn = (config.REFRESH_EXPIRES_IN ?? "7d") as Exclude<
    jwt.SignOptions["expiresIn"],
    undefined
  >
  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: accessExpiresIn,
  })

  const refreshToken = jwt.sign(payload, config.REFRESH_SECRET, {
    expiresIn: refreshExpiresIn,
  })

  return { accessToken, refreshToken }
}

function signExtensionToken(actor: Actor) {
  const payload = { sub: actor.id, email: actor.email, role: actor.role, aud: "extension" }
  const accessExpiresIn = (config.EXTENSION_JWT_EXPIRES_IN ?? "5m") as Exclude<
    jwt.SignOptions["expiresIn"],
    undefined
  >
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: accessExpiresIn })
}

export class AuthService {
  private emailService: EmailService

  constructor(private prisma: PrismaClient) {
    this.emailService = new EmailService()
  }

  // ─── Registration ─────────────────────────────────────────────────────────

  async registerEmployer(data: {
    name: string
    cacNumber: string
    email: string
    password: string
  }) {
    const existing = await this.prisma.employer.findUnique({ where: { email: data.email } })
    if (existing) throw new Error("Email already registered")

    const existingCac = await this.prisma.employer.findUnique({
      where: { cacNumber: data.cacNumber },
    })
    if (existingCac) throw new Error("CAC number already registered")

    const passwordHash = await bcryptjs.hash(data.password, 12)
    const walletAddress = `0x${crypto.randomBytes(20).toString("hex")}`

    const emp = await this.prisma.employer.create({
      data: {
        name: data.name,
        cacNumber: data.cacNumber,
        email: data.email,
        passwordHash,
        walletAddress,
        kycApproved: false,
        active: true,
      },
    })

    // Fire & forget admin alert
    this.emailService
      .sendNewRegistrationAdminAlert({
        role: "employer",
        orgName: emp.name,
        email: emp.email,
      })
      .catch((e) => log.error({ err: e }, "Failed to send admin alert for employer registration"))

    return { id: emp.id, email: emp.email, kycApproved: emp.kycApproved }
  }

  async registerInstitution(data: {
    name: string
    email: string
    publicKey: string
    institutionKey?: string
    password: string
  }) {
    const existing = await this.prisma.institution.findUnique({ where: { email: data.email } })
    if (existing) throw new Error("Email already registered")

    const passwordHash = await bcryptjs.hash(data.password, 12)

    // Auto-generate a provisional onChainId as a bytes32 hex string based on name & randomness
    const nameHash = crypto.createHash("sha256").update(data.name).digest("hex")
    // Needs 0x prefix to match expectations
    const provisionalOnChainId = "0x" + nameHash

    const institutionKeyHex = data.institutionKey
      ? data.institutionKey.startsWith("0x")
        ? data.institutionKey.slice(2)
        : data.institutionKey
      : crypto.randomBytes(32).toString("hex")

    const { encryptedData, encryptedIv, encryptedTag } = encrypt(institutionKeyHex)

    const adminWallet = config.PLATFORM_ADMIN_PUBLIC_KEY
      ?? ""

    const inst = await this.prisma.institution.create({
      data: {
        name: data.name,
        email: data.email,
        adminWallet,
        publicKey: data.publicKey,
        institutionKeyEncrypted: encryptedData,
        institutionKeyIv: encryptedIv,
        institutionKeyTag: encryptedTag,
        passwordHash,
        onChainId: provisionalOnChainId,
        kycApproved: false,
        active: true,
      },
    })

    // Fire & forget admin alert
    this.emailService
      .sendNewRegistrationAdminAlert({
        role: "institution",
        orgName: inst.name,
        email: inst.email,
      })
      .catch((e) => log.error({ err: e }, "Failed to send admin alert for institution registration"))

    return { id: inst.id, email: inst.email, kycApproved: inst.kycApproved }
  }

  // ─── Login ───────────────────────────────────────────────────────────────

  async loginInstitution(email: string, password: string) {
    const inst = await this.prisma.institution.findUnique({ where: { email } })
    if (!inst || !inst.active) return null

    const ok = await bcryptjs.compare(password, inst.passwordHash)
    if (!ok) return null

    const tokens = signTokens({ id: inst.id, email: inst.email, role: "INSTITUTION" })
    return {
      ...tokens,
      user: {
        id: inst.id,
        email: inst.email,
        name: inst.name,
        role: "INSTITUTION",
        kycApproved: inst.kycApproved,
      },
    }
  }

  async loginEmployer(email: string, password: string) {
    const emp = await this.prisma.employer.findUnique({ where: { email } })
    if (!emp || !emp.active) return null

    const ok = await bcryptjs.compare(password, emp.passwordHash)
    if (!ok) return null

    const tokens = signTokens({ id: emp.id, email: emp.email, role: "EMPLOYER" })
    return {
      ...tokens,
      user: {
        id: emp.id,
        email: emp.email,
        name: emp.name,
        role: "EMPLOYER",
        kycApproved: emp.kycApproved,
      },
    }
  }

  async loginAdmin(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } })
    if (!admin) return null

    const ok = await bcryptjs.compare(password, admin.passwordHash)
    if (!ok) return null

    const tokens = signTokens({ id: admin.id, email: admin.email, role: "ADMIN" })
    return {
      ...tokens,
      user: { id: admin.id, email: admin.email, name: admin.name, role: "ADMIN" },
    }
  }

  async refresh(token: string) {
    try {
      const payload = jwt.verify(token, config.REFRESH_SECRET) as {
        sub: string
        email: string
        role: "ADMIN" | "INSTITUTION" | "EMPLOYER"
      }

      const actor = { id: payload.sub, email: payload.email, role: payload.role }
      const { accessToken } = signTokens(actor)
      return { accessToken }
    } catch {
      return null
    }
  }

  async exchangeExtensionToken(token: string) {
    try {
      const payload = jwt.verify(token, config.REFRESH_SECRET) as {
        sub: string
        email: string
        role: "ADMIN" | "INSTITUTION" | "EMPLOYER"
      }

      let name = payload.email
      if (payload.role === "ADMIN") {
        const admin = await this.prisma.admin.findUnique({ where: { id: payload.sub } })
        if (admin) name = admin.name
      }
      if (payload.role === "INSTITUTION") {
        const inst = await this.prisma.institution.findUnique({ where: { id: payload.sub } })
        if (inst) name = inst.name
      }
      if (payload.role === "EMPLOYER") {
        const emp = await this.prisma.employer.findUnique({ where: { id: payload.sub } })
        if (emp) name = emp.name
      }

      const actor = { id: payload.sub, email: payload.email, role: payload.role }
      const accessToken = signExtensionToken(actor)
      return { accessToken, user: { id: actor.id, email: actor.email, role: actor.role, name } }
    } catch {
      return null
    }
  }

  // ─── Password Reset ───────────────────────────────────────────────────────

  async triggerPasswordReset(email: string, role: "admin" | "institution" | "employer") {
    type UserRecord = { id: string; email: string; name: string }
    let user: UserRecord | null = null

    if (role === "admin") {
      const record = await this.prisma.admin.findUnique({ where: { email } })
      if (record) user = record
    } else if (role === "institution") {
      const record = await this.prisma.institution.findUnique({ where: { email } })
      if (record) user = record
    } else if (role === "employer") {
      const record = await this.prisma.employer.findUnique({ where: { email } })
      if (record) user = record
    }

    if (!user) return false // Fail silently for security

    const resetToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex")
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    const updateData = { resetToken: tokenHash, resetTokenExpires }

    if (role === "admin")
      await this.prisma.admin.update({ where: { id: user.id }, data: updateData })
    else if (role === "institution")
      await this.prisma.institution.update({ where: { id: user.id }, data: updateData })
    else if (role === "employer")
      await this.prisma.employer.update({ where: { id: user.id }, data: updateData })

    // Send email with unhashed token
    await this.emailService.sendPasswordReset({
      to: user.email,
      name: user.name,
      role,
      token: resetToken,
    })

    return true
  }

  async executePasswordReset(
    token: string,
    newPassword: string,
    role: "admin" | "institution" | "employer"
  ) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    type ResettableUser = { id: string; email: string; resetToken: string | null; resetTokenExpires: Date | null }
    let user: ResettableUser | null = null
    const findQuery = {
      where: {
        resetToken: tokenHash,
        resetTokenExpires: { gt: new Date() }, // MUST not be expired
      },
    }

    if (role === "admin") user = await this.prisma.admin.findFirst(findQuery)
    else if (role === "institution") user = await this.prisma.institution.findFirst(findQuery)
    else if (role === "employer") user = await this.prisma.employer.findFirst(findQuery)

    if (!user) throw new Error("Invalid or expired reset token")

    const passwordHash = await bcryptjs.hash(newPassword, 12)
    const clearData = { passwordHash, resetToken: null, resetTokenExpires: null }

    if (role === "admin")
      await this.prisma.admin.update({ where: { id: user.id }, data: clearData })
    else if (role === "institution")
      await this.prisma.institution.update({ where: { id: user.id }, data: clearData })
    else if (role === "employer")
      await this.prisma.employer.update({ where: { id: user.id }, data: clearData })

    // Optional: Log this action into the Audit Log.
    await this.prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET_EXECUTED",
        details: { role, email: user.email },
        adminId: role === "admin" ? user.id : null,
        employerId: role === "employer" ? user.id : null,
        institutionId: role === "institution" ? user.id : null,
      },
    })

    return true
  }
}
