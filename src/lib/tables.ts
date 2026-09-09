import type { Order, RestaurantTable, TableStatus } from '@/types'
import { formatDuration } from './utils'

/**
 * ============================================================================
 *  MEJA & BILL TERBUKA
 *
 *  Alur table service: satu meja boleh punya paling banyak satu bill terbuka
 *  (pesanan berstatus `pending`). Status meja diturunkan dari keberadaan bill
 *  itu — bukan disimpan terpisah lalu dibiarkan basi.
 * ============================================================================
 */

/** Pesanan yang masih terbuka (sudah dibuka, belum dibayar). */
export function isOpenBill(order: Order): boolean {
  return order.status === 'pending'
}

export function openBills(orders: Order[]): Order[] {
  return orders.filter(isOpenBill)
}

/** Bill terbuka untuk satu meja, bila ada. */
export function billForTable(orders: Order[], tableId: string): Order | undefined {
  return orders.find((o) => isOpenBill(o) && o.table_id === tableId)
}

export interface TableState {
  table: RestaurantTable
  bill: Order | null
  /**
   * Status efektif. Meja dengan bill terbuka selalu `occupied`, apa pun nilai
   * yang tersimpan — sehingga papan meja tidak pernah berbohong.
   */
  status: TableStatus
  itemCount: number
  total: number
  /** Lama bill terbuka, mis. "1j 12m". */
  duration: string | null
}

export function tableState(table: RestaurantTable, orders: Order[]): TableState {
  const bill = billForTable(orders, table.id) ?? null
  return {
    table,
    bill,
    status: bill ? 'occupied' : table.status === 'occupied' ? 'available' : table.status,
    itemCount: bill ? bill.items.reduce((a, i) => a + i.quantity, 0) : 0,
    total: bill?.total ?? 0,
    duration: bill ? formatDuration(bill.created_at) : null,
  }
}

export function allTableStates(tables: RestaurantTable[], orders: Order[]): TableState[] {
  return tables.map((t) => tableState(t, orders))
}

export interface TableSummary {
  total: number
  available: number
  occupied: number
  reserved: number
  cleaning: number
  openBillValue: number
  guests: number
}

export function summarizeTables(states: TableState[]): TableSummary {
  return {
    total: states.length,
    available: states.filter((s) => s.status === 'available').length,
    occupied: states.filter((s) => s.status === 'occupied').length,
    reserved: states.filter((s) => s.status === 'reserved').length,
    cleaning: states.filter((s) => s.status === 'cleaning').length,
    openBillValue: states.reduce((a, s) => a + s.total, 0),
    guests: states.reduce((a, s) => a + (s.bill?.guest_count ?? 0), 0),
  }
}

/** Warna papan meja — dipakai denah meja dan pemilih meja di POS. */
export const TABLE_TONE: Record<TableStatus, { card: string; chip: string; dot: string }> = {
  available: {
    card: 'border-ink-200 bg-white hover:border-brand-400',
    chip: 'bg-ink-100 text-ink-600',
    dot: 'bg-ink-300',
  },
  occupied: {
    card: 'border-brand-400 bg-brand-50 hover:border-brand-500',
    chip: 'bg-brand-500 text-ink-950',
    dot: 'bg-brand-500',
  },
  reserved: {
    card: 'border-info-200 bg-info-50 hover:border-info-500',
    chip: 'bg-info-500 text-white',
    dot: 'bg-info-500',
  },
  cleaning: {
    card: 'border-warning-200 bg-warning-50 hover:border-warning-500',
    chip: 'bg-warning-500 text-white',
    dot: 'bg-warning-500',
  },
}
