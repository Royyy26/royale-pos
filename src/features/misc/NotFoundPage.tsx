import { useNavigate } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HOME_ROUTE } from '@/app/navigation'
import { useAuthStore } from '@/store/useAuthStore'

export function NotFoundPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-ink-100 text-ink-400">
        <Compass className="h-9 w-9" />
      </div>
      <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.16em] text-brand-600">Error 404</p>
      <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink-900">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-500">
        Alamat yang Anda tuju tidak tersedia atau telah dipindahkan. Kembali ke halaman utama untuk melanjutkan
        pekerjaan.
      </p>
      <Button
        className="mt-6"
        size="lg"
        leftIcon={<Home className="h-4 w-4" />}
        onClick={() => navigate(user ? HOME_ROUTE[user.role_id] : '/login')}
      >
        Kembali ke halaman utama
      </Button>
    </div>
  )
}
