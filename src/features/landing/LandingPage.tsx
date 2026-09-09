import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Receipt,
  ShieldCheck,
  Target,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EASE_OUT, FadeIn, Stagger, StaggerItem } from '@/components/ui/motion'
import HomeHeroLandingScrollAnimation from '@/components/ui/home-hero-landing-scroll-animation'
import { DEFAULT_SETTINGS } from '@/data/catalog'
import { Glyph } from '@/lib/glyphs'

/**
 * Halaman publik sebelum login. Di sinilah animasi scroll-pin berada —
 * bukan di dalam aplikasi kasir, yang harus langsung bisa dipakai.
 */

const FEATURES = [
  {
    icon: Zap,
    title: 'Checkout di bawah 30 detik',
    body: 'Grid menu bertombol besar, pencarian instan, pintasan papan ketik, dan kembalian yang dihitung otomatis.',
  },
  {
    icon: Receipt,
    title: 'Struk & faktur siap cetak',
    body: 'Struk thermal 80mm lengkap dengan QR verifikasi, plus faktur A4 formal. Cetak atau simpan sebagai PDF.',
  },
  {
    icon: Target,
    title: 'Target bulanan yang terukur',
    body: 'Tetapkan target omzet dan jumlah transaksi. Sistem menghitung laju, proyeksi akhir bulan, dan sisa per hari.',
  },
  {
    icon: Boxes,
    title: 'Stok berkurang sendiri',
    body: 'Setiap penjualan memotong stok, setiap void mengembalikannya. Lengkap dengan opname dan riwayat pergerakan.',
  },
  {
    icon: BarChart3,
    title: 'Analitik untuk pemilik',
    body: 'Tren per jam hingga per bulan, produk terlaris, komposisi pembayaran, dan estimasi laba beserta marginnya.',
  },
  {
    icon: ShieldCheck,
    title: 'Hak akses per peran',
    body: 'Kasir hanya menginput pesanan. Gudang hanya menyentuh stok. Pemilik memegang seluruh kendali dan audit log.',
  },
]

const ROLES = [
  { label: 'Kasir', desc: 'Input pesanan, pembayaran, rekap hari ini.', tone: 'bg-brand-500 text-ink-950' },
  { label: 'Owner', desc: 'Analitik, target, laporan, pengaturan.', tone: 'bg-ink-900 text-ink-50' },
  { label: 'Warehouse', desc: 'Inventori, penyesuaian, stok opname.', tone: 'bg-warning-500 text-white' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      {/* Bar navigasi mengambang */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-2xl border border-ink-200/70 bg-white/80 px-4 py-2.5 shadow-card backdrop-blur-xl">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-ink-950">
            <Glyph name={DEFAULT_SETTINGS.logo_emoji} className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[14px] font-bold leading-none tracking-[-0.02em] text-ink-900">
              {DEFAULT_SETTINGS.business_name}
            </p>
            <p className="mt-1 truncate text-[11px] text-ink-500">Point of Sale System</p>
          </div>
          <Link to="/login">
            <Button size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
              Masuk
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero scroll-pin */}
      <HomeHeroLandingScrollAnimation />

      {/* Angka ringkas */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Stagger className="grid gap-4 sm:grid-cols-3">
          {[
            { value: '3', label: 'Peran pengguna', sub: 'Kasir · Owner · Warehouse' },
            { value: '4', label: 'Kanal pembayaran', sub: 'Tunai · QRIS · Transfer · Kartu' },
            { value: '16', label: 'Tabel basis data', sub: 'Siap dipindah ke backend' },
          ].map((s) => (
            <StaggerItem
              key={s.label}
              className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card"
            >
              <p className="figure text-[40px] leading-none text-ink-900">{s.value}</p>
              <p className="mt-3 font-display text-[15px] font-bold tracking-[-0.02em] text-ink-800">{s.label}</p>
              <p className="mt-1 text-[13px] text-ink-500">{s.sub}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Fitur */}
      <section className="border-y border-ink-200 bg-white/60 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <FadeIn>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">Yang Anda dapat</p>
            <h2 className="mt-3 max-w-2xl font-display text-[clamp(1.8rem,3.6vw,2.8rem)] font-bold leading-[1.15] tracking-tightest text-ink-900">
              Dibangun untuk dipakai delapan jam sehari, bukan untuk dipamerkan sekali.
            </h2>
          </FadeIn>

          <Stagger className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" gap={0.06}>
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <StaggerItem key={f.title}>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/70">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-[16px] font-bold tracking-[-0.02em] text-ink-900">{f.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{f.body}</p>
                </StaggerItem>
              )
            })}
          </Stagger>
        </div>
      </section>

      {/* Peran */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <FadeIn>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">Satu sistem, tiga sudut pandang</p>
          <h2 className="mt-3 max-w-2xl font-display text-[clamp(1.8rem,3.6vw,2.8rem)] font-bold leading-[1.15] tracking-tightest text-ink-900">
            Setiap orang hanya melihat yang jadi tanggung jawabnya.
          </h2>
        </FadeIn>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {ROLES.map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: EASE_OUT }}
              className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card"
            >
              <div className={`px-6 py-5 ${r.tone}`}>
                <p className="font-display text-[22px] font-bold tracking-[-0.03em]">{r.label}</p>
              </div>
              <p className="px-6 py-5 text-[13.5px] leading-relaxed text-ink-600">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Ajakan masuk */}
      <section className="px-5 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="surface-dark relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-8 py-16 text-center text-ink-50"
        >
          <span className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-28 -left-10 h-72 w-72 rounded-full bg-brand-400/10 blur-3xl" />

          <h2 className="relative font-display text-[clamp(1.8rem,4vw,3rem)] font-bold leading-[1.12] tracking-tightest">
            Coba langsung, tanpa daftar.
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-50/60">
            Tiga akun demo sudah tersedia beserta 60 hari riwayat transaksi, target bulanan, dan data stok yang realistis.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login">
              <Button variant="accent" size="xl" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Masuk ke aplikasi
              </Button>
            </Link>
          </div>
          <p className="relative mt-6 font-mono text-[12px] text-ink-50/40">
            owner · kasir · gudang — PIN 1234
          </p>
        </motion.div>
      </section>

      <footer className="border-t border-ink-200 px-5 py-8">
        <p className="mx-auto max-w-6xl text-center text-[12.5px] text-ink-500">
          {DEFAULT_SETTINGS.business_name} — {DEFAULT_SETTINGS.tagline}
        </p>
      </footer>
    </div>
  )
}

export default LandingPage
