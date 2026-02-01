'use client'

import { electronFetch } from '@/lib/electron-api'
import type { Client, Article, Charge, SalesResponse, ChargesResponse, SettingsResponse } from '@/lib/types'

export const SWR_KEYS = {
  clients: 'clients',
  articles: 'articles',
  sales: 'sales',
  charges: 'charges',
  settings: 'settings',
} as const

export async function fetchClients(): Promise<Client[]> {
  const res = await electronFetch('/api/clients')
  if (!res.ok) throw new Error('Erreur chargement clients')
  return res.json()
}

export async function fetchArticles(): Promise<Article[]> {
  const res = await electronFetch('/api/articles')
  if (!res.ok) throw new Error('Erreur chargement articles')
  const data = await res.json()
  return Array.isArray(data) ? data : data?.articles ?? []
}

export async function fetchSales(): Promise<SalesResponse> {
  const res = await electronFetch('/api/sales')
  if (!res.ok) throw new Error('Erreur chargement ventes')
  const data = await res.json()
  return { sales: data?.sales ?? [], pagination: data?.pagination }
}

export async function fetchCharges(): Promise<ChargesResponse> {
  const res = await electronFetch('/api/charges?limit=500')
  if (!res.ok) throw new Error('Erreur chargement charges')
  const data = await res.json()
  return { charges: data?.charges ?? [], pagination: data?.pagination }
}

export type { SettingsResponse } from '@/lib/types'

export async function fetchSettings(): Promise<SettingsResponse> {
  const res = await electronFetch('/api/settings')
  if (!res.ok) throw new Error('Erreur chargement paramètres')
  const data = await res.json()
  return { parameters: data?.parameters ?? [] }
}
