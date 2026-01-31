import jsPDF from 'jspdf'
import { electronFetch } from './electron-api'

export interface SaleData {
  invoiceNo: string
  saleDate: string
  clientName: string
  serviceName: string
  quantity: number
  unitPriceHt: number
  unitLabel?: string // "heure" | "forfait" pour affichage
  caHt: number
  tvaRate: number
  tvaAmount: number
  totalTtc: number
  client?: {
    email?: string
    website?: string
    company?: string
  }
}

export interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
  siret?: string
  logoPath?: string
}

const COLORS = {
  primary: '#1A1A1A',
  secondary: '#667eea',
  secondaryDark: '#4c51bf',
  accent: '#F8F9FA',
  accentBlue: '#EEF0FC',
  text: '#212529',
  textLight: '#6C757D',
  border: '#E9ECEF',
  background: '#FFFFFF',
}

const SPACING = { margin: 20, section: 18, line: 10, small: 5, titleUnderline: 4 }

const FONTS = {
  title: { size: 24, weight: 'bold' },
  subtitle: { size: 18, weight: 'bold' },
  header: { size: 13, weight: 'bold' },
  body: { size: 10, weight: 'normal' },
  small: { size: 8, weight: 'normal' },
  large: { size: 12, weight: 'bold' },
}

function getParam(params: { key: string; value: string }[], key: string, def = '') {
  return params.find((p) => p.key === key)?.value ?? def
}

export async function generateQuotePDF(sale: SaleData) {
  const doc = new jsPDF()
  let companyInfo: CompanyInfo = { name: 'ARES', address: 'Votre entreprise', phone: '', email: '', logoPath: '' }
  try {
    const res = await electronFetch('/api/settings')
    if (res.ok) {
      const data = await res.json()
      const params = data.parameters || []
      companyInfo = {
        name: getParam(params, 'companyName', 'ARES'),
        address: getParam(params, 'companyAddress', 'Votre entreprise'),
        phone: getParam(params, 'companyPhone'),
        email: getParam(params, 'companyEmail'),
        siret: getParam(params, 'siret'),
        logoPath: getParam(params, 'logoPath'),
      }
    }
  } catch (e) {
    console.error('Settings PDF:', e)
  }

  await drawHeader(doc, companyInfo, 'DEVIS')
  const companyY = await drawCompanyInfo(doc, companyInfo, 60)
  const clientY = drawClientInfo(doc, sale, companyY + SPACING.section)
  
  // === QUOTE DETAILS SECTION ===
  const detailsY = drawQuoteDetails(doc, sale, clientY + SPACING.section)
  
  // === SERVICES TABLE ===
  const tableY = drawServicesTable(doc, sale, detailsY + SPACING.section)
  
  // === TOTALS SECTION ===
  const totalsY = drawTotalsSection(doc, sale, tableY + SPACING.section)
  
  // === FOOTER ===
  drawFooter(doc, companyInfo, totalsY + SPACING.section)
  
  // === SAVE PDF ===
  const fileName = `devis-${sale.invoiceNo || 'devis'}-${sale.clientName || 'client'}.pdf`
  doc.save(fileName)
  
  return doc
}

