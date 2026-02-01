import { test, expect } from '@playwright/test'

/**
 * Tests API auth (sans UI). Vérifient les réponses attendues.
 * En l'absence de BDD de test, on vérifie au moins les codes et messages.
 */
test.describe('API auth', () => {
  test('POST /api/auth/login sans body retourne 400 ou 401', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect([400, 401]).toContain(res.status())
    const body = await res.json().catch(() => ({}))
    expect(body).toHaveProperty('error')
  })

  test('POST /api/auth/register sans body retourne 400', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect(res.status()).toBe(400)
    const body = await res.json().catch(() => ({}))
    expect(body).toHaveProperty('error')
  })

  test('POST /api/auth/confirm-email sans token retourne 400', async ({ request }) => {
    const res = await request.post('/api/auth/confirm-email', {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect(res.status()).toBe(400)
  })
})
