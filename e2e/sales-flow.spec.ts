import { test, expect } from '@playwright/test'

test.describe('Flux Business Complet', () => {
  const timestamp = Date.now()
  const clientLastName = `E2E-${timestamp}`
  const clientNameFull = `Test ${clientLastName}`
  const serviceName = `Service E2E ${timestamp}`

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('seed@example.com')
    // Utiliser un sélecteur précis pour éviter le bouton "Afficher le mot de passe"
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test('Cycle complet : Client -> Article -> Vente', async ({ page }) => {
    // 1. Créer Client
    console.log('Création du client...')
    await page.locator('[data-sidebar="sidebar"]').getByRole('link', { name: 'Clients' }).click()
    await expect(page).toHaveURL('/clients')

    await page.getByRole('button', { name: 'Nouveau' }).click()
    await expect(page.getByText('Nouveau client')).toBeVisible()

    await page.locator('#firstName').fill('Test')
    await page.locator('#lastName').fill(clientLastName)
    await page.getByRole('button', { name: 'Créer' }).click()

    // Attendre le toast ou la fermeture du dialog
    await expect(page.getByText(/Client créé/i)).toBeVisible()

    // 2. Créer Article
    console.log('Création de l\'article...')
    await page.locator('[data-sidebar="sidebar"]').getByRole('link', { name: 'Articles' }).click()
    await expect(page).toHaveURL('/articles')

    await page.getByRole('button', { name: 'Nouveau' }).click()
    await expect(page.getByText('Nouvel article')).toBeVisible()

    await page.locator('#serviceName').fill(serviceName)
    await page.locator('#priceHt').fill('1000')
    await page.getByRole('button', { name: 'Créer' }).click()

    await expect(page.getByText(/Article créé/i)).toBeVisible()

    // 3. Créer Vente
    console.log('Création de la vente...')
    await page.locator('[data-sidebar="sidebar"]').getByRole('link', { name: 'Ventes' }).click()
    await expect(page).toHaveURL('/sales')

    await page.getByRole('button', { name: 'Nouveau' }).click()
    await expect(page.getByText('Nouvelle vente')).toBeVisible()

    // Sélection Client (Select Shadcn)
    await page.locator('button[aria-label="Sélectionner un client"]').click()
    // Attendre que la liste s'ouvre et cliquer sur le client
    // On utilise filter pour trouver l'option exacte qui contient le nom
    await page.getByRole('option').filter({ hasText: clientLastName }).click()

    // Sélection Service
    await page.locator('button[aria-label="Sélectionner un service"]').first().click()
    await page.getByRole('option').filter({ hasText: serviceName }).click()

    // Vérifier que le prix s'est mis à jour (1000)
    await expect(page.locator('#price-0')).toHaveValue('1000')

    await page.getByRole('button', { name: 'Créer' }).click()
    await expect(page.getByText(/Vente enregistrée/i)).toBeVisible()

    // Attendre que le dialog soit fermé pour être sûr que la table visible est la bonne
    // ou cibler spécifiquement la table de données
    await expect(page.getByRole('dialog')).toBeHidden()

    // Vérifier présence dans la liste (Nom et Prénom peuvent être dans des colonnes séparées)
    await expect(page.locator('table[data-slot="table"]')).toContainText(clientLastName)
    // On cherche le montant approximatif pour éviter les soucis de locale (espace insécable, virgule/point)
    // 1000 * 1.2 = 1200
    await expect(page.locator('table[data-slot="table"]')).toContainText('1200')
  })
})
