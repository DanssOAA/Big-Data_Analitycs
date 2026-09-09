import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'

export async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase()
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const found = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail)
    if (found) return found
    if (data.users.length < 1000) return null
  }
  throw new Error('No se pudo completar la comprobación de usuarios.')
}
