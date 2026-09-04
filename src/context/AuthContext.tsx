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
import {
  emptyPermissions,
  type AppModule,
  type PermissionAction,
  type PermissionMap,
} from '../types/permission.types'

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
  permissions: PermissionMap
  can: (module: AppModule, action?: PermissionAction) => boolean
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

  const role: UserRole =
    profile?.role === 'admin' || profile?.role === 'analyst'
      ? profile.role
      : 'worker'

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
  const [permissions, setPermissions] = useState<PermissionMap>(emptyPermissions())

  const loadPermissions = async (mappedUser: AuthUser | null) => {
    const next = emptyPermissions()
    if (!mappedUser) {
      setPermissions(next)
      return
    }
    if (mappedUser.role === 'admin') {
      Object.values(next).forEach((module) =>
        Object.keys(module).forEach((action) => {
          module[action as PermissionAction] = true
        }),
      )
      setPermissions(next)
      return
    }
    const { data } = await supabase
      .from('user_permissions')
      .select('module, can_view, can_create, can_update, can_delete')
      .eq('user_id', mappedUser.id)
    for (const row of data ?? []) {
      const module = row.module as AppModule
      if (next[module]) {
        next[module] = {
          view: row.can_view,
          create: row.can_create,
          update: row.can_update,
          delete: row.can_delete,
        }
      }
    }
    setPermissions(next)
  }

  useEffect(() => {
    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          void mapUser(
            session?.user,
          ).then((mappedUser) => {
            setUser(mappedUser)
            void loadPermissions(mappedUser).finally(() => setLoading(false))
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

    const mappedUser = await mapUser(data.user)
    setUser(mappedUser)
    await loadPermissions(mappedUser)

    return { success: true }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPermissions(emptyPermissions())
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAdmin: user?.role === 'admin',
      permissions,
      can: (module: AppModule, action: PermissionAction = 'view') =>
        user?.role === 'admin' || permissions[module][action],
    }),
    [user, loading, permissions],
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
