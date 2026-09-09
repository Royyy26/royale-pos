import type { PrinterDriver, PrinterStatus, ReceiptPayload } from './types'

/**
 * Driver printer default: memakai dialog cetak browser.
 * Elemen dengan id `receipt-print-area` / `invoice-print-area` yang sedang
 * tampil di DOM akan dicetak (lihat aturan @media print pada index.css).
 */

const PRINT_DELAY = 120

function triggerPrint(mode: 'receipt' | 'invoice'): Promise<void> {
  return new Promise((resolve) => {
    document.body.dataset.printMode = mode
    setTimeout(() => {
      window.print()
      document.body.dataset.printMode = ''
      resolve()
    }, PRINT_DELAY)
  })
}

export class BrowserPrinter implements PrinterDriver {
  readonly id = 'browser-print'
  readonly label = 'Printer Browser (Cetak / Simpan PDF)'
  readonly kind = 'browser' as const
  readonly capabilities = {
    paperWidth: '80mm' as const,
    supportsCut: false,
    supportsDrawerKick: false,
    supportsLogo: true,
    supportsQr: true,
  }

  private connected = true

  async connect(): Promise<PrinterStatus> {
    this.connected = true
    return this.status()
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  status(): PrinterStatus {
    return {
      connected: this.connected,
      name: this.label,
      message: this.connected ? 'Siap mencetak melalui dialog browser' : 'Tidak terhubung',
    }
  }

  async printReceipt(_payload: ReceiptPayload): Promise<void> {
    await triggerPrint('receipt')
  }

  async printInvoiceA4(_payload: ReceiptPayload): Promise<void> {
    await triggerPrint('invoice')
  }

  async openCashDrawer(): Promise<void> {
    // Tidak tersedia pada driver browser. Driver ESC/POS akan mengirim
    // perintah 0x1B 0x70 0x00 0x19 0xFA ke port printer.
    return Promise.resolve()
  }
}
