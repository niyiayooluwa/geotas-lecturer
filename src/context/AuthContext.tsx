import React, { createContext, useContext, useEffect, useState } from "react"
import { api } from "@/lib/api"

export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(sessionStorage.getItem("token"))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
      if (!token) {
        setIsLoading(false)
        return
      }
      try {
        const userData = await api.get<User>("/me")
        setUser(userData)
      } catch (err) {
        console.error("Session restoration failed:", err)
        sessionStorage.removeItem("token")
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }
    loadSession()
  }, [token])

  const login = (newToken: string, userData: User) => {
    sessionStorage.setItem("token", newToken)
    setToken(newToken)
    setUser(userData)
  }

  const logout = () => {
    sessionStorage.removeItem("token")
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
