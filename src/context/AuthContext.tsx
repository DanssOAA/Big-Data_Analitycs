import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../lib/supabase'

import type { AuthUser } from '../types/auth.types'

interface LoginResult {
  success: boolean
  message?: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<LoginResult>
  logout: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ── Helpers ──────────────────────────────────────────────────

function buildAuthUser(
  id: string,
  email: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>,
): AuthUser {
  return {
    id,
    name: (metadata?.full_name as string) ?? email.split('@')[0],
    email,
    role: (metadata?.role as 'admin' | 'worker') ?? 'worker',
  }
}

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Recuperar sesión activa al cargar
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        const meta = session.user.user_metadata ?? {}
        setUser(
          buildAuthUser(session.user.id, session.user.email ?? '', meta),
        )
      }

      setLoading(false)
    }

    void init()

    // Escuchar cambios de sesión (login/logout desde otra pestaña, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata ?? {}
        setUser(
          buildAuthUser(session.user.id, session.user.email ?? '', meta),
        )
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Login con correo y contraseña
  const login = async (
    email: string,
    password: string,
  ): Promise<LoginResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error || !data.user) {
      return {
        success: false,
        message: error?.message ?? 'Credenciales incorrectas.',
      }
    }

    const meta = data.user.user_metadata ?? {}
    setUser(buildAuthUser(data.user.id, data.user.email ?? '', meta))

    return { success: true }
  }

  // Logout
  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAdmin: user?.role === 'admin',
    }),
    [user, loading],
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
    throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  }

  return context
}