async function drawHeader(doc: jsPDF, companyInfo: CompanyInfo, documentType: string) {
  // Header background avec gradient effect
  doc.setFillColor(26, 26, 26) // #1A1A1A
  doc.rect(0, 0, 210, 50, 'F')
  
  // Logo de l'entreprise (si disponible)
  if (companyInfo.logoPath) {
    try {
      const logoResponse = await electronFetch(companyInfo.logoPath)
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob()
        
        // Vérifier que le blob n'est pas vide et a un type valide
        if (logoBlob.size > 0 && (logoBlob.type.includes('png') || logoBlob.type.includes('jpeg') || logoBlob.type.includes('jpg') || logoBlob.type.includes('svg'))) {
          const logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              // Vérifier que les données Base64 sont valides
              if (result && result.startsWith('data:image/')) {
                resolve(result)
              } else {
                reject(new Error('Données d\'image invalides'))
              }
            }
            reader.onerror = () => reject(new Error('Erreur de lecture du logo'))
            reader.readAsDataURL(logoBlob)
          })
          
          // Logo en haut à droite avec bordure dorée
          doc.setDrawColor(102, 126, 234) // #667eea
          doc.setLineWidth(2)
          doc.rect(145, 8, 32, 32)
          
          // Déterminer le format d'image à partir des données Base64
          let imageFormat = 'JPEG' // Format par défaut
          if (logoBase64.includes('data:image/png')) {
            imageFormat = 'PNG'
          } else if (logoBase64.includes('data:image/svg')) {
            imageFormat = 'SVG'
          }
          
          try {
            doc.addImage(logoBase64, imageFormat, 147, 10, 28, 28)
          } catch (imageError) {
            console.warn('Erreur lors de l\'ajout de l\'image:', imageError)
            // Si l'ajout de l'image échoue, continuer sans le logo
          }
        } else {
          console.warn('Logo invalide ou format non supporté:', logoBlob.type, logoBlob.size)
        }
      } else {
        console.warn('Impossible de récupérer le logo:', logoResponse.status)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du logo:', error)
    }
  }
  
  // Titre du document
  doc.setTextColor(102, 126, 234) // #667eea
  doc.setFontSize(FONTS.title.size)
  doc.setFont('helvetica', 'bold')
  doc.text(documentType, SPACING.margin, 30)
  
  // Ligne décorative
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(3)
  doc.line(SPACING.margin, 35, 80, 35)
  
  // Date du document
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(FONTS.body.size)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, SPACING.margin, 42)
}

async function drawCompanyInfo(doc: jsPDF, companyInfo: CompanyInfo, startY: number): Promise<number> {
  let currentY = startY
  
  // Titre section
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.header.size)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMATIONS ENTREPRISE', SPACING.margin, currentY)
  
  // Ligne de séparation
  doc.setDrawColor(COLORS.secondary)
  doc.setLineWidth(1)
  doc.line(SPACING.margin, currentY + SPACING.titleUnderline, 190, currentY + SPACING.titleUnderline)
  
  currentY += SPACING.line
  
  // Informations entreprise dans un cadre (hauteur adaptée si SIRET présent)
  const hasSiret = !!companyInfo.siret?.trim()
  const boxHeight = hasSiret ? 42 : 35
  doc.setFillColor(COLORS.accent)
  doc.rect(SPACING.margin, currentY, 170, boxHeight, 'F')
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(1)
  doc.rect(SPACING.margin, currentY, 170, boxHeight)
  
  // Contenu du cadre
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.body.size)
  doc.setFont('helvetica', 'bold')
  doc.text(companyInfo.name, SPACING.margin + 5, currentY + 8)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONTS.small.size)
  doc.text(companyInfo.address, SPACING.margin + 5, currentY + 15)
  
  if (companyInfo.phone) {
    doc.text(`Tél: ${companyInfo.phone}`, SPACING.margin + 5, currentY + 22)
  }
  if (companyInfo.email) {
    doc.text(`Email: ${companyInfo.email}`, SPACING.margin + 5, currentY + 29)
  }
  if (hasSiret) {
    doc.text(`SIRET: ${companyInfo.siret!.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')}`, SPACING.margin + 5, currentY + 36)
  }
  
  return currentY + boxHeight
}

