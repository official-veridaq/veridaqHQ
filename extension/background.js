importScripts("config.js")

const ext = typeof chrome !== "undefined" ? chrome : browser

// ─── Session Management ──────────────────────────────────────────────────────

async function getRefreshTokenCookie() {
  return new Promise((resolve) => {
    ext.cookies.get(
      { url: VERIDAQ_CONFIG.BACKEND_URL, name: "refreshToken" },
      (cookie) => resolve(cookie ? cookie.value : null)
    )
  })
}

async function exchangeExtensionToken() {
  const refreshToken = await getRefreshTokenCookie()
  if (!refreshToken) return null

  try {
    const res = await fetch(VERIDAQ_CONFIG.BACKEND_URL + "/api/auth/extension/token", {
      method: "POST",
      headers: { "x-refresh-token": refreshToken },
      credentials: "include",
    })

    if (!res.ok) return null
    const data = await res.json()
    if (!data || !data.accessToken) return null

    await ext.storage.session.set({
      veridaqToken: data.accessToken,
      veridaqUser: data.user,
      veridaqTokenExpiry: Date.now() + 4 * 60 * 1000, // 4 min (token expires in 5)
    })

    return data
  } catch {
    return null
  }
}

async function getSession() {
  const stored = await ext.storage.session.get([
    "veridaqToken",
    "veridaqUser",
    "veridaqTokenExpiry",
  ])

  if (stored.veridaqToken && stored.veridaqUser) {
    // Check if token is about to expire (within 30 seconds)
    if (stored.veridaqTokenExpiry && Date.now() > stored.veridaqTokenExpiry - 30000) {
      return exchangeExtensionToken()
    }
    return { accessToken: stored.veridaqToken, user: stored.veridaqUser }
  }

  return exchangeExtensionToken()
}

async function clearSession() {
  await ext.storage.session.remove(["veridaqToken", "veridaqUser", "veridaqTokenExpiry"])
}

// ─── API Proxy ───────────────────────────────────────────────────────────────

async function apiFetch(path, options) {
  const session = await getSession()
  if (!session) return { ok: false, status: 401, data: { error: "Not authenticated" } }

  const headers = Object.assign({}, options && options.headers ? options.headers : {})
  headers["Authorization"] = "Bearer " + session.accessToken

  try {
    const res = await fetch(
      VERIDAQ_CONFIG.BACKEND_URL + path,
      Object.assign({}, options, { headers })
    )

    // If 401, try to refresh once
    if (res.status === 401) {
      const refreshed = await exchangeExtensionToken()
      if (refreshed) {
        headers["Authorization"] = "Bearer " + refreshed.accessToken
        const retryRes = await fetch(
          VERIDAQ_CONFIG.BACKEND_URL + path,
          Object.assign({}, options, { headers })
        )
        const retryContentType = retryRes.headers.get("content-type") || ""
        const retryData = retryContentType.includes("application/json")
          ? await retryRes.json()
          : await retryRes.text()
        return { ok: retryRes.ok, status: retryRes.status, data: retryData }
      }
      await clearSession()
      return { ok: false, status: 401, data: { error: "Session expired" } }
    }

    const contentType = res.headers.get("content-type") || ""
    const data = contentType.includes("application/json") ? await res.json() : await res.text()
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    return { ok: false, status: 500, data: { error: err.message } }
  }
}

// ─── Redirect Handling ───────────────────────────────────────────────────────

function getPortalUrl(role) {
  const base = VERIDAQ_CONFIG.WEB_URL
  switch (role) {
    case "INSTITUTION": return base + "/institution/dashboard"
    case "EMPLOYER": return base + "/employer/dashboard"
    case "ADMIN": return base + "/admin/dashboard"
    default: return base
  }
}

// ─── Message Handler ─────────────────────────────────────────────────────────

ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return false

  switch (message.type) {
    case "veridaq.session":
      getSession()
        .then((session) => sendResponse({ session }))
        .catch(() => sendResponse({ session: null }))
      return true

    case "veridaq.refresh":
      exchangeExtensionToken()
        .then((session) => sendResponse({ session }))
        .catch(() => sendResponse({ session: null }))
      return true

    case "veridaq.logout":
      clearSession()
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }))
      return true

    case "veridaq.redirect":
      const url = getPortalUrl(message.role)
      ext.tabs.create({ url })
      sendResponse({ ok: true })
      return false

    case "veridaq.api":
      apiFetch(message.path, message.options)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, status: 500, data: { error: err.message } }))
      return true

    default:
      return false
  }
})

// ─── Auto-refresh alarm ──────────────────────────────────────────────────────

ext.alarms?.onAlarm?.addListener((alarm) => {
  if (alarm.name === "veridaq-session-refresh") {
    getSession().catch(() => {})
  }
})

// Set up periodic refresh (every 3 minutes)
ext.alarms?.create?.("veridaq-session-refresh", { periodInMinutes: 3 })
