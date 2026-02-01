/**
 * Client pour génération PDF dans un Web Worker (évite de bloquer l’UI).
 * Doit rester dans le même répertoire que pdf.worker.ts pour new URL('./pdf.worker.ts', import.meta.url).
 */
import type { SaleData } from './pdf-generator-v2'
import { getCompanyInfoForPdf } from './pdf-generator-v2'

/** Génère le devis dans un Web Worker (l’app ne freeze pas). */
export function generateQuotePDFViaWorker(sale: SaleData): Promise<void> {
  return new Promise((resolve, reject) => {
    getCompanyInfoForPdf()
      .then((companyInfo) => {
        const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' })
        worker.postMessage({ type: 'quote', sale, companyInfo })
        worker.onmessage = (e: MessageEvent<Blob>) => {
          const blob = e.data
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `devis-${sale.invoiceNo || 'devis'}-${sale.clientName || 'client'}.pdf`
          a.click()
          URL.revokeObjectURL(url)
          worker.terminate()
          resolve()
        }
        worker.onerror = (err) => {
          worker.terminate()
          reject(err ?? new Error('Worker error'))
        }
      })
      .catch(reject)
  })
}

/** Génère la facture dans un Web Worker (l’app ne freeze pas). */
export function generateInvoicePDFViaWorker(sale: SaleData | SaleData[]): Promise<void> {
  const sales = Array.isArray(sale) ? sale : [sale]
  const firstSale = sales[0]
  return new Promise((resolve, reject) => {
    getCompanyInfoForPdf()
      .then((companyInfo) => {
        const worker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' })
        worker.postMessage({ type: 'invoice', sale, companyInfo })
        worker.onmessage = (e: MessageEvent<Blob>) => {
          const blob = e.data
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `facture-${firstSale.invoiceNo || 'facture'}-${firstSale.clientName || 'client'}.pdf`
          a.click()
          URL.revokeObjectURL(url)
          worker.terminate()
          resolve()
        }
        worker.onerror = (err) => {
          worker.terminate()
          reject(err ?? new Error('Worker error'))
        }
      })
      .catch(reject)
  })
}
