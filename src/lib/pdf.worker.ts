/**
 * Worker pour génération PDF (évite de bloquer le thread principal).
 * Reçoit { type: 'quote'|'invoice', sale, companyInfo } avec companyInfo.logoBase64 déjà rempli.
 */
async function handleMessage(e: MessageEvent<{ type: 'quote' | 'invoice'; sale: any; companyInfo: any }>) {
  const { type, sale, companyInfo } = e.data
  const mod = await import('./pdf-generator-v2')
  const doc =
    type === 'quote'
      ? await mod.generateQuotePDFFromData(sale, companyInfo)
      : await mod.generateInvoicePDFFromData(Array.isArray(sale) ? sale : [sale], companyInfo)
  const blob = doc.output('blob')
  self.postMessage(blob)
}

self.onmessage = handleMessage
