// Requêtes API : toujours depuis le renderer (navigateur ou Electron) avec fetch + credentials
// pour que le cookie auth-token (httpOnly) soit envoyé automatiquement. L'IPC Electron ne peut
// pas transmettre les cookies httpOnly (inaccessibles à document.cookie).
export async function electronFetch(path: string, options?: RequestInit): Promise<Response> {
  try {
    // Ne pas forcer Content-Type pour FormData (ex. upload logo) : le navigateur ajoute multipart/form-data + boundary
    const body = options?.body
    const headers =
      body instanceof FormData
        ? (options?.headers ?? {})
        : { 'Content-Type': 'application/json', ...options?.headers }
    const response = await fetch(path, {
      ...options,
      credentials: 'include',
      headers,
    })
    return response
  } catch (error) {
    console.error('Erreur fetch:', error)
    throw error
  }
}

// Fonctions spécialisées pour les API routes
export async function fetchDashboard(params: string) {
  return electronFetch(`/api/dashboard?${params}`)
}

export async function fetchChargesBreakdown(params: string) {
  return electronFetch(`/api/charges/breakdown?${params}`)
}

export async function fetchDashboardEvolution(params: string) {
  return electronFetch(`/api/dashboard/evolution?${params}`)
}

export async function fetchSettings() {
  return electronFetch('/api/settings')
}