function drawClientInfo(doc: jsPDF, sale: SaleData, startY: number): number {
  let currentY = startY
  
  // Titre section
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.header.size)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMATIONS CLIENT', SPACING.margin, currentY)
  
  // Ligne de séparation
  doc.setDrawColor(COLORS.secondary)
  doc.setLineWidth(1)
  doc.line(SPACING.margin, currentY + SPACING.titleUnderline, 190, currentY + SPACING.titleUnderline)
  
  currentY += SPACING.line
  
  // Informations client
  doc.setFontSize(FONTS.body.size)
  doc.setFont('helvetica', 'bold')
  doc.text(`Client: ${sale.clientName || 'Non défini'}`, SPACING.margin, currentY)
  
  if (sale.client?.email) {
    currentY += SPACING.line
    doc.setFont('helvetica', 'normal')
    doc.text(`Email: ${sale.client.email}`, SPACING.margin, currentY)
  }
  
  if (sale.client?.company) {
    currentY += SPACING.line
    doc.text(`Entreprise: ${sale.client.company}`, SPACING.margin, currentY)
  }
  if (sale.client?.website) {
    currentY += SPACING.line
    doc.text(`Site web: ${sale.client.website}`, SPACING.margin, currentY)
  }
  
  return currentY
}

function drawQuoteDetails(doc: jsPDF, sale: SaleData, startY: number): number {
  let currentY = startY
  
  // Titre section
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.header.size)
  doc.setFont('helvetica', 'bold')
  doc.text('DÉTAILS DU DEVIS', SPACING.margin, currentY)
  
  // Ligne de séparation
  doc.setDrawColor(COLORS.secondary)
  doc.setLineWidth(1)
  doc.line(SPACING.margin, currentY + SPACING.titleUnderline, 190, currentY + SPACING.titleUnderline)
  
  currentY += SPACING.line
  
  // Détails
  doc.setFontSize(FONTS.body.size)
  doc.setFont('helvetica', 'normal')
  doc.text(`Numéro de devis: ${sale.invoiceNo || 'Non défini'}`, SPACING.margin, currentY)
  
  currentY += SPACING.line
  doc.text(`Date: ${sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('fr-FR') : 'Non définie'}`, SPACING.margin, currentY)
  
  currentY += SPACING.line
  doc.text(`Validité: 30 jours`, SPACING.margin, currentY)
  
  return currentY
}

function drawServicesTable(doc: jsPDF, sale: SaleData, startY: number): number {
  let currentY = startY
  
  // Titre section
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.header.size)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICES', SPACING.margin, currentY)
  
  // Ligne de séparation
  doc.setDrawColor(COLORS.secondary)
  doc.setLineWidth(1)
  doc.line(SPACING.margin, currentY + SPACING.titleUnderline, 190, currentY + SPACING.titleUnderline)
  
  currentY += SPACING.line
  
  // En-tête du tableau (bleu/violet foncé)
  const tableTop = currentY
  const colWidths = [80, 20, 30, 30, 30] // Description, Qté, Prix HT, TVA, Total
  const headerHeight = 12
  
  doc.setFillColor(76, 81, 191) // secondaryDark #4c51bf
  doc.rect(SPACING.margin, tableTop, 170, headerHeight, 'F')
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(0.5)
  doc.rect(SPACING.margin, tableTop, 170, headerHeight)
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(FONTS.small.size)
  doc.setFont('helvetica', 'bold')
  
  let xPos = SPACING.margin
  doc.text('Description', xPos + 4, tableTop + 8)
  xPos += colWidths[0]
  doc.text('Qté', xPos + 4, tableTop + 8)
  xPos += colWidths[1]
  doc.text('Prix HT', xPos + 4, tableTop + 8)
  xPos += colWidths[2]
  doc.text('TVA', xPos + 4, tableTop + 8)
  xPos += colWidths[3]
  doc.text('Total TTC', xPos + 4, tableTop + 8)
  
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(1)
  doc.line(SPACING.margin, tableTop + headerHeight, 190, tableTop + headerHeight)
  
  // Contenu du tableau
  currentY = tableTop + headerHeight
  const rowHeight = 15
  
  // Background alterné
  doc.setFillColor(COLORS.accent)
  doc.rect(SPACING.margin, currentY, 170, rowHeight, 'F')
  
  // Bordures du tableau
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.5)
  
  // Lignes verticales
  xPos = SPACING.margin
  for (let i = 0; i <= colWidths.length; i++) {
    doc.line(xPos, tableTop, xPos, currentY + rowHeight)
    if (i < colWidths.length) xPos += colWidths[i]
  }
  
  // Ligne horizontale du bas
  doc.line(SPACING.margin, currentY + rowHeight, 190, currentY + rowHeight)
  
  // Contenu de la ligne
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.body.size)
  doc.setFont('helvetica', 'normal')
  
  xPos = SPACING.margin
  doc.text(sale.serviceName || 'Service non défini', xPos + 2, currentY + 10)
  xPos += colWidths[0]
  const qtyDisplay = sale.unitLabel === 'heure' ? `${sale.quantity || 0} h` : (sale.quantity || 0).toString()
  doc.text(qtyDisplay, xPos + 2, currentY + 10)
  xPos += colWidths[1]
  const priceDisplay = sale.unitLabel === 'heure' ? `${(sale.unitPriceHt || 0).toFixed(2)} €/h` : `${(sale.unitPriceHt || 0).toFixed(2)} €`
  doc.text(priceDisplay, xPos + 2, currentY + 10)
  xPos += colWidths[2]
  doc.text(`${(sale.tvaRate || 0)}%`, xPos + 2, currentY + 10)
  xPos += colWidths[3]
  doc.text(`${(sale.totalTtc || 0).toFixed(2)}€`, xPos + 2, currentY + 10)
  
  return currentY + rowHeight
}

