import { useMemo, useState } from 'react'
import { CalendarDays, Gauge, Pencil, Target, TrendingUp, Triangle, Trophy } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { Badge, Card, CurrencyInput, Input, ProgressBar, Table, Td, Textarea, Th } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/Modal'
import { StatCard, StatRow } from '@/components/ui/StatCard'
import { ChartCard, ComparisonLineChart } from '@/components/charts'
import { cn, formatCompactIDR, formatIDR, formatNumber, formatPercent } from '@/lib/utils'
import {
  TARGET_STATUS_LABEL,
  TARGET_STATUS_TONE,
  periodKey,
  periodLabel,
  periodLabelShort,
  targetHistory,
  targetProgress,
  type TargetProgress,
} from '@/lib/targets'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'
import { toast } from '@/store/useToastStore'
import type { SalesTarget } from '@/types'

const STATUS_BADGE = {
  upcoming: 'neutral',
  achieved: 'success',
  on_track: 'brand',
  at_risk: 'warning',
  behind: 'danger',
  missed: 'danger',
} as const

export function TargetsPage() {
  const db = useDataStore((s) => s.db)
  const saveTarget = useDataStore((s) => s.saveTarget)
  const actor = useAuthStore((s) => s.user)!

  const [editing, setEditing] = useState<SalesTarget | null>(null)

  const current = useMemo(() => targetProgress(periodKey(new Date()), db.orders, db.targets), [db.orders, db.targets])
  const history = useMemo(() => targetHistory(db.orders, db.targets, 6), [db.orders, db.targets])

  /** Daftar periode yang bisa diatur: 6 bulan lalu s/d 6 bulan ke depan. */
  const editablePeriods = useMemo(() => {
    const now = new Date()
    const rows: { period: string; target: SalesTarget | null; progress: TargetProgress }[] = []
    for (let i = -6; i <= 6; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const period = periodKey(d)
      rows.push({
        period,
        target: db.targets.find((t) => t.period === period) ?? null,
        progress: targetProgress(period, db.orders, db.targets),
      })
    }
    return rows.reverse()
  }, [db.targets, db.orders])

  const chartData = history.map((h) => ({
    label: periodLabelShort(h.period),
    target: h.revenueTarget,
    realisasi: h.revenueActual,
  }))

  const achieved = history.filter((h) => h.revenuePercent >= 100).length
  const withTarget = history.filter((h) => h.hasTarget).length

  const openEditor = (period: string) => {
    const existing = db.targets.find((t) => t.period === period)
    setEditing(
      existing ?? {
        id: `tgt_${period}`,
        period,
        revenue_target: 0,
        transaction_target: 0,
        note: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    )
  }

  return (
    <Page
      title="Target & KPI Penjualan"
      subtitle={`Periode berjalan: ${current.label}`}
      actions={
        <Button leftIcon={<Target className="h-4 w-4" />} onClick={() => openEditor(current.period)}>
          Atur Target Bulan Ini
        </Button>
      }
    >
      {/* Ringkasan bulan berjalan */}
      <TargetHeroCard progress={current} onEdit={() => openEditor(current.period)} />

      <div className="my-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Target Omzet Bulan Ini"
          value={current.hasTarget ? formatIDR(current.revenueTarget) : 'Belum diatur'}
          sublabel={current.hasTarget ? `Setara ${formatIDR(current.dailyTarget)} / hari` : 'Klik tombol di atas untuk mengatur'}
          icon={<Target className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Realisasi Omzet"
          value={formatIDR(current.revenueActual)}
          sublabel={`Rata-rata ${formatIDR(current.dailyAverage)} / hari`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Proyeksi Akhir Bulan"
          value={formatIDR(current.projection)}
          sublabel={
            current.hasTarget
              ? current.projection >= current.revenueTarget
                ? 'Diperkirakan melampaui target'
                : `Kurang ${formatIDR(Math.max(0, current.revenueTarget - current.projection))}`
              : 'Berdasarkan laju saat ini'
          }
          icon={<Gauge className="h-5 w-5" />}
          tone={!current.hasTarget ? 'neutral' : current.projection >= current.revenueTarget ? 'success' : 'warning'}
        />
        <StatCard
          label="Target Tercapai"
          value={`${achieved} / ${withTarget}`}
          sublabel="6 bulan terakhir"
          icon={<Trophy className="h-5 w-5" />}
          tone={achieved > 0 ? 'success' : 'neutral'}
        />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <ChartCard
          title="Target vs Realisasi"
          subtitle="Perbandingan enam bulan terakhir"
          height={300}
          empty={chartData.every((d) => d.target === 0 && d.realisasi === 0)}
        >
          <ComparisonLineChart
            data={chartData}
            series={[
              { key: 'target', name: 'Target', color: '#94A3B8', dashed: true },
              { key: 'realisasi', name: 'Realisasi', color: '#10B981' },
            ]}
          />
        </ChartCard>

        <Card className="p-5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Indikator Bulan Berjalan</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">Ukuran untuk memantau laju pencapaian</p>

          <div className="mt-4 divide-y divide-ink-100">
            <StatRow label="Hari berjalan" value={`${current.daysElapsed} dari ${current.daysInMonth} hari`} />
            <StatRow label="Sisa hari" value={`${current.daysRemaining} hari`} />
            <StatRow label="Seharusnya tercapai" value={formatIDR(current.expectedToDate)} />
            <StatRow label="Realisasi saat ini" value={formatIDR(current.revenueActual)} bold />
            <StatRow
              label="Selisih terhadap laju ideal"
              value={`${current.revenueActual - current.expectedToDate >= 0 ? '+' : ''}${formatIDR(current.revenueActual - current.expectedToDate)}`}
              tone={current.revenueActual >= current.expectedToDate ? 'success' : 'danger'}
              bold
            />
          </div>

          <div className="mt-4 rounded-2xl bg-ink-900 p-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Harus dicapai per hari tersisa</p>
            <p className="mt-1 text-[24px] figure">
              {current.hasTarget ? formatIDR(current.requiredPerDay) : '-'}
            </p>
            <p className="mt-1.5 text-[12px] text-white/50">
              {current.hasTarget
                ? current.remaining > 0
                  ? `Sisa target ${formatIDR(current.remaining)} dalam ${current.daysRemaining} hari`
                  : 'Target bulan ini sudah tercapai'
                : 'Tetapkan target terlebih dahulu'}
            </p>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-ink-600">Target jumlah transaksi</span>
              <span className="font-bold tnum text-ink-900">
                {formatNumber(current.transactionActual)} / {current.transactionTarget ? formatNumber(current.transactionTarget) : '-'}
              </span>
            </div>
            <ProgressBar
              value={current.transactionPercent}
              tone={current.transactionPercent >= 100 ? 'success' : current.transactionPercent >= 70 ? 'brand' : 'warning'}
              className="mt-2"
            />
          </div>
        </Card>
      </div>

      {/* Tabel periode */}
      <Card>
        <div className="px-5 pt-5">
          <h3 className="font-display text-[15px] font-bold tracking-[-0.02em] text-ink-900">Daftar Target per Bulan</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">Atur target omzet dan jumlah transaksi untuk setiap periode</p>
        </div>
        <div className="mt-4">
          <Table>
            <thead>
              <tr>
                <Th>Periode</Th>
                <Th align="right">Target Omzet</Th>
                <Th align="right">Realisasi</Th>
                <Th>Pencapaian</Th>
                <Th align="right">Target Transaksi</Th>
                <Th align="right">Realisasi</Th>
                <Th align="center">Status</Th>
                <Th align="center">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {editablePeriods.map(({ period, target, progress }) => (
                <tr
                  key={period}
                  className={cn('transition-colors hover:bg-ink-50/60', progress.isCurrentMonth && 'bg-brand-50/40')}
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-ink-900">{periodLabel(period)}</span>
                      {progress.isCurrentMonth && <Badge tone="brand">Berjalan</Badge>}
                    </div>
                  </Td>
                  <Td align="right" className="tnum font-semibold text-ink-800">
                    {target ? formatIDR(target.revenue_target) : <span className="text-ink-300">Belum diatur</span>}
                  </Td>
                  <Td align="right" className="figure text-ink-900">
                    {formatIDR(progress.revenueActual)}
                  </Td>
                  <Td className="w-40">
                    {progress.hasTarget ? (
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={progress.revenuePercent}
                          tone={progress.revenuePercent >= 100 ? 'success' : progress.revenuePercent >= 70 ? 'brand' : 'warning'}
                          className="flex-1"
                        />
                        <span className="w-12 text-right text-[11.5px] font-bold tnum text-ink-500">
                          {progress.revenuePercent.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-ink-300">-</span>
                    )}
                  </Td>
                  <Td align="right" className="tnum text-ink-600">
                    {target ? formatNumber(target.transaction_target) : '-'}
                  </Td>
                  <Td align="right" className="tnum font-semibold text-ink-800">
                    {formatNumber(progress.transactionActual)}
                  </Td>
                  <Td align="center">
                    {progress.hasTarget ? (
                      <Badge tone={STATUS_BADGE[progress.status]} dot>
                        {TARGET_STATUS_LABEL[progress.status]}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Tanpa Target</Badge>
                    )}
                  </Td>
                  <Td align="center">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditor(period)} aria-label="Atur target">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <TargetFormModal
        target={editing}
        progress={editing ? targetProgress(editing.period, db.orders, db.targets) : null}
        onClose={() => setEditing(null)}
        onSave={(t) => {
          saveTarget(t, actor)
          setEditing(null)
          toast.success('Target tersimpan', `${periodLabel(t.period)} · ${formatIDR(t.revenue_target)}`)
        }}
      />
    </Page>
  )
}

/* ------------------------------- Kartu utama ----------------------------- */

export function TargetHeroCard({ progress, onEdit }: { progress: TargetProgress; onEdit?: () => void }) {
  const tone = TARGET_STATUS_TONE[progress.status]
  const gradients = {
    success: 'from-success-500 to-success-700',
    brand: 'from-brand-500 to-brand-700',
    warning: 'from-warning-500 to-warning-700',
    danger: 'from-danger-500 to-danger-700',
    neutral: 'from-ink-700 to-ink-900',
  } as const

  if (!progress.hasTarget) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink-100 text-ink-500">
          <Target className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold text-ink-900">Target {progress.label} belum ditetapkan</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500">
            Tetapkan target omzet dan jumlah transaksi agar sistem dapat menghitung progres, proyeksi akhir bulan, dan
            berapa yang perlu dikejar setiap hari.
          </p>
        </div>
        {onEdit && (
          <Button size="lg" onClick={onEdit} leftIcon={<Target className="h-4 w-4" />}>
            Tetapkan Target
          </Button>
        )}
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className={cn('bg-gradient-to-br p-6 text-white', gradients[tone])}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-white/70" />
              <p className="text-[12px] font-bold uppercase tracking-wider text-white/70">Target {progress.label}</p>
            </div>
            <p className="mt-2 text-[34px] font-extrabold leading-none tnum">{formatIDR(progress.revenueActual)}</p>
            <p className="mt-1.5 text-[13.5px] text-white/70">
              dari target {formatIDR(progress.revenueTarget)} · hari ke-{progress.daysElapsed} dari {progress.daysInMonth}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {TARGET_STATUS_LABEL[progress.status]}
            </span>
            <p className="mt-3 text-[40px] font-extrabold leading-none tnum">{progress.revenuePercent.toFixed(0)}%</p>
            <p className="text-[12px] text-white/70">tercapai</p>
          </div>
        </div>

        {/* Bar progres dengan penanda laju ideal */}
        <div className="relative mt-6 h-3 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all duration-700"
            style={{ width: `${Math.min(100, progress.revenuePercent)}%` }}
          />
        </div>
        <div className="relative mt-1.5 h-4">
          <span
            className="absolute flex -translate-x-1/2 items-center gap-1 whitespace-nowrap text-[10.5px] font-semibold text-white/70"
            style={{ left: `${Math.min(97, Math.max(3, (progress.expectedToDate / Math.max(1, progress.revenueTarget)) * 100))}%` }}
          >
            <Triangle className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
            laju ideal
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Sisa target', value: formatIDR(progress.remaining) },
            { label: 'Per hari tersisa', value: formatIDR(progress.requiredPerDay) },
            { label: 'Proyeksi akhir bulan', value: formatCompactIDR(progress.projection) },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[11px] text-white/60">{s.label}</p>
              <p className="mt-0.5 text-[18px] figure">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

/* -------------------------------- Form ----------------------------------- */

function TargetFormModal({
  target,
  progress,
  onClose,
  onSave,
}: {
  target: SalesTarget | null
  progress: TargetProgress | null
  onClose: () => void
  onSave: (target: SalesTarget) => void
}) {
  const [revenue, setRevenue] = useState(0)
  const [transactions, setTransactions] = useState(0)
  const [note, setNote] = useState('')
  const [ready, setReady] = useState<string | null>(null)

  // Sinkronkan form ketika target yang dibuka berubah.
  if (target && ready !== target.period) {
    setReady(target.period)
    setRevenue(target.revenue_target)
    setTransactions(target.transaction_target)
    setNote(target.note)
  }

  if (!target || !progress) return null

  const daily = revenue ? revenue / progress.daysInMonth : 0
  const avgTicket = transactions ? revenue / transactions : 0

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      size="md"
      title={`Target ${periodLabel(target.period)}`}
      subtitle="Target dipakai untuk menghitung KPI harian dan bulanan."
      footer={
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>
            Batal
          </Button>
          <Button fullWidth onClick={() => onSave({ ...target, revenue_target: revenue, transaction_target: transactions, note })}>
            Simpan Target
          </Button>
        </div>
      }
    >
      <CurrencyInput label="Target omzet per bulan" value={revenue} onValueChange={setRevenue} sizeVariant="lg" />
      <div className="mt-2.5 flex flex-wrap gap-2">
        {[100_000_000, 150_000_000, 200_000_000, 250_000_000, 300_000_000].map((v) => (
          <button
            key={v}
            onClick={() => setRevenue(v)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-[12.5px] font-bold tnum transition-colors',
              revenue === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50',
            )}
          >
            {formatCompactIDR(v)}
          </button>
        ))}
      </div>

      <Input
        label="Target jumlah transaksi per bulan"
        className="mt-4"
        inputMode="numeric"
        sizeVariant="lg"
        value={transactions ? formatNumber(transactions) : ''}
        onChange={(e) => setTransactions(Number(e.target.value.replace(/\D/g, '')) || 0)}
        placeholder="0"
      />

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-ink-100 p-4 text-center">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Per hari</p>
          <p className="mt-0.5 text-[15px] figure text-ink-900">{formatCompactIDR(daily)}</p>
        </div>
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Transaksi/hari</p>
          <p className="mt-0.5 text-[15px] figure text-ink-900">
            {transactions ? Math.ceil(transactions / progress.daysInMonth) : 0}
          </p>
        </div>
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">Nilai/transaksi</p>
          <p className="mt-0.5 text-[15px] figure text-ink-900">{formatCompactIDR(avgTicket)}</p>
        </div>
      </div>

      {progress.revenueActual > 0 && (
        <p className="mt-3 rounded-xl bg-info-50 p-3 text-[12.5px] leading-relaxed text-info-700">
          Realisasi periode ini sudah <b>{formatIDR(progress.revenueActual)}</b> dari {progress.transactionActual}{' '}
          transaksi. Dengan target di atas, pencapaiannya menjadi{' '}
          <b>{revenue ? formatPercent((progress.revenueActual / revenue) * 100) : '-'}</b>.
        </p>
      )}

      <Textarea
        label="Catatan (opsional)"
        className="mt-4"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="mis. target naik karena promo akhir tahun"
      />
    </Modal>
  )
}
