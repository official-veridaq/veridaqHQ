import { createHmac, timingSafeEqual } from "crypto"
import pino from "pino"
import { config } from "../config/index.js"

const log = pino({ name: "crossmint-service" })

const CROSSMINT_API = "https://www.crossmint.com/api/2022-06-09"

// USDC on Base Sepolia (Crossmint-supported token locator)
const USDC_BASE_SEPOLIA = "base-sepolia:0x036CbD53842c5426634e7929541eC2318f3dCF7e"
const USDC_BASE_MAINNET = "base:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

type CrossmintWebhookPayload = {
  type: string
  orderId: string
  status: string
  recipient?: { walletAddress?: string }
  lineItems?: Array<{ tokenLocator?: string; amount?: string }>
  payment?: { currency?: string; total?: string }
}

export class CrossmintService {
  getApiBase(): string {
    return CROSSMINT_API
  }

  getUsdcTokenLocator(): string {
    return config.NODE_ENV === "production" ? USDC_BASE_MAINNET : USDC_BASE_SEPOLIA
  }

  /**
   * Create a Crossmint order via server-side REST API.
   * Returns the checkout URL that the frontend opens in a popup.
   */
  async createOrder(params: {
    amountUsd: number
    walletAddress: string
    email?: string
    orderId: string
  }): Promise<{ checkoutUrl: string; orderId: string }> {
    const apiKey = config.CROSSMINT_SERVER_API_KEY
    if (!apiKey) {
      throw new Error("CROSSMINT_SERVER_API_KEY is not configured")
    }

    const response = await fetch(`${CROSSMINT_API}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        lineItems: [
          {
            tokenLocator: this.getUsdcTokenLocator(),
            executionParameters: {
              mode: "exact-in",
              amount: String(params.amountUsd),
            },
          },
        ],
        payment: {
          method: "card",
          ...(params.email ? { receiptEmail: params.email } : {}),
        },
        recipient: {
          walletAddress: params.walletAddress,
        },
        metadata: {
          orderId: params.orderId,
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown")
      log.error({ status: response.status, body: errorBody }, "Crossmint order creation failed")
      throw new Error(`Crossmint API error: ${response.status}`)
    }

    const data = await response.json() as {
      order?: { orderId: string; checkoutUrl?: string }
      checkoutUrl?: string
    }

    const checkoutUrl = data.checkoutUrl ?? data.order?.checkoutUrl
    const orderId = data.order?.orderId ?? params.orderId

    if (!checkoutUrl) {
      log.error({ data }, "Crossmint response missing checkoutUrl")
      throw new Error("Missing checkout URL in Crossmint response")
    }

    log.info({ orderId, amountUsd: params.amountUsd }, "Crossmint order created")
    return { checkoutUrl, orderId }
  }

  /**
   * Verify a Crossmint webhook signature.
   * Crossmint signs webhooks with HMAC-SHA256 using the webhook secret.
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = config.CROSSMINT_WEBHOOK_SECRET
    if (!secret) {
      log.warn("CROSSMINT_WEBHOOK_SECRET not configured — skipping webhook verification")
      return true
    }

    try {
      const expectedSig = createHmac("sha256", secret).update(payload).digest("hex")
      const actualSig = signature.toLowerCase()
      const expectedBuf = Buffer.from(expectedSig)
      const actualBuf = Buffer.from(actualSig)
      if (expectedBuf.length !== actualBuf.length) return false
      return timingSafeEqual(expectedBuf, actualBuf)
    } catch (err) {
      log.error({ err }, "Crossmint webhook signature verification failed")
      return false
    }
  }

  /**
   * Parse and validate a Crossmint webhook payload.
   */
  parseWebhookEvent(body: unknown): CrossmintWebhookPayload | null {
    if (!body || typeof body !== "object") return null
    const event = body as Record<string, unknown>
    if (typeof event.type !== "string") return null
    return event as CrossmintWebhookPayload
  }
}