function drawTotalsSection(doc: jsPDF, sale: SaleData, startY: number): number {
  let currentY = startY
  
  const totalsWidth = 80
  const totalsX = 190 - totalsWidth
  const headerStripHeight = 14
  
  // Bandeau titre TOTAUX (bleu)
  doc.setFillColor(102, 126, 234) // secondary
  doc.rect(totalsX, currentY, totalsWidth, headerStripHeight, 'F')
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(1)
  doc.rect(totalsX, currentY, totalsWidth, headerStripHeight)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(FONTS.header.size)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAUX', totalsX + 5, currentY + 9)
  
  currentY += headerStripHeight
  
  // Corps du bloc (fond bleu très léger)
  const bodyHeight = 36
  doc.setFillColor(238, 240, 252) // accentBlue
  doc.rect(totalsX, currentY, totalsWidth, bodyHeight, 'F')
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(1)
  doc.rect(totalsX, currentY, totalsWidth, bodyHeight)
  doc.rect(totalsX, startY, totalsWidth, headerStripHeight + bodyHeight)
  
  currentY += 10
  
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.body.size)
  doc.setFont('helvetica', 'normal')
  doc.text('CA HT:', totalsX + 5, currentY)
  doc.text(`${(sale.caHt || 0).toFixed(2)}€`, totalsX + totalsWidth - 8, currentY)
  currentY += SPACING.line
  
  if ((sale.tvaRate || 0) > 0) {
    doc.text(`TVA (${sale.tvaRate || 0}%):`, totalsX + 5, currentY)
    doc.text(`${(sale.tvaAmount || 0).toFixed(2)}€`, totalsX + totalsWidth - 8, currentY)
    currentY += SPACING.line
  }
  
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(1)
  doc.line(totalsX + 5, currentY, totalsX + totalsWidth - 5, currentY)
  currentY += SPACING.line
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FONTS.large.size)
  doc.setTextColor(102, 126, 234)
  doc.text('TOTAL TTC:', totalsX + 5, currentY)
  doc.text(`${(sale.totalTtc || 0).toFixed(2)}€`, totalsX + totalsWidth - 8, currentY)
  
  return currentY + 12
}

