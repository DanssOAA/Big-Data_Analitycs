import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { AuthUser } from '../types/auth.types'

interface LoginResult {
  success: boolean
  message?: string
}

interface AuthContextValue {
  user: AuthUser | null
  login: (
    email: string,
    password: string,
    adminMode: boolean,
  ) => LoginResult
  logout: () => void
  isAdmin: boolean
}

const STORAGE_KEY = 'crm-insights-demo-user'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const DEMO_WORKER = {
  email: 'trabajador@crminsights.local',
  password: 'Trabajador123!',
}

const DEMO_ADMIN = {
  email: 'admin@crminsights.local',
  password: 'Admin123!',
}

function getStoredUser(): AuthUser | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return null
    }

    return JSON.parse(stored) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)

  const login = (
    email: string,
    password: string,
    adminMode: boolean,
  ): LoginResult => {
    const normalizedEmail = email.trim().toLowerCase()

    if (adminMode) {
      if (
        normalizedEmail !== DEMO_ADMIN.email ||
        password !== DEMO_ADMIN.password
      ) {
        return {
          success: false,
          message: 'Credenciales de administrador incorrectas.',
        }
      }

      const adminUser: AuthUser = {
        id: 'admin-001',
        name: 'Administrador',
        email: DEMO_ADMIN.email,
        role: 'admin',
      }

      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(adminUser),
      )

      setUser(adminUser)

      return {
        success: true,
      }
    }

    if (
      normalizedEmail !== DEMO_WORKER.email ||
      password !== DEMO_WORKER.password
    ) {
      return {
        success: false,
        message: 'Correo o contraseña incorrectos.',
      }
    }

    const workerUser: AuthUser = {
      id: 'worker-001',
      name: 'Trabajador',
      email: DEMO_WORKER.email,
      role: 'worker',
    }

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(workerUser),
    )

    setUser(workerUser)

    return {
      success: true,
    }
  }

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAdmin: user?.role === 'admin',
    }),
    [user],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de AuthProvider',
    )
  }

  return context
}
