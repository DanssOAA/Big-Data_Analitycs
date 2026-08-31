import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../services/supabaseClient'

import type { AuthUser, UserRole } from '../types/auth.types'

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

async function mapUser(
  supabaseUser: {
    id: string
    email?: string | null
    user_metadata?: Record<string, unknown>
  } | null | undefined,
): Promise<AuthUser | null> {
  if (!supabaseUser) {
    return null
  }

  const metadata = supabaseUser.user_metadata ?? {}

  const { data: profile } =
    await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', supabaseUser.id)
      .maybeSingle()

  const role =
    profile?.role === 'admin'
      ? 'admin'
      : ('worker' as UserRole)

  const name =
    typeof profile?.full_name === 'string' &&
    profile.full_name.trim() !== ''
      ? profile.full_name
      : typeof metadata.full_name === 'string' &&
          metadata.full_name.trim() !== ''
        ? metadata.full_name
      : (supabaseUser.email ?? 'Usuario')

  return {
    id: supabaseUser.id,
    name,
    email: supabaseUser.email ?? '',
    role,
  }
}

function translateAuthError(message: string) {
  if (
    message
      .toLowerCase()
      .includes('invalid login credentials')
  ) {
    return 'Correo o contraseña incorrectos.'
  }

  return message
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          void mapUser(
            session?.user,
          ).then((mappedUser) => {
            setUser(mappedUser)
            setLoading(false)
          })
        },
      )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const login = async (
    email: string,
    password: string,
  ): Promise<LoginResult> => {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

    if (error || !data.user) {
      return {
        success: false,
        message: translateAuthError(
          error?.message ??
            'No se pudo iniciar sesion.',
        ),
      }
    }

    setUser(await mapUser(data.user))

    return { success: true }
  }

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
    throw new Error(
      'useAuth debe utilizarse dentro de AuthProvider',
    )
  }

  return context
}
