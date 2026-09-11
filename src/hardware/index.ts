import { BrowserPrinter } from './browserPrinter'
import type { CustomerDisplayDriver, PrinterDriver, ReceiptPayload, ScannerDriver } from './types'

export * from './types'
export { BrowserPrinter }

/**
 * Registry perangkat. Mengganti printer di masa depan cukup dengan
 * `registerPrinter(new ThermalUsbPrinter())` pada bootstrap aplikasi -
 * seluruh halaman memanggil `printer()` sehingga tidak perlu diubah.
 */

let activePrinter: PrinterDriver = new BrowserPrinter()

export function printer(): PrinterDriver {
  return activePrinter
}

export function registerPrinter(driver: PrinterDriver): void {
  activePrinter = driver
}

/** Scanner berbasis keyboard-wedge: mendeteksi ketikan cepat + Enter. */
export class KeyboardWedgeScanner implements ScannerDriver {
  readonly id = 'keyboard-wedge'
  readonly label = 'Barcode Scanner (mode keyboard)'

  start(onScan: (code: string) => void): () => void {
    let buffer = ''
    let lastTime = 0

    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return

      const now = Date.now()
      if (now - lastTime > 80) buffer = ''
      lastTime = now

      if (event.key === 'Enter') {
        if (buffer.length >= 6) onScan(buffer)
        buffer = ''
        return
      }
      if (event.key.length === 1) buffer += event.key
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }
}

let activeScanner: ScannerDriver = new KeyboardWedgeScanner()

export function scanner(): ScannerDriver {
  return activeScanner
}

export function registerScanner(driver: ScannerDriver): void {
  activeScanner = driver
}

/** Customer display placeholder, menulis ke console pada versi ini. */
export class NoopCustomerDisplay implements CustomerDisplayDriver {
  readonly id = 'noop-display'
  readonly label = 'Customer Display (belum terpasang)'

  async show(lines: string[]): Promise<void> {
    if (import.meta.env.DEV) console.debug('[customer-display]', lines.join(' | '))
  }

  async clear(): Promise<void> {
    /* noop */
  }
}

let activeDisplay: CustomerDisplayDriver = new NoopCustomerDisplay()

export function customerDisplay(): CustomerDisplayDriver {
  return activeDisplay
}

export function registerCustomerDisplay(driver: CustomerDisplayDriver): void {
  activeDisplay = driver
}

/** Ringkasan status seluruh perangkat, ditampilkan pada halaman Pengaturan. */
export function hardwareStatus() {
  return [
    { group: 'Printer', ...activePrinter.status(), driver: activePrinter.label, kind: activePrinter.kind },
    { group: 'Barcode Scanner', connected: true, name: activeScanner.label, message: 'Mode keyboard aktif', driver: activeScanner.id, kind: 'keyboard' },
    { group: 'Cash Drawer', connected: false, name: 'Belum terpasang', message: 'Menunggu driver ESC/POS', driver: '-', kind: 'none' },
    { group: 'Customer Display', connected: false, name: activeDisplay.label, message: 'Menunggu perangkat', driver: activeDisplay.id, kind: 'none' },
  ]
}

export type { ReceiptPayload }