function drawFooter(doc: jsPDF, companyInfo: CompanyInfo, startY: number) {
  // Vérifier si on a assez d'espace
  if (startY > 250) {
    doc.addPage()
    startY = 20
  }
  
  // Ligne de séparation
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(1)
  doc.line(SPACING.margin, startY, 190, startY)
  
  // Footer content
  doc.setTextColor(COLORS.textLight)
  doc.setFontSize(FONTS.small.size)
  doc.setFont('helvetica', 'normal')
  
  const footerY = startY + 10
  
  // Conditions générales
  doc.text('Conditions générales de vente disponibles sur demande.', SPACING.margin, footerY)
  
  // Mentions légales
  const siretDisplay = companyInfo.siret?.trim()
    ? `SIRET: ${companyInfo.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')}`
    : 'SIRET: [À compléter dans Paramètres]'
  doc.text(`Société ${companyInfo.name} - ${siretDisplay}`, SPACING.margin, footerY + 8)
  
  // Page number
  const pageNum = doc.getNumberOfPages()
  doc.text(`Page 1/${pageNum}`, 190 - 30, footerY + 8)
  
  // Note de remerciement
  doc.setTextColor(COLORS.secondary)
  doc.setFont('helvetica', 'bold')
  doc.text('Merci pour votre confiance !', SPACING.margin, footerY + 20)
}

export async function generateInvoicePDF(sale: SaleData | SaleData[]) {
  const doc = new jsPDF()
  const sales = Array.isArray(sale) ? sale : [sale]
  const firstSale = sales[0]
  
  let companyInfo: CompanyInfo = { name: 'ARES', address: 'Votre entreprise', phone: '', email: '', logoPath: '' }
  try {
    const res = await electronFetch('/api/settings')
    if (res.ok) {
      const data = await res.json()
      const params = data.parameters || []
      companyInfo = {
        name: getParam(params, 'companyName', 'ARES'),
        address: getParam(params, 'companyAddress', 'Votre entreprise'),
        phone: getParam(params, 'companyPhone'),
        email: getParam(params, 'companyEmail'),
        siret: getParam(params, 'siret'),
        logoPath: getParam(params, 'logoPath'),
      }
    }
  } catch (e) {
    console.error('Settings PDF:', e)
  }

  await drawHeader(doc, companyInfo, 'FACTURE')
  const companyY = await drawCompanyInfo(doc, companyInfo, 60)
  const clientY = drawClientInfo(doc, firstSale, companyY + SPACING.section)
  const detailsY = drawInvoiceDetails(doc, firstSale, clientY + SPACING.section)
  const tableY = drawInvoiceTable(doc, sales, detailsY + SPACING.section)
  const totalsY = drawInvoiceTotals(doc, sales, tableY + SPACING.section)
  
  // === PAYMENT INFO ===
  const paymentY = drawPaymentInfo(doc, companyInfo, totalsY + SPACING.section)
  
  // === FOOTER ===
  drawFooter(doc, companyInfo, paymentY + SPACING.section)
  
  // === SAVE PDF ===
  const fileName = `facture-${firstSale.invoiceNo || 'facture'}-${firstSale.clientName || 'client'}.pdf`
  doc.save(fileName)
  
  return doc
}

function drawInvoiceDetails(doc: jsPDF, sale: SaleData, startY: number): number {
  let currentY = startY
  
  // Titre section
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.header.size)
  doc.setFont('helvetica', 'bold')
  doc.text('DÉTAILS DE LA FACTURE', SPACING.margin, currentY)
  
  // Ligne de séparation
  doc.setDrawColor(COLORS.secondary)
  doc.setLineWidth(1)
  doc.line(SPACING.margin, currentY + SPACING.titleUnderline, 190, currentY + SPACING.titleUnderline)
  
  currentY += SPACING.line
  
  // Détails
  doc.setFontSize(FONTS.body.size)
  doc.setFont('helvetica', 'normal')
  doc.text(`Numéro de facture: ${sale.invoiceNo || 'Non défini'}`, SPACING.margin, currentY)
  
  currentY += SPACING.line
  doc.text(`Date d'émission: ${sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('fr-FR') : 'Non définie'}`, SPACING.margin, currentY)
  
  currentY += SPACING.line
  doc.text(`Date d'échéance: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')}`, SPACING.margin, currentY)
  
  return currentY
}

