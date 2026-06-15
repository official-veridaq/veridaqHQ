/**
 * Axios API client configured for the VERIDAQ backend.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

const BASE_URL = process.env["NEXT_PUBLIC_BACKEND_URL"] ?? "http://localhost:4000"

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
})

let accessToken: string | null = null
let refreshing = false
let refreshSubscribers: ((token: string | null) => void)[] = []

export function setAccessToken(token: string | null) {
  accessToken = token
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type")
  }
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && original && !original._retry) {
      if (refreshing) {
        return new Promise((resolve, reject) => {
          original._retry = true
          refreshSubscribers.push((token) => {
            if (!token) return reject(error)
            original.headers.set("Authorization", `Bearer ${token}`)
            resolve(api(original))
          })
        })
      }

      original._retry = true
      refreshing = true

      try {
        const { data } = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )
        setAccessToken(data.accessToken)
        original.headers.set("Authorization", `Bearer ${data.accessToken}`)
        onRefreshed(data.accessToken)
        return api(original)
      } catch (refreshError) {
        setAccessToken(null)
        onRefreshed(null) // clear queue so they reject
        if (typeof window !== "undefined") {
          const path = window.location.pathname
          // Avoid redirect loop — if already on a login page, do nothing
          if (
            path === "/institution/login" ||
            path === "/employer/login" ||
            path === "/admin/login"
          ) {
            // already there, no redirect needed
          } else if (path.startsWith("/institution")) {
            window.location.href = "/institution/login"
          } else if (path.startsWith("/employer")) {
            window.location.href = "/employer/login"
          } else if (path.startsWith("/admin")) {
            window.location.href = "/admin/login"
          } else if (
            path.includes("/dashboard") ||
            path.includes("/verify") ||
            path.includes("/institutions") ||
            path.includes("/employers") ||
            path.includes("/batches") ||
            path.includes("/history") ||
            path.includes("/claims")
          ) {
            window.location.href = "/"
          }
        }
        return Promise.reject(refreshError)
      } finally {
        refreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export async function downloadReport(requestId: string) {
  const { data, headers } = await api.get(`/verify/report/${requestId}`, {
    responseType: "blob",
  })
  const disposition = headers["content-disposition"] ?? ""
  const match = disposition.match(/filename="?(.+?)"?$/)
  const filename = match?.[1] ?? `veridaq-report-${requestId}.pdf`

  const url = window.URL.createObjectURL(new Blob([data], { type: "application/pdf" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export default api
