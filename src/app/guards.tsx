import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Leaf, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/useAuthStore'
import { HOME_ROUTE } from './navigation'
import type { Permission, RoleName } from '@/types'

/** Wajib login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)
  const location = useLocation()

  if (!hydrated) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

/** Wajib memiliki permission tertentu. */
export function RequirePermission({
  permission,
  roles,
  children,
}: {
  permission?: Permission | Permission[]
  roles?: RoleName[]
  children: ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  const has = useAuthStore((s) => s.has)

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role_id)) return <AccessDenied />
  if (permission && !has(permission)) return <AccessDenied />
  return <>{children}</>
}

export function AccessDenied() {
  const user = useAuthStore((s) => s.user)
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-danger-50 text-danger-500">
        <ShieldAlert className="h-9 w-9" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-ink-900">Akses Ditolak</h1>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-500">
        Role Anda tidak memiliki izin untuk membuka halaman ini. Hubungi owner apabila Anda merasa seharusnya
        memiliki akses.
      </p>
      <Button
        className="mt-6"
        size="lg"
        onClick={() => {
          window.location.href = user ? HOME_ROUTE[user.role_id] : '/login'
        }}
      >
        Kembali ke halaman utama
      </Button>
    </div>
  )
}

export function FullScreenLoader({ message = 'Menyiapkan sistem…' }: { message?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--app-bg)]">
      <div className="flex flex-col items-center">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-2xl bg-brand-100" />
          <div className="absolute inset-0 grid place-items-center animate-pulse-soft text-brand-700">
            <Leaf className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-5 h-1 w-40 overflow-hidden rounded-full bg-ink-200">
          <div className="h-full w-1/2 animate-[shimmer_1.2s_infinite] rounded-full bg-brand-500" />
        </div>
        <p className="mt-4 text-[13px] font-medium text-ink-500">{message}</p>
      </div>
    </div>
  )
}

/** Arahkan pengguna ke halaman utama sesuai role. */
export function RoleHomeRedirect() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={HOME_ROUTE[user.role_id]} replace />
}