function drawInvoiceTable(doc: jsPDF, sales: SaleData[], startY: number): number {
  let currentY = startY
  
  // Titre section
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.header.size)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVICES', SPACING.margin, currentY)
  
  // Ligne de séparation
  doc.setDrawColor(COLORS.secondary)
  doc.setLineWidth(1)
  doc.line(SPACING.margin, currentY + SPACING.titleUnderline, 190, currentY + SPACING.titleUnderline)
  
  currentY += SPACING.line
  
  // En-tête du tableau (bleu/violet foncé)
  const tableTop = currentY
  const colWidths = [80, 20, 30, 30, 30]
  const headerHeight = 12
  
  doc.setFillColor(76, 81, 191) // secondaryDark #4c51bf
  doc.rect(SPACING.margin, tableTop, 170, headerHeight, 'F')
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(0.5)
  doc.rect(SPACING.margin, tableTop, 170, headerHeight)
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(FONTS.small.size)
  doc.setFont('helvetica', 'bold')
  
  let xPos = SPACING.margin
  doc.text('Description', xPos + 4, tableTop + 8)
  xPos += colWidths[0]
  doc.text('Qté', xPos + 4, tableTop + 8)
  xPos += colWidths[1]
  doc.text('Prix HT', xPos + 4, tableTop + 8)
  xPos += colWidths[2]
  doc.text('TVA', xPos + 4, tableTop + 8)
  xPos += colWidths[3]
  doc.text('Total TTC', xPos + 4, tableTop + 8)
  
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(1)
  doc.line(SPACING.margin, tableTop + headerHeight, 190, tableTop + headerHeight)
  
  // Contenu du tableau
  currentY = tableTop + headerHeight
  const rowHeight = 15
  
  sales.forEach((sale, index) => {
    // Background alterné
    if (index % 2 === 0) {
      doc.setFillColor(COLORS.accent)
      doc.rect(SPACING.margin, currentY, 170, rowHeight, 'F')
    }
    
    // Contenu de la ligne
    doc.setTextColor(COLORS.text)
    doc.setFontSize(FONTS.body.size)
    doc.setFont('helvetica', 'normal')
    
    xPos = SPACING.margin
    doc.text(sale.serviceName || 'Service non défini', xPos + 2, currentY + 10)
    xPos += colWidths[0]
    const qtyDisplay = sale.unitLabel === 'heure' ? `${sale.quantity || 0} h` : (sale.quantity || 0).toString()
    doc.text(qtyDisplay, xPos + 2, currentY + 10)
    xPos += colWidths[1]
    const priceDisplay = sale.unitLabel === 'heure' ? `${(sale.unitPriceHt || 0).toFixed(2)} €/h` : `${(sale.unitPriceHt || 0).toFixed(2)} €`
    doc.text(priceDisplay, xPos + 2, currentY + 10)
    xPos += colWidths[2]
    doc.text(`${(sale.tvaRate || 0)}%`, xPos + 2, currentY + 10)
    xPos += colWidths[3]
    doc.text(`${(sale.totalTtc || 0).toFixed(2)}€`, xPos + 2, currentY + 10)
    
    currentY += rowHeight
  })
  
  // Bordures du tableau
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.5)
  
  // Lignes verticales
  xPos = SPACING.margin
  for (let i = 0; i <= colWidths.length; i++) {
    doc.line(xPos, tableTop, xPos, currentY)
    if (i < colWidths.length) xPos += colWidths[i]
  }
  
  // Ligne horizontale du bas
  doc.line(SPACING.margin, currentY, 190, currentY)
  
  return currentY
}

