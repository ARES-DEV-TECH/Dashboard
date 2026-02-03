import { test, expect } from '@playwright/test'

test.describe('Pages auth', () => {
  test('page login affiche le formulaire de connexion', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/ARES|Dashboard|Connexion/i)
    await expect(page.getByText('Connexion').first()).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/mot de passe/i).first()).toBeVisible()
  })

  test('page inscription affiche le formulaire', async ({ page }) => {
    await page.goto('/register')
    // Utiliser getByText car CardTitle est une div
    await expect(page.getByText('Créer un compte', { exact: true })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.locator('#firstName')).toBeVisible()
    await expect(page.locator('#lastName')).toBeVisible()
  })

  test('page mot de passe oublié affiche le formulaire', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByText('Mot de passe oublié')).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })

  test('redirection / vers /login quand non connecté', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})
