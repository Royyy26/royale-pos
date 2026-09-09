import { useAuthStore } from '@/store/useAuthStore'
import { KasirDashboard } from './KasirDashboard'
import { OwnerDashboard } from './OwnerDashboard'
import { WarehouseDashboard } from './WarehouseDashboard'

/** Dashboard dipilih berdasarkan role pengguna yang sedang masuk. */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  if (!user) return null
  if (user.role_id === 'owner') return <OwnerDashboard />
  if (user.role_id === 'warehouse') return <WarehouseDashboard />
  return <KasirDashboard />
}
