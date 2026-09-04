export const modules = [
  'dashboard', 'clients', 'sales', 'products', 'shipments',
  'activities', 'insights', 'documentation',
] as const

export const actions = ['view', 'create', 'update', 'delete'] as const

export type AppModule = (typeof modules)[number]
export type PermissionAction = (typeof actions)[number]
export type PermissionMap = Record<AppModule, Record<PermissionAction, boolean>>

export function emptyPermissions(): PermissionMap {
  return Object.fromEntries(
    modules.map((module) => [
      module,
      Object.fromEntries(actions.map((action) => [action, false])),
    ]),
  ) as PermissionMap
}