function drawInvoiceTotals(doc: jsPDF, sales: SaleData[], startY: number): number {
  const totalCaHt = sales.reduce((sum, sale) => sum + (sale.caHt || 0), 0)
  const totalTva = sales.reduce((sum, sale) => sum + (sale.tvaAmount || 0), 0)
  const totalTtc = sales.reduce((sum, sale) => sum + (sale.totalTtc || 0), 0)
  const tvaRate = sales.length > 0 ? (sales[0].tvaRate || 0) : 0
  
  let currentY = startY
  
  const totalsWidth = 80
  const totalsX = 190 - totalsWidth
  const headerStripHeight = 14
  
  doc.setFillColor(102, 126, 234)
  doc.rect(totalsX, currentY, totalsWidth, headerStripHeight, 'F')
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(1)
  doc.rect(totalsX, currentY, totalsWidth, headerStripHeight)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(FONTS.header.size)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAUX', totalsX + 5, currentY + 9)
  
  currentY += headerStripHeight
  
  const bodyHeight = tvaRate > 0 ? 46 : 36
  doc.setFillColor(238, 240, 252)
  doc.rect(totalsX, currentY, totalsWidth, bodyHeight, 'F')
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(1)
  doc.rect(totalsX, currentY, totalsWidth, bodyHeight)
  doc.rect(totalsX, startY, totalsWidth, headerStripHeight + bodyHeight)
  
  currentY += 10
  
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.body.size)
  doc.setFont('helvetica', 'normal')
  doc.text('CA HT:', totalsX + 5, currentY)
  doc.text(`${totalCaHt.toFixed(2)}€`, totalsX + totalsWidth - 8, currentY)
  currentY += SPACING.line
  
  if (tvaRate > 0) {
    doc.text(`TVA (${tvaRate}%):`, totalsX + 5, currentY)
    doc.text(`${totalTva.toFixed(2)}€`, totalsX + totalsWidth - 8, currentY)
    currentY += SPACING.line
  }
  
  doc.setDrawColor(102, 126, 234)
  doc.setLineWidth(1)
  doc.line(totalsX + 5, currentY, totalsX + totalsWidth - 5, currentY)
  currentY += SPACING.line
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(FONTS.large.size)
  doc.setTextColor(102, 126, 234)
  doc.text('TOTAL TTC:', totalsX + 5, currentY)
  doc.text(`${totalTtc.toFixed(2)}€`, totalsX + totalsWidth - 8, currentY)
  
  return currentY + 12
}

function drawPaymentInfo(doc: jsPDF, companyInfo: CompanyInfo, startY: number): number {
  let currentY = startY
  
  // Titre section
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.header.size)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMATIONS DE PAIEMENT', SPACING.margin, currentY)
  
  // Ligne de séparation
  doc.setDrawColor(COLORS.secondary)
  doc.setLineWidth(1)
  doc.line(SPACING.margin, currentY + SPACING.titleUnderline, 190, currentY + SPACING.titleUnderline)
  
  currentY += SPACING.line
  
  // Cadre des informations bancaires
  const boxHeight = 45
  doc.setFillColor(COLORS.accent)
  doc.rect(SPACING.margin, currentY, 170, boxHeight, 'F')
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(1)
  doc.rect(SPACING.margin, currentY, 170, boxHeight)
  
  // Contenu
  doc.setTextColor(COLORS.text)
  doc.setFontSize(FONTS.body.size)
  doc.setFont('helvetica', 'bold')
  doc.text('Coordonnées bancaires:', SPACING.margin + 5, currentY + 10)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(FONTS.small.size)
  doc.text('Banque: [À compléter]', SPACING.margin + 5, currentY + 18)
  doc.text('IBAN: [À compléter]', SPACING.margin + 5, currentY + 26)
  doc.text('BIC: [À compléter]', SPACING.margin + 5, currentY + 34)
  
  return currentY + boxHeight
}
