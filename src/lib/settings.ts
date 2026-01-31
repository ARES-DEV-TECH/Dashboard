// Utility functions for settings management
import { electronFetch } from './electron-api'

export interface CompanySettings {
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  defaultTvaRate: number
  tauxUrssaf: number
}

export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const response = await electronFetch('/api/settings')
    if (!response.ok) {
      throw new Error('Failed to fetch settings')
    }
    
    const data = await response.json()
    const params = data.parameters || []
    
    const getParamValue = (key: string, defaultValue: string | number): string | number => {
      const param = params.find((p: { key: string; value: string }) => p.key === key)
      return param ? (typeof defaultValue === 'number' ? parseFloat(param.value) ?? defaultValue : param.value) : defaultValue
    }
    
    return {
      companyName: getParamValue('companyName', 'ARES') as string,
      companyAddress: getParamValue('companyAddress', 'Votre entreprise') as string,
      companyPhone: getParamValue('companyPhone', '') as string,
      companyEmail: getParamValue('companyEmail', '') as string,
      defaultTvaRate: getParamValue('defaultTvaRate', 20) as number,
      tauxUrssaf: getParamValue('tauxUrssaf', 22) as number
    }
  } catch (error) {
    console.error('Error loading company settings:', error)
    // Return default values if loading fails
    return {
      companyName: 'ARES',
      companyAddress: 'Votre entreprise',
      companyPhone: '',
      companyEmail: '',
      defaultTvaRate: 20,
      tauxUrssaf: 22
    }
  }
}

export async function getDefaultTvaRate(): Promise<number> {
  const settings = await getCompanySettings()
  return settings.defaultTvaRate
}

export async function getTauxUrssaf(): Promise<number> {
  const settings = await getCompanySettings()
  return settings.tauxUrssaf
}
