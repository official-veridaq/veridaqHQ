"use client"
/**
 * Auth context — provides login, logout, and the current user to all components.
 * The access token lives in memory only; the refresh token is in an httpOnly cookie.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { api, setAccessToken } from "./api"

export type User = { id: string; email: string; name: string; role: string; kycApproved?: boolean }
type AuthCtx = {
  user: User | null
  loading: boolean
  login(email: string, password: string, role: "institution" | "employer" | "admin"): Promise<void>
  logout(): Promise<void>
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount, see if we can resolve a user session (if refresh cookie is present)
  useEffect(() => {
    async function initAuth() {
      try {
        // Will auto-trigger /refresh in api interceptor if it gets 401 and refresh token exists
        const { data } = await api.get("/auth/me")
        if (data && data.user) {
          setUser(data.user)
        }
      } catch {
        // Not authenticated
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    initAuth()
  }, [])

  const login = useCallback(
    async (email: string, password: string, role: "institution" | "employer" | "admin") => {
      const { data } = await api.post(`/auth/${role}/login`, { email, password })
      setAccessToken(data.accessToken)
      setUser(data.user)
    },
    []
  )

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout")
    } catch {
      /* ignore */
    }
    setAccessToken(null)
    setUser(null)
    window.location.href = "/" // Redirect to home so protected routes die gracefully
  }, [])

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  return useContext(Ctx)
}
