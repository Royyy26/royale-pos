import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Delete, Eye, EyeOff, Lock, ShieldCheck, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/primitives'
import { cn, formatTime } from '@/lib/utils'
import { ROLE_META } from '@/lib/rbac'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { HOME_ROUTE } from '@/app/navigation'
import { toast } from '@/store/useToastStore'
import { Glyph } from '@/lib/glyphs'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const currentUser = useAuthStore((s) => s.user)
  const db = useDataStore((s) => s.db)

  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (currentUser) navigate(HOME_ROUTE[currentUser.role_id], { replace: true })
  }, [currentUser, navigate])

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    setError('')
    if (!username.trim()) return setError('Masukkan username terlebih dahulu.')
    if (pin.length < 4) return setError('PIN minimal 4 digit.')

    setLoading(true)
    setTimeout(() => {
      const result = login(username, pin)
      setLoading(false)
      if (!result.ok) {
        setError(result.message)
        setPin('')
        return
      }
      toast.success(`Selamat datang, ${result.user.name.split(' ')[0]}!`, ROLE_META[result.user.role_id].description)
      navigate(HOME_ROUTE[result.user.role_id], { replace: true })
    }, 450)
  }

  const quickLogin = (uname: string) => {
    setUsername(uname)
    setPin('1234')
    setError('')
  }

  const pressKey = (key: string) => {
    setError('')
    if (key === 'del') return setPin((p) => p.slice(0, -1))
    if (key === 'clear') return setPin('')
    if (pin.length >= 6) return
    setPin((p) => p + key)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel kiri: branding */}
      <div className="surface-dark relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-ink-950 shadow-[0_10px_30px_-8px_rgba(224,146,26,.7)]">
              <Glyph name={db.settings.logo_emoji} className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-[-0.02em] text-white">{db.settings.business_name}</p>
              <p className="text-[12.5px] text-ink-50/45">{db.settings.tagline}</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-400">Point of Sale System</p>
          <h1 className="mt-4 font-display text-[44px] font-bold leading-[1.06] tracking-tightest text-white">
            Kelola restoran Anda,
            <br />
            dari satu layar.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-50/55">
            Kasir, owner, dan tim gudang memakai sistem yang sama dengan hak akses
            yang berbeda.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Checkout Cepat', value: '< 30 dtk' },
              { label: 'Metode Bayar', value: '4 Kanal' },
              { label: 'Rekap Harian', value: 'Otomatis' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="figure text-[20px] text-brand-300">{s.value}</p>
                <p className="mt-1 text-[11.5px] text-ink-50/45">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[12.5px] text-ink-50/40">
          <ShieldCheck className="h-4 w-4" />
          Akses dilindungi PIN & kontrol berbasis role (RBAC)
        </div>
      </div>

      {/* Panel kanan: form */}
      <div className="flex flex-col justify-center bg-white px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-ink-950">
                <Glyph name={db.settings.logo_emoji} className="h-5 w-5" />
              </div>
              <p className="font-bold text-ink-900">{db.settings.business_name}</p>
            </div>
          </div>

          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-600">{formatTime(now)} · Selamat bekerja</p>
          <h2 className="mt-1.5 font-display text-[30px] font-bold tracking-tightest text-ink-900">Masuk ke sistem</h2>
          <p className="mt-1.5 text-[14px] text-ink-500">Gunakan username dan PIN yang diberikan oleh owner.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Input
              label="Username"
              name="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              placeholder="mis. kasir"
              leftIcon={<UserIcon className="h-4 w-4" />}
              autoComplete="username"
              autoFocus
            />

            <Input
              label="PIN"
              name="pin"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                setError('')
              }}
              placeholder="••••"
              leftIcon={<Lock className="h-4 w-4" />}
              className="tnum tracking-[0.35em]"
              autoComplete="current-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="mr-1 grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-600"
                  aria-label={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={error || undefined}
            />

            {/* Keypad, nyaman untuk layar sentuh */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => pressKey(k)}
                  className="h-12 rounded-xl border border-ink-200 bg-white font-display text-[18px] font-bold text-ink-800 transition-all hover:border-brand-300 hover:bg-brand-50/60 active:scale-95"
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={() => pressKey('clear')}
                className="h-12 rounded-xl border border-ink-200 bg-white text-[11px] font-bold uppercase tracking-[0.1em] text-ink-500 transition-all hover:bg-ink-50 active:scale-95"
              >
                HAPUS
              </button>
              <button
                type="button"
                onClick={() => pressKey('0')}
                className="h-12 rounded-xl border border-ink-200 bg-white font-display text-[18px] font-bold text-ink-800 transition-all hover:border-brand-300 hover:bg-brand-50/60 active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => pressKey('del')}
                className="grid h-12 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500 transition-all hover:bg-ink-50 active:scale-95"
                aria-label="Hapus satu digit"
              >
                <Delete className="h-[18px] w-[18px]" />
              </button>
            </div>

            <Button type="submit" size="xl" fullWidth loading={loading} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Masuk
            </Button>
          </form>

          {/* Akses cepat demo */}
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink-200" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">Akun demo</span>
              <span className="h-px flex-1 bg-ink-200" />
            </div>
            <div className="grid gap-2">
              {db.users
                .filter((u) => ['owner', 'kasir', 'gudang'].includes(u.username))
                .map((u) => {
                  const meta = ROLE_META[u.role_id]
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => quickLogin(u.username)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-3 text-left transition-all',
                        'hover:border-brand-400 hover:bg-brand-50/60 active:scale-[.99]',
                        username === u.username && 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20',
                      )}
                    >
                      <span className={cn('grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-[12px] font-bold text-white', meta.color)}>
                        {u.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[13.5px] font-bold text-ink-900">{meta.label}</span>
                        <span className="block truncate text-[11.5px] text-ink-500">
                          {u.username} · PIN 1234
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-ink-300" />
                    </button>
                  )
                })}
            </div>
            <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-400">
              Klik salah satu akun untuk mengisi kredensial, lalu tekan <b>Masuk</b>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
