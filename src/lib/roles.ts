import type { SessionPayload } from './session'

/**
 * 中心化的角色策略 - 新增角色（如 store_manager）时改这里一处即可。
 */

export type Role = SessionPayload['role']

export function canReadRecycleRecords(role: Role): boolean {
  return role === 'boss'
}

export function canCreateRecycleRecords(role: Role): boolean {
  return role === 'boss' || role === 'employee'
}

export function canExportRecycleRecords(role: Role): boolean {
  return role === 'boss'
}

export function canDecryptRecycleId(role: Role): boolean {
  return role === 'boss'
}
