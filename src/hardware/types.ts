import type { Order, Payment, StoreSettings, User } from '@/types'

/**
 * ============================================================================
 *  HARDWARE ABSTRACTION LAYER
 *  Kontrak perangkat POS. Implementasi saat ini memakai kemampuan browser
 *  (window.print / PDF), namun antarmuka ini dirancang agar driver thermal
 *  printer, cash drawer, barcode scanner, dan customer display dapat
 *  dipasang di kemudian hari tanpa mengubah komponen UI.
 * ============================================================================
 */

export interface ReceiptPayload {
  order: Order
  payment: Payment | null
  invoiceNumber: string
  cashier: Pick<User, 'id' | 'name'>
  settings: StoreSettings
}

export type PrinterKind = 'browser' | 'thermal-usb' | 'thermal-network' | 'bluetooth' | 'cloud'

export interface PrinterCapabilities {
  paperWidth: '58mm' | '80mm' | 'A4'
  supportsCut: boolean
  supportsDrawerKick: boolean
  supportsLogo: boolean
  supportsQr: boolean
}

export interface PrinterStatus {
  connected: boolean
  name: string
  message: string
}

/** Kontrak driver printer. */
export interface PrinterDriver {
  readonly id: string
  readonly label: string
  readonly kind: PrinterKind
  readonly capabilities: PrinterCapabilities

  connect(): Promise<PrinterStatus>
  disconnect(): Promise<void>
  status(): PrinterStatus
  /** Cetak struk 80mm. */
  printReceipt(payload: ReceiptPayload): Promise<void>
  /** Cetak faktur A4. */
  printInvoiceA4(payload: ReceiptPayload): Promise<void>
  /** Buka laci uang (ESC/POS drawer kick). */
  openCashDrawer(): Promise<void>
}

/** Kontrak pembaca barcode — saat ini disimulasikan lewat input keyboard. */
export interface ScannerDriver {
  readonly id: string
  readonly label: string
  start(onScan: (code: string) => void): () => void
}

/** Kontrak layar pelanggan (customer display). */
export interface CustomerDisplayDriver {
  readonly id: string
  readonly label: string
  show(lines: string[]): Promise<void>
  clear(): Promise<void>
}
