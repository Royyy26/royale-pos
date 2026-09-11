import { create } from 'zustand'
import { ROLE_PERMISSIONS } from '@/lib/rbac'
import { useDataStore } from './useDataStore'
import type { Permission, User } from '@/types'

const SESSION_KEY = 'royale-pos-session'

interface AuthState {
  user: User | null
  permissions: Permission[]
  hydrated: boolean

  hydrate: () => void
  login: (username: string, pin: string) => { ok: true; user: User } | { ok: false; message: string }
  loginAs: (user: User) => void
  logout: () => void
  has: (permission: Permission | Permission[]) => boolean
}

function readSession(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function writeSession(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(SESSION_KEY, userId)
    else window.localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage tidak tersedia, sesi hanya bertahan di memori */
  }
}

function permissionsFor(user: User): Permission[] {
  const role = useDataStore.getState().db.roles.find((r) => r.id === user.role_id)
  return role?.permissions ?? ROLE_PERMISSIONS[user.role_id] ?? []
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  hydrated: false,

  hydrate: () => {
    const id = readSession()
    if (!id) {
      set({ hydrated: true })
      return
    }
    const user = useDataStore.getState().db.users.find((u) => u.id === id) ?? null
    set({ user, permissions: user ? permissionsFor(user) : [], hydrated: true })
  },

  login: (username, pin) => {
    const users = useDataStore.getState().db.users
    const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())
    if (!user) return { ok: false as const, message: 'Username tidak ditemukan.' }
    if (user.status !== 'active') return { ok: false as const, message: 'Akun tidak aktif. Hubungi owner.' }
    if (user.pin !== pin) return { ok: false as const, message: 'PIN salah. Coba lagi.' }

    const logged: User = { ...user, last_login_at: new Date().toISOString() }
    useDataStore.getState().saveUser(logged, logged)
    useDataStore.getState().log(logged.id, logged.name, 'login', 'Masuk ke sistem', null)
    writeSession(logged.id)
    set({ user: logged, permissions: permissionsFor(logged) })
    return { ok: true as const, user: logged }
  },

  loginAs: (user) => {
    const logged: User = { ...user, last_login_at: new Date().toISOString() }
    useDataStore.getState().log(logged.id, logged.name, 'login', 'Masuk ke sistem (akses cepat demo)', null)
    writeSession(logged.id)
    set({ user: logged, permissions: permissionsFor(logged) })
  },

  logout: () => {
    const user = get().user
    if (user) useDataStore.getState().log(user.id, user.name, 'logout', 'Keluar dari sistem', null)
    writeSession(null)
    set({ user: null, permissions: [] })
  },

  has: (permission) => {
    const list = Array.isArray(permission) ? permission : [permission]
    const owned = get().permissions
    return list.some((p) => owned.includes(p))
  },
}))
