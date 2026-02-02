// Utility functions for date filtering and period calculations

export type PresetFilter = 
  | 'today'           // Aujourd'hui
  | 'yesterday'       // Hier
  | 'thisWeek'       // Cette semaine (lundi-dimanche)
  | 'lastWeek'       // Semaine dernière
  | 'thisMonth'      // Ce mois
  | 'lastMonth'      // Mois dernier
  | 'thisQuarter'    // Ce trimestre
  | 'lastQuarter'    // Trimestre dernier
  | 'thisYear'       // Cette année
  | 'lastYear'       // Année dernière
  | 'ytd'           // Year to Date (1er jan - aujourd'hui)
  | 'last12Months'   // 12 derniers mois
  | 'last30Days'     // 30 derniers jours
  | 'last90Days'     // 90 derniers jours
  | 'custom'         // Plage personnalisée

export interface DateRange {
  start: Date
  end: Date
  preset?: PresetFilter
}

export interface PresetOption {
  value: PresetFilter
  label: string
  icon: string
  description: string
}

export const PRESET_OPTIONS: PresetOption[] = [
  { value: 'thisMonth', label: 'Ce mois', icon: '📅', description: 'Mois en cours' },
  { value: 'lastMonth', label: 'Mois dernier', icon: '⏮️', description: 'Mois précédent' },
  { value: 'thisQuarter', label: 'Ce trimestre', icon: '📊', description: 'Trimestre en cours' },
  { value: 'lastQuarter', label: 'Trimestre dernier', icon: '⏪', description: 'Trimestre précédent' },
  { value: 'thisYear', label: 'Cette année', icon: '🗓️', description: 'Année en cours' },
  { value: 'lastYear', label: 'Année dernière', icon: '📅', description: 'Année précédente' },
  { value: 'ytd', label: 'YTD', icon: '📈', description: 'Depuis le 1er janvier' },
  { value: 'last12Months', label: '12 derniers mois', icon: '📅', description: '12 mois glissants' },
  { value: 'last30Days', label: '30 derniers jours', icon: '⏱️', description: '30 jours glissants' },
  { value: 'custom', label: 'Personnalisé', icon: '⚙️', description: 'Plage libre' }
]

export function calculatePresetDates(preset: PresetFilter): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (preset) {
    case 'today':
      return { start: new Date(today), end: new Date(today), preset }
    
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { start: yesterday, end: yesterday, preset }
    
    case 'thisWeek':
      const monday = new Date(today)
      monday.setDate(today.getDate() - today.getDay() + 1)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { start: monday, end: sunday, preset }
    
    case 'lastWeek':
      const lastMonday = new Date(today)
      lastMonday.setDate(today.getDate() - today.getDay() - 6)
      const lastSunday = new Date(lastMonday)
      lastSunday.setDate(lastMonday.getDate() + 6)
      return { start: lastMonday, end: lastSunday, preset }
    
    case 'thisMonth':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
        preset
      }
    
    case 'lastMonth':
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: lastMonth, end: lastMonthEnd, preset }
    
    case 'thisQuarter':
      const currentQuarter = Math.floor(today.getMonth() / 3)
      const quarterStart = new Date(today.getFullYear(), currentQuarter * 3, 1)
      const quarterEnd = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0)
      return { start: quarterStart, end: quarterEnd, preset }
    
    case 'lastQuarter':
      const lastQuarter = Math.floor(today.getMonth() / 3) - 1
      const lastQuarterStart = new Date(today.getFullYear(), lastQuarter * 3, 1)
      const lastQuarterEnd = new Date(today.getFullYear(), (lastQuarter + 1) * 3, 0)
      return { start: lastQuarterStart, end: lastQuarterEnd, preset }
    
    case 'thisYear':
      return {
        start: new Date(today.getFullYear(), 0, 1),
        end: new Date(today.getFullYear(), 11, 31),
        preset
      }
    
    case 'lastYear':
      return {
        start: new Date(today.getFullYear() - 1, 0, 1),
        end: new Date(today.getFullYear() - 1, 11, 31),
        preset
      }
    
    case 'ytd':
      return {
        start: new Date(today.getFullYear(), 0, 1),
        end: today,
        preset
      }
    
    case 'last12Months':
      const last12Months = new Date(today)
      last12Months.setMonth(last12Months.getMonth() - 12)
      return { start: last12Months, end: today, preset }
    
    case 'last30Days':
      const last30Days = new Date(today)
      last30Days.setDate(last30Days.getDate() - 30)
      return { start: last30Days, end: today, preset }
    
    case 'last90Days':
      const last90Days = new Date(today)
      last90Days.setDate(last90Days.getDate() - 90)
      return { start: last90Days, end: today, preset }
    
    case 'custom':
      // Par défaut : du 1er du mois à aujourd'hui
      const customStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: customStart, end: new Date(today), preset }
    
    default:
      return { start: today, end: today, preset: 'today' }
  }
}

export function calculatePreviousPeriod(currentRange: DateRange): DateRange {
  const duration = currentRange.end.getTime() - currentRange.start.getTime()
  // Fin de la période précédente = fin du dernier jour avant le début de la période actuelle
  const previousEnd = new Date(currentRange.start)
  previousEnd.setDate(previousEnd.getDate() - 1)
  previousEnd.setHours(23, 59, 59, 999)
  const previousStart = new Date(previousEnd.getTime() - duration)

  return {
    start: previousStart,
    end: previousEnd,
    preset: 'custom'
  }
}

export function formatDateRange(range: DateRange): string {
  const startStr = range.start.toLocaleDateString('fr-FR')
  const endStr = range.end.toLocaleDateString('fr-FR')
  
  if (startStr === endStr) {
    return startStr
  }
  
  return `${startStr} - ${endStr}`
}

export function getPresetLabel(preset: PresetFilter): string {
  const option = PRESET_OPTIONS.find(opt => opt.value === preset)
  return option?.label || 'Personnalisé'
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

export function getDaysDifference(start: Date, end: Date): number {
  const timeDiff = end.getTime() - start.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

export function buildApiParams(range: DateRange): string {
  const params = new URLSearchParams()
  
  // Ajouter l'année
  params.set('year', range.start.getFullYear().toString())
  
  // Déterminer le type de plage selon la logique de l'API dashboard
  const daysDiff = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))
  
  if (range.preset === 'custom' || range.preset === 'ytd' || range.preset === 'last12Months' || range.preset === 'last30Days' || range.preset === 'last90Days') {
    // Pour les plages personnalisées et spéciales, utiliser 'custom' et ajouter les dates
    params.set('range', 'custom')
    params.set('startDate', range.start.toISOString().split('T')[0])
    params.set('endDate', range.end.toISOString().split('T')[0])
  } else if (daysDiff <= 31) {
    // Mois ou moins : envoyer le mois pour que l'API utilise la bonne période (ce mois, mois dernier, etc.)
    params.set('range', 'month')
    params.set('month', (range.start.getMonth() + 1).toString())
  } else if (daysDiff <= 93) {
    // Trimestre : envoyer year + month pour que l'API et le graphique utilisent le bon trimestre (ce trimestre ou trimestre dernier)
    params.set('range', 'quarter')
    params.set('month', (range.start.getMonth() + 1).toString())
  } else {
    // Année complète
    params.set('range', 'year')
  }
  
  return params.toString()
}